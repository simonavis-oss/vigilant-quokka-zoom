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

  let completedJobId: string;
  try {
    const { job_id } = await req.json();
    completedJobId = job_id;
    if (!completedJobId) throw new Error("Missing job_id");
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Use RLS client
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  
  // Find the completed job (RLS ensures user ownership)
  const { data: completedJob, error: findError } = await supabase
    .from("print_queue")
    .select("id, printer_id")
    .eq("id", completedJobId)
    .eq("status", "completed")
    .single();

  if (findError || !completedJob) {
    return new Response(JSON.stringify({ error: "Completed job not found or already cleared." }), { status: 404, headers: corsHeaders });
  }

  // Delete the completed job from the queue
  await supabase.from("print_queue").delete().eq("id", completedJob.id);

  // Find the next job for that printer
  const { data: nextJob } = await supabase
    .from("print_queue")
    .select("file_name")
    .eq("printer_id", completedJob.printer_id)
    .eq("status", "assigned")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (nextJob) {
    return new Response(JSON.stringify({ status: "success", message: `Bed cleared. Next job "${nextJob.file_name}" is ready to start.` }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ status: "success", message: "Bed cleared. No more jobs in queue for this printer." }), { status: 200, headers: corsHeaders });
});