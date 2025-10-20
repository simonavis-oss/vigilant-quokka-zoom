import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ListOrdered, Loader2, Printer } from "lucide-react";
import { fetchPrintQueue } from "@/integrations/supabase/queries";
import { PrintQueueItem } from "@/types/print-queue";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import QueueItemActions from "@/components/queue/QueueItemActions";
import AddJobToQueueDialog from "@/components/queue/AddJobToQueueDialog";

const getStatusBadge = (status: PrintQueueItem['status']) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    case 'assigned':
      return <Badge className="bg-blue-500 hover:bg-blue-500/80">Assigned</Badge>;
    case 'printing':
      return <Badge className="bg-green-600 hover:bg-green-600/80"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Printing</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const PrintQueuePage: React.FC = () => {
  const { user } = useSession();
  
  const { data: queue, isLoading, isError } = useQuery<PrintQueueItem[]>({
    queryKey: ["printQueue", user?.id],
    queryFn: () => fetchPrintQueue(user!.id),
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !queue) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-destructive">Error</h2>
        <p className="text-muted-foreground">Could not load print queue.</p>
      </div>
    );
  }
  
  const pendingJobs = queue.filter(job => job.status === 'pending');
  const activeJobs = queue.filter(job => job.status === 'assigned' || job.status === 'printing');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center"><ListOrdered className="h-7 w-7 mr-3" /> Print Queue</h1>
        <AddJobToQueueDialog />
      </div>
      
      <Card>
        <CardHeader><CardTitle>Active & Assigned Jobs ({activeJobs.length})</CardTitle></CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <p className="text-muted-foreground">No jobs are currently printing or assigned.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Printer</TableHead>
                    <TableHead>Assigned At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium truncate max-w-[150px] md:max-w-none">{job.file_name}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="flex items-center"><Printer className="h-4 w-4 mr-2 text-muted-foreground" />{job.printers?.name || 'N/A'}</TableCell>
                      <TableCell>{job.assigned_at ? format(new Date(job.assigned_at), 'MMM dd, HH:mm') : 'N/A'}</TableCell>
                      <TableCell className="text-right"><QueueItemActions item={job} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pending Jobs ({pendingJobs.length})</CardTitle></CardHeader>
        <CardContent>
          {pendingJobs.length === 0 ? (
            <p className="text-muted-foreground">The pending queue is empty.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium truncate max-w-[150px] md:max-w-none">{job.file_name}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>{job.priority}</TableCell>
                      <TableCell>{format(new Date(job.created_at), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell className="text-right"><QueueItemActions item={job} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintQueuePage;