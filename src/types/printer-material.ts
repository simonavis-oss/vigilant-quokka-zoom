import { Material } from './material';

export type PrinterMaterial = {
  id: string;
  printer_id: string;
  material_id: string;
  slot_number: number;
  user_id: string;
  materials: Material; // Joined data
};