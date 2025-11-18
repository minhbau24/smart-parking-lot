import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, ParkingCircle, AlertCircle, Activity } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { LiveView } from "@/components/LiveView";

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { cameras, loading } = useCamera();

  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [totalSlots, setTotalSlots] = useState(0);
  const [emptySlots, setEmptySlots] = useState(0);
  const [occupiedSlots, setOccupiedSlots] = useState(0);

  // Get camera from URL or default to first camera
  useEffect(() => {
    const cameraParam = searchParams.get("camera");
    if (cameraParam) {
      setSelectedCameraId(parseInt(cameraParam));
    } else if (cameras.length > 0 && !selectedCameraId) {
      setSelectedCameraId(cameras[0].id);
    }
  }, [cameras, searchParams, selectedCameraId]);

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId);

  const handleCameraChange = (value: string) => {
    const cameraId = parseInt(value);
    setSelectedCameraId(cameraId);
    setSearchParams({ camera: cameraId.toString() });
  };

  const activeCameras = cameras.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Live Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time parking lot status and camera feeds
          </p>
        </div>

        {/* Camera Selector */}
        {cameras.length > 0 && (
          <Select
            value={selectedCameraId?.toString()}
            onValueChange={handleCameraChange}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a camera" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((camera) => (
                <SelectItem key={camera.id} value={camera.id.toString()}>
                  {camera.name} - {camera.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Cameras
              </p>
              <h3 className="text-2xl font-bold text-foreground">{activeCameras}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Video className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Slots
              </p>
              <h3 className="text-2xl font-bold text-foreground">{totalSlots}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <ParkingCircle className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Available
              </p>
              <h3 className="text-2xl font-bold text-success">{emptySlots}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <Activity className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Occupied
              </p>
              <h3 className="text-2xl font-bold text-destructive">{occupiedSlots}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </Card>
      </div>

      {/* Live Feed */}
      {loading && cameras.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Video className="h-16 w-16 animate-pulse text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Loading cameras...</p>
          </div>
        </Card>
      ) : selectedCamera ? (
        <LiveView
          camera={selectedCamera}
          onStatsUpdate={(total, empty, occupied) => {
            setTotalSlots(total);
            setEmptySlots(empty);
            setOccupiedSlots(occupied);
          }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Live Camera Feed
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select a camera to view real-time monitoring
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground"></span>
                </span>
                No camera selected
              </Badge>
            </div>
          </div>

          <div className="aspect-video bg-muted/30">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Video className="mx-auto h-16 w-16 text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">
                  No active camera feed
                </p>
                <p className="text-xs text-muted-foreground">
                  {cameras.length === 0
                    ? "Add cameras from the Cameras page"
                    : "Select a camera from the dropdown above"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
