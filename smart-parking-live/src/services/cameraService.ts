import { apiClient } from "./api";
import { Camera, CameraFormData } from "../types/camera.types";

export const getCameras = async (): Promise<Camera[]> => {
  const response = await apiClient.get<Camera[]>("/cameras");
  return response.data;
};

export const getCamera = async (id: number): Promise<Camera> => {
  const response = await apiClient.get<Camera>(`/cameras/${id}`);
  return response.data;
};

export const createCamera = async (data: CameraFormData): Promise<Camera> => {
  const response = await apiClient.post<Camera>("/cameras", data);
  return response.data;
};

export const updateCamera = async (
  id: number,
  data: Partial<CameraFormData>
): Promise<Camera> => {
  const response = await apiClient.put<Camera>(`/cameras/${id}`, data);
  return response.data;
};

export const deleteCamera = async (id: number): Promise<void> => {
  await apiClient.delete(`/cameras/${id}`);
};
