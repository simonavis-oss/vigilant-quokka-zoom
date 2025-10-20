import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock function to simulate sending a print start command to a printer API
const mockStartPrint = (printer: any, fileName: string) => {
  console.log(`[MOCK] Starting print of ${fileName} on ${printer.name} (${printer.connection_type})`);
  // In a real scenario, this would involve an HTTP request to the printer's API
  return { success: true, message: "Print command sent successfully." };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Authentication Check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  // 2. Parse Request Body
  let jobId: string;
  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "Missing job ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    jobId = job_id;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    return new Response(JSON.stringify({ error: "Invalid user session" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  const { data: job, error: jobError } = await supabaseServiceRole
    .from("print_queue")
    .select("id, user_id, file_name, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job || job.status !== 'pending') {
    return new Response(JSON.stringify({ error: "Job not found or not pending" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 5. Find an Available Printer
  // In a real scenario, we would query the printer-status edge function for all printers,
  // but for simplicity and to avoid complex cross-function calls, we mock availability here.
  // We assume any printer not currently marked as 'is_online: false' is potentially available.
  
  const { data: printers, error: printerError } = await supabaseServiceRole
    .from("printers")
    .select("id, name, connection_type, base_url, api_key")
    .eq("user_id", user.id)
    .eq("is_online", true) // Assuming 'is_online' is a rough indicator of availability
    .limit(1);

  if (printerError || !printers || printers.length === 0) {
    return new Response(JSON.stringify({ error: "No available printers found." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  const availablePrinter = printers[0];

  // 6. Assign Job and Start Print (Mock)
  const printResult = mockStartPrint(availablePrinter, job.file_name);

  if (printResult.success) {
    // 7. Update Queue Status
    const { error: updateError } = await supabaseServiceRole
      .from("print_queue")
      .update({ 
        status: 'assigned', 
        printer_id: availablePrinter.id,
        assigned_at: new Date().toISOString()
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Failed to update queue status:", updateError);
      // Note: If update fails, the print might still be running, but the queue state is wrong.
      // For this mock, we proceed with success.
    }
    
    // 8. Return Success
    return new Response(JSON.stringify({ 
      status: "success", 
      message: `Job assigned to ${availablePrinter.name}. Print started.`,
      printer_id: availablePrinter.id,
      printer_name: availablePrinter.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } else {
    return new Response(JSON.stringify({ 
      status: "error", 
      message: `Failed to start print on ${availablePrinter.name}.` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});