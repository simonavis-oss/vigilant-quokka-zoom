import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Printer } from "@/types/printer";
import { getPrinterStatus, PrinterStatus } from "@/integrations/supabase/functions";
import { useEffect } from "react";

interface FarmStatus {
  totalPrinters: number;
  onlineCount: number;
  activePrints: number; // Added activePrints count
  isLoading: boolean;
}

/**
 * Fetches the real-time status for a list of printers and aggregates the results.
 * @param printers The list of printers from the database.
 * @returns FarmStatus object containing counts and loading state.
 */
export const useFarmStatus = (printers: Printer[] | undefined): FarmStatus => {
  const queryClient = useQueryClient();
  
  // Define queries for each printer's status
  const printerStatusQueries = useQueries({
    queries: (printers || []).map((printer) => ({
      queryKey: ["printerStatus", printer.id],
      queryFn: () => getPrinterStatus(printer),
      staleTime: 10000, // Use the same polling interval as PrinterStatusDisplay
      refetchInterval: 10000,
      // We don't want failed connections to block the entire dashboard, 
      // so we handle errors gracefully in the aggregation step.
      retry: 1, 
    })),
  });

  const isLoading = printerStatusQueries.some(query => query.isLoading);
  
  const successfulStatuses = printerStatusQueries
    .filter(query => query.isSuccess && query.data)
    .map(query => query.data as PrinterStatus);

  // Calculate online count based on successful queries
  const onlineCount = successfulStatuses.length;
  
  // Calculate active prints
  const activePrints = successfulStatuses.filter(status => status.is_printing).length;

  // Pre-fetch status for any new printers that might have been added 
  // (though the individual PrinterCard handles its own fetch, this helps populate the cache)
  useEffect(() => {
    if (printers) {
      printers.forEach(printer => {
        queryClient.prefetchQuery({
          queryKey: ["printerStatus", printer.id],
          queryFn: () => getPrinterStatus(printer),
        });
      });
    }
  }, [printers, queryClient]);

  return {
    totalPrinters: printers?.length || 0,
    onlineCount,
    activePrints,
    isLoading,
  };
};