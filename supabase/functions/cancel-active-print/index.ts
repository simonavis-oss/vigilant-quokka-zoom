import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Real function to send a cancel command to Moonraker
const stopPrint = async (printer: { base_url: string, api_key: string | null, name: string }) => {
  try {
    const moonrakerUrl = `${printer.base_url}/printer/print/cancel`;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (printer.api_key) {
      headers["X-Api-Key"] = printer.api_key;
    }
    const response = await fetch(moonrakerUrl, { method: "POST", headers });
    if (!response.ok) {
      throw new Error(`Moonraker API returned status ${response.status}`);
    }
    return { success: true, message: "Cancel command sent successfully." };
  } catch (error) {
    console.error(`Failed to send cancel command to ${printer.name}:`, error.message);
    return { success: false, message: error.message };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth, Body Parsing, and User Verification (Same as before) ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  let printerId: string, reason: string;
  try {
    const body = await req.json();
    printerId = body.printer_id;
    reason = body.reason;
    if (!printerId || !reason) {
      return new Response(JSON.stringify({ error: "Missing printer ID or reason" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseServiceRole = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  
  const { data: { user } } = await supabaseAnon.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid user session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  // --- Find Job and Printer ---
  const { data: job, error: jobError } = await supabaseServiceRole.from("print_queue").select("*").eq("printer_id", printerId).eq("user_id", user.id).eq("status", "printing").single();
  if (jobError || !job) {
    return new Response(JSON.stringify({ error: "No active print job found to cancel for this printer." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: printer, error: printerError } = await supabaseServiceRole.from("printers").select("id, name, base_url, api_key").eq("id", job.printer_id).single();
  if (printerError || !printer) {
    return new Response(JSON.stringify({ error: "Assigned printer not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  // --- Send Real Cancel Command ---
  const stopResult = await stopPrint(printer);
  if (!stopResult.success) {
    return new Response(JSON.stringify({ error: `Failed to send stop command to ${printer.name}: ${stopResult.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // --- Update Database (Same as before) ---
  const now = new Date();
  const assignedAt = new Date(job.assigned_at);
  const durationSeconds = Math.round((now.getTime() - assignedAt.getTime()) / 1000);

  await supabaseServiceRole.from("print_jobs").insert({
    user_id: job.user_id,
    printer_id: job.printer_id,
    file_name: job.file_name,
    duration_seconds: durationSeconds > 0 ? durationSeconds : 0,
    status: 'cancelled',
    cancellation_reason: reason,
    started_at: job.assigned_at,
    finished_at: now.toISOString(),
  });

  const { error: deleteError } = await supabaseServiceRole.from("print_queue").delete().eq("id", job.id);
  if (deleteError) {
    console.error("Failed to delete job from queue:", deleteError);
  }

  return new Response(JSON.stringify({ status: "success", message: `Print job "${job.file_name}" has been cancelled.` }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});