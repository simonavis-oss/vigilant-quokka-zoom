export type PrintQueueItem = {
  id: string;
  user_id: string;
  file_name: string;
  status: 'pending' | 'assigned' | 'printing' | 'failed' | 'completed';
  priority: number;
  printer_id: string | null;
  created_at: string;
  assigned_at: string | null;
  printers: {
    name: string;
  } | null;
};