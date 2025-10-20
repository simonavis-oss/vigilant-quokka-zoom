import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const mockStartPrint = (printer: any, fileName: string) => {
  console.log(`[MOCK-AUTO-START] Starting print of ${fileName} on ${printer.name}`);
  return { success: true };
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

  const { data: printer } = await supabaseServiceRole.from("printers").select("name").eq("id", printerId).single();
  const startResult = mockStartPrint(printer, nextJob.file_name);

  if (!startResult.success) {
    await supabaseServiceRole.from("print_queue").update({ status: 'failed' }).eq("id", nextJob.id);
    return new Response(JSON.stringify({ status: "error", completedJobName: completedJob.file_name, startedJobName: null }), { status: 500, headers: corsHeaders });
  }

  await supabaseServiceRole.from("print_queue").update({ status: 'printing', assigned_at: new Date().toISOString() }).eq("id", nextJob.id);

  return new Response(JSON.stringify({ status: "success", completedJobName: completedJob.file_name, startedJobName: nextJob.file_name }), { status: 200, headers: corsHeaders });
});