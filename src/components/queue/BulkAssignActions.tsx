import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer as PrinterIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bulkAssignPrintJobs } from "@/integrations/supabase/functions";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import { useSession } from "@/context/SessionContext";

interface BulkAssignActionsProps {
  selectedJobIds: string[];
  onClearSelection: () => void;
}

const fetchPrinters = async (userId: string): Promise<Printer[]> => {
  const { data, error } = await supabase.from("printers").select("*").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data as Printer[];
};

const BulkAssignActions: React.FC<BulkAssignActionsProps> = ({ selectedJobIds, onClearSelection }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null);
  
  const { data: printers, isLoading: isLoadingPrinters } = useQuery<Printer[]>({
    queryKey: ["printers", user?.id],
    queryFn: () => fetchPrinters(user!.id),
    enabled: !!user?.id,
  });

  const assignMutation = useMutation({
    mutationFn: ({ jobIds, printerId }: { jobIds: string[]; printerId: string }) => bulkAssignPrintJobs(jobIds, printerId),
    onSuccess: (response) => {
      showSuccess(response.message);
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      onClearSelection();
      setSelectedPrinterId(null);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleAssign = () => {
    if (!selectedPrinterId) {
      showError("Please select a printer to assign the jobs to.");
      return;
    }
    assignMutation.mutate({ jobIds: selectedJobIds, printerId: selectedPrinterId });
  };

  const isPending = assignMutation.isPending;

  return (
    <div className="p-4 border rounded-lg bg-card flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <p className="text-sm font-medium">
          {selectedJobIds.length} job(s) selected
        </p>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4 mr-2" />
          Clear Selection
        </Button>
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto">
        <Select onValueChange={setSelectedPrinterId} disabled={isLoadingPrinters || isPending}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Select a printer..." />
          </SelectTrigger>
          <SelectContent>
            {printers && printers.length > 0 ? (
              printers.map((printer) => (
                <SelectItem key={printer.id} value={printer.id}>
                  {printer.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>No printers found</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleAssign}
          disabled={!selectedPrinterId || isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PrinterIcon className="h-4 w-4 mr-2" />}
          Assign
        </Button>
      </div>
    </div>
  );
};

export default BulkAssignActions;