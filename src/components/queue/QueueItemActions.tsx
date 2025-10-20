import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintQueueItem } from "@/types/print-queue";
import { showSuccess, showError } from "@/utils/toast";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";
import { supabase } from "@/integrations/supabase/client";
import AssignPrinterButton from "./AssignPrinterButton";

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
  
  // Only need delete mutation here now
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
  
  const handleDelete = () => {
    deleteMutation.mutate(item.id);
  };

  const isActionPending = deleteMutation.isPending;

  if (item.status === 'assigned') {
    return (
      <Button variant="secondary" size="sm" disabled>
        Assigned
      </Button>
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