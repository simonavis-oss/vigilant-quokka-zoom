import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatTime = (seconds: number): string => {
  if (seconds <= 0 || !isFinite(seconds)) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
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

  const { data: printer, error: dbError } = await supabaseServiceRole.from("printers").select("*").eq("id", printerId).single();
  if (dbError || !printer) {
    return new Response(JSON.stringify({ error: "Printer not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  const { data: { user } } = await supabaseAnon.auth.getUser();
  if (!user || user.id !== printer.user_id) {
    return new Response(JSON.stringify({ error: "Unauthorized access" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    let formattedStatus;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    if (printer.connection_type === 'obico') {
      // --- Obico API Logic ---
      const obicoUrl = `https://app.obico.io/api/v2/printers/${printer.cloud_printer_id}`;
      const headers: HeadersInit = { "Authorization": `Bearer ${printer.api_key}` };
      const response = await fetch(obicoUrl, { method: "GET", headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Obico API returned status: ${response.status}`);
      
      const data = await response.json();
      const isPrinting = data.state.flags.printing || data.state.flags.paused;
      
      formattedStatus = {
        is_printing: isPrinting,
        is_paused: data.state.flags.paused,
        progress: Math.round(data.job.progress.completion || 0),
        nozzle_temp: `${data.state.temperature.tool0.actual.toFixed(1)}°C / ${data.state.temperature.tool0.target.toFixed(1)}°C`,
        bed_temp: `${data.state.temperature.bed.actual.toFixed(1)}°C / ${data.state.temperature.bed.target.toFixed(1)}°C`,
        file_name: isPrinting ? data.job.file.name : "Idle",
        time_remaining: formatTime(data.job.progress.printTimeLeft),
      };

    } else {
      // --- Moonraker/Local API Logic ---
      const moonrakerUrl = `${printer.base_url}/printer/objects/query?webhooks&print_stats&display_status&extruder&heater_bed&virtual_sdcard`;
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (printer.api_key) headers["X-Api-Key"] = printer.api_key;
      
      const response = await fetch(moonrakerUrl, { method: "GET", headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Moonraker API returned status: ${response.status}`);

      const data = await response.json();
      const status = data.result.status;
      const printStats = status.print_stats;
      const isPrinting = ["printing", "paused"].includes(printStats.state);
      
      formattedStatus = {
        is_printing: isPrinting,
        is_paused: printStats.state === "paused",
        progress: Math.round((status.display_status?.progress || status.virtual_sdcard?.progress || 0) * 100),
        nozzle_temp: `${status.extruder.temperature.toFixed(1)}°C / ${status.extruder.target.toFixed(1)}°C`,
        bed_temp: `${status.heater_bed.temperature.toFixed(1)}°C / ${status.heater_bed.target.toFixed(1)}°C`,
        file_name: isPrinting ? printStats.filename : "Idle",
        time_remaining: formatTime(printStats.total_duration - printStats.print_duration),
      };
    }

    await supabaseServiceRole.from("printers").update({ is_online: true }).eq("id", printerId);
    return new Response(JSON.stringify({ status: "success", data: formattedStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    await supabaseServiceRole.from("printers").update({ is_online: false }).eq("id", printerId);
    const errorMessage = error.name === 'AbortError' ? 'Connection timed out after 5 seconds.' : `Failed to connect: ${error.message}`;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error.name === 'AbortError' ? 504 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});