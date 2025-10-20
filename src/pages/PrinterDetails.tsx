import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Camera, Zap, LayoutDashboard, Send, Loader2, Trash2, CheckCircle, FileText, History, Pause, XCircle, Play, Cloud } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPrinterStatus, PrinterStatus, sendPrinterCommand, pausePrint, resumePrint, cancelActivePrint } from "@/integrations/supabase/functions";
import { Progress } from "@/components/ui/progress";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { deletePrinter, updatePrinter } from "@/integrations/supabase/mutations";
import PrinterEditForm from "@/components/printer/PrinterEditForm";
import PrinterControlPanel from "@/components/printer/PrinterControlPanel";
import PrinterWebcamPanel from "@/components/printer/PrinterWebcamPanel";
import PrinterFileManagementPanel from "@/components/printer/PrinterFileManagementPanel";
import PrintJobHistoryPanel from "@/components/printer/PrintJobHistoryPanel";
import CancellationDialog from "@/components/CancellationDialog";
import CloudPrinterSetup from "@/components/printer/CloudPrinterSetup";

// --- Data Fetching ---

const fetchPrinterDetails = async (printerId: string): Promise<Printer> => {
  const { data, error } = await supabase
    .from("printers")
    .select("*")
    .eq("id", printerId)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Printer not found.");
  return data as Printer;
};

// --- Components ---

