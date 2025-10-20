import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import { Profile } from "./queries"; // Import Profile type
import { MaintenanceLog } from "@/types/maintenance";

export const deletePrinter = async (printerId: string): Promise<void> => {
  const { error } = await supabase
    .from("printers")
    .delete()
    .eq("id", printerId);

  if (error) {
    throw new Error(`Failed to delete printer: ${error.message}`);
  }
};

export const updatePrinter = async (printer: Partial<Printer>): Promise<void> => {
  const { id, ...updates } = printer;
  
  if (!id) {
    throw new Error("Printer ID is required for update.");
  }

  const { error } = await supabase
    .from("printers")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update printer: ${error.message}`);
  }
};

export const updateProfile = async (profile: Partial<Profile>): Promise<void> => {
  const { id, ...updates } = profile;
  
  if (!id) {
    throw new Error("Profile ID is required for update.");
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
};

export const updateFailureAlertStatus = async ({ alertId, status }: { alertId: string; status: string }): Promise<void> => {
  const { error } = await supabase
    .from("failure_alerts")
    .update({ status })
    .eq("id", alertId);

  if (error) {
    throw new Error(`Failed to update alert status: ${error.message}`);
  }
};

interface NewMaintenanceLog {
  printer_id: string;
  user_id: string;
  task_description: string;
  notes: string | null;
  maintenance_date: string;
}

export const insertMaintenanceLog = async (log: NewMaintenanceLog): Promise<MaintenanceLog> => {
  const { data, error } = await supabase
    .from("maintenance_log")
    .insert(log)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert maintenance log: ${error.message}`);
  }
  return data as MaintenanceLog;
};