import { useForm } from "react-hook-form";
import { CameraFormData, SourceType } from "@/types/camera.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CameraFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CameraFormData) => Promise<void>;
  initialData?: Partial<CameraFormData>;
  title?: string;
  description?: string;
}

export const CameraForm = ({
  open,
  onClose,
  onSubmit,
  initialData,
  title = "Add New Camera",
  description = "Fill in the details to add a new camera to the system.",
}: CameraFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CameraFormData>({
    defaultValues: {
      name: initialData?.name || "",
      location: initialData?.location || "",
      source_type: initialData?.source_type || SourceType.WEBCAM,
      stream_url: initialData?.stream_url || "0",
    },
  });

  const sourceType = watch("source_type");

  const handleFormSubmit = async (data: CameraFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Camera Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Front Entrance Camera"
              {...register("name", { required: "Camera name is required" })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Main Gate - Area A"
              {...register("location")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_type">
              Source Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={sourceType}
              onValueChange={(value) =>
                setValue("source_type", value as SourceType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SourceType.WEBCAM}>Webcam</SelectItem>
                <SelectItem value={SourceType.RTSP}>RTSP Stream</SelectItem>
                <SelectItem value={SourceType.FILE}>Video File</SelectItem>
                <SelectItem value={SourceType.HTTP}>HTTP Stream</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stream_url">
              Stream URL/Path <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stream_url"
              placeholder={
                sourceType === SourceType.WEBCAM
                  ? "e.g., 0, 1, 2"
                  : sourceType === SourceType.RTSP
                  ? "e.g., rtsp://username:password@ip:port/stream"
                  : "e.g., /path/to/video.mp4"
              }
              {...register("stream_url", { required: "Stream URL is required" })}
            />
            {errors.stream_url && (
              <p className="text-sm text-destructive">
                {errors.stream_url.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {sourceType === SourceType.WEBCAM &&
                "Enter webcam index (0 for default, 1 for second camera, etc.)"}
              {sourceType === SourceType.RTSP &&
                "Enter full RTSP URL with credentials if required"}
              {sourceType === SourceType.FILE && "Enter path to video file"}
              {sourceType === SourceType.HTTP && "Enter HTTP stream URL"}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Camera"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
