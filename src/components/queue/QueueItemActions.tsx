import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintQueueItem } from "@/types/print-queue";
import { showSuccess, showError } from "@/utils/toast";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";
import { supabase } from "@/integrations/supabase/client";
import AssignPrinterButton from "./AssignPrinterButton";
import { cancelPrintJob } from "@/integrations/supabase/functions";

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
    mutationFn: cancelPrintJob,
    onSuccess: (response) => {
      showSuccess(response.message);
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      queryClient.invalidateQueries({ queryKey: ["printJobs", item.printer_id] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });
  
  const handleDelete = () => {
    deleteMutation.mutate(item.id);
  };

  const handleCancel = () => {
    cancelMutation.mutate(item.id);
  };

  const isActionPending = deleteMutation.isPending || cancelMutation.isPending;

  if (item.status === 'assigned') {
    return (
      <DeleteConfirmationDialog
        onConfirm={handleCancel}
        title={`Cancel print job "${item.file_name}"?`}
        description="This will send a stop command to the printer and move the job to your print history as 'cancelled'. This action cannot be undone."
        triggerButton={
          <Button variant="destructive" size="sm" disabled={isActionPending}>
            {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
            Cancel Job
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex space-x-2">
      <AssignPrinterButton item={item} disabled={isActionPending} />
      
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
};

export default QueueItemActions;