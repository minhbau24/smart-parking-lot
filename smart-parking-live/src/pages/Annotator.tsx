import { Card } from "@/components/ui/card";
import { PenTool } from "lucide-react";

const Annotator = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Slot Annotator</h1>
        <p className="text-muted-foreground">
          Draw parking slot polygons on camera frames
        </p>
      </div>

      {/* Placeholder */}
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <PenTool className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-foreground">
            Slot Annotation Tool
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Select a camera from the Cameras page to start drawing parking slot
            polygons. This feature will be available in the next iteration.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Annotator;
