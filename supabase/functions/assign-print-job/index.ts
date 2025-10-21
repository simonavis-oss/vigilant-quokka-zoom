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

  // --- Authentication & Body Parsing ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  let jobId: string, printerId: string;
  try {
    const body = await req.json();
    jobId = body.job_id;
    printerId = body.printer_id;
    if (!jobId || !printerId) throw new Error("Missing job_id or printer_id");
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // --- Supabase Clients ---
  // RLS client for user-context operations
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  // Service Role client for elevated privileges (accessing storage)
  const serviceRoleClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // --- Fetch Job and Printer Details (RLS ensures ownership) ---
    const { data: job, error: jobError } = await supabase.from("print_queue").select("file_name, storage_path").eq("id", jobId).eq("status", "pending").single();
    if (jobError || !job) throw new Error("Pending job not found for this user.");
    if (!job.storage_path) throw new Error("Job is missing a file (storage_path).");

    const { data: printer, error: printerError } = await supabase.from("printers").select("name, base_url, api_key").eq("id", printerId).single();
    if (printerError || !printer) throw new Error("Printer not found for this user.");

    // --- Download File from Storage (using Service Role) ---
    const { data: fileBlob, error: downloadError } = await serviceRoleClient.storage.from("gcode-files").download(job.storage_path);
    if (downloadError || !fileBlob) throw new Error(`Failed to download file from storage: ${downloadError?.message}`);

    // --- Upload File to Printer (Moonraker) ---
    const formData = new FormData();
    formData.append("file", fileBlob, job.file_name);

    const moonrakerUrl = `${printer.base_url}/server/files/upload`;
    const headers = new Headers();
    if (printer.api_key) {
      headers.append("X-Api-Key", printer.api_key);
    }

    const uploadResponse = await fetch(moonrakerUrl, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload file to printer: ${errorText}`);
    }

    // --- Update Queue Item Status (RLS ensures ownership) ---
    const { error: updateError } = await supabase
      .from("print_queue")
      .update({ status: 'assigned', printer_id: printerId, assigned_at: new Date().toISOString() })
      .eq("id", jobId);

    if (updateError) throw new Error(`Failed to update job status after upload: ${updateError.message}`);

    // --- Success ---
    return new Response(JSON.stringify({ status: "success", message: `Job assigned and file uploaded to ${printer.name}.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Assign Job Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});