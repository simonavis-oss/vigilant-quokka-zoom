import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintQueueItem } from "@/types/print-queue";
import { startPrintJob } from "@/integrations/supabase/functions";
import { showSuccess, showError } from "@/utils/toast";

interface StartPrintButtonProps {
  item: PrintQueueItem;
  disabled: boolean;
}

const StartPrintButton: React.FC<StartPrintButtonProps> = ({ item, disabled }) => {
  const queryClient = useQueryClient();
  
  const startMutation = useMutation({
    mutationFn: startPrintJob,
    onSuccess: (response) => {
      showSuccess(response.message);
      // Invalidate printer status to reflect it's now busy
      queryClient.invalidateQueries({ queryKey: ["printerStatus", item.printer_id] });
      queryClient.invalidateQueries({ queryKey: ["printerStatus"] }); // General status for dashboard
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleStart = () => {
    startMutation.mutate(item.id);
  };

  const isPending = startMutation.isPending;

  return (
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
  );
};

export default StartPrintButton;