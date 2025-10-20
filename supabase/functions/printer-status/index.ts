import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock status data structure
interface PrinterStatus {
  is_printing: boolean;
  progress: number;
  nozzle_temp: string;
  bed_temp: string;
  file_name: string;
  time_remaining: string;
}

// Mock function to simulate fetching data from a 3D printer API
const fetchMockStatus = (type: string): PrinterStatus => {
  // Simulate different statuses based on connection type or just random chance
  const isPrinting = Math.random() > 0.5;
  const progress = isPrinting ? Math.floor(Math.random() * 100) : 0;

  return {
    is_printing: isPrinting,
    progress: progress,
    nozzle_temp: isPrinting ? "215°C / 215°C" : "25°C / 0°C",
    bed_temp: isPrinting ? "60°C / 60°C" : "25°C / 0°C",
    file_name: isPrinting ? "Benchy.gcode" : "Idle",
    time_remaining: isPrinting ? `${Math.floor(Math.random() * 2) + 1}h ${Math.floor(Math.random() * 60)}m` : "N/A",
  };
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
  let printerId: string;
  try {
    const { id } = await req.json();
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing printer ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    printerId = id;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Initialize Supabase Client (using service role key for secure access)
  const supabaseServiceRole = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 4. Fetch Printer Details
  const { data: printer, error: dbError } = await supabaseServiceRole
    .from("printers")
    .select("user_id, connection_type, base_url, api_key")
    .eq("id", printerId)
    .single();

  if (dbError || !printer) {
    console.error("DB Error:", dbError);
    return new Response(JSON.stringify({ error: "Printer not found or database error" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  // 5. Verify User Ownership (Security Check)
  // We use the standard client to verify the token and get the user.
  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );
  
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();

  if (authError || !user || user.id !== printer.user_id) {
    return new Response(JSON.stringify({ error: "Unauthorized access to printer data" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 6. Simulate API Call (Replace with actual fetch logic later)
  console.log(`Attempting to connect to ${printer.connection_type} at ${printer.base_url}`);
  
  const status = fetchMockStatus(printer.connection_type);

  // 7. Return Status
  return new Response(JSON.stringify({ 
    status: "success", 
    data: status,
    connection_type: printer.connection_type,
    base_url: printer.base_url,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});