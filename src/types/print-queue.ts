export type PrintQueueItem = {
  id: string;
  user_id: string;
  file_name: string;
  status: 'pending' | 'assigned' | 'failed';
  priority: number;
  printer_id: string | null;
  created_at: string;
  assigned_at: string | null;
};