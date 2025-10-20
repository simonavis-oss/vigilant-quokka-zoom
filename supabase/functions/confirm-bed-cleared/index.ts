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
    return { success: false, error: error.message };
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

  let completedJobId: string;
  try {
    const { job_id } = await req.json();
    completedJobId = job_id;
    if (!completedJobId) throw new Error("Missing job_id");
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
    .select("id, printer_id")
    .eq("id", completedJobId)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .single();

  if (findError || !completedJob) {
    return new Response(JSON.stringify({ error: "Completed job not found or already cleared." }), { status: 404, headers: corsHeaders });
  }

  // Delete the completed job from the queue
  await supabaseServiceRole.from("print_queue").delete().eq("id", completedJob.id);

  // Find the next job for that printer
  const { data: nextJob } = await supabaseServiceRole
    .from("print_queue")
    .select("*")
    .eq("printer_id", completedJob.printer_id)
    .eq("status", "assigned")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!nextJob) {
    return new Response(JSON.stringify({ status: "success", message: "Bed cleared. No more jobs in queue for this printer." }), { status: 200, headers: corsHeaders });
  }

  const { data: printer } = await supabaseServiceRole.from("printers").select("name, base_url, api_key").eq("id", completedJob.printer_id!).single();
  if (!printer) {
    return new Response(JSON.stringify({ error: "Printer not found for auto-start." }), { status: 404, headers: corsHeaders });
  }

  const startResult = await startPrint(printer, nextJob.file_name);

  if (!startResult.success) {
    await supabaseServiceRole.from("print_queue").update({ status: 'failed' }).eq("id", nextJob.id);
    return new Response(JSON.stringify({ error: `Bed cleared, but failed to start next job: ${startResult.error}` }), { status: 500, headers: corsHeaders });
  }

  await supabaseServiceRole.from("print_queue").update({ status: 'printing', assigned_at: new Date().toISOString() }).eq("id", nextJob.id);

  return new Response(JSON.stringify({ status: "success", message: `Bed cleared. Starting next print: "${nextJob.file_name}".` }), { status: 200, headers: corsHeaders });
});