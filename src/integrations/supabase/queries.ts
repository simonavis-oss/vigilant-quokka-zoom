import { supabase } from "@/integrations/supabase/client";
import { PrintJob } from "@/types/print-job";
import { PrintQueueItem } from "@/types/print-queue"; // Import new type

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
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
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
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
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
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
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

// Mock data for print queue
const mockPrintQueue: PrintQueueItem[] = [
  {
    id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11",
    user_id: "mock-user-id",
    file_name: "New_Part_A.gcode",
    status: 'pending',
    priority: 10,
    printer_id: null,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    assigned_at: null,
    printers: null,
  },
  {
    id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12",
    user_id: "mock-user-id",
    file_name: "Large_Support_Structure.gcode",
    status: 'pending',
    priority: 5,
    printer_id: null,
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    assigned_at: null,
    printers: null,
  },
  {
    id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13",
    user_id: "mock-user-id",
    file_name: "Assigned_Job_B.gcode",
    status: 'assigned',
    priority: 1,
    printer_id: "some-printer-id",
    created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    assigned_at: new Date(Date.now() - 1800000).toISOString(),
    printers: { name: "Mock Printer 1" },
  },
];

export const fetchPrintQueue = async (userId: string): Promise<PrintQueueItem[]> => {
  const { data, error } = await supabase
    .from("print_queue")
    .select(`
      *,
      printers ( name )
    `)
    .eq("user_id", userId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code !== 'PGRST116') {
      throw new Error(error.message);
    }
  }
  
  if (!data || data.length === 0) {
    // Return mock data if DB is empty
    return mockPrintQueue.map(job => ({ ...job, user_id: userId }));
  }
  
  return data as PrintQueueItem[];
};