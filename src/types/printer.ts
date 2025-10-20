export type Printer = {
  id: string;
  user_id: string;
  name: string;
  connection_type: 'moonraker' | 'octoprint' | 'klipper_go' | 'obico';
  base_url: string | null;
  api_key: string | null;
  is_online: boolean;
  created_at: string;
  webcam_url: string | null;
  cloud_printer_id: string | null;
};