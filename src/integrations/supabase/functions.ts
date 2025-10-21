import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import { showError } from "@/utils/toast";

export interface PrinterStatus {
  is_printing: boolean;
  progress: number;
  file_name: string;
  time_remaining: string;
  nozzle_temp: string;
  bed_temp: string;
}

export const getPrinterStatus = async (printer: Printer): Promise<PrinterStatus> => {
  try {
    const response = await fetch(`${printer.base_url}/printer/objects/query?objects=print_stats,gcode_move,extruder,heater_bed`, {
      headers: printer.api_key ? { 'X-Api-Key': printer.api_key } : {},
    });

    if (!response.ok) {
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
    };
  } catch (error) {
    console.error('Failed to fetch printer status:', error);
    throw new Error('Failed to connect to printer');
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
  const response = await fetch(`${printer.base_url}/printer/gcode/script`, {
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
  const response = await fetch(`${printer.base_url}/server/files/list?root=gcodes`, {
    headers: printer.api_key ? { 'X-Api-Key': printer.api_key } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result || [];
};

export const getBedMesh = async (printer: Printer): Promise<any> => {
  const response = await fetch(`${printer.base_url}/printer/objects/query?objects=bed_mesh`, {
    headers: printer.api_key ? { 'X-Api-Key': printer.api_key } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to get bed mesh: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result.status.bed_mesh;
};

export const fetchTemperaturePresets = async (printer: Printer): Promise<any[]> => {
  // This would typically come from your printer configuration
  // For now, returning some common presets
  return [
    { name: "PLA", extruder: 200, heater_bed: 60 },
    { name: "PETG", extruder: 240, heater_bed: 80 },
    { name: "ABS", extruder: 250, heater_bed: 100 },
    { name: "TPU", extruder: 220, heater_bed: 50 },
  ];
};

export const assignPrintJob = async (jobId: string, printerId: string): Promise<{ message: string }> => {
  const { data, error } = await supabase.functions.invoke("assign-print-job", {
    body: { job_id: jobId, printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Assignment Error: ${error.message}`);
  }

  return data;
};

export const bulkAssignPrintJobs = async (jobIds: string[], printerId: string): Promise<{ message: string }> => {
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

export const startPrintJob = async (jobId: string): Promise<{ message: string }> => {
  const { data, error } = await supabase.functions.invoke("start-print-job", {
    body: { job_id: jobId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Start Print Error: ${error.message}`);
  }

  return data;
};

export const checkBedClearance = async (printerId: string): Promise<{
  is_clear: boolean;
  reason: string;
  snapshot_url?: string;
}> => {
  const { data, error } = await supabase.functions.invoke("check-bed-clearance", {
    body: { printer_id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Bed Clearance Check Error: ${error.message}`);
  }

  return data;
};

export const cancelActivePrint = async (printerId: string, reason: string): Promise<{ message: string }> => {
  const { data, error } = await supabase.functions.invoke("cancel-active-print-db", {
    body: { printer_id: printerId, reason },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Cancel Print Error: ${error.message}`);
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

// Add this to your existing functions.ts file
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