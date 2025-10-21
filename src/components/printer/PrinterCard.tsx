import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Wifi, WifiOff, Settings, Camera, Brain } from "lucide-react";
import { Printer as PrinterType } from "@/types/printer";
import PrinterStatusDisplay from "./PrinterStatusDisplay";
import { useQuery } from "@tanstack/react-query";
import { getPrinterStatus, PrinterStatus } from "@/integrations/supabase/functions";

interface PrinterCardProps {
  printer: PrinterType;
}

const PrinterCard: React.FC<PrinterCardProps> = ({ printer }) => {
  const { data: status, isLoading } = useQuery<PrinterStatus>({
    queryKey: ["printerStatus", printer.id],
    queryFn: () => getPrinterStatus(printer),
  });
  
  // Use the real-time status from the query, defaulting to offline if data is missing/loading
  const isOnline = status?.is_online ?? false;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Printer className="h-5 w-5 mr-2" />
          {printer.name}
          {printer.ai_failure_detection_enabled && (
            <Badge variant="secondary" className="ml-2">
              <Brain className="h-3 w-3 mr-1" />
              AI
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center space-x-2">
          {printer.webcam_url && (
            <Camera className="h-4 w-4 text-muted-foreground" />
          )}
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading status...</div>
          ) : status ? (
            <div className="text-sm text-muted-foreground">
              {status.is_printing ? `Printing (${status.progress}%)` : "Idle"}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No status available</div>
          )}

          <div className="pt-3 border-t">
            <Link to={`/printers/${printer.id}`}>
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Manage Printer
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrinterCard;