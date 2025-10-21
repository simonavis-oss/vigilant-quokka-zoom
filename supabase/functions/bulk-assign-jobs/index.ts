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
  
  // 2. Parse Request Body
  let jobIds: string[], printerId: string;
  try {
    const body = await req.json();
    jobIds = body.job_ids;
    printerId = body.printer_id;
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0 || !printerId) {
      return new Response(JSON.stringify({ error: "Missing job IDs or printer ID" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 3. Initialize Supabase Client (using Anon key + Auth header for RLS)
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  
  // 4. Verify Printer (RLS handles user ownership check implicitly)
  const { data: printer, error: printerError } = await supabase.from("printers").select("name").eq("id", printerId).single();
  if (printerError || !printer) {
    return new Response(JSON.stringify({ error: "Printer not found or does not belong to user" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 5. Update Queue Items in bulk (RLS ensures only pending jobs owned by the user are updated)
  const { data: updatedJobs, error: updateError } = await supabase
    .from("print_queue")
    .update({ 
      status: 'assigned', 
      printer_id: printerId,
      assigned_at: new Date().toISOString()
    })
    .in("id", jobIds)
    .eq("status", "pending")
    .select("id");

  if (updateError) {
    return new Response(JSON.stringify({ error: `Database error: ${updateError.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  const updatedCount = updatedJobs?.length || 0;

  // 6. Return Success
  return new Response(JSON.stringify({ status: "success", message: `${updatedCount} job(s) assigned to ${printer.name}.` }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});