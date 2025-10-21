import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Computer Vision API configuration
const CV_API_URL = "https://api.roboflow.com"; // You can use Roboflow, SentryML, or your own model
const CV_MODEL_ID = "print-failure-detection"; // Replace with your actual model ID
const CV_API_KEY = Deno.env.get("CV_API_KEY"); // You'll need to set this in Supabase secrets

interface AnalysisResult {
  is_failure: boolean;
  confidence: number;
  failure_type?: string;
  bounding_boxes?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    class: string;
    confidence: number;
  }>;
}

async function analyzeImageWithComputerVision(imageBlob: Blob): Promise<AnalysisResult> {
  if (!CV_API_KEY) {
    throw new Error("Computer vision API key not configured");
  }

  // Example using Roboflow - replace with your preferred CV service
  const formData = new FormData();
  formData.append("file", imageBlob);
  
  const response = await fetch(
    `${CV_API_URL}/${CV_MODEL_ID}?api_key=${CV_API_KEY}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`CV API error: ${response.status}`);
  }

  const result = await response.json();
  
  // Parse the computer vision results
  const predictions = result.predictions || [];
  const failurePredictions = predictions.filter((p: any) => 
    p.class === "spaghetti" || p.class === "layer_shift" || p.class === "warping" || p.class === "nozzle_clog"
  );

  return {
    is_failure: failurePredictions.length > 0,
    confidence: failurePredictions.length > 0 ? Math.max(...failurePredictions.map((p: any) => p.confidence)) : 0,
    failure_type: failurePredictions.length > 0 ? failurePredictions[0].class : undefined,
    bounding_boxes: failurePredictions.map((p: any) => ({
      x: p.x / result.image.width,
      y: p.y / result.image.height,
      width: p.width / result.image.width,
      height: p.height / result.image.height,
      class: p.class,
      confidence: p.confidence,
    })),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  let printerId: string;
  try {
    const { printer_id } = await req.json();
    printerId = printer_id;
    if (!printerId) throw new Error("Missing printer_id");
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { 
    global: { headers: { Authorization: authHeader } } 
  });
  const serviceRoleClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Get printer details
    const { data: printer, error: printerError } = await supabase
      .from("printers")
      .select("webcam_url, name, ai_failure_detection_enabled")
      .eq("id", printerId)
      .single();

    if (printerError || !printer) {
      throw new Error("Printer not found");
    }

    if (!printer.ai_failure_detection_enabled) {
      return new Response(JSON.stringify({ error: "AI failure detection not enabled for this printer" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!printer.webcam_url) {
      throw new Error("Printer does not have a webcam URL configured");
    }

    // Capture snapshot from webcam
    const snapshotResponse = await fetch(printer.webcam_url);
    if (!snapshotResponse.ok) {
      throw new Error("Failed to capture snapshot from webcam");
    }
    const snapshotBlob = await snapshotResponse.blob();

    // Analyze with computer vision
    const analysis = await analyzeImageWithComputerVision(snapshotBlob);

    let screenshotUrl = null;
    if (analysis.is_failure) {
      // Upload failure snapshot for user review
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Could not identify user");

      const filePath = `${user.user.id}/${printerId}-${Date.now()}.jpg`;
      const { error: uploadError } = await serviceRoleClient.storage
        .from('failure-snapshots')
        .upload(filePath, snapshotBlob, { contentType: 'image/jpeg' });

      if (!uploadError) {
        const { data: signedUrlData } = await serviceRoleClient.storage
          .from('failure-snapshots')
          .createSignedUrl(filePath, 60 * 30); // 30 minutes
        screenshotUrl = signedUrlData?.signedUrl;
      }
    }

    // Update printer with bounding boxes for UI visualization
    if (analysis.bounding_boxes && analysis.bounding_boxes.length > 0) {
      await supabase
        .from("printers")
        .update({ 
          ai_bounding_box: analysis.bounding_boxes[0] // Store primary failure box
        })
        .eq("id", printerId);
    }

    return new Response(JSON.stringify({ 
      is_failure: analysis.is_failure,
      confidence: analysis.confidence,
      failure_type: analysis.failure_type,
      screenshot_url: screenshotUrl,
      requires_action: analysis.is_failure && analysis.confidence > 0.7 // High confidence failures need immediate attention
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("AI Analysis Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});