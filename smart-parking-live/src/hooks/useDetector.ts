import { useState, useCallback } from "react";
import * as detectorService from "@/services/detectorService";
import { toast } from "sonner";

interface UseDetectorReturn {
  loading: boolean;
  startDetector: (cameraId: number) => Promise<void>;
  stopDetector: (cameraId: number) => Promise<void>;
}

export const useDetector = (): UseDetectorReturn => {
  const [loading, setLoading] = useState(false);

  const startDetector = useCallback(async (cameraId: number) => {
    try {
      setLoading(true);
      await detectorService.startDetector(cameraId);
      toast.success(`Detector started for camera ${cameraId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start detector";
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopDetector = useCallback(async (cameraId: number) => {
    try {
      setLoading(true);
      await detectorService.stopDetector(cameraId);
      toast.success(`Detector stopped for camera ${cameraId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to stop detector";
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    startDetector,
    stopDetector,
  };
};
