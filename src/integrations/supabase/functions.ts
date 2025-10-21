import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import { showError } from "@/utils/toast";

// Helper to ensure the URL has a protocol for fetch to work correctly
const ensureProtocol = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Default to http:// for local network connections if no protocol is specified
  return `http://${url}`;
};

export interface PrinterStatus {
  is_printing: boolean;
  progress: number;
  file_name: string;
  time_remaining: string;
  nozzle_temp: string;
  bed_temp: string;
  is_online: boolean; // Added explicit online status
}

export const getPrinterStatus = async (printer: Printer): Promise<PrinterStatus> => {
  const baseUrl = ensureProtocol(printer.base_url);
  try {
    const response = await fetch(`${baseUrl}/printer/objects/query?objects=print_stats,gcode_move,extruder,heater_bed`, {
      headers: printer.api_key ? { 'X-Api-Key': printer.api_key } : {},
    });

    if (!response.ok) {
      // If the HTTP request succeeds but the printer API returns an error status (e.g., 404, 500)
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    const printStats = data.result.status.print_stats;
    const gcodeMove = data.result.status.gcode_move;
    const extruder = data.result.status.extruder;
    const heaterBed = data.result.status.heater_bed;

    return {
      is_printing: printStats.state === 'printing',
      progress: printStats.progress ? Math.round(printStats.progress * 100) : 0,
      file_name: printStats.filename || 'No file',
      time_remaining: printStats.print_duration ? formatTime(printStats.print_duration) : 'N/A',
      nozzle_temp: `${Math.round(extruder.temperature)}°C / ${Math.round(extruder.target)}°C`,
      bed_temp: `${Math.round(heaterBed.temperature)}°C / ${Math.round(heaterBed.target)}°C`,
      is_online: true, // Successfully connected and got data
    };
  } catch (error) {
    console.error('Failed to fetch printer status:', error);
    // Return a default offline status object instead of throwing
    return {
      is_printing: false,
      progress: 0,
      file_name: 'Connection Failed',
      time_remaining: 'N/A',
      nozzle_temp: 'N/A',
      bed_temp: 'N/A',
      is_online: false,
    };
  }
};

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export const sendPrinterCommand = async (printer: Printer, command: string): Promise<void> => {
  const baseUrl = ensureProtocol(printer.base_url);
  const response = await fetch(`${baseUrl}/printer/gcode/script`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(printer.api_key ? { 'X-Api-Key': printer.api_key } : {}),
    },
    body: JSON.stringify({ script: command }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send command: ${response.statusText}`);
  }
};

export const listPrinterFiles = async (printer: Printer): Promise<any[]> => {
  const baseUrl = ensureProtocol(printer.base_url);
  const response = await fetch(`${baseUrl}/server/files/list?root=gcodes`, {
    headers: printer.api_key ? { 'X-Api-Key': printer.api_key } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result || [];
};

export const getBedMesh = async (printer: Printer): Promise<any> => {
  const baseUrl = ensureProtocol(printer.base_url);
  const response = await fetch(`${baseUrl}/printer/objects/query?objects=bed_mesh`, {
    headers: printer.api_key ? { 'X-Api-Key': printer.api_key } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to get bed mesh: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result.status.bed_mesh;
};

export interface TemperaturePreset {
  name: string;
  extruder: number | null;
  heater_bed: number | null;
}

export const fetchTemperaturePresets = async (printer: Printer): Promise<TemperaturePreset[]> => {
  // This would typically come from your printer configuration
  // For now, returning some common presets
  return [
    { name: "PLA", extruder: 200, heater_bed: 60 },
    { name: "PETG", extruder: 240, heater_bed: 80 },
    { name: "ABS", extruder: 250, heater_bed: 100 },
    { name: "TPU", extruder: 220, heater_bed: 50 },
  ];
};

// Client-side function to handle file upload to Moonraker
const uploadFileToPrinter = async (printer: Printer, fileName: string, storagePath: string): Promise<void> => {
  // 1. Download file from Supabase Storage
  const { data: fileBlob, error: downloadError } = await supabase.storage.from("gcode-files").download(storagePath);
  if (downloadError || !fileBlob) {
    throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
  }

  // 2. Upload file to Printer (Moonraker) via client's local network
  const baseUrl = ensureProtocol(printer.base_url);
  const formData = new FormData();
  // We need to convert the Blob to a File object to ensure the filename is correctly passed in the multipart form data
  const file = new File([fileBlob], fileName, { type: fileBlob.type });
  formData.append("file", file, fileName);

  const moonrakerUrl = `${baseUrl}/server/files/upload`;
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
};

// Client-side function to handle the entire assignment process
export const assignPrintJobClient = async (jobId: string, printerId: string): Promise<{ message: string }> => {
  // 1. Fetch job and printer details (we need storage_path and printer details)
  const { data: jobData, error: jobError } = await supabase
    .from("print_queue")
    .select(`id, file_name, storage_path, printers ( base_url, api_key, name )`)
    .eq("id", jobId)
    .single();

  if (jobError || !jobData) {
    throw new Error(`Job not found or access denied: ${jobError?.message}`);
  }
  
  const printer = jobData.printers as Printer;
  if (!printer || !jobData.storage_path) {
    throw new Error("Printer details or file path missing.");
  }

  // 2. Upload file to printer via client's local network
  await uploadFileToPrinter(printer, jobData.file_name, jobData.storage_path);

  // 3. Update database status via Edge Function (only DB update)
  const { data, error } = await supabase.functions.invoke("assign-job-db", {
    body: { job_id: jobId, printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Database Update Error: ${error.message}`);
  }

  return { message: `File uploaded and job assigned to ${printer.name}.` };
};

