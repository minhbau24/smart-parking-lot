export enum SlotStatus {
  EMPTY = "empty",
  OCCUPIED = "occupied",
  RESERVED = "reserved",
  DISABLED = "disabled",
}

export interface Slot {
  id: number;
  camera_id: number;
  label: string; // "A-01", "B-12", etc.
  polygon: number[][]; // [[x, y], [x, y], ...] - coordinates in original video size
  status: SlotStatus;
  last_changed_at: string;
  created_at: string;
  updated_at: string;
}

export interface SlotFormData {
  camera_id: number;
  label: string;
  polygon: number[][];
}
