export type MaintenanceLog = {
  id: string;
  user_id: string;
  printer_id: string;
  maintenance_date: string;
  task_description: string;
  notes: string | null;
  created_at: string;
};