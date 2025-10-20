import { supabase } from "@/integrations/supabase/client";
import { PrintJob } from "@/types/print-job";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

export const fetchProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, updated_at")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    // This should ideally not happen if the trigger works, but we handle it.
    throw new Error("Profile not found.");
  }
  return data as Profile;
};

// Mock data for demonstration purposes
const mockPrintJobs: PrintJob[] = [
  {
    id: "mock-1",
    user_id: "mock-user-id",
    printer_id: "mock-printer-id",
    file_name: "Dragon_Vase.gcode",
    duration_seconds: 18000, // 5 hours
    material_used_grams: 150.50,
    status: 'success',
    started_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    finished_at: new Date(Date.now() - 86400000 + 18000000).toISOString(),
  },
  {
    id: "mock-2",
    user_id: "mock-user-id",
    printer_id: "mock-printer-id",
    file_name: "Gear_Set_v2.gcode",
    duration_seconds: 7200, // 2 hours
    material_used_grams: 45.20,
    status: 'failed',
    started_at: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    finished_at: new Date(Date.now() - 3 * 86400000 + 7200000).toISOString(),
  },
  {
    id: "mock-3",
    user_id: "mock-user-id",
    printer_id: "mock-printer-id",
    file_name: "Phone_Stand.gcode",
    duration_seconds: 10800, // 3 hours
    material_used_grams: 88.00,
    status: 'cancelled',
    started_at: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    finished_at: null,
  },
];


export const fetchPrintJobs = async (printerId: string): Promise<PrintJob[]> => {
  const { data, error } = await supabase
    .from("print_jobs")
    .select("*")
    .eq("printer_id", printerId)
    .order("started_at", { ascending: false });

  if (error) {
    // If there's a real database error (not just empty data), throw it.
    if (error.code !== 'PGRST116') { // PGRST116 is "No rows found"
      throw new Error(error.message);
    }
  }
  
  // If no data is returned from the DB, return mock data for demonstration
  if (!data || data.length === 0) {
    // Filter mock data to only show if the printer ID matches the mock ID, 
    // or if the user has no printers yet (to avoid showing mock data for every real printer)
    // For simplicity, we will just return the mock data if the DB is empty for this printer.
    return mockPrintJobs.map(job => ({ ...job, printer_id: printerId }));
  }
  
  return data as PrintJob[];
};