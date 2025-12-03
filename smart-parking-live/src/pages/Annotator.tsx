import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { SlotAnnotator } from "@/components/SlotAnnotator";
import { Camera } from "@/types/camera.types";
import { PenTool, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const Annotator = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cameraId = searchParams.get("camera");

  useEffect(() => {
    const loadCamera = async () => {
      if (!cameraId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/cameras/${cameraId}`);
        if (!response.ok) throw new Error("Camera not found");

        const data = await response.json();
        setCamera(data);
        setError(null);
      } catch (err) {
        setError("Failed to load camera information");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCamera();
  }, [cameraId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!cameraId || !camera) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Slot Annotator</h1>
          <p className="text-muted-foreground">
            Draw parking slot polygons on camera frames
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No camera selected. Please select a camera from the Cameras page and click
            "Annotate Slots" to start drawing parking slot polygons.
          </AlertDescription>
        </Alert>

        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <PenTool className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-foreground">
              Slot Annotation Tool
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Click on a camera from the Cameras page to start annotating parking slots.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Slot Annotator</h1>
          <p className="text-muted-foreground">Error loading camera</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Slot Annotator</h1>
        <p className="text-muted-foreground">
          Draw parking slot polygons on camera frames
        </p>
      </div>

      <SlotAnnotator camera={camera} onBack={() => navigate("/cameras")} />
    </div>
  );
};

export default Annotator;
