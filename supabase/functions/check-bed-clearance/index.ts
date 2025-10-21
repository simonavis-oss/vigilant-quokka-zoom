import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Placeholder for AI Vision Service ---
// In a real application, this would be a call to a service like Roboflow, SentryML, or a custom model.
async function analyzeImageForObstructions(image: Blob): Promise<{ is_clear: boolean; reason: string }> {
  // TODO: Replace this mock logic with a real API call to your computer vision model.
  // This placeholder will randomly decide if the bed is clear or not to demonstrate the UI flow.
  const isClear = Math.random() > 0.5;
  
  if (isClear) {
    return { is_clear: true, reason: "Bed appears to be clear." };
  } else {
    return { is_clear: false, reason: "Potential object or previous print detected on the bed." };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  let printerId: string;
  try {
    const { printer_id } = await req.json();
    printerId = printer_id;
    if (!printerId) throw new Error("Missing printer_id");
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const serviceRoleClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // 1. Get printer's webcam URL
    const { data: printer, error: printerError } = await supabase.from("printers").select("webcam_url").eq("id", printerId).single();
    if (printerError || !printer) throw new Error("Printer not found or user does not have access.");
    if (!printer.webcam_url) throw new Error("Printer does not have a webcam URL configured.");

    // 2. Fetch snapshot from webcam
    const snapshotResponse = await fetch(printer.webcam_url);
    if (!snapshotResponse.ok) throw new Error("Failed to fetch snapshot from webcam.");
    const snapshotBlob = await snapshotResponse.blob();

    // 3. Analyze the image (using our placeholder)
    const analysis = await analyzeImageForObstructions(snapshotBlob);

    // 4. If not clear, upload snapshot for user review
    let snapshotUrl = null;
    if (!analysis.is_clear) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Could not identify user for snapshot upload.");
      
      const filePath = `${user.user.id}/${printerId}-${Date.now()}.jpg`;
      const { error: uploadError } = await serviceRoleClient.storage.from("bed-snapshots").upload(filePath, snapshotBlob, { contentType: 'image/jpeg' });
      if (uploadError) throw new Error(`Failed to upload snapshot: ${uploadError.message}`);

      const { data: signedUrlData } = await serviceRoleClient.storage.from("bed-snapshots").createSignedUrl(filePath, 60 * 5); // URL valid for 5 minutes
      if (!signedUrlData) throw new Error("Failed to create signed URL for snapshot.");
      snapshotUrl = signedUrlData.signedUrl;
    }

    // 5. Return the result
    return new Response(JSON.stringify({ ...analysis, snapshot_url: snapshotUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Bed Clearance Check Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});