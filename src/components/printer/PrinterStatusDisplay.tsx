import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPrinterStatus, PrinterStatus } from "@/integrations/supabase/functions";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PrinterStatusDisplayProps {
  printerId: string;
}

const PrinterStatusDisplay: React.FC<PrinterStatusDisplayProps> = ({ printerId }) => {
  const { data: status, isLoading, isError } = useQuery<PrinterStatus>({
    queryKey: ["printerStatus", printerId],
    queryFn: () => getPrinterStatus(printerId),
    refetchInterval: 10000, // Poll status every 10 seconds for dashboard view
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (isError || !status) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Badge variant="destructive">Offline</Badge>
          <WifiOff className="h-4 w-4 text-red-500" />
        </div>
        <p className="text-xs text-destructive">Connection failed.</p>
      </div>
    );
  }
  
  const statusText = status.is_printing ? `Printing (${status.progress}%)` : "Idle";
  const isOnline = !isError; // Assuming successful query means the connection details are valid

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Badge variant={isOnline ? "default" : "destructive"}>
          {isOnline ? "Online" : "Offline"}
        </Badge>
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
      </div>
      
      <div className="text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Status:</span> {statusText}
        </p>
        <p>
          <span className="font-medium text-foreground">File:</span> {status.file_name}
        </p>
      </div>
      
      {status.is_printing && (
        <div className="space-y-1">
          <Progress value={status.progress} className="w-full h-2" />
          <p className="text-xs text-muted-foreground">{status.time_remaining} remaining</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">
        <div>
          <p className="font-medium">Nozzle Temp</p>
          <p className="text-muted-foreground">{status.nozzle_temp}</p>
        </div>
        <div>
          <p className="font-medium">Bed Temp</p>
          <p className="text-muted-foreground">{status.bed_temp}</p>
        </div>
      </div>
    </div>
  );
};

export default PrinterStatusDisplay;