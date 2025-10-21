export type Material = {
  id: string;
  user_id: string;
  name: string;
  type: string; // e.g., PLA, PETG, ABS
  color: string | null;
  density_g_cm3: number;
  cost_per_kg: number;
  created_at: string;
};