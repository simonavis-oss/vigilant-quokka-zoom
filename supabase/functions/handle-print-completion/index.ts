import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const startPrint = async (printer: { base_url: string, api_key: string | null, name: string }, fileName: string) => {
  try {
    const encodedFile = encodeURIComponent(fileName);
    const moonrakerUrl = `${printer.base_url}/printer/print/start?filename=${encodedFile}`;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (printer.api_key) {
      headers["X-Api-Key"] = printer.api_key;
    }
    const response = await fetch(moonrakerUrl, { method: "POST", headers });
    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error.message || `Moonraker API returned status ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    console.error(`Failed to auto-start print on ${printer.name}:`, error.message);
    return { success: false };
  }
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
    const { printer_id } = await req.json();
    printerId = printer_id;
    if (!printerId) throw new Error("Missing printer_id");
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseServiceRole = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  
  const { data: { user } } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } }).auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid user session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: completedJob, error: findError } = await supabaseServiceRole
    .from("print_queue")
    .select("*")
    .eq("printer_id", printerId)
    .eq("status", "printing")
    .single();

  if (findError || !completedJob) {
    return new Response(JSON.stringify({ status: "noop", message: "No active print job found to complete." }), { status: 200, headers: corsHeaders });
  }

  const duration = Math.round((new Date().getTime() - new Date(completedJob.assigned_at).getTime()) / 1000);
  await supabaseServiceRole.from("print_jobs").insert({
    user_id: completedJob.user_id,
    printer_id: completedJob.printer_id,
    file_name: completedJob.file_name,
    duration_seconds: duration > 0 ? duration : 0,
    status: 'success',
    started_at: completedJob.assigned_at,
    finished_at: new Date().toISOString(),
  });

  await supabaseServiceRole.from("print_queue").delete().eq("id", completedJob.id);

  const { data: nextJob, error: nextJobError } = await supabaseServiceRole
    .from("print_queue")
    .select("*")
    .eq("printer_id", printerId)
    .eq("status", "assigned")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (nextJobError || !nextJob) {
    return new Response(JSON.stringify({ status: "success", completedJobName: completedJob.file_name, startedJobName: null }), { status: 200, headers: corsHeaders });
  }

  const { data: printer } = await supabaseServiceRole.from("printers").select("name, base_url, api_key").eq("id", printerId).single();
  if (!printer) {
    return new Response(JSON.stringify({ status: "error", message: "Printer not found for auto-start." }), { status: 404, headers: corsHeaders });
  }

  const startResult = await startPrint(printer, nextJob.file_name);

  if (!startResult.success) {
    await supabaseServiceRole.from("print_queue").update({ status: 'failed' }).eq("id", nextJob.id);
    return new Response(JSON.stringify({ status: "error", completedJobName: completedJob.file_name, startedJobName: null, message: "Failed to auto-start next job." }), { status: 500, headers: corsHeaders });
  }

  await supabaseServiceRole.from("print_queue").update({ status: 'printing', assigned_at: new Date().toISOString() }).eq("id", nextJob.id);

  return new Response(JSON.stringify({ status: "success", completedJobName: completedJob.file_name, startedJobName: nextJob.file_name }), { status: 200, headers: corsHeaders });
});