import { Camera, CameraStatus } from "@/types/camera.types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, MapPin, Edit, Trash2, Eye, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraCardProps {
  camera: Camera;
  onEdit: (camera: Camera) => void;
  onDelete: (camera: Camera) => void;
  onViewLive: (camera: Camera) => void;
  onAnnotate: (camera: Camera) => void;
}

export const CameraCard = ({
  camera,
  onEdit,
  onDelete,
  onViewLive,
  onAnnotate,
}: CameraCardProps) => {
  const getStatusColor = (status: CameraStatus) => {
    switch (status) {
      case CameraStatus.ACTIVE:
        return "bg-success text-success-foreground";
      case CameraStatus.INACTIVE:
        return "bg-muted text-muted-foreground";
      case CameraStatus.ERROR:
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-video bg-muted">
        <div className="flex h-full items-center justify-center">
          <Video className="h-16 w-16 text-muted-foreground/30" />
        </div>
        <Badge
          className={cn(
            "absolute right-2 top-2",
            getStatusColor(camera.status)
          )}
        >
          {camera.status}
        </Badge>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground truncate">
          {camera.name}
        </h3>
        
        {camera.location && (
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{camera.location}</span>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {camera.source_type.toUpperCase()}
          </Badge>
          <span className="truncate">{camera.stream_url}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => onViewLive(camera)}
            className="flex-1"
          >
            <Eye className="mr-1 h-4 w-4" />
            View Live
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAnnotate(camera)}
            className="flex-1"
          >
            <PenTool className="mr-1 h-4 w-4" />
            Annotate
          </Button>
        </div>

        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(camera)}
            className="flex-1"
          >
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(camera)}
            className="flex-1"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
};
