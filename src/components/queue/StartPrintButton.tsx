import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintQueueItem } from "@/types/print-queue";
import { startPrintJob, checkBedClearance, BedClearanceResponse } from "@/integrations/supabase/functions";
import { showSuccess, showError } from "@/utils/toast";
import BedClearanceDialog from "./BedClearanceDialog";

interface StartPrintButtonProps {
  item: PrintQueueItem;
  disabled: boolean;
}

const StartPrintButton: React.FC<StartPrintButtonProps> = ({ item, disabled }) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [checkResult, setCheckResult] = useState<BedClearanceResponse | null>(null);

  const startMutation = useMutation({
    mutationFn: () => startPrintJob(item.id),
    onSuccess: (response) => {
      showSuccess(response.message);
      queryClient.invalidateQueries({ queryKey: ["printerStatus", item.printer_id] });
      queryClient.invalidateQueries({ queryKey: ["printerStatus"] });
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const checkBedMutation = useMutation({
    mutationFn: () => checkBedClearance(item.printer_id!),
    onSuccess: (data) => {
      if (data.is_clear) {
        showSuccess("Bed clearance check passed. Starting print...");
        startMutation.mutate();
      } else {
        setCheckResult(data);
        setIsDialogOpen(true);
      }
    },
    onError: (err) => {
      showError(`Bed check failed: ${err.message}`);
    },
  });

  const handleStart = () => {
    if (!item.printer_id) {
      showError("No printer assigned to this job.");
      return;
    }
    checkBedMutation.mutate();
  };

  const handleConfirmOverride = () => {
    setIsDialogOpen(false);
    startMutation.mutate();
  };

  const isPending = startMutation.isPending || checkBedMutation.isPending;

  return (
    <>
      <Button 
        variant="default" 
        size="sm" 
        onClick={handleStart}
        disabled={disabled || isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-1" />
        )}
        Start Print
      </Button>
      {checkResult && (
        <BedClearanceDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onConfirm={handleConfirmOverride}
          snapshotUrl={checkResult.snapshot_url}
          reason={checkResult.reason}
        />
      )}
    </>
  );
};

export default StartPrintButton;