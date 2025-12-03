import { apiClient } from "./api";

export interface DetectorStatus {
  camera_id: number;
  running: boolean;
  frame_id?: number;
  processed_frames?: number;
}

export const startDetector = async (cameraId: number): Promise<unknown> => {
  const response = await apiClient.post(`/detectors/${cameraId}/start`, {
    model_path: "checkpoint_last.pt",
  });
  return response.data;
};

export const stopDetector = async (cameraId: number): Promise<unknown> => {
  const response = await apiClient.delete(`/detectors/${cameraId}/stop`);
  return response.data;
};

export const getDetectorStatus = async (
  cameraId: number
): Promise<DetectorStatus> => {
  const response = await apiClient.get<DetectorStatus>(
    `/detectors/${cameraId}/status`
  );
  return response.data;
};
