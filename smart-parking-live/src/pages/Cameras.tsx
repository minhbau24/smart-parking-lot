import { useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { Camera, CameraFormData } from "@/types/camera.types";
import { CameraCard } from "@/components/CameraCard";
import { CameraForm } from "@/components/CameraForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Cameras = () => {
  const navigate = useNavigate();
  const { cameras, loading, fetchCameras, createCamera, updateCamera, deleteCamera } = useCamera();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [deletingCamera, setDeletingCamera] = useState<Camera | null>(null);

  const filteredCameras = cameras.filter(
    (camera) =>
      camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (data: CameraFormData) => {
    await createCamera(data);
  };

  const handleEdit = (camera: Camera) => {
    setEditingCamera(camera);
    setFormOpen(true);
  };

  const handleUpdate = async (data: CameraFormData) => {
    if (editingCamera) {
      await updateCamera(editingCamera.id, data);
      setEditingCamera(null);
    }
  };

  const handleDelete = async () => {
    if (deletingCamera) {
      await deleteCamera(deletingCamera.id);
      setDeletingCamera(null);
    }
  };

  const handleViewLive = (camera: Camera) => {
    navigate(`/?camera=${camera.id}`);
  };

  const handleAnnotate = (camera: Camera) => {
    navigate(`/annotator?camera=${camera.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Camera Management</h1>
          <p className="text-muted-foreground">
            Manage your parking lot cameras and monitoring devices
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Camera
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cameras by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchCameras}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Camera Grid */}
      {loading && cameras.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading cameras...</p>
          </div>
        </div>
      ) : filteredCameras.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">No cameras found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search query"
                : "Get started by adding your first camera"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCameras.map((camera) => (
            <CameraCard
              key={camera.id}
              camera={camera}
              onEdit={handleEdit}
              onDelete={setDeletingCamera}
              onViewLive={handleViewLive}
              onAnnotate={handleAnnotate}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Form */}
      <CameraForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCamera(null);
        }}
        onSubmit={editingCamera ? handleUpdate : handleCreate}
        initialData={editingCamera || undefined}
        title={editingCamera ? "Edit Camera" : "Add New Camera"}
        description={
          editingCamera
            ? "Update the camera information."
            : "Fill in the details to add a new camera to the system."
        }
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingCamera}
        onOpenChange={() => setDeletingCamera(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Camera</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCamera?.name}"? This action
              cannot be undone and will also delete all associated parking slots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Cameras;
