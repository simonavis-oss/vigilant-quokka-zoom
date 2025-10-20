import { supabase } from "@/integrations/supabase/client";

export const deletePrinter = async (printerId: string): Promise<void> => {
  const { error } = await supabase
    .from("printers")
    .delete()
    .eq("id", printerId);

  if (error) {
    throw new Error(`Failed to delete printer: ${error.message}`);
  }
};