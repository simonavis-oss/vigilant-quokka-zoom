import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";

// Define the structure of the data returned by the Moonraker API (simplified)
export interface PrinterStatus {
  is_printing: boolean;
  is_paused: boolean;
  progress: number;
  nozzle_temp: string;
  bed_temp: string;
  file_name: string;
  time_remaining: string;
  connection_type: string;
  base_url: string;
}

export interface CommandResponse {
  status: "success" | "error";
  message: string;
}

export interface AssignmentResponse {
  status: "success" | "error";
  message: string;
  printer_id?: string;
  printer_name?: string;
}

export interface CancelResponse {
  status: "success" | "error";
  message: string;
}

export interface StartPrintResponse {
  status: "success" | "error";
  message: string;
}

export interface CompletionResponse {
  status: "success" | "error" | "noop";
  message?: string;
  completedJob?: {
    id: string;
    file_name: string;
    printer_name: string;
  };
}

export interface BulkAssignmentResponse {
  status: "success" | "error";
}

export interface PrinterFile {
  path: string;
  modified: number;
  size: number;
}

export interface TemperaturePreset {
  name: string;
  extruder: number;
  heater_bed: number;
}

// --- Helper for Direct Moonraker Calls ---

const callMoonrakerApi = async (
  printer: Printer,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<any> => {
  const url = `${printer.base_url}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (printer.api_key) {
    headers['X-Api-Key'] = printer.api_key;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Check for common authentication/permission errors
      if (response.status === 403) {
        throw new Error(`Moonraker API Error (403 Forbidden): Check your API Key and Moonraker permissions.`);
      }
      throw new Error(`Moonraker API Error (${response.status}): ${errorText.substring(0, 100)}`);
    }

    // Moonraker often returns 200 with an empty body for commands, or a JSON result
    const text = await response.text();
    return text ? JSON.parse(text) : { result: { status: 'ok' } };

  } catch (error) {
    // If the error is a network error (e.g., CORS, connection refused, DNS failure)
    if (error instanceof TypeError) {
      throw new Error(`Network connection failed. This is often due to: 1. Incorrect IP/URL, 2. Printer is offline, or 3. CORS blocking (Moonraker needs to allow requests from this app's address).`);
    }
    throw error;
  }
};

