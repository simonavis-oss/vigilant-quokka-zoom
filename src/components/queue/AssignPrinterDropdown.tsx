import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PrintQueueItem } from "@/types/print-queue";
import { assignPrintJob } from "@/integrations/supabase/functions";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import { useSession } from "@/context/SessionContext";

interface AssignPrinterDropdownProps {
  item: PrintQueueItem;
  disabled: boolean;
}

const fetchPrinters = async (userId: string): Promise<Printer[]> => {
  const { data, error } = await supabase.from("printers").select("*").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data as Printer[];
};

const AssignPrinterDropdown: React.FC<AssignPrinterDropdownProps> = ({ item, disabled }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  
  const { data: printers, isLoading: isLoadingPrinters } = useQuery<Printer[]>({
    queryKey: ["printers", user?.id],
    queryFn: () => fetchPrinters(user!.id),
    enabled: !!user?.id,
  });

  const assignMutation = useMutation({
    mutationFn: ({ jobId, printerId }: { jobId: string; printerId: string }) => assignPrintJob(jobId, printerId),
    onSuccess: (response) => {
      showSuccess(response.message);
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleSelect = (printerId: string) => {
    assignMutation.mutate({ jobId: item.id, printerId });
  };

  const isPending = assignMutation.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || isPending || isLoadingPrinters}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Printer"}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Select a Printer</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {printers && printers.length > 0 ? (
          printers.map((printer) => (
            <DropdownMenuItem key={printer.id} onSelect={() => handleSelect(printer.id)}>
              {printer.name}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No printers found</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AssignPrinterDropdown;