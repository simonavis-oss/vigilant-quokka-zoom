import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrinterStatus {
  is_printing: boolean;
  is_paused: boolean;
  progress: number;
  nozzle_temp: string;
  bed_temp: string;
  file_name: string;
  time_remaining: string;
}

interface ActiveJob {
  file_name: string;
}

const fetchMockStatus = (activeJob: ActiveJob | null): PrinterStatus => {
  const isPrinting = !!activeJob;
  const isPaused = isPrinting && Math.random() > 0.5; // 50% chance of being paused if printing
  const progress = isPrinting ? Math.floor(Math.random() * 100) : 0;
  const statusText = isPaused ? "Paused" : "Printing";

  return {
    is_printing: isPrinting,
    is_paused: isPaused,
    progress: progress,
    nozzle_temp: isPrinting ? "215°C / 215°C" : "25°C / 0°C",
    bed_temp: isPrinting ? "60°C / 60°C" : "25°C / 0°C",
    file_name: isPrinting ? activeJob!.file_name : "Idle",
    time_remaining: isPrinting ? `${Math.floor(Math.random() * 2) + 1}h ${Math.floor(Math.random() * 60)}m` : "N/A",
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  let printerId: string;
  try {
    const { id } = await req.json();
    printerId = id;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  const { data: printer, error: dbError } = await supabaseServiceRole
    .from("printers")
    .select("user_id, connection_type, base_url, api_key")
    .eq("id", printerId)
    .single();

  if (dbError || !printer) {
    return new Response(JSON.stringify({ error: "Printer not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  const { data: { user } } = await supabaseAnon.auth.getUser();
  if (!user || user.id !== printer.user_id) {
    return new Response(JSON.stringify({ error: "Unauthorized access" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check the database for a real printing job
  const { data: activeJob } = await supabaseServiceRole
    .from("print_queue")
    .select("file_name")
    .eq("printer_id", printerId)
    .eq("status", "printing")
    .single();

  const isConnectionSuccessful = Math.random() > 0.1;

  await supabaseServiceRole
    .from("printers")
    .update({ is_online: isConnectionSuccessful })
    .eq("id", printerId);

  if (!isConnectionSuccessful) {
    return new Response(JSON.stringify({ error: "Failed to connect to printer API (Mock Failure)" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate mock status based on the real job state
  const status = fetchMockStatus(activeJob as ActiveJob | null);

  return new Response(JSON.stringify({ 
    status: "success", 
    data: status,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});