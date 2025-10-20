import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock function to simulate sending a stop command
const mockStopPrint = (printer: any) => {
  console.log(`[MOCK] Sending STOP command to ${printer.name}`);
  // In a real scenario, this would be an API call to the printer
  return { success: true, message: "Stop command sent successfully." };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  // 2. Parse Request Body
  let jobId: string;
  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "Missing job ID" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    jobId = job_id;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 3. Initialize Supabase Clients
  const supabaseServiceRole = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  
  // 4. Verify User and Fetch Job Details
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid user session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  const { data: job, error: jobError } = await supabaseServiceRole
    .from("print_queue")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job || job.status !== 'assigned') {
    return new Response(JSON.stringify({ error: "Job not found or not in 'assigned' state" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 5. Fetch Printer Details
  const { data: printer, error: printerError } = await supabaseServiceRole
    .from("printers")
    .select("id, name")
    .eq("id", job.printer_id)
    .single();

  if (printerError || !printer) {
    return new Response(JSON.stringify({ error: "Assigned printer not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 6. Send Stop Command to Printer (Mock)
  const stopResult = mockStopPrint(printer);
  if (!stopResult.success) {
    return new Response(JSON.stringify({ error: `Failed to send stop command to ${printer.name}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 7. Create a record in print_jobs (history)
  const now = new Date();
  const assignedAt = new Date(job.assigned_at);
  const durationSeconds = Math.round((now.getTime() - assignedAt.getTime()) / 1000);

  const { error: historyError } = await supabaseServiceRole
    .from("print_jobs")
    .insert({
      user_id: job.user_id,
      printer_id: job.printer_id,
      file_name: job.file_name,
      duration_seconds: durationSeconds,
      status: 'cancelled',
      started_at: job.assigned_at,
      finished_at: now.toISOString(),
    });

  if (historyError) {
    console.error("Failed to create history record:", historyError);
    // Don't fail the whole request, but log it. The main thing is stopping the print.
  }

  // 8. Delete the job from the print_queue
  const { error: deleteError } = await supabaseServiceRole
    .from("print_queue")
    .delete()
    .eq("id", job.id);

  if (deleteError) {
    console.error("Failed to delete job from queue:", deleteError);
    return new Response(JSON.stringify({ error: "Failed to remove job from queue after cancellation" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 9. Return Success
  return new Response(JSON.stringify({ 
    status: "success", 
    message: `Job "${job.file_name}" has been cancelled.`,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});