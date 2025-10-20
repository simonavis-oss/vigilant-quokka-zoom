import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth and Body Parsing ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  let printerId: string, command: string;
  try {
    const body = await req.json();
    printerId = body.id;
    command = body.command;
    if (!printerId || !command) {
      return new Response(JSON.stringify({ error: "Missing printer ID or command" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // --- Supabase and Printer Fetching ---
  const supabaseServiceRole = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  
  const { data: printer, error: dbError } = await supabaseServiceRole.from("printers").select("user_id, base_url, api_key").eq("id", printerId).single();
  if (dbError || !printer) {
    return new Response(JSON.stringify({ error: "Printer not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  const { data: { user } } = await supabaseAnon.auth.getUser();
  if (!user || user.id !== printer.user_id) {
    return new Response(JSON.stringify({ error: "Unauthorized access" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // --- Live Moonraker API Call ---
  try {
    const encodedCommand = encodeURIComponent(command);
    const moonrakerUrl = `${printer.base_url}/printer/gcode/script?gcode=${encodedCommand}`;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (printer.api_key) {
      headers["X-Api-Key"] = printer.api_key;
    }

    const response = await fetch(moonrakerUrl, { method: "POST", headers });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Moonraker API returned status ${response.status}: ${errorBody}`);
    }

    return new Response(JSON.stringify({ status: "success", message: `Command executed: ${command}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`Error sending command to printer ${printerId}:`, error.message);
    return new Response(JSON.stringify({ status: "error", message: `Failed to execute command: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});