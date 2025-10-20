import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Camera, Zap, LayoutDashboard, Send, Loader2, Trash2, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPrinterStatus, PrinterStatus } from "@/integrations/supabase/functions";
import { Progress } from "@/components/ui/progress";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { deletePrinter, updatePrinter } from "@/integrations/supabase/mutations";
import PrinterEditForm from "@/components/printer/PrinterEditForm";

// --- Data Fetching ---

const fetchPrinterDetails = async (printerId: string): Promise<Printer> => {
  const { data, error } = await supabase
    .from("printers")
    .select("*")
    .eq("id", printerId)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Printer not found.");
  }
  return data as Printer;
};

// --- Components ---

const PrinterOverviewTab = ({ printerId }: { printerId: string }) => {
  const { data: status, isLoading: isStatusLoading, isError: isStatusError } = useQuery<PrinterStatus>({
    queryKey: ["printerStatus", printerId],
    queryFn: () => getPrinterStatus(printerId),
    refetchInterval: 5000, // Poll status every 5 seconds
  });

  if (isStatusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-time Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Connecting to printer...</p>
        </CardContent>
      </Card>
    );
  }

  if (isStatusError || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-time Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Connection Error</p>
          <p className="text-muted-foreground text-sm mt-1">
            Could not retrieve status from the printer. Check the connection URL in settings.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const statusText = status.is_printing ? `Printing (${status.progress}%)` : "Idle";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Status</p>
            <p className="text-lg font-bold">{statusText}</p>
          </div>
          <div>
            <p className="font-medium">File</p>
            <p className="text-lg font-bold truncate">{status.file_name}</p>
          </div>
        </div>

        {status.is_printing && (
          <div className="space-y-2">
            <p className="font-medium">Progress</p>
            <Progress value={status.progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{status.time_remaining} remaining</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <p className="font-medium">Nozzle Temp</p>
            <p className="text-lg font-bold">{status.nozzle_temp}</p>
          </div>
          <div>
            <p className="font-medium">Bed Temp</p>
            <p className="text-lg font-bold">{status.bed_temp}</p>
          </div>
        </div>
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
      queryClient.invalidateQueries({ queryKey: ["printers"] }); // Invalidate dashboard list
      navigate("/", { replace: true });
    },
    onError: (err) => {
      showError(err.message);
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: updatePrinter,
    onSuccess: (data, variables) => {
      showSuccess(`Printer "${variables.name || printer?.name}" updated successfully.`);
      queryClient.invalidateQueries({ queryKey: ["printerDetails", id] }); // Refetch details
      queryClient.invalidateQueries({ queryKey: ["printers"] }); // Update dashboard list
    },
    onError: (err) => {
      showError(err.message);
    },
  });
  
  const testConnectionMutation = useMutation({
    mutationFn: getPrinterStatus,
    onSuccess: (status) => {
      showSuccess(`Connection successful! Printer is currently ${status.is_printing ? 'printing' : 'idle'}.`);
    },
    onError: (err) => {
      showError(`Connection failed: ${err.message}`);
    },
  });
  
  const handleUpdate = (updates: Partial<Printer>) => {
    updateMutation.mutate(updates);
  };
  
  const handleDelete = () => {
    if (id) {
      deleteMutation.mutate(id);
    }
  };
  
  const handleTestConnection = () => {
    if (id) {
      testConnectionMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (isError) {
    showError(`Error loading printer: ${error.message}`);
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-destructive">Error</h2>
        <p className="text-muted-foreground">Could not load printer details.</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!printer) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold">Printer Not Found</h2>
        <p className="text-muted-foreground">The requested printer does not exist.</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {printer.name}
        </h1>
        <Button variant="destructive">
          <Zap className="mr-2 h-4 w-4" /> Emergency Stop
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:w-auto">
          <TabsTrigger value="overview" className="flex items-center">
            <LayoutDashboard className="h-4 w-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="control" className="flex items-center">
            <Send className="h-4 w-4 mr-2" /> Control
          </TabsTrigger>
          <TabsTrigger value="webcam" className="flex items-center">
            <Camera className="h-4 w-4 mr-2" /> Webcam
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" /> Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <PrinterOverviewTab printerId={printer.id} />
        </TabsContent>
        
        <TabsContent value="control" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Printer Control (Mock)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Here you will find controls for movement, heating, and starting/stopping prints.
              </p>
              <Button className="mt-4">Send G-Code</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="webcam" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Webcam Streaming (Mock)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This area will host the live webcam stream(s), snapshots, and timelapse controls.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Printer Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <PrinterEditForm 
                printer={printer} 
                onSubmit={handleUpdate} 
                isSubmitting={updateMutation.isPending} 
              />
              
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-2">Connection Test</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Verify that the application can successfully communicate with your printer using the current settings.
                </p>
                <Button 
                  onClick={handleTestConnection} 
                  disabled={testConnectionMutation.isPending}
                >
                  {testConnectionMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently remove this printer from your farm. This action cannot be undone.
              </p>
              <DeleteConfirmationDialog
                onConfirm={handleDelete}
                title={`Are you absolutely sure?`}
                description={`This action will permanently delete the printer "${printer.name}" and all associated data. This cannot be undone.`}
                triggerButton={
                  <Button variant="destructive" disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Printer
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrinterDetails;