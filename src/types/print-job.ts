export type PrintJob = {
  id: string;
  user_id: string;
  printer_id: string;
  file_name: string;
  duration_seconds: number;
  material_used_grams: number | null;
  status: 'success' | 'failed' | 'cancelled';
  started_at: string;
  finished_at: string | null;
};