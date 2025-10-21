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
  
  let jobId: string;
  try {
    const body = await req.json();
    jobId = body.job_id;
    if (!jobId) throw new Error("Missing job_id");
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Use RLS client
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  
  try {
    // Update Queue Item Status (RLS ensures ownership)
    const { data: job, error: updateError } = await supabase
      .from("print_queue")
      .update({ status: 'printing' })
      .eq("id", jobId)
      .select("file_name")
      .single();

    if (updateError || !job) throw new Error(`Failed to update job status: ${updateError?.message || "Job not found."}`);

    return new Response(JSON.stringify({ status: "success", message: `Database updated for job "${job.file_name}".` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Start Print DB Update Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});