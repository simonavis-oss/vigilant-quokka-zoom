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

  try {
    const url = new URL(req.url);
    const printerId = url.searchParams.get("printer_id");
    const token = url.searchParams.get("token");

    if (!printerId || !token) {
      throw new Error("Missing printer_id or token query parameter.");
    }

    // Initialize Supabase client to verify the token
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Verify the JWT and get the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Invalid or expired token.");
    }

    // Now use the service role client to fetch printer details, but still check ownership
    const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: printer, error: printerError } = await serviceClient
      .from("printers")
      .select("webcam_url")
      .eq("id", printerId)
      .eq("user_id", user.id) // IMPORTANT: Enforce ownership
      .single();

    if (printerError || !printer) {
      throw new Error("Printer not found or access denied.");
    }
    if (!printer.webcam_url) {
      throw new Error("Webcam URL is not configured for this printer.");
    }

    // Fetch the webcam stream
    const streamResponse = await fetch(printer.webcam_url);

    if (!streamResponse.ok) {
      throw new Error(`Failed to fetch stream from webcam. Status: ${streamResponse.status}`);
    }

    // Return the stream directly to the client
    return new Response(streamResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': streamResponse.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});