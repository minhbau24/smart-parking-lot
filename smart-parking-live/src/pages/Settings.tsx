import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Configure application preferences and system settings
        </p>
      </div>

      {/* Placeholder */}
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <SettingsIcon className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-foreground">
            Settings Panel
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Application settings and configuration options will be available here
            in future updates.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
