import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PrintJob } from "@/types/print-job";
import { Printer } from "@/types/printer";
import { format } from "date-fns";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface JobDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  jobs: PrintJob[];
  printers: Printer[] | undefined;
}

const getStatusBadge = (status: PrintJob["status"]) => {
  switch (status) {
    case "success":
      return (
        <Badge
          variant="default"
          className="bg-green-500 hover:bg-green-500/80"
        >
          <CheckCircle className="h-3 w-3 mr-1" /> Success
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" /> Failed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="secondary">
          <AlertTriangle className="h-3 w-3 mr-1" /> Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const JobDetailsDialog: React.FC<JobDetailsDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  jobs,
  printers,
}) => {
  const getPrinterName = (printerId: string) => {
    return (
      printers?.find((p) => p.id === printerId)?.name ||
      printerId.substring(0, 8)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Printer</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium truncate max-w-xs">
                    {job.file_name}
                  </TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>{getPrinterName(job.printer_id)}</TableCell>
                  <TableCell>
                    {format(new Date(job.started_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailsDialog;