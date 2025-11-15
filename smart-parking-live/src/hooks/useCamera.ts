import { useState, useCallback, useEffect } from "react";
import { Camera, CameraFormData } from "../types/camera.types";
import * as cameraService from "../services/cameraService";
import { toast } from "sonner";

interface UseCameraReturn {
  cameras: Camera[];
  loading: boolean;
  error: string | null;
  fetchCameras: () => Promise<void>;
  createCamera: (data: CameraFormData) => Promise<Camera | undefined>;
  updateCamera: (id: number, data: Partial<CameraFormData>) => Promise<Camera | undefined>;
  deleteCamera: (id: number) => Promise<void>;
}

export const useCamera = (): UseCameraReturn => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cameraService.getCameras();
      setCameras(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch cameras";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCamera = useCallback(async (data: CameraFormData) => {
    try {
      setLoading(true);
      setError(null);
      const newCamera = await cameraService.createCamera(data);
      setCameras((prev) => [...prev, newCamera]);
      toast.success("Camera created successfully");
      return newCamera;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create camera";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCamera = useCallback(
    async (id: number, data: Partial<CameraFormData>) => {
      try {
        setLoading(true);
        setError(null);
        const updatedCamera = await cameraService.updateCamera(id, data);
        setCameras((prev) =>
          prev.map((cam) => (cam.id === id ? updatedCamera : cam))
        );
        toast.success("Camera updated successfully");
        return updatedCamera;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update camera";
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteCamera = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await cameraService.deleteCamera(id);
      setCameras((prev) => prev.filter((cam) => cam.id !== id));
      toast.success("Camera deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete camera";
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  return {
    cameras,
    loading,
    error,
    fetchCameras,
    createCamera,
    updateCamera,
    deleteCamera,
  };
};
