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

  // 1. Authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  // 2. Parse Request Body for job_id and printer_id
  let jobId: string, printerId: string;
  try {
    const body = await req.json();
    jobId = body.job_id;
    printerId = body.printer_id;
    if (!jobId || !printerId) {
      return new Response(JSON.stringify({ error: "Missing job ID or printer ID" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 3. Initialize Supabase Clients
  const supabaseServiceRole = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  
  // 4. Verify User, Job, and Printer
  const { data: { user } } = await supabaseAnon.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid user session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  const { data: job, error: jobError } = await supabaseServiceRole.from("print_queue").select("id, status").eq("id", jobId).eq("user_id", user.id).single();
  if (jobError || !job || job.status !== 'pending') {
    return new Response(JSON.stringify({ error: "Job not found or not pending" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: printer, error: printerError } = await supabaseServiceRole.from("printers").select("id, name").eq("id", printerId).eq("user_id", user.id).single();
  if (printerError || !printer) {
    return new Response(JSON.stringify({ error: "Printer not found or does not belong to user" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 5. Update Queue Item
  const { error: updateError } = await supabaseServiceRole
    .from("print_queue")
    .update({ 
      status: 'assigned', 
      printer_id: printerId,
      assigned_at: new Date().toISOString()
    })
    .eq("id", jobId);

  if (updateError) {
    return new Response(JSON.stringify({ error: `Database error: ${updateError.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  // 6. Return Success
  return new Response(JSON.stringify({ status: "success", message: `Job assigned to ${printer.name}.` }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});