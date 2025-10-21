import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import { Profile } from "./queries";
import { MaintenanceLog } from "@/types/maintenance";
import { PrinterMacro } from "@/types/printer-macro";
import { Material } from "@/types/material";

export const deletePrinter = async (printerId: string): Promise<void> => {
  const { error } = await supabase.from("printers").delete().eq("id", printerId);
  if (error) throw new Error(`Failed to delete printer: ${error.message}`);
};

export const updatePrinter = async (printer: Partial<Printer>): Promise<void> => {
  const { id, ...updates } = printer;
  if (!id) throw new Error("Printer ID is required for update.");
  const { error } = await supabase.from("printers").update(updates).eq("id", id);
  if (error) throw new Error(`Failed to update printer: ${error.message}`);
};

export const updateProfile = async (profile: Partial<Profile>): Promise<void> => {
  const { id, ...updates } = profile;
  if (!id) throw new Error("Profile ID is required for update.");
  const { error } = await supabase.from("profiles").update(updates).eq("id", id);
  if (error) throw new Error(`Failed to update profile: ${error.message}`);
};

export const updateFailureAlertStatus = async ({ alertId, status }: { alertId: string; status: string }): Promise<void> => {
  const { error } = await supabase.from("failure_alerts").update({ status }).eq("id", alertId);
  if (error) throw new Error(`Failed to update alert status: ${error.message}`);
};

interface NewMaintenanceLog { printer_id: string; user_id: string; task_description: string; notes: string | null; maintenance_date: string; }
export const insertMaintenanceLog = async (log: NewMaintenanceLog): Promise<MaintenanceLog> => {
  const { data, error } = await supabase.from("maintenance_log").insert(log).select().single();
  if (error) throw new Error(`Failed to insert maintenance log: ${error.message}`);
  return data as MaintenanceLog;
};

interface NewPrinterMacro { printer_id: string; user_id: string; name: string; gcode: string; }
export const insertPrinterMacro = async (macro: NewPrinterMacro): Promise<PrinterMacro> => {
  const { data, error } = await supabase.from("printer_macros").insert(macro).select().single();
  if (error) throw new Error(`Failed to insert macro: ${error.message}`);
  return data as PrinterMacro;
};

export const deletePrinterMacro = async (macroId: string): Promise<void> => {
  const { error } = await supabase.from("printer_macros").delete().eq("id", macroId);
  if (error) throw new Error(`Failed to delete macro: ${error.message}`);
};

interface NewMaterial { user_id: string; name: string; type: string; color: string | null; density_g_cm3: number; cost_per_kg: number; }
export const insertMaterial = async (material: NewMaterial): Promise<Material> => {
  const { data, error } = await supabase.from("materials").insert(material).select().single();
  if (error) throw new Error(`Failed to insert material: ${error.message}`);
  return data as Material;
};

export const updateMaterial = async (material: Partial<Material>): Promise<void> => {
  const { id, ...updates } = material;
  if (!id) throw new Error("Material ID is required for update.");
  const { error } = await supabase.from("materials").update(updates).eq("id", id);
  if (error) throw new Error(`Failed to update material: ${error.message}`);
};

export const deleteMaterial = async (materialId: string): Promise<void> => {
  const { error } = await supabase.from("materials").delete().eq("id", materialId);
  if (error) throw new Error(`Failed to delete material: ${error.message}`);
};

interface AssignMaterialParams { printer_id: string; material_id: string; slot_number: number; user_id: string; }
export const assignMaterialToSlot = async (params: AssignMaterialParams) => {
  const { error } = await supabase.from("printer_materials").upsert(
    { ...params },
    { onConflict: 'printer_id, slot_number' }
  );
  if (error) throw new Error(`Failed to assign material: ${error.message}`);
};

export const clearMaterialFromSlot = async (printerMaterialId: string) => {
  const { error } = await supabase.from("printer_materials").delete().eq("id", printerMaterialId);
  if (error) throw new Error(`Failed to clear material slot: ${error.message}`);
};