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