import { supabase } from "@/integrations/supabase/client";
import { PrintJob } from "@/types/print-job";
import { PrintQueueItem } from "@/types/print-queue";
import { Printer } from "@/types/printer";
import { subDays } from "date-fns";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

export const fetchPrinters = async (userId: string): Promise<Printer[]> => {
  const { data, error } = await supabase
    .from("printers")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
  return data as Printer[];
};

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
    throw new Error("Profile not found.");
  }
  return data as Profile;
};

const mockPrintJobs: PrintJob[] = [
  { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", user_id: "mock-user-id", printer_id: "mock-printer-id", file_name: "Dragon_Vase.gcode", duration_seconds: 18000, material_used_grams: 150.50, status: 'success', started_at: new Date(Date.now() - 86400000).toISOString(), finished_at: new Date(Date.now() - 86400000 + 18000000).toISOString() },
  { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12", user_id: "mock-user-id", printer_id: "mock-printer-id", file_name: "Gear_Set_v2.gcode", duration_seconds: 7200, material_used_grams: 45.20, status: 'failed', started_at: new Date(Date.now() - 3 * 86400000).toISOString(), finished_at: new Date(Date.now() - 3 * 86400000 + 7200000).toISOString() },
  { id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13", user_id: "mock-user-id", printer_id: "mock-printer-id", file_name: "Phone_Stand.gcode", duration_seconds: 10800, material_used_grams: 88.00, status: 'cancelled', started_at: new Date(Date.now() - 7 * 86400000).toISOString(), finished_at: null },
];

export const fetchPrintJobs = async (printerId: string): Promise<PrintJob[]> => {
  const { data, error } = await supabase.from("print_jobs").select("*").eq("printer_id", printerId).order("started_at", { ascending: false });
  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    return mockPrintJobs.map(job => ({ ...job, printer_id: printerId }));
  }
  return data as PrintJob[];
};

const mockPrintQueue: PrintQueueItem[] = [
  { id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11", user_id: "mock-user-id", file_name: "New_Part_A.gcode", status: 'pending', priority: 10, printer_id: null, created_at: new Date(Date.now() - 3600000).toISOString(), assigned_at: null, printers: null },
  { id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12", user_id: "mock-user-id", file_name: "Large_Support_Structure.gcode", status: 'pending', priority: 5, printer_id: null, created_at: new Date(Date.now() - 7200000).toISOString(), assigned_at: null, printers: null },
  { id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13", user_id: "mock-user-id", file_name: "Assigned_Job_B.gcode", status: 'assigned', priority: 1, printer_id: "some-printer-id", created_at: new Date(Date.now() - 10800000).toISOString(), assigned_at: new Date(Date.now() - 1800000).toISOString(), printers: { name: "Mock Printer 1" } },
];

export const fetchPrintQueue = async (userId: string): Promise<PrintQueueItem[]> => {
  const { data, error } = await supabase.from("print_queue").select(`*, printers ( name )`).eq("user_id", userId).order("priority", { ascending: false }).order("created_at", { ascending: true });
  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    return mockPrintQueue.map(job => ({ ...job, user_id: userId }));
  }
  return data as PrintQueueItem[];
};

const mockAllUserJobs: PrintJob[] = [
  // Last 7 days of mock data
  { id: "job-1", user_id: "mock", printer_id: "p1", file_name: "file1.gcode", duration_seconds: 3600, status: 'success', started_at: subDays(new Date(), 1).toISOString(), finished_at: new Date().toISOString() },
  { id: "job-2", user_id: "mock", printer_id: "p2", file_name: "file2.gcode", duration_seconds: 7200, status: 'success', started_at: subDays(new Date(), 1).toISOString(), finished_at: new Date().toISOString() },
  { id: "job-3", user_id: "mock", printer_id: "p1", file_name: "file3.gcode", duration_seconds: 1800, status: 'failed', started_at: subDays(new Date(), 2).toISOString(), finished_at: new Date().toISOString() },
  { id: "job-4", user_id: "mock", printer_id: "p1", file_name: "file4.gcode", duration_seconds: 9000, status: 'success', started_at: subDays(new Date(), 3).toISOString(), finished_at: new Date().toISOString() },
  { id: "job-5", user_id: "mock", printer_id: "p2", file_name: "file5.gcode", duration_seconds: 5400, status: 'success', started_at: subDays(new Date(), 4).toISOString(), finished_at: new Date().toISOString() },
  { id: "job-6", user_id: "mock", printer_id: "p1", file_name: "file6.gcode", duration_seconds: 3600, status: 'cancelled', started_at: subDays(new Date(), 5).toISOString(), finished_at: new Date().toISOString() },
  { id: "job-7", user_id: "mock", printer_id: "p2", file_name: "file7.gcode", duration_seconds: 10800, status: 'success', started_at: subDays(new Date(), 6).toISOString(), finished_at: new Date().toISOString() },
  { id: "job-8", user_id: "mock", printer_id: "p1", file_name: "file8.gcode", duration_seconds: 1200, status: 'success', started_at: subDays(new Date(), 6).toISOString(), finished_at: new Date().toISOString() },
];

export const fetchAllPrintJobsForUser = async (userId: string): Promise<PrintJob[]> => {
  const { data, error } = await supabase
    .from("print_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  
  if (!data || data.length === 0) {
    return mockAllUserJobs.map(job => ({ ...job, user_id: userId }));
  }
  
  return data as PrintJob[];
};