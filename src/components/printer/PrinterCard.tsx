import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer } from "@/types/printer";
import { Badge } from "@/components/ui/badge";
import { Settings, Wifi, WifiOff, Printer as PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PrinterCardProps {
  printer: Printer;
}

const PrinterCard: React.FC<PrinterCardProps> = ({ printer }) => {
  const navigate = useNavigate();
  
  // Mock data for status display until real-time connection is implemented
  const mockStatus = {
    fileName: printer.is_online ? "Calibration_Cube.gcode" : "N/A",
    timeRemaining: printer.is_online ? "1h 35m" : "N/A",
    bedTemp: printer.is_online ? "60°C / 60°C" : "N/A",
    nozzleTemp: printer.is_online ? "210°C / 210°C" : "N/A",
    status: printer.is_online ? "Printing (75%)" : "Idle",
  };

  const handleManageClick = () => {
    navigate(`/printers/${printer.id}`);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <PrinterIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">{printer.name}</CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={printer.is_online ? "default" : "destructive"}>
            {printer.is_online ? "Online" : "Offline"}
          </Badge>
          {printer.is_online ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Connection:</span> {printer.connection_type}
          </p>
          <p>
            <span className="font-medium text-foreground">Status:</span> {mockStatus.status}
          </p>
          <p>
            <span className="font-medium text-foreground">File:</span> {mockStatus.fileName}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="border-r pr-2">
            <p className="font-medium">Nozzle Temp</p>
            <p className="text-muted-foreground">{mockStatus.nozzleTemp}</p>
          </div>
          <div>
            <p className="font-medium">Bed Temp</p>
            <p className="text-muted-foreground">{mockStatus.bedTemp}</p>
          </div>
          <div className="col-span-2 pt-2 border-t">
            <p className="font-medium">Time Remaining</p>
            <p className="text-muted-foreground">{mockStatus.timeRemaining}</p>
          </div>
        </div>
      </CardContent>
      <div className="p-4 border-t">
        <Button variant="secondary" className="w-full" onClick={handleManageClick}>
          <Settings className="mr-2 h-4 w-4" /> Manage Printer
        </Button>
      </div>
    </Card>
  );
};

export default PrinterCard;