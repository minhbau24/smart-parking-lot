export enum CameraStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
}

export enum SourceType {
  WEBCAM = "webcam",
  RTSP = "rtsp",
  FILE = "file",
  HTTP = "http",
}

export interface Camera {
  id: number;
  name: string;
  location: string;
  source_type: SourceType;
  stream_url: string;
  status: CameraStatus;
  homography_matrix?: number[][];
  created_at: string;
  updated_at: string;
}

export interface CameraFormData {
  name: string;
  location?: string;
  source_type: SourceType;
  stream_url: string;
}
