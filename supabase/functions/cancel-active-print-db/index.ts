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
  let reason: string;
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

  // Use RLS client
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  
  // Find the job that was printing on this printer (RLS ensures user ownership)
  const { data: job, error: jobError } = await supabase.from("print_queue").select("*").eq("printer_id", printerId).eq("status", "printing").single();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: "No active print job found to cancel for this printer." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Update Database
  const now = new Date();
  const assignedAt = new Date(job.assigned_at);
  const durationSeconds = Math.round((now.getTime() - assignedAt.getTime()) / 1000);

  await supabase.from("print_jobs").insert({
    user_id: job.user_id,
    printer_id: job.printer_id,
    file_name: job.file_name,
    duration_seconds: durationSeconds > 0 ? durationSeconds : 0,
    status: 'cancelled',
    cancellation_reason: reason,
    started_at: job.assigned_at,
    finished_at: now.toISOString(),
  });

  const { error: deleteError } = await supabase.from("print_queue").delete().eq("id", job.id);
  if (deleteError) {
    console.error("Failed to delete job from queue:", deleteError);
    return new Response(JSON.stringify({ error: "Failed to remove job from queue after cancellation" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ status: "success", message: `Database updated for cancelled job "${job.file_name}".` }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});