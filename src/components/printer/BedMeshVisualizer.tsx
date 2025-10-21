import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grid3x3, Loader2, RefreshCw, Info } from "lucide-react";
import { Printer } from "@/types/printer";
import { getBedMesh, BedMesh, sendPrinterCommand } from "@/integrations/supabase/functions";
import { showSuccess, showError, showLoading } from "@/utils/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BedMeshVisualizerProps {
  printer: Printer;
}

const getColorForValue = (value: number, min: number, max: number) => {
  if (min === max) return 'hsl(120, 70%, 50%)'; // Green if flat
  const range = max - min;
  const normalized = (value - min) / range; // 0 to 1
  // Hue from blue (low, 240) to red (high, 0)
  const hue = (1 - normalized) * 240;
  return `hsl(${hue}, 80%, 60%)`;
};

const BedMeshVisualizer: React.FC<BedMeshVisualizerProps> = ({ printer }) => {
  const queryClient = useQueryClient();

  const { data: mesh, isLoading, isError, error, refetch } = useQuery<BedMesh>({
    queryKey: ["bedMesh", printer.id],
    queryFn: () => getBedMesh(printer),
    retry: 1,
  });

  const calibrateMutation = useMutation({
    mutationFn: () => sendPrinterCommand(printer, "BED_MESH_CALIBRATE"),
    onMutate: () => {
      return showLoading("Starting bed mesh calibration... This may take several minutes.");
    },
    onSuccess: (data, variables, context) => {
      showSuccess("Calibration command sent. The mesh will update automatically when finished.");
      setTimeout(() => refetch(), 30000); // Refetch after 30s to check progress
    },
    onError: (err, variables, context) => {
      showError(`Failed to start calibration: ${err.message}`);
    },
  });

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Loading mesh data...</span></div>;
    }
    if (isError) {
      return <p className="text-destructive">Error: {error.message}</p>;
    }
    if (!mesh) {
      return <p className="text-muted-foreground">No mesh data available.</p>;
    }

    const allPoints = mesh.probed_matrix.flat();
    const min = Math.min(...allPoints);
    const max = Math.max(...allPoints);
    const variance = max - min;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-sm text-muted-foreground">Min</p><p className="font-bold text-blue-500">{min.toFixed(4)}</p></div>
          <div><p className="text-sm text-muted-foreground">Max</p><p className="font-bold text-red-500">{max.toFixed(4)}</p></div>
          <div><p className="text-sm text-muted-foreground">Variance</p><p className="font-bold">{variance.toFixed(4)}</p></div>
        </div>
        <TooltipProvider>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${mesh.probed_matrix[0].length}, minmax(0, 1fr))` }}>
            {mesh.probed_matrix.map((row, rowIndex) =>
              row.map((value, colIndex) => (
                <Tooltip key={`${rowIndex}-${colIndex}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="aspect-square w-full rounded-sm"
                      style={{ backgroundColor: getColorForValue(value, min, max) }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Value: {value.toFixed(4)}</p>
                  </TooltipContent>
                </Tooltip>
              ))
            )}
          </div>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <CardTitle className="flex items-center"><Grid3x3 className="h-5 w-5 mr-2" /> Bed Mesh</CardTitle>
            <CardDescription>A visualization of your printer's bed level.</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isLoading}><RefreshCw className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => calibrateMutation.mutate()} disabled={calibrateMutation.isPending}>
              {calibrateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calibrate"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default BedMeshVisualizer;