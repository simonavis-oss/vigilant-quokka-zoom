import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, Brain, Settings } from "lucide-react";
import { Printer } from "@/types/printer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePrinter } from "@/integrations/supabase/mutations";
import { showSuccess, showError } from "@/utils/toast";

interface AISettingsPanelProps {
  printer: Printer;
}

const AISettingsPanel: React.FC<AISettingsPanelProps> = ({ printer }) => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: updatePrinter,
    onSuccess: () => {
      showSuccess("AI settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["printerDetails", printer.id] });
    },
    onError: (err) => showError(err.message),
  });

  const handleToggleAI = (enabled: boolean) => {
    updateMutation.mutate({
      id: printer.id,
      ai_failure_detection_enabled: enabled,
    });
  };

  const handleTestAI = async () => {
    try {
      const { analyzePrintFailure } = await import("@/integrations/supabase/functions");
      const result = await analyzePrintFailure(printer.id);
      
      if (result.is_failure) {
        showSuccess(`AI test complete: ${result.failure_type} detected (${Math.round(result.confidence * 100)}% confidence)`);
      } else {
        showSuccess("AI test complete: No failures detected");
      }
    } catch (error) {
      showError(`AI test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="h-5 w-5 mr-2" />
          AI Failure Detection
        </CardTitle>
        <CardDescription>
          Automatically monitor prints for common failures using computer vision
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="ai-detection" className="text-base">
              Enable AI Detection
            </Label>
            <p className="text-sm text-muted-foreground">
              Requires a configured webcam. Analyzes prints every 30 seconds.
            </p>
          </div>
          <Switch
            id="ai-detection"
            checked={printer.ai_failure_detection_enabled}
            onCheckedChange={handleToggleAI}
            disabled={!printer.webcam_url || updateMutation.isPending}
          />
        </div>

        {printer.ai_failure_detection_enabled && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Detected Failure Types:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Spaghetti / Stringing</li>
                <li>• Layer shifting</li>
                <li>• Warping / Lifting</li>
                <li>• Nozzle clogs</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleTestAI}
              variant="outline"
              className="w-full"
              disabled={!printer.webcam_url}
            >
              <Camera className="h-4 w-4 mr-2" />
              Test AI Detection Now
            </Button>
          </div>
        )}

        {!printer.webcam_url && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <Camera className="h-4 w-4 inline mr-1" />
              Configure a webcam URL to enable AI failure detection
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AISettingsPanel;