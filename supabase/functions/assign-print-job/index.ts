import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Live Status Check Logic ---
// This mock logic simulates checking if a printer is online and not busy.
const checkIsPrinterAvailable = (printer: { name: string }): boolean => {
  console.log(`[Assign-Job] Live checking printer: ${printer.name}`);
  
  // Mock connection success (90% chance)
  const isConnectionSuccessful = Math.random() > 0.1;
  if (!isConnectionSuccessful) {
    console.log(`[Assign-Job] Connection failed for ${printer.name}`);
    return false;
  }

  // Mock checking if it's currently printing (50% chance if connected)
  const isPrinting = Math.random() > 0.5;
  console.log(`[Assign-Job] ${printer.name} is_printing: ${isPrinting}`);
  
  // A printer is available if it's connected and not printing.
  return !isPrinting;
};
// --- End Live Status Check ---

// Mock function to simulate sending a print start command to a printer API
const mockStartPrint = (printer: any, fileName: string) => {
  console.log(`[MOCK] Starting print of ${fileName} on ${printer.name} (${printer.connection_type})`);
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

  // 5. Find an Available Printer by performing LIVE checks
  const { data: allPrinters, error: printerError } = await supabaseServiceRole
    .from("printers")
    .select("id, name, connection_type, base_url, api_key")
    .eq("user_id", user.id);

  if (printerError || !allPrinters || allPrinters.length === 0) {
    return new Response(JSON.stringify({ error: "No printers are registered for this user." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let availablePrinter = null;
  for (const printer of allPrinters) {
    if (checkIsPrinterAvailable(printer)) {
      availablePrinter = printer;
      break; // Found an available printer, so we stop looking.
    }
  }

  if (!availablePrinter) {
    return new Response(JSON.stringify({ error: "No available printers found. All may be busy or offline." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
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