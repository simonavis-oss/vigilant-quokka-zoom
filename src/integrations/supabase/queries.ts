import { supabase } from "@/integrations/supabase/client";
import { PrintJob } from "@/types/print-job";
import { PrintQueueItem } from "@/types/print-queue";
import { Printer } from "@/types/printer";

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

export const fetchPrintJobs = async (printerId: string): Promise<PrintJob[]> => {
  const { data, error } = await supabase
    .from("print_jobs")
    .select("*")
    .eq("printer_id", printerId)
    .order("started_at", { ascending: false });

  if (error) {
    // Allow empty results without throwing an error
    if (error.code === 'PGRST116') {
      return [];
    }
    throw new Error(error.message);
  }
  return data as PrintJob[];
};

export const fetchPrintQueue = async (userId: string): Promise<PrintQueueItem[]> => {
  const { data, error } = await supabase
    .from("print_queue")
    .select(`*, printers ( name )`)
    .eq("user_id", userId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === 'PGRST116') {
      return [];
    }
    throw new Error(error.message);
  }
  return data as PrintQueueItem[];
};

export const fetchAllPrintJobsForUser = async (userId: string): Promise<PrintJob[]> => {
  const { data, error } = await supabase
    .from("print_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    if (error.code === 'PGRST116') {
      return [];
    }
    throw new Error(error.message);
  }
  
  return data as PrintJob[];
};

export const fetchTotalPrintTime = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from("print_jobs")
    .select("duration_seconds")
    .eq("user_id", userId)
    .eq("status", "success");

  if (error) {
    if (error.code === 'PGRST116') {
      return 0;
    }
    throw new Error(error.message);
  }

  if (!data) {
    return 0;
  }

  const totalSeconds = data.reduce((sum, job) => sum + (job.duration_seconds || 0), 0);
  return totalSeconds;
};