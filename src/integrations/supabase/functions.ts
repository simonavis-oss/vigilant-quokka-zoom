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
    // If the Edge Function returns a non-2xx status (e.g., 500 on mock failure), 
    // the client throws a generic error. We catch it here and provide a clearer message.
    // The Edge Function is designed to return a 500 status on mock failure (see step 6 in index.ts).
    if (error.message.includes("non-2xx status code")) {
      throw new Error(`Command failed. The printer API may be unreachable or the command was rejected.`);
    }
    throw new Error(`Edge Function Invocation Error: ${error.message}`);
  }
  
  if (data.status === "error") {
    // This handles cases where the Edge Function returns a 200 status but contains an application error payload.
    throw new Error(data.message);
  }

  return data as CommandResponse;
};

export const assignPrintJob = async (jobId: string): Promise<AssignmentResponse> => {
  const { data, error } = await supabase.functions.invoke("assign-print-job", {
    body: { job_id: jobId },
  });

  if (error) {
    if (error.message.includes("non-2xx status code")) {
      throw new Error(`Assignment failed. No available printers or API error.`);
    }
    throw new Error(`Edge Function Invocation Error: ${error.message}`);
  }
  
  if (data.status === "error") {
    throw new Error(data.message);
  }

  return data as AssignmentResponse;
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