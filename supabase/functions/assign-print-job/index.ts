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

  // 3. Initialize Supabase Client (using Anon key + Auth header for RLS)
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  
  // 4. Verify User and Printer (RLS handles user ownership check implicitly)
  const { data: printer, error: printerError } = await supabase.from("printers").select("name").eq("id", printerId).single();
  if (printerError || !printer) {
    return new Response(JSON.stringify({ error: "Printer not found or does not belong to user" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 5. Update Queue Item (RLS ensures only pending jobs owned by the user are updated)
  const { data: updatedJob, error: updateError } = await supabase
    .from("print_queue")
    .update({ 
      status: 'assigned', 
      printer_id: printerId,
      assigned_at: new Date().toISOString()
    })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id")
    .single();

  if (updateError || !updatedJob) {
    return new Response(JSON.stringify({ error: `Job not found, not pending, or database error: ${updateError?.message || 'Job not updated.'}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  // 6. Return Success
  return new Response(JSON.stringify({ status: "success", message: `Job assigned to ${printer.name}.` }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});