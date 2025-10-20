import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Printer } from "@/types/printer";
import { Settings, Printer as PrinterIcon, Loader2, Pause, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import PrinterStatusDisplay from "./PrinterStatusDisplay";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPrinterStatus, PrinterStatus, pausePrint, cancelActivePrint } from "@/integrations/supabase/functions";
import { showSuccess, showError } from "@/utils/toast";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";

interface PrinterCardProps {
  printer: Printer;
}

const PrinterCard: React.FC<PrinterCardProps> = ({ printer }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: status, isLoading, isError } = useQuery<PrinterStatus>({
    queryKey: ["printerStatus", printer.id],
    queryFn: () => getPrinterStatus(printer.id),
    refetchInterval: 10000,
  });

  const pauseMutation = useMutation({
    mutationFn: () => pausePrint(printer.id),
    onSuccess: () => {
      showSuccess(`Pause command sent to ${printer.name}.`);
      // Note: We don't invalidate here, as the printer's state might not update instantly.
      // The regular polling will catch the change.
    },
    onError: (err) => {
      showError(`Failed to pause: ${err.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelActivePrint(printer.id),
    onSuccess: (data) => {
      showSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["printerStatus", printer.id] });
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      queryClient.invalidateQueries({ queryKey: ["printJobs"] });
    },
    onError: (err) => {
      showError(`Failed to cancel: ${err.message}`);
    },
  });
  
  const handleManageClick = () => {
    navigate(`/printers/${printer.id}`);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Connecting...</span>
        </div>
      );
    }

    // isError is true if connection fails, so isOnline is !isError
    const isOnline = !isError;

    return (
      <>
        <CardContent className="flex-grow space-y-3">
          <PrinterStatusDisplay status={status!} isOnline={isOnline} />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Connection Type:</span> {printer.connection_type}
          </p>
        </CardContent>
        
        {isOnline && status?.is_printing && (
          <div className="p-4 border-t grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
            >
              {pauseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}
              Pause
            </Button>
            <DeleteConfirmationDialog
              onConfirm={() => cancelMutation.mutate()}
              title={`Cancel print on ${printer.name}?`}
              description="This will stop the current print job and move it to your history as 'cancelled'. This action cannot be undone."
              triggerButton={
                <Button variant="destructive" size="sm" disabled={cancelMutation.isPending}>
                  {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Cancel
                </Button>
              }
            />
          </div>
        )}

        <div className="p-4 border-t">
          <Button variant="secondary" className="w-full" onClick={handleManageClick}>
            <Settings className="mr-2 h-4 w-4" /> Manage Printer
          </Button>
        </div>
      </>
    );
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <PrinterIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">{printer.name}</CardTitle>
        </div>
      </CardHeader>
      {renderContent()}
    </Card>
  );
};

export default PrinterCard;