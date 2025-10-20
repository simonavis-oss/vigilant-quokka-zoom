import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintQueueItem } from "@/types/print-queue";
import { assignPrintJob } from "@/integrations/supabase/functions";
import { showSuccess, showError } from "@/utils/toast";

interface AssignPrinterButtonProps {
  item: PrintQueueItem;
  disabled: boolean;
}

const AssignPrinterButton: React.FC<AssignPrinterButtonProps> = ({ item, disabled }) => {
  const queryClient = useQueryClient();
  
  const assignMutation = useMutation({
    mutationFn: assignPrintJob,
    onSuccess: (response) => {
      showSuccess(response.message);
      // Invalidate both the queue and the printer status cache
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      queryClient.invalidateQueries({ queryKey: ["printerStatus"] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleAssign = () => {
    assignMutation.mutate(item.id);
  };

  const isPending = assignMutation.isPending;

  return (
    <Button 
      variant="default" 
      size="sm" 
      onClick={handleAssign}
      disabled={disabled || isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4 mr-1" />
      )}
      Assign Printer
    </Button>
  );
};

export default AssignPrinterButton;