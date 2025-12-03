import { useEffect, useRef, useState, useCallback } from "react";
import { Camera } from "@/types/camera.types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Play,
    Undo,
    Trash2,
    Save,
    RefreshCw,
    ArrowLeft,
    PenTool,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

interface Point {
    x: number;
    y: number;
}

interface Slot {
    id: string;
    name: string;
    polygon: Point[];
    displayPolygon: Point[];
    color: string;
}

interface SlotAnnotatorProps {
    camera: Camera;
    onBack?: () => void;
}

export const SlotAnnotator = ({ camera, onBack }: SlotAnnotatorProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLImageElement>(null);
    const { toast } = useToast();

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
    const [completedSlots, setCompletedSlots] = useState<Slot[]>([]);
    const [slotCounter, setSlotCounter] = useState(1);
    const [slotPrefix, setSlotPrefix] = useState("Slot");
    const [polygonColor, setPolygonColor] = useState("#00ff00");
    const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
    const [mousePos, setMousePos] = useState<Point | null>(null);
    const [loading, setLoading] = useState(false);
    const [existingSlots, setExistingSlots] = useState<Slot[]>([]);

    const streamUrl = `${API_BASE_URL}/stream/${camera.id}/snapshot?t=${Date.now()}`;

    // Load existing slots from DB
    const loadExistingSlots = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/slots/?camera_id=${camera.id}`);
            if (!response.ok) throw new Error("Failed to load slots");

            const slots = await response.json();

            // Convert DB slots to format with original coordinates only
            const formattedSlots: Slot[] = slots.map((slot: any) => {
                // DB polygon is [[x, y], ...], convert to Point[]
                const polygon = slot.polygon.map((p: number[]) => ({ x: p[0], y: p[1] }));

                return {
                    id: slot.id.toString(),
                    name: slot.label,
                    polygon: polygon,
                    displayPolygon: [], // Will be calculated by updateExistingSlotsDisplay
                    color: "#ffaa00", // Orange for existing slots
                };
            });

            setExistingSlots(formattedSlots);

            if (formattedSlots.length > 0) {
                toast({
                    title: "Loaded existing slots",
                    description: `Found ${formattedSlots.length} slot(s) from database`,
                });
            }
        } catch (error) {
            console.error("Error loading slots:", error);
        }
    }, [camera.id, toast]);

    // Convert existing slots to display coordinates
    const updateExistingSlotsDisplay = useCallback(() => {
        if (existingSlots.length === 0 || originalSize.width === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const scaleX = canvas.width / originalSize.width;
        const scaleY = canvas.height / originalSize.height;

        const updatedSlots = existingSlots.map((slot) => ({
            ...slot,
            displayPolygon: slot.polygon.map((p) => ({
                x: p.x * scaleX,
                y: p.y * scaleY,
            })),
        }));

        setExistingSlots(updatedSlots);
    }, [existingSlots, originalSize]);

    // Load frame
    const loadFrame = useCallback(() => {
        if (!videoRef.current) return;

        setLoading(true);
        const img = videoRef.current;
        const timestamp = Date.now();

        img.onload = () => {
            setOriginalSize({
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
            resizeCanvas();

            // Update existing slots display coordinates after image loads
            if (existingSlots.length > 0) {
                updateExistingSlotsDisplay();
            }

            setLoading(false);
            toast({
                title: "Frame loaded",
                description: `${img.naturalWidth}x${img.naturalHeight}`,
            });
        };

        img.onerror = () => {
            setLoading(false);
            toast({
                variant: "destructive",
                title: "Failed to load frame",
                description: "Make sure detector is running for this camera",
            });
        };

        img.src = `${API_BASE_URL}/stream/${camera.id}/snapshot?t=${timestamp}`;
    }, [camera.id, toast]);

    // Resize canvas to match image
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const img = videoRef.current;

        if (!canvas || !img) return;

        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
        redrawAll();
    }, []);

    // Draw functions
    const drawPolygon = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            points: Point[],
            color: string,
            filled: boolean,
            name?: string
        ) => {
            if (points.length === 0) return;

            ctx.strokeStyle = color;
            ctx.fillStyle = color + "30";
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }

            if (filled) {
                ctx.closePath();
                ctx.fill();
            }

            ctx.stroke();

            // Draw points
            points.forEach((point, index) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 12px Arial";
                ctx.fillText((index + 1).toString(), point.x + 8, point.y - 8);
            });

            // Draw name for completed slots
            if (filled && name) {
                const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
                const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

                ctx.fillStyle = color;
                ctx.font = "bold 16px Arial";
                ctx.textAlign = "center";
                ctx.fillText(name, centerX, centerY);
                ctx.textAlign = "left";
            }
        },
        []
    );

    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw existing slots from DB (orange)
        existingSlots.forEach((slot) => {
            if (slot.displayPolygon.length > 0) {
                drawPolygon(ctx, slot.displayPolygon, slot.color, true, slot.name);
            }
        });

        // Draw completed slots (newly drawn)
        completedSlots.forEach((slot) => {
            drawPolygon(ctx, slot.displayPolygon, slot.color, true, slot.name);
        });

        // Draw current polygon
        if (currentPolygon.length > 0) {
            drawPolygon(ctx, currentPolygon, polygonColor, false);
        }

        // Draw preview line
        if (isDrawing && currentPolygon.length > 0 && mousePos) {
            const lastPoint = currentPolygon[currentPolygon.length - 1];
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }, [existingSlots, completedSlots, currentPolygon, isDrawing, mousePos, polygonColor, drawPolygon]);

    // Event handlers
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCurrentPolygon([...currentPolygon, { x, y }]);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const startDrawing = () => {
        setIsDrawing(true);
        setCurrentPolygon([]);
    };

    const undoLastPoint = () => {
        if (currentPolygon.length > 0) {
            setCurrentPolygon(currentPolygon.slice(0, -1));
        }
    };

    const clearCurrentPolygon = () => {
        setCurrentPolygon([]);
        setIsDrawing(false);
    };

    const finishPolygon = useCallback(() => {
        if (currentPolygon.length < 3) {
            toast({
                variant: "destructive",
                title: "Invalid polygon",
                description: "A parking slot needs at least 3 points!",
            });
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Convert to original coordinates
        const scaleX = originalSize.width / canvas.width;
        const scaleY = originalSize.height / canvas.height;

        const originalPolygon = currentPolygon.map((point) => ({
            x: Math.round(point.x * scaleX),
            y: Math.round(point.y * scaleY),
        }));

        const slot: Slot = {
            id: `temp_${slotCounter}`,
            name: `${slotPrefix}-${slotCounter}`,
            polygon: originalPolygon,
            displayPolygon: [...currentPolygon],
            color: polygonColor,
        };

        setCompletedSlots([...completedSlots, slot]);
        setSlotCounter(slotCounter + 1);
        setCurrentPolygon([]);
        setIsDrawing(false);

        toast({
            title: "Slot created",
            description: `${slot.name} with ${currentPolygon.length} points`,
        });
    }, [currentPolygon, slotCounter, slotPrefix, polygonColor, completedSlots, originalSize, toast]);

    const deleteSlot = (index: number) => {
        const newSlots = [...completedSlots];
        newSlots.splice(index, 1);
        setCompletedSlots(newSlots);
    };

    const deleteExistingSlot = async (slotId: string, slotName: string) => {
        if (!confirm(`Are you sure you want to delete slot "${slotName}" from database?`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/slots/${slotId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast({
                    title: "Slot deleted",
                    description: `Successfully deleted ${slotName}`,
                });
                // Reload slots from database
                loadExistingSlots();
            } else {
                throw new Error("Failed to delete slot");
            }
        } catch (error) {
            console.error("Error deleting slot:", error);
            toast({
                variant: "destructive",
                title: "Failed to delete slot",
                description: "Could not delete slot from database",
            });
        } finally {
            setLoading(false);
        }
    };

    const saveAllSlots = async () => {
        if (completedSlots.length === 0) {
            toast({
                variant: "destructive",
                title: "No slots to save",
            });
            return;
        }

        setLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const slot of completedSlots) {
            try {
                const polygonArray = slot.polygon.map((p) => [p.x, p.y]);

                const response = await fetch(`${API_BASE_URL}/slots/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        camera_id: camera.id,
                        label: slot.name,
                        polygon: polygonArray,
                    }),
                });

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error("Error saving slot:", error);
                errorCount++;
            }
        }

        setLoading(false);

        if (errorCount === 0) {
            toast({
                title: "Success!",
                description: `Saved ${successCount} parking slots`,
            });
            setCompletedSlots([]);
            setSlotCounter(1);
            // Reload existing slots after save
            loadExistingSlots();
        } else {
            toast({
                variant: "destructive",
                title: "Partial success",
                description: `Saved ${successCount}, failed ${errorCount}`,
            });
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isDrawing) return;

            switch (e.key) {
                case "Enter":
                case " ":
                    e.preventDefault();
                    finishPolygon();
                    break;
                case "Escape":
                    e.preventDefault();
                    clearCurrentPolygon();
                    break;
                case "Backspace":
                case "Delete":
                    e.preventDefault();
                    undoLastPoint();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isDrawing, finishPolygon]);

    // Load existing slots and initial frame
    useEffect(() => {
        loadExistingSlots();
        loadFrame();
    }, [loadExistingSlots, loadFrame]);

    // Update existing slots display when original size changes
    useEffect(() => {
        if (originalSize.width > 0 && existingSlots.length > 0) {
            updateExistingSlotsDisplay();
        }
    }, [originalSize, updateExistingSlotsDisplay]);

    // Redraw on changes
    useEffect(() => {
        redrawAll();
    }, [redrawAll]);

    // Resize handler
    useEffect(() => {
        window.addEventListener("resize", resizeCanvas);
        return () => window.removeEventListener("resize", resizeCanvas);
    }, [resizeCanvas]);

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Canvas Area */}
            <div className="lg:col-span-2">
                <Card className="overflow-hidden">
                    <div className="border-b border-border bg-muted/50 px-6 py-4">
                        <h2 className="text-lg font-semibold">Video Frame - {camera.name}</h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <Badge variant={isDrawing ? "default" : "secondary"}>
                                {isDrawing ? "Drawing" : "Idle"}
                            </Badge>
                            <span>Points: {currentPolygon.length}</span>
                            <span>Slots: {completedSlots.length}</span>
                        </div>
                    </div>

                    <div className="relative aspect-video bg-black">
                        <img
                            ref={videoRef}
                            alt="Frame"
                            className="absolute inset-0 h-full w-full object-contain"
                            style={{ display: "block" }}
                        />
                        <canvas
                            ref={canvasRef}
                            onClick={handleCanvasClick}
                            onMouseMove={handleMouseMove}
                            className="absolute inset-0 h-full w-full cursor-crosshair"
                        />
                    </div>

                    <div className="border-t border-border bg-muted/30 px-6 py-3">
                        <div className="text-sm text-muted-foreground">
                            <kbd className="rounded bg-muted px-2 py-1">Enter</kbd> Finish •{" "}
                            <kbd className="rounded bg-muted px-2 py-1">Esc</kbd> Cancel •{" "}
                            <kbd className="rounded bg-muted px-2 py-1">Backspace</kbd> Undo
                        </div>
                    </div>
                </Card>
            </div>

            {/* Control Panel */}
            <div className="space-y-4">
                <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold">Controls</h3>

                    <div className="space-y-2">
                        <Button
                            onClick={startDrawing}
                            disabled={isDrawing || loading}
                            className="w-full"
                        >
                            <PenTool className="mr-2 h-4 w-4" />
                            Start Drawing Slot
                        </Button>

                        <Button
                            onClick={undoLastPoint}
                            disabled={!isDrawing || currentPolygon.length === 0 || loading}
                            variant="outline"
                            className="w-full"
                        >
                            <Undo className="mr-2 h-4 w-4" />
                            Undo Last Point
                        </Button>

                        <Button
                            onClick={clearCurrentPolygon}
                            disabled={!isDrawing || loading}
                            variant="outline"
                            className="w-full"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear Current
                        </Button>

                        <Button
                            onClick={saveAllSlots}
                            disabled={completedSlots.length === 0 || loading}
                            variant="default"
                            className="w-full"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save All Slots
                        </Button>

                        <Button
                            onClick={loadFrame}
                            disabled={loading}
                            variant="outline"
                            className="w-full"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh Frame
                        </Button>

                        {onBack && (
                            <Button
                                onClick={onBack}
                                variant="secondary"
                                className="w-full"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold">Settings</h3>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="slot-prefix">Slot Name Prefix</Label>
                            <Input
                                id="slot-prefix"
                                value={slotPrefix}
                                onChange={(e) => setSlotPrefix(e.target.value)}
                                placeholder="Slot"
                            />
                        </div>

                        <div>
                            <Label htmlFor="polygon-color">Polygon Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="polygon-color"
                                    type="color"
                                    value={polygonColor}
                                    onChange={(e) => setPolygonColor(e.target.value)}
                                    className="h-10 w-20"
                                />
                                <Input value={polygonColor} readOnly className="flex-1" />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Existing Slots from DB */}
                {existingSlots.length > 0 && (
                    <Card className="p-6">
                        <h3 className="mb-4 text-lg font-semibold">
                            Existing Slots ({existingSlots.length})
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Slots already saved in database (shown in orange)
                        </p>

                        <div className="max-h-[300px] space-y-2 overflow-y-auto">
                            {existingSlots.map((slot) => (
                                <div
                                    key={slot.id}
                                    className="flex items-center justify-between rounded-lg bg-orange-500/10 p-3 border border-orange-500/20"
                                >
                                    <div className="flex-1">
                                        <div className="font-semibold" style={{ color: slot.color }}>
                                            {slot.name}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {slot.polygon.length} points • ID: {slot.id}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-orange-500 border-orange-500">
                                            Saved
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => deleteExistingSlot(slot.id, slot.name)}
                                            disabled={loading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* New Drawn Slots */}
                <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold">
                        New Slots ({completedSlots.length})
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Newly drawn slots (not yet saved)
                    </p>

                    <div className="max-h-[400px] space-y-2 overflow-y-auto">
                        {completedSlots.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No new slots
                            </p>
                        ) : (
                            completedSlots.map((slot, index) => (
                                <div
                                    key={slot.id}
                                    className="flex items-center justify-between rounded-lg bg-muted p-3"
                                >
                                    <div>
                                        <div className="font-semibold" style={{ color: slot.color }}>
                                            {slot.name}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {slot.polygon.length} points
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteSlot(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
