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

export const fetchPrintJobs = async (printerId: string): Promise<PrintJob[]> => {
  const { data, error } = await supabase
    .from("print_jobs")
    .select("*")
    .eq("printer_id", printerId)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data as PrintJob[];
};