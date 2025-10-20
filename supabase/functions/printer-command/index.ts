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

  // 1. Authentication Check (Client JWT required)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  // 2. Parse Request Body
  let printerId: string;
  let command: string;
  try {
    const body = await req.json();
    printerId = body.id;
    command = body.command;
    
    if (!printerId || !command) {
      return new Response(JSON.stringify({ error: "Missing printer ID or command" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
  // Use the standard client to verify the token and get the user.
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
    return new Response(JSON.stringify({ error: "Unauthorized access or command attempt" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 6. Simulate External API Call (Replace with actual fetch logic later)
  console.log(`Sending command to ${printer.connection_type} at ${printer.base_url}: ${command}`);
  
  // Simulate success/failure based on command complexity or random chance
  const success = Math.random() > 0.1; 

  if (!success) {
    return new Response(JSON.stringify({ 
      status: "error", 
      message: `Failed to execute command: ${command}. Printer API unreachable. (Mock Error)` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  // 7. Return Success
  return new Response(JSON.stringify({ 
    status: "success", 
    message: `Command executed successfully: ${command}`
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});