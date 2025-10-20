import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const checkIsPrinterAvailable = (printer: { name: string }): boolean => {
  console.log(`[Start-Print] Live checking printer: ${printer.name}`);
  const isConnectionSuccessful = Math.random() > 0.1;
  if (!isConnectionSuccessful) return false;
  const isPrinting = Math.random() > 0.5;
  return !isPrinting;
};

const mockStartPrint = (printer: any, fileName: string) => {
  console.log(`[MOCK] Starting print of ${fileName} on ${printer.name}`);
  return { success: true, message: "Print command sent successfully." };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  let jobId: string;
  try {
    const { job_id } = await req.json();
    jobId = job_id;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseServiceRole = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  
  const { data: { user } } = await supabaseAnon.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid user session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  const { data: job, error: jobError } = await supabaseServiceRole.from("print_queue").select("*").eq("id", jobId).eq("user_id", user.id).single();
  if (jobError || !job || job.status !== 'assigned' || !job.printer_id) {
    return new Response(JSON.stringify({ error: "Job not found or not in 'assigned' state" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: printer, error: printerError } = await supabaseServiceRole.from("printers").select("*").eq("id", job.printer_id).single();
  if (printerError || !printer) {
    return new Response(JSON.stringify({ error: "Assigned printer not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!checkIsPrinterAvailable(printer)) {
    return new Response(JSON.stringify({ error: `${printer.name} is currently busy or offline.` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const printResult = mockStartPrint(printer, job.file_name);
  if (!printResult.success) {
    return new Response(JSON.stringify({ error: `Failed to start print on ${printer.name}.` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { error: updateError } = await supabaseServiceRole
    .from("print_queue")
    .update({ status: 'printing', assigned_at: new Date().toISOString() })
    .eq("id", job.id);

  if (updateError) {
    console.error(`Failed to update job status to printing for job ${job.id}:`, updateError);
  }

  return new Response(JSON.stringify({ status: "success", message: `Print started for "${job.file_name}" on ${printer.name}.` }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});