// New client-side function to start the print job
export const startPrintJobClient = async (jobId: string): Promise<{ message: string }> => {
  // 1. Fetch job and printer details
  const { data: jobData, error: jobError } = await supabase
    .from("print_queue")
    .select(`id, file_name, printer_id, printers ( base_url, api_key )`)
    .eq("id", jobId)
    .single();

  if (jobError || !jobData || !jobData.printer_id) {
    throw new Error(`Assigned job not found or printer ID missing: ${jobError?.message}`);
  }
  
  const printer = jobData.printers as Printer;
  if (!printer) {
    throw new Error("Printer details missing.");
  }

  // 2. Send Moonraker command to start print (assuming file is already uploaded during assignment)
  const baseUrl = ensureProtocol(printer.base_url);
  const moonrakerUrl = `${baseUrl}/printer/print/start`;
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  if (printer.api_key) {
    headers.append("X-Api-Key", printer.api_key);
  }

  const startResponse = await fetch(moonrakerUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ filename: jobData.file_name }),
  });

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    throw new Error(`Failed to start print on printer: ${errorText}`);
  }

  // 3. Update database status via Edge Function
  const { data, error } = await supabase.functions.invoke("start-print-job-db", {
    body: { job_id: jobId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Database Update Error: ${error.message}`);
  }

  return { message: `Print job "${jobData.file_name}" started successfully.` };
};


// --- Export Aliases ---
export const assignPrintJob = assignPrintJobClient;
export const startPrintJob = startPrintJobClient;


export const bulkAssignPrintJobs = async (jobIds: string[], printerId: string): Promise<{ message: string }> => {
  // Bulk assignment remains DB-only update via Edge Function for simplicity
  const { data, error } = await supabase.functions.invoke("bulk-assign-jobs", {
    body: { job_ids: jobIds, printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Bulk Assignment Error: ${error.message}`);
  }

  return data;
};

export const cancelPrintJob = async (jobId: string, reason: string): Promise<{ message: string }> => {
  const { data, error } = await supabase.functions.invoke("cancel-print-job", {
    body: { job_id: jobId, reason },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Cancellation Error: ${error.message}`);
  }

  return data;
};

export const confirmBedCleared = async (jobId: string): Promise<{ message: string }> => {
  const { data, error } = await supabase.functions.invoke("confirm-bed-cleared", {
    body: { job_id: jobId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Bed Clearance Error: ${error.message}`);
  }

  return data;
};

export interface BedClearanceResponse {
  is_clear: boolean;
  reason: string;
  snapshot_url?: string;
}

// Client-side function to check bed clearance (fetches printer details and calls Edge Function for AI)
export const checkBedClearance = async (printerId: string): Promise<BedClearanceResponse> => {
  // 1. Fetch printer details to ensure user has access (RLS handles this)
  const { data: printerData, error: printerError } = await supabase
    .from("printers")
    .select(`id, webcam_url`)
    .eq("id", printerId)
    .single();

  if (printerError || !printerData) {
    throw new Error(`Printer not found or access denied: ${printerError?.message}`);
  }

  // 2. Call Edge Function for AI analysis (which handles snapshot capture, CV analysis, and storage upload)
  const { data, error } = await supabase.functions.invoke("check-bed-clearance", {
    body: { printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Bed Clearance Check Error: ${error.message}`);
  }

  return data as BedClearanceResponse;
};

export const cancelActivePrint = async (printerId: string, reason: string): Promise<{ message: string }> => {
  // 1. Fetch printer details to get base_url and api_key
  const { data: printerData, error: printerError } = await supabase
    .from("printers")
    .select(`base_url, api_key`)
    .eq("id", printerId)
    .single();

  if (printerError || !printerData) {
    throw new Error(`Printer not found or access denied: ${printerError?.message}`);
  }

  // 2. Send Moonraker command to cancel print
  const baseUrl = ensureProtocol(printerData.base_url);
  const moonrakerUrl = `${baseUrl}/printer/print/cancel`;
  const headers = new Headers();
  if (printerData.api_key) {
    headers.append("X-Api-Key", printerData.api_key);
  }

  const cancelResponse = await fetch(moonrakerUrl, {
    method: "POST",
    headers: headers,
  });

  if (!cancelResponse.ok) {
    const errorText = await cancelResponse.text();
    throw new Error(`Failed to cancel print on printer: ${errorText}`);
  }

  // 3. Update database status via Edge Function
  const { data, error } = await supabase.functions.invoke("cancel-active-print-db", {
    body: { printer_id: printerId, reason },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Database Update Error: ${error.message}`);
  }

  return data;
};

export const handlePrintCompletion = async (printerId: string): Promise<{ 
  status: string; 
  message: string;
  completedJob?: any;
}> => {
  const { data, error } = await supabase.functions.invoke("handle-print-completion", {
    body: { printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Print Completion Error: ${error.message}`);
  }

  return data;
};

export const analyzePrintFailure = async (printerId: string): Promise<{
  is_failure: boolean;
  confidence: number;
  failure_type?: string;
  screenshot_url?: string;
  requires_action: boolean;
}> => {
  const { data, error } = await supabase.functions.invoke("analyze-print-failure", {
    body: { printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `AI Analysis Error: ${error.message}`);
  }
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};