const PrinterOverviewTab = ({ printer }: { printer: Printer }) => {
  const queryClient = useQueryClient();
  const { data: status, isLoading: isStatusLoading, isError: isStatusError } = useQuery<PrinterStatus>({
    queryKey: ["printerStatus", printer.id],
    queryFn: () => getPrinterStatus(printer),
    refetchInterval: 5000,
  });

  const pauseMutation = useMutation({
    mutationFn: () => pausePrint(printer),
    onSuccess: () => {
      showSuccess(`Pause command sent to ${printer.name}.`);
      queryClient.invalidateQueries({ queryKey: ["printerStatus", printer.id] });
    },
    onError: (err) => showError(`Failed to pause: ${err.message}`),
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumePrint(printer),
    onSuccess: () => {
      showSuccess(`Resume command sent to ${printer.name}.`);
      queryClient.invalidateQueries({ queryKey: ["printerStatus", printer.id] });
    },
    onError: (err) => showError(`Failed to resume: ${err.message}`),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelActivePrint(printer.id, reason),
    onSuccess: (data) => {
      showSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["printerStatus", printer.id] });
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      queryClient.invalidateQueries({ queryKey: ["printJobs"] });
    },
    onError: (err) => showError(`Failed to cancel: ${err.message}`),
  });

  if (isStatusLoading) {
    return <Card><CardHeader><CardTitle>Real-time Status</CardTitle></CardHeader><CardContent className="flex items-center space-x-2"><Loader2 className="h-5 w-5 animate-spin" /><p>Connecting to printer...</p></CardContent></Card>;
  }

  if (isStatusError || !status) {
    return <Card><CardHeader><CardTitle>Real-time Status</CardTitle></CardHeader><CardContent><p className="text-destructive">Connection Error</p><p className="text-muted-foreground text-sm mt-1">Could not retrieve status. For local printers, check the connection URL. For cloud printers, ensure the agent is running.</p></CardContent></Card>;
  }
  
  const statusText = status.is_printing ? (status.is_paused ? `Paused (${status.progress}%)` : `Printing (${status.progress}%)`) : "Idle";

  return (
    <Card>
      <CardHeader><CardTitle>Real-time Status</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="font-medium">Status</p><p className="text-lg font-bold">{statusText}</p></div>
          <div><p className="font-medium">File</p><p className="text-lg font-bold truncate">{status.file_name}</p></div>
        </div>
        {status.is_printing && (<div className="space-y-2"><p className="font-medium">Progress</p><Progress value={status.progress} className="w-full" /><p className="text-sm text-muted-foreground">{status.time_remaining} remaining</p></div>)}
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div><p className="font-medium">Nozzle Temp</p><p className="text-lg font-bold">{status.nozzle_temp}</p></div>
          <div><p className="font-medium">Bed Temp</p><p className="text-lg font-bold">{status.bed_temp}</p></div>
        </div>
        {status.is_printing && (
          <div className="pt-4 border-t grid grid-cols-2 gap-4">
            {status.is_paused ? (<Button variant="outline" onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending || cancelMutation.isPending}>{resumeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Resume</Button>) : (<Button variant="outline" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending || cancelMutation.isPending}>{pauseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}Pause</Button>)}
            <CancellationDialog onConfirm={(reason) => cancelMutation.mutate(reason)} title={`Cancel print on ${printer.name}?`} description="This will stop the current print job and move it to your history. Please provide a reason." triggerButton={<Button variant="destructive" disabled={pauseMutation.isPending || cancelMutation.isPending || resumeMutation.isPending}>{cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}Cancel</Button>} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Main Page Component ---

const PrinterDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: printer, isLoading, isError, error } = useQuery<Printer>({
    queryKey: ["printerDetails", id],
    queryFn: () => fetchPrinterDetails(id!),
    enabled: !!id,
  });
  
  const deleteMutation = useMutation({
    mutationFn: deletePrinter,
    onSuccess: () => {
      showSuccess(`Printer "${printer?.name}" successfully removed.`);
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      navigate("/", { replace: true });
    },
    onError: (err) => showError(err.message),
  });
  
  const updateMutation = useMutation({
    mutationFn: updatePrinter,
    onSuccess: (data, variables) => {
      showSuccess(`Printer "${variables.name || printer?.name}" updated successfully.`);
      queryClient.invalidateQueries({ queryKey: ["printerDetails", id] });
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
    onError: (err) => showError(err.message),
  });
  
  const testConnectionMutation = useMutation({
    mutationFn: (p: Printer) => getPrinterStatus(p),
    onSuccess: (status) => showSuccess(`Connection successful! Printer is currently ${status.is_printing ? 'printing' : 'idle'}.`),
    onError: (err) => showError(`Connection failed: ${err.message}`),
  });
  
  const emergencyStopMutation = useMutation({
    mutationFn: (p: Printer) => sendPrinterCommand(p, "M112"),
    onSuccess: () => {
      showSuccess(`Emergency Stop command sent to ${printer?.name}.`);
      queryClient.invalidateQueries({ queryKey: ["printerStatus", id] });
    },
    onError: (err) => showError(`Emergency Stop failed: ${err.message}`),
  });

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-1/3" /><div className="grid grid-cols-5 gap-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div><Skeleton className="h-[500px] w-full" /></div>;
  }

  if (isError) {
    showError(`Error loading printer: ${error.message}`);
    return <div className="text-center p-8"><h2 className="text-xl font-semibold text-destructive">Error</h2><p className="text-muted-foreground">Could not load printer details.</p><Button onClick={() => navigate("/")} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button></div>;
  }

  if (!printer) {
    return <div className="text-center p-8"><h2 className="text-xl font-semibold">Printer Not Found</h2><p className="text-muted-foreground">The requested printer does not exist.</p><Button onClick={() => navigate("/")} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Button></div>;
  }

  const isCloudPrinter = printer.connection_type === 'cloud_agent';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center"><Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mr-2"><ArrowLeft className="h-5 w-5" /></Button>{printer.name}</h1>
        <DeleteConfirmationDialog onConfirm={() => emergencyStopMutation.mutate(printer)} title={`Confirm Emergency Stop for ${printer.name}`} description="This will immediately halt all printer operations. Use only in emergencies." triggerButton={<Button variant="destructive" disabled={emergencyStopMutation.isPending}>{emergencyStopMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}Emergency Stop</Button>} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 md:w-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="h-4 w-4 mr-2" /> Overview</TabsTrigger>
          <TabsTrigger value="control"><Send className="h-4 w-4 mr-2" /> Control</TabsTrigger>
          <TabsTrigger value="files"><FileText className="h-4 w-4 mr-2" /> Files</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" /> History</TabsTrigger>
          <TabsTrigger value="webcam"><Camera className="h-4 w-4 mr-2" /> Webcam</TabsTrigger>
          <TabsTrigger value="settings">{isCloudPrinter ? <Cloud className="h-4 w-4 mr-2" /> : <Settings className="h-4 w-4 mr-2" />} Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6"><PrinterOverviewTab printer={printer} /></TabsContent>
        <TabsContent value="control" className="mt-6"><PrinterControlPanel printer={printer} /></TabsContent>
        <TabsContent value="files" className="mt-6"><PrinterFileManagementPanel printer={printer} /></TabsContent>
        <TabsContent value="history" className="mt-6"><PrintJobHistoryPanel printer={printer} /></TabsContent>
        <TabsContent value="webcam" className="mt-6"><PrinterWebcamPanel printer={printer} /></TabsContent>
        <TabsContent value="settings" className="mt-6 space-y-6">
          {isCloudPrinter ? <CloudPrinterSetup printer={printer} /> : (
            <Card>
              <CardHeader><CardTitle>Printer Configuration</CardTitle></CardHeader>
              <CardContent>
                <PrinterEditForm printer={printer} onSubmit={(updates) => updateMutation.mutate(updates)} isSubmitting={updateMutation.isPending} />
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-2">Connection Test</h3>
                  <p className="text-sm text-muted-foreground mb-4">Verify communication with your printer.</p>
                  <Button onClick={() => testConnectionMutation.mutate(printer)} disabled={testConnectionMutation.isPending}>{testConnectionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}Test Connection</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="border-destructive">
            <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Permanently remove this printer from your farm.</p>
              <DeleteConfirmationDialog onConfirm={() => deleteMutation.mutate(printer.id)} title={`Are you absolutely sure?`} description={`This will permanently delete "${printer.name}". This cannot be undone.`} triggerButton={<Button variant="destructive" disabled={deleteMutation.isPending}>{deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete Printer</Button>} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrinterDetails;