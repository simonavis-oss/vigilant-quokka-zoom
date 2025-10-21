import { supabase } from "@/integrations/supabase/client";
import { PrintQueueItem } from "@/types/print-queue";

interface NewPrintJob {
  user_id: string;
  file_name: string;
  storage_path: string; // Added storage_path
  priority?: number;
}

export const insertPrintJob = async (job: NewPrintJob): Promise<PrintQueueItem> => {
  const { data, error } = await supabase
    .from("print_queue")
    .insert({
      user_id: job.user_id,
      file_name: job.file_name,
      storage_path: job.storage_path, // Add storage_path to insert
      priority: job.priority || 0,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add job to queue: ${error.message}`);
  }
  
  return data as PrintQueueItem;
};

export const insertMultiplePrintJobs = async (jobs: NewPrintJob[]): Promise<PrintQueueItem[]> => {
  const jobsToInsert = jobs.map(job => ({
    user_id: job.user_id,
    file_name: job.file_name,
    storage_path: job.storage_path, // Add storage_path to insert
    priority: job.priority || 0,
    status: 'pending' as const,
  }));

  const { data, error } = await supabase
    .from("print_queue")
    .insert(jobsToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to add jobs to queue: ${error.message}`);
  }
  
  return data as PrintQueueItem[];
};