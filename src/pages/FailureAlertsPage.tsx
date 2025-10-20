import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Printer, CheckCircle, XCircle, Info } from "lucide-react";
import { fetchFailureAlerts, FailureAlert } from "@/integrations/supabase/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { updateFailureAlertStatus } from "@/integrations/supabase/mutations";
import { showSuccess, showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const getStatusBadge = (status: FailureAlert['status']) => {
  switch (status) {
    case 'detected':
      return <Badge variant="destructive" className="bg-yellow-600 hover:bg-yellow-600/90">Detected</Badge>;
    case 'ignored':
      return <Badge variant="secondary">Ignored</Badge>;
    case 'resolved':
      return <Badge className="bg-green-500 hover:bg-green-500/90">Resolved</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const FailureAlertsPage: React.FC = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  
  const { data: alerts, isLoading, isError } = useQuery<FailureAlert[]>({
    queryKey: ["failureAlerts", user?.id],
    queryFn: () => fetchFailureAlerts(user!.id),
    enabled: !!user?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: updateFailureAlertStatus,
    onSuccess: () => {
      showSuccess("Alert status updated.");
      queryClient.invalidateQueries({ queryKey: ["failureAlerts"] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleResolve = (alertId: string) => {
    updateStatusMutation.mutate({ alertId, status: 'resolved' });
  };

  const handleIgnore = (alertId: string) => {
    updateStatusMutation.mutate({ alertId, status: 'ignored' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !alerts) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-destructive">Error</h2>
        <p className="text-muted-foreground">Could not load failure alerts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center"><AlertTriangle className="h-7 w-7 mr-3" /> Failure Alert History</h1>
      
      <Card>
        <CardHeader><CardTitle>All Alerts ({alerts.length})</CardTitle></CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">No AI failure alerts have been recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Printer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Screenshot</TableHead>
                    <TableHead>Detected At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="flex items-center"><Printer className="h-4 w-4 mr-2 text-muted-foreground" />{alert.printers?.name || 'Unknown'}</TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell>
                        {alert.screenshot_url ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-blue-500 cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <img src={alert.screenshot_url} alt="Snapshot" className="w-full h-auto rounded-md" />
                                <p className="text-xs mt-1">Snapshot URL (may require local access)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(alert.created_at), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {alert.status === 'detected' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleIgnore(alert.id)} disabled={updateStatusMutation.isPending}>
                              Ignore
                            </Button>
                            <Button variant="default" size="sm" onClick={() => handleResolve(alert.id)} disabled={updateStatusMutation.isPending}>
                              Resolve
                            </Button>
                          </>
                        )}
                        {alert.status === 'ignored' && (
                          <Button variant="default" size="sm" onClick={() => handleResolve(alert.id)} disabled={updateStatusMutation.isPending}>
                            Mark Resolved
                          </Button>
                        )}
                      </TableCell>
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

export default FailureAlertsPage;