import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Printer } from "@/types/printer";
import { Settings, Printer as PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import PrinterStatusDisplay from "./PrinterStatusDisplay";

interface PrinterCardProps {
  printer: Printer;
}

const PrinterCard: React.FC<PrinterCardProps> = ({ printer }) => {
  const navigate = useNavigate();
  
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
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <PrinterStatusDisplay printerId={printer.id} />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Connection Type:</span> {printer.connection_type}
        </p>
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