import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, XCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintQueueItem } from "@/types/print-queue";
import { showSuccess, showError } from "@/utils/toast";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";
import { supabase } from "@/integrations/supabase/client";
import { cancelPrintJob, confirmBedCleared } from "@/integrations/supabase/functions";
import AssignPrinterDropdown from "./AssignPrinterDropdown";
import StartPrintButton from "./StartPrintButton";
import CancellationDialog from "../CancellationDialog";

interface QueueItemActionsProps {
  item: PrintQueueItem;
}

const deleteQueueItem = async (jobId: string) => {
  const { error } = await supabase.from("print_queue").delete().eq("id", jobId);
  if (error) {
    throw new Error(`Failed to delete job: ${error.message}`);
  }
};

const QueueItemActions: React.FC<QueueItemActionsProps> = ({ item }) => {
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation({
    mutationFn: deleteQueueItem,
    onSuccess: () => {
      showSuccess(`Job "${item.file_name}" removed from queue.`);
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason: string }) => cancelPrintJob(jobId, reason),
    onSuccess: (response) => {
      showSuccess(response.message);
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      queryClient.invalidateQueries({ queryKey: ["printJobs", item.printer_id] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const clearBedMutation = useMutation({
    mutationFn: confirmBedCleared,
    onSuccess: (data) => {
      showSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      queryClient.invalidateQueries({ queryKey: ["printerStatus"] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });
  
  const handleDelete = () => {
    deleteMutation.mutate(item.id);
  };

  const handleCancel = (reason: string) => {
    cancelMutation.mutate({ jobId: item.id, reason });
  };

  const handleClearBed = () => {
    clearBedMutation.mutate(item.id);
  };

  const isActionPending = deleteMutation.isPending || cancelMutation.isPending || clearBedMutation.isPending;

  if (item.status === 'completed') {
    return (
      <Button 
        variant="default" 
        size="sm" 
        onClick={handleClearBed}
        disabled={isActionPending}
      >
        {clearBedMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4 mr-1" />
        )}
        Confirm Cleared
      </Button>
    );
  }

  if (item.status === 'assigned' || item.status === 'printing') {
    return (
      <div className="flex items-center space-x-2">
        {item.status === 'assigned' && <StartPrintButton item={item} disabled={isActionPending} />}
        <CancellationDialog
          onConfirm={handleCancel}
          title={`Cancel print job "${item.file_name}"?`}
          description="This will stop the print and move the job to your history. Please provide a reason for the cancellation below."
          triggerButton={
            <Button variant="outline" size="sm" disabled={isActionPending}>
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            </Button>
          }
        />
      </div>
    );
  }

  if (item.status === 'pending') {
    return (
      <div className="flex items-center space-x-2">
        <AssignPrinterDropdown item={item} disabled={isActionPending} />
        <DeleteConfirmationDialog
          onConfirm={handleDelete}
          title={`Remove "${item.file_name}" from queue?`}
          description="This will permanently remove the job from the print queue."
          triggerButton={
            <Button variant="destructive" size="sm" disabled={isActionPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    );
  }

  return null;
};

export default QueueItemActions;