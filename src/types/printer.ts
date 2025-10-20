export type Printer = {
  id: string;
  user_id: string;
  name: string;
  connection_type: 'moonraker' | 'cloud_agent';
  base_url: string;
  api_key: string | null;
  is_online: boolean;
  created_at: string;
  webcam_url: string | null;
  cloud_printer_id: string | null;
  cloud_last_seen: string | null;
};