// Helper to format seconds into a readable string
const formatTime = (seconds: number): string => {
  if (seconds <= 0 || !isFinite(seconds)) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

// --- Client-Side Printer Interaction Functions ---

export const getPrinterStatus = async (printer: Printer): Promise<PrinterStatus> => {
  const data = await callMoonrakerApi(
    printer,
    "/printer/objects/query?webhooks&print_stats&display_status&extruder&heater_bed&virtual_sdcard"
  );

  const status = data.result.status;
  const printStats = status.print_stats;
  const isPrinting = ["printing", "paused"].includes(printStats.state);
  
  return {
    is_printing: isPrinting,
    is_paused: printStats.state === "paused",
    progress: Math.round((status.display_status?.progress || status.virtual_sdcard?.progress || 0) * 100),
    nozzle_temp: `${status.extruder.temperature.toFixed(1)}°C / ${status.extruder.target.toFixed(1)}°C`,
    bed_temp: `${status.heater_bed.temperature.toFixed(1)}°C / ${status.heater_bed.target.toFixed(1)}°C`,
    file_name: isPrinting ? printStats.filename : "Idle",
    time_remaining: formatTime(printStats.total_duration - printStats.print_duration),
    connection_type: printer.connection_type,
    base_url: printer.base_url,
  };
};

export const fetchTemperaturePresets = async (printer: Printer): Promise<TemperaturePreset[]> => {
  const data = await callMoonrakerApi(
    printer,
    "/server/temperature_store"
  );
  
  // Moonraker returns presets under data.result.presets
  const presets = data.result.presets || {};
  
  return Object.entries(presets).map(([name, preset]: [string, any]) => ({
    name,
    extruder: preset.extruder || 0,
    heater_bed: preset.heater_bed || 0,
  }));
};

export const sendPrinterCommand = async (printer: Printer, command: string): Promise<CommandResponse> => {
  const encodedCommand = encodeURIComponent(command);
  await callMoonrakerApi(
    printer,
    `/printer/gcode/script?gcode=${encodedCommand}`,
    'POST'
  );
  return { status: "success", message: `Command executed: ${command}` };
};

export const listPrinterFiles = async (printer: Printer): Promise<PrinterFile[]> => {
  const data = await callMoonrakerApi(
    printer,
    "/server/files/list"
  );

  // Filter for .gcode files and return only what's needed
  const files = data.result
    .filter((file: { path: string }) => file.path.toLowerCase().endsWith('.gcode'))
    .map((file: { path: string, modified: number, size: number }) => ({
      path: file.path,
      modified: file.modified,
      size: file.size,
    }));

  return files as PrinterFile[];
};

export const pausePrint = async (printer: Printer): Promise<CommandResponse> => {
  return sendPrinterCommand(printer, "PAUSE");
};

export const resumePrint = async (printer: Printer): Promise<CommandResponse> => {
  return sendPrinterCommand(printer, "RESUME");
};

export const cancelActivePrint = async (printerId: string, reason: string): Promise<CancelResponse> => {
  // This function now needs to perform two steps:
  // 1. Get printer details (since we only have the ID here)
  // 2. Send the cancel command to Moonraker
  // 3. Call the Supabase Edge Function to update the database history (which we will keep)

  // Step 1: Get printer details (using a direct Supabase query since we need the base_url)
  const { data: printer, error: dbError } = await supabase.from("printers").select("*").eq("id", printerId).single();
  if (dbError || !printer) {
    throw new Error("Printer not found.");
  }

  // Step 2: Send Cancel Command to Moonraker
  await callMoonrakerApi(printer, "/printer/print/cancel", 'POST');
  
  // Step 3: Call the Supabase Edge Function to update the database
  const { data, error } = await supabase.functions.invoke("cancel-active-print-db", {
    body: { printer_id: printerId, reason },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Database update failed after Moonraker cancel: ${error.message}`);
  }
  
  if (data.status === "error") {
    throw new Error(data.message);
  }

  return { status: "success", message: `Print job on ${printer.name} has been cancelled.` };
};

// --- Database Interaction Functions (Keep using Edge Functions for security/atomicity) ---

export const assignPrintJob = async (jobId: string, printerId: string): Promise<AssignmentResponse> => {
  const { data, error } = await supabase.functions.invoke("assign-print-job", {
    body: { job_id: jobId, printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Edge Function Invocation Error: ${error.message}`);
  }
  
  if (data.status === "error") {
    throw new Error(data.message);
  }

  return data as AssignmentResponse;
};

export const bulkAssignPrintJobs = async (jobIds: string[], printerId: string): Promise<BulkAssignmentResponse> => {
  const { data, error } = await supabase.functions.invoke("bulk-assign-jobs", {
    body: { job_ids: jobIds, printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Edge Function Invocation Error: ${error.message}`);
  }
  
  if (data.status === "error") {
    throw new Error(data.message);
  }

  return data as BulkAssignmentResponse;
};

export const startPrintJob = async (jobId: string): Promise<StartPrintResponse> => {
  // 1. Get job and printer details
  const { data: job, error: jobError } = await supabase
    .from("print_queue")
    .select(`*, printers ( base_url, api_key, name )`)
    .eq("id", jobId)
    .eq("status", "assigned")
    .single();

  if (jobError || !job || !job.printers) {
    throw new Error("Assigned job or printer details not found.");
  }

  // 2. Send Start Command to Moonraker
  const printer: Printer = { ...job.printers, id: job.printer_id!, user_id: job.user_id, connection_type: 'moonraker', is_online: true, created_at: '', webcam_url: null, cloud_printer_id: null, cloud_last_seen: null, ai_failure_detection_enabled: false };
  
  // Moonraker expects the file path relative to its configured G-Code directory.
  // We assume the file_name stored in the queue is the correct path/filename.
  const encodedFile = encodeURIComponent(job.file_name);
  
  await callMoonrakerApi(printer, `/printer/print/start?filename=${encodedFile}`, 'POST');

  // 3. Update database status to 'printing'
  const { error: updateError } = await supabase
    .from("print_queue")
    .update({ status: 'printing', assigned_at: new Date().toISOString() })
    .eq("id", jobId);

  if (updateError) {
    console.error(`Failed to update job status to printing for job ${jobId}:`, updateError);
    throw new Error(`Print started on printer, but failed to update database status: ${updateError.message}`);
  }

  return { status: "success", message: `Print started for "${job.file_name}" on ${job.printers.name}.` };
};

export const cancelPrintJob = async (jobId: string, reason: string): Promise<CancelResponse> => {
  const { data, error } = await supabase.functions.invoke("cancel-print-job", {
    body: { job_id: jobId, reason },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Edge Function Invocation Error: ${error.message}`);
  }
  
  if (data.status === "error") {
    throw new Error(data.message);
  }

  return data as CancelResponse;
};

export const handlePrintCompletion = async (printerId: string): Promise<CompletionResponse> => {
  const { data, error } = await supabase.functions.invoke("handle-print-completion", {
    body: { printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Edge Function Error: ${error.message}`);
  }
  
  if (data.status === "error") {
    throw new Error(data.message || "Print completion handling failed.");
  }

  return data as CompletionResponse;
};

export const confirmBedCleared = async (jobId: string): Promise<CommandResponse> => {
  const { data, error } = await supabase.functions.invoke("confirm-bed-cleared", {
    body: { job_id: jobId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Edge Function Invocation Error: ${error.message}`);
  }
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data as CommandResponse;
};