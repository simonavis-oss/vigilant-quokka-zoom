import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, PlusCircle, Loader2 } from "lucide-react";
import { Printer } from "@/types/printer";
import { listPrinterFiles, PrinterFile } from "@/integrations/supabase/functions";
import { insertPrintJob } from "@/integrations/supabase/queueMutations";
import { useSession } from "@/context/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const PrinterFileManagementPanel: React.FC<{ printer: Printer }> = ({ printer }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const { data: files, isLoading, isError, error } = useQuery<PrinterFile[]>({
    queryKey: ["printerFiles", printer.id],
    queryFn: () => listPrinterFiles(printer.id),
  });

  const addMutation = useMutation({
    mutationFn: insertPrintJob,
    onSuccess: (data) => {
      showSuccess(`"${data.file_name}" added to the print queue.`);
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleAddToQueue = (fileName: string) => {
    if (!user) {
      showError("You must be logged in to add jobs to the queue.");
      return;
    }
    addMutation.mutate({ user_id: user.id, file_name: fileName });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading files from printer...</span>
        </div>
      );
    }

    if (isError) {
      return <p className="text-destructive">Failed to load files: {error.message}</p>;
    }

    if (!files || files.length === 0) {
      return <p className="text-muted-foreground">No .gcode files found on the printer.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.path}>
                <TableCell className="font-medium truncate max-w-[200px]">{file.path}</TableCell>
                <TableCell>{formatBytes(file.size)}</TableCell>
                <TableCell>{format(new Date(file.modified * 1000), 'MMM dd, yyyy HH:mm')}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleAddToQueue(file.path)}
                    disabled={addMutation.isPending && addMutation.variables?.file_name === file.path}
                  >
                    {addMutation.isPending && addMutation.variables?.file_name === file.path ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlusCircle className="h-4 w-4 mr-2" />
                    )}
                    Add to Queue
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" /> Stored Files
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default PrinterFileManagementPanel;