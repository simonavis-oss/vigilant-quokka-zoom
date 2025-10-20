import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Info } from "lucide-react";
import { Printer } from "@/types/printer";
import { fetchPrintJobs, PrintJob } from "@/integrations/supabase/queries";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PrintJobHistoryPanelProps {
  printer: Printer;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
};

const getStatusBadge = (job: PrintJob) => {
  switch (job.status) {
    case 'success':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-500/80"><CheckCircle className="h-3 w-3 mr-1" /> Success</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
    case 'cancelled':
      return (
        <div className="flex items-center space-x-2">
          <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" /> Cancelled</Badge>
          {job.cancellation_reason && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{job.cancellation_reason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    default:
      return <Badge variant="outline">{job.status}</Badge>;
  }
};

const PrintJobHistoryPanel: React.FC<PrintJobHistoryPanelProps> = ({ printer }) => {
  const { data: jobs, isLoading, isError } = useQuery<PrintJob[]>({
    queryKey: ["printJobs", printer.id],
    queryFn: () => fetchPrintJobs(printer.id),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Print History</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading history...</span>
          </div>
          <Skeleton className="h-40 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !jobs) {
    return (
      <Card>
        <CardHeader><CardTitle>Print History</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load print history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" /> Print Job History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-muted-foreground">No print jobs recorded for this printer yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Material (g)</TableHead>
                  <TableHead className="text-right">Started At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium truncate max-w-[150px] md:max-w-none">{job.file_name}</TableCell>
                    <TableCell>{getStatusBadge(job)}</TableCell>
                    <TableCell className="text-right">{formatDuration(job.duration_seconds)}</TableCell>
                    <TableCell className="text-right">{job.material_used_grams?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{format(new Date(job.started_at), 'MMM dd, HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrintJobHistoryPanel;