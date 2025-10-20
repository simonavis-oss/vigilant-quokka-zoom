import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Printer } from "@/types/printer";
import { Settings, Printer as PrinterIcon, Loader2, Pause, XCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import PrinterStatusDisplay from "./PrinterStatusDisplay";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPrinterStatus, PrinterStatus, pausePrint, resumePrint, cancelActivePrint } from "@/integrations/supabase/functions";
import { showSuccess, showError } from "@/utils/toast";
import CancellationDialog from "../CancellationDialog";

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
      queryClient.invalidateQueries({ queryKey: ["printerStatus", printer.id] });
    },
    onError: (err) => {
      showError(`Failed to pause: ${err.message}`);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumePrint(printer.id),
    onSuccess: () => {
      showSuccess(`Resume command sent to ${printer.name}.`);
      queryClient.invalidateQueries({ queryKey: ["printerStatus", printer.id] });
    },
    onError: (err) => {
      showError(`Failed to resume: ${err.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ printerId, reason }: { printerId: string; reason: string }) => cancelActivePrint(printerId, reason),
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

  const handleCancel = (reason: string) => {
    cancelMutation.mutate({ printerId: printer.id, reason });
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
            {status.is_paused ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
              >
                {resumeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Resume
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
              >
                {pauseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}
                Pause
              </Button>
            )}
            <CancellationDialog
              onConfirm={handleCancel}
              title={`Cancel print on ${printer.name}?`}
              description="This will stop the current print job and move it to your history. Please provide a reason for the cancellation."
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