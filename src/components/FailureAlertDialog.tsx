import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, VideoOff, XCircle } from "lucide-react";
import { FailureAlert } from "@/hooks/useFailureAlerts";

interface FailureAlertDialogProps {
  alert: FailureAlert | null;
  isOpen: boolean;
  onClose: () => void;
  onIgnore: (alertId: string) => void;
  onStopPrint: (printerId: string) => void;
}

const FailureAlertDialog: React.FC<FailureAlertDialogProps> = ({
  alert,
  isOpen,
  onClose,
  onIgnore,
  onStopPrint,
}) => {
  if (!alert) return null;

  const handleIgnore = () => {
    onIgnore(alert.id);
    onClose();
  };

  const handleStop = () => {
    onStopPrint(alert.printer_id);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="h-6 w-6 mr-3 text-yellow-500" />
            Potential Print Failure Detected
          </AlertDialogTitle>
          <AlertDialogDescription>
            Our AI has detected a potential issue with the print on{" "}
            <strong>{alert.printerName}</strong>. Please review the snapshot below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-4 p-2 border rounded-lg">
          {alert.screenshot_url ? (
            <img
              src={alert.screenshot_url}
              alt="Print failure snapshot"
              className="rounded-md w-full aspect-video object-contain bg-gray-100 dark:bg-gray-900"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; 
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.fallback-icon');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className="fallback-icon aspect-video items-center justify-center bg-muted rounded-md"
            style={{ display: alert.screenshot_url ? 'none' : 'flex' }}
          >
            <VideoOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleIgnore}>
            Ignore (False Alarm)
          </Button>
          <Button variant="destructive" onClick={handleStop}>
            <XCircle className="mr-2 h-4 w-4" /> Stop Print
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FailureAlertDialog;