import { supabase } from "@/integrations/supabase/client";

// Define the structure of the data returned by the Edge Function
export interface PrinterStatus {
  is_printing: boolean;
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
  completedJobName?: string;
  startedJobName?: string | null;
}

export const getPrinterStatus = async (printerId: string): Promise<PrinterStatus> => {
  const { data, error } = await supabase.functions.invoke("printer-status", {
    body: { id: printerId },
  });

  if (error) {
    throw new Error(`Edge Function Error: ${error.message}`);
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
    if (error.message.includes("non-2xx status code")) {
      throw new Error(`Command failed. The printer API may be unreachable or the command was rejected.`);
    }
    throw new Error(`Edge Function Invocation Error: ${error.message}`);
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

export const cancelPrintJob = async (jobId: string): Promise<CancelResponse> => {
  const { data, error } = await supabase.functions.invoke("cancel-print-job", {
    body: { job_id: jobId },
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