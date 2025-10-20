import { useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer } from "@/types/printer";
import { getPrinterStatus, handlePrintCompletion, confirmBedCleared } from "@/integrations/supabase/functions";
import { useEffect, useRef } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

type PrinterStatuses = { [printerId: string]: { is_printing: boolean } };

export const usePrintJobAutomation = (printers: Printer[] | undefined) => {
  const queryClient = useQueryClient();
  const previousStatusesRef = useRef<PrinterStatuses>({});

  const printerStatusQueries = useQueries({
    queries: (printers || []).map((printer) => ({
      queryKey: ["printerStatus", printer.id],
      queryFn: () => getPrinterStatus(printer.id),
      refetchInterval: 15000, // Poll every 15 seconds
      retry: 1,
    })),
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

  const completionMutation = useMutation({
    mutationFn: handlePrintCompletion,
    onSuccess: (data) => {
      if (data.status !== 'success' || !data.completedJob) {
        return;
      }

      toast.info(`Print finished: ${data.completedJob.file_name}`, {
        description: `Printer: ${data.completedJob.printer_name}. Please confirm the bed is clear to start the next print.`,
        duration: Infinity, // Persist until dismissed or action is taken
        action: (
          <Button 
            size="sm" 
            onClick={() => {
              clearBedMutation.mutate(data.completedJob!.id);
              toast.dismiss();
            }}
            disabled={clearBedMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm Bed Cleared
          </Button>
        ),
      });

      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      queryClient.invalidateQueries({ queryKey: ["printJobs"] });
    },
    onError: (err) => {
      showError(`Automation Error: ${err.message}`);
    },
  });

  useEffect(() => {
    const currentStatuses: PrinterStatuses = {};
    
    printerStatusQueries.forEach((query, index) => {
      if (query.isSuccess && query.data && printers) {
        const printerId = printers[index].id;
        currentStatuses[printerId] = { is_printing: query.data.is_printing };

        const wasPrinting = previousStatusesRef.current[printerId]?.is_printing;
        const isNowIdle = !query.data.is_printing;

        if (wasPrinting === true && isNowIdle) {
          console.log(`Print completed on printer ${printerId}. Triggering automation.`);
          completionMutation.mutate(printerId);
        }
      }
    });

    previousStatusesRef.current = currentStatuses;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printerStatusQueries, printers]);
};