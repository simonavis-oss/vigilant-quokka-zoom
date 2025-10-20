import { supabase } from "@/integrations/supabase/client";

// Define the structure of the data returned by the Edge Function
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
  message: string;
}

export interface PrinterFile {
  path: string;
  modified: number;
  size: number;
}

export const getPrinterStatus = async (printerId: string): Promise<PrinterStatus> => {
  const { data, error } = await supabase.functions.invoke("printer-status", {
    body: { id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Edge Function Error: ${error.message}`);
  }
  
  if (data.error) {
    throw new Error(`Printer Status Error: ${data.error}`);
  }

  return data.data as PrinterStatus;
};

export const sendPrinterCommand = async (printerId: string, command: string): Promise<CommandResponse> => {
  const { data, error } = await supabase.functions.invoke("printer-command", {
    body: { id: printerId, command },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Edge Function Invocation Error: ${error.message}`);
  }
  
  if (data.status === "error") {
    throw new Error(data.message);
  }

  return data as CommandResponse;
};

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

export const startPrintJob = async (jobId: string): Promise<StartPrintResponse> => {
  const { data, error } = await supabase.functions.invoke("start-print-job", {
    body: { job_id: jobId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Edge Function Invocation Error: ${error.message}`);
  }
  
  if (data.status === "error") {
    throw new Error(data.message);
  }

  return data as StartPrintResponse;
};

export const cancelPrintJob = async (jobId: string, reason: string): Promise<CancelResponse> => {
  const { data, error } = await supabase.functions.invoke("cancel-print-job", {
    body: { job_id: jobId, reason },
  });

  if (error) {
    throw new Error(`Edge Function Invocation Error: ${error.message}`);
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
    throw new Error(`Edge Function Error: ${error.message}`);
  }
  
  if (data.status === "error") {
    throw new Error(data.message || "Print completion handling failed.");
  }

  return data as CompletionResponse;
};

export const pausePrint = async (printerId: string): Promise<CommandResponse> => {
  // Klipper's specific command for pausing a print.
  return sendPrinterCommand(printerId, "PAUSE");
};

export const resumePrint = async (printerId: string): Promise<CommandResponse> => {
  // Klipper's specific command for resuming a print.
  return sendPrinterCommand(printerId, "RESUME");
};

export const cancelActivePrint = async (printerId: string, reason: string): Promise<CancelResponse> => {
  const { data, error } = await supabase.functions.invoke("cancel-active-print", {
    body: { printer_id: printerId, reason },
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

export const listPrinterFiles = async (printerId: string): Promise<PrinterFile[]> => {
  const { data, error } = await supabase.functions.invoke("list-printer-files", {
    body: { id: printerId },
  });

  if (error) {
    const response = await error.context.json();
    throw new Error(response.error || `Edge Function Error: ${error.message}`);
  }
  
  if (data.error) {
    throw new Error(`List Files Error: ${data.error}`);
  }

  return data.data as PrinterFile[];
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