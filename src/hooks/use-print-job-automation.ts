import { useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer } from "@/types/printer";
import { getPrinterStatus, handlePrintCompletion } from "@/integrations/supabase/functions";
import { useEffect, useRef } from "react";
import { showSuccess, showError } from "@/utils/toast";

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

  const completionMutation = useMutation({
    mutationFn: handlePrintCompletion,
    onSuccess: (data) => {
      // Guard against false positives from mock data or unexpected responses
      if (data.status !== 'success' || !data.completedJobName) {
        // Log if we get an unexpected success-like status without a name, but don't show a toast.
        if (data.status !== 'noop') {
          console.warn("Print completion handler returned success status without a job name.", data);
        }
        return;
      }

      let message = `Print "${data.completedJobName}" completed.`;
      if (data.startedJobName) {
        message += ` Starting next print: "${data.startedJobName}".`;
      } else {
        message += ` No more jobs in queue for this printer.`;
      }
      showSuccess(message);
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