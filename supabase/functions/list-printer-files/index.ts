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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  let printerId: string;
  try {
    const { id } = await req.json();
    printerId = id;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

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

  try {
    const moonrakerUrl = `${printer.base_url}/server/files/list`;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (printer.api_key) {
      headers["X-Api-Key"] = printer.api_key;
    }

    const response = await fetch(moonrakerUrl, { method: "GET", headers });

    if (!response.ok) {
      throw new Error(`Moonraker API returned status: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for .gcode files and return only what's needed
    const files = data.result
      .filter((file: { path: string }) => file.path.toLowerCase().endsWith('.gcode'))
      .map((file: { path: string, modified: number, size: number }) => ({
        path: file.path,
        modified: file.modified,
        size: file.size,
      }));

    return new Response(JSON.stringify({ status: "success", data: files }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`Error listing files for printer ${printerId}:`, error.message);
    return new Response(JSON.stringify({ error: `Failed to list files: ${error.message}` }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});