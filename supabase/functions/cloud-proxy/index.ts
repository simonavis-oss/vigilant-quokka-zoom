import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to generate a unique request ID
const generateRequestId = () => crypto.randomUUID();

// Main request handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication and Initialization ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseAnon.auth.getUser();
    if (!user) throw new Error("Invalid user session");

    const { printer_id, command } = await req.json();
    if (!printer_id || !command) throw new Error("Missing printer_id or command");

    // --- Verify Printer Ownership ---
    const supabaseServiceRole = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: printer, error: printerError } = await supabaseServiceRole
      .from("printers")
      .select("user_id, cloud_printer_id")
      .eq("id", printer_id)
      .single();

    if (printerError || !printer || printer.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Printer not found or access denied" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!printer.cloud_printer_id) {
      return new Response(JSON.stringify({ error: "This printer is not configured for cloud connection" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Realtime Communication ---
    const requestId = generateRequestId();
    const commandChannel = supabaseServiceRole.channel(`printer-commands:${printer.cloud_printer_id}`);
    const responseChannel = supabaseServiceRole.channel(`printer-responses:${printer.cloud_printer_id}`);

    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        responseChannel.unsubscribe();
        reject(new Error("Request timed out. The printer agent may be offline."));
      }, 10000); // 10-second timeout

      responseChannel
        .on('broadcast', { event: 'agent-response' }, (payload) => {
          if (payload.request_id === requestId) {
            clearTimeout(timeout);
            responseChannel.unsubscribe();
            resolve(payload.data);
          }
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            reject(new Error("Failed to subscribe to response channel."));
          }
        });
    });

    // Send the command to the agent
    await commandChannel.send({
      type: 'broadcast',
      event: 'proxy-request',
      payload: { ...command, request_id: requestId },
    });
    commandChannel.unsubscribe();

    // Wait for the response from the agent
    const responseData = await responsePromise;

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Cloud Proxy Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});