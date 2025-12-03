import { useEffect, useRef, useState } from "react";
import { Camera } from "@/types/camera.types";
import { Detection } from "@/types/detection.types";
import { Slot, SlotStatus } from "@/types/slot.types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Square, Eye, EyeOff } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDetector } from "@/hooks/useDetector";

interface LiveViewProps {
  camera: Camera;
  onStatsUpdate?: (totalSlots: number, emptySlots: number, occupiedSlots: number) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const LiveView = ({ camera, onStatsUpdate }: LiveViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLImageElement>(null);
  const [showDetections, setShowDetections] = useState(true);
  const [showSlots, setShowSlots] = useState(true);
  const [detectorRunning, setDetectorRunning] = useState(false);

  const { isConnected, detections, slots } = useWebSocket(camera.id);
  const { loading: detectorLoading, startDetector, stopDetector } = useDetector();

  const streamUrl = `${API_BASE_URL}/stream/${camera.id}`;

  // Auto-start detector when component mounts
  useEffect(() => {
    const initDetector = async () => {
      try {
        await startDetector(camera.id);
        setDetectorRunning(true);
      } catch (error) {
        console.error("Failed to start detector:", error);
      }
    };

    initDetector();

    return () => {
      // Optional: stop detector on unmount
      // stopDetector(camera.id);
    };
  }, [camera.id, startDetector]);

  // Handle detector control
  const handleDetectorToggle = async () => {
    try {
      if (detectorRunning) {
        await stopDetector(camera.id);
        setDetectorRunning(false);
      } else {
        await startDetector(camera.id);
        setDetectorRunning(true);
      }
    } catch (error) {
      console.error("Failed to toggle detector:", error);
    }
  };

  // Resize canvas to match video
  useEffect(() => {
    const resizeCanvas = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.complete && video.naturalWidth > 0) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener("load", resizeCanvas);
      window.addEventListener("resize", resizeCanvas);
    }

    return () => {
      if (video) {
        video.removeEventListener("load", resizeCanvas);
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // Update parent stats when slots change
  useEffect(() => {
    if (onStatsUpdate) {
      const totalSlots = slots.length;
      const emptySlots = slots.filter((s) => s.status === SlotStatus.EMPTY).length;
      const occupiedSlots = slots.filter((s) => s.status === SlotStatus.OCCUPIED).length;
      onStatsUpdate(totalSlots, emptySlots, occupiedSlots);
    }
  }, [slots, onStatsUpdate]);

  // Render overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.complete || video.naturalWidth === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / video.naturalWidth;
    const scaleY = canvas.height / video.naturalHeight;

    // Draw detection boxes (red)
    if (showDetections && detections.length > 0) {
      detections.forEach((detection) => {
        drawDetectionBox(ctx, detection, scaleX, scaleY);
      });
    }

    // Draw slot polygons (green/red)
    if (showSlots && slots.length > 0) {
      slots.forEach((slot) => {
        drawSlotPolygon(ctx, slot, scaleX, scaleY);
      });
    }
  }, [detections, slots, showDetections, showSlots]);

  const drawDetectionBox = (
    ctx: CanvasRenderingContext2D,
    detection: Detection,
    scaleX: number,
    scaleY: number
  ) => {
    const [centerX, centerY, width, height] = detection.bbox;

    // Convert YOLO format (center_x, center_y, w, h) to (x, y, w, h)
    const x = (centerX - width / 2) * scaleX;
    const y = (centerY - height / 2) * scaleY;
    const w = width * scaleX;
    const h = height * scaleY;

    // Draw box
    ctx.strokeStyle = "#EF4444"; // Red
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Draw semi-transparent fill
    ctx.fillStyle = "rgba(239, 68, 68, 0.1)";
    ctx.fillRect(x, y, w, h);

    // Label is hidden - only show bounding box
    // Uncomment below to show detection class name and confidence
    // const label = `${detection.class_name} ${(detection.confidence * 100).toFixed(0)}%`;
    // ctx.font = "bold 14px Arial";
    // const textMetrics = ctx.measureText(label);
    // const textHeight = 20;
    // const padding = 4;
    // ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
    // ctx.fillRect(x, y - textHeight - padding, textMetrics.width + padding * 2, textHeight);
    // ctx.fillStyle = "#FFFFFF";
    // ctx.fillText(label, x + padding, y - padding - 4);
  };

  const drawSlotPolygon = (
    ctx: CanvasRenderingContext2D,
    slot: Slot,
    scaleX: number,
    scaleY: number
  ) => {
    if (!slot.polygon || slot.polygon.length < 3) return;

    const isOccupied = slot.status === SlotStatus.OCCUPIED;

    // Draw polygon
    ctx.beginPath();
    const firstPoint = slot.polygon[0];
    ctx.moveTo(firstPoint[0] * scaleX, firstPoint[1] * scaleY);

    for (let i = 1; i < slot.polygon.length; i++) {
      ctx.lineTo(slot.polygon[i][0] * scaleX, slot.polygon[i][1] * scaleY);
    }
    ctx.closePath();

    // Style based on status
    if (isOccupied) {
      ctx.strokeStyle = "#EF4444"; // Red
      ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
    } else {
      ctx.strokeStyle = "#22C55E"; // Green
      ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
    }

    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();

    // Draw slot label
    const centerX =
      slot.polygon.reduce((sum, p) => sum + p[0], 0) / slot.polygon.length;
    const centerY =
      slot.polygon.reduce((sum, p) => sum + p[1], 0) / slot.polygon.length;

    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Text outline
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeText(slot.label, centerX * scaleX, centerY * scaleY);

    // Text fill
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(slot.label, centerX * scaleX, centerY * scaleY);
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-muted/50 px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {camera.name}
            </h2>
            <p className="text-sm text-muted-foreground">{camera.location}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Connection Status */}
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${isConnected ? "bg-white" : "bg-muted-foreground"
                    }`}
                ></span>
              </span>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>

            {/* Detector Control */}
            <Button
              size="sm"
              variant={detectorRunning ? "destructive" : "default"}
              onClick={handleDetectorToggle}
              disabled={detectorLoading}
              className="gap-1"
            >
              {detectorRunning ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start
                </>
              )}
            </Button>

            {/* Toggle Detections */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetections(!showDetections)}
              className="gap-1"
            >
              {showDetections ? (
                <>
                  <Eye className="h-4 w-4" />
                  Boxes
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Boxes
                </>
              )}
            </Button>

            {/* Toggle Slots */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSlots(!showSlots)}
              className="gap-1"
            >
              {showSlots ? (
                <>
                  <Eye className="h-4 w-4" />
                  Slots
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Slots
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Video Stream with Canvas Overlay */}
      <div className="relative aspect-video bg-black">
        {/* MJPEG Stream */}
        <img
          ref={videoRef}
          src={streamUrl}
          alt={`Camera ${camera.name}`}
          className="absolute inset-0 h-full w-full object-contain"
          onError={(e) => {
            console.error("Failed to load video stream:", e);
          }}
        />

        {/* Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ pointerEvents: "none" }}
        />
      </div>

      {/* Stats Footer */}
      <div className="border-t border-border bg-muted/30 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4">
            <span className="text-muted-foreground">
              Detections: <strong className="text-foreground">{detections.length}</strong>
            </span>
            <span className="text-muted-foreground">
              Slots: <strong className="text-foreground">{slots.length}</strong>
            </span>
            <span className="text-muted-foreground">
              Occupied:{" "}
              <strong className="text-destructive">
                {slots.filter((s) => s.status === SlotStatus.OCCUPIED).length}
              </strong>
            </span>
            <span className="text-muted-foreground">
              Available:{" "}
              <strong className="text-success">
                {slots.filter((s) => s.status === SlotStatus.EMPTY).length}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
