export interface Detection {
  bbox: number[]; // [center_x, center_y, width, height] - YOLO format
  confidence: number; // 0.0 - 1.0
  class_name: string; // "car", "bus", "truck", etc.
}
