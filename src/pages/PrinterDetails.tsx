import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer } from "@/types/printer";
import { fetchPrinterDetails, updatePrinter } from "@/integrations/supabase/mutations";
import { fetchPrintJobs } from "@/integrations/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer as PrinterIcon, Settings, History, Camera, BarChart3, Brain } from "lucide-react";
import PrinterStatusDisplay from "@/components/printer/PrinterStatusDisplay";
import PrinterControlPanel from "@/components/printer/PrinterControlPanel";
import PrinterWebcamPanel from "@/components/printer/PrinterWebcamPanel";
import PrintJobHistoryPanel from "@/components/printer/PrintJobHistoryPanel";
import PrinterFileManagementPanel from "@/components/printer/PrinterFileManagementPanel";
import MaintenanceLogPanel from "@/components/printer/MaintenanceLogPanel";
import BedMeshVisualizer from "@/components/printer/BedMeshVisualizer";
import MacroManagementPanel from "@/components/printer/MacroManagementPanel";
import AmsManagementPanel from "@/components/printer/AmsManagementPanel";
import AISettingsPanel from "@/components/printer/AISettingsPanel";
import PrinterEditForm from "@/components/printer/PrinterEditForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAIFailureDetection } from "@/hooks/useAIFailureDetection";

const PrinterDetails = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: printer, isLoading: isPrinterLoading, isError: isPrinterError } = useQuery<Printer>({
    queryKey: ["printerDetails", id],
    queryFn: () => fetchPrinterDetails(id!),
    enabled: !!id,
  });

  const { data: jobs, isLoading: isJobsLoading } = useQuery({
    queryKey: ["printJobs", id],
    queryFn: () => fetchPrintJobs(id!),
    enabled: !!id,
  });

  // Enable AI failure detection if printer has it enabled
  const { isAnalyzing } = useAIFailureDetection({
    printerId: id || "",
    enabled: printer?.ai_failure_detection_enabled || false,
    interval: 30,
  });

  const handlePrinterUpdated = () => {
    setIsEditOpen(false);
    queryClient.invalidateQueries({ queryKey: ["printerDetails", id] });
  };

  if (isPrinterLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isPrinterError || !printer) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-destructive">Error</h2>
        <p className="text-muted-foreground">Could not load printer details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <PrinterIcon className="h-7 w-7 mr-3" /> {printer.name}
        </h1>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" /> Edit Printer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Printer Settings</DialogTitle>
            </DialogHeader>
            <PrinterEditForm 
              printer={printer} 
              onSubmit={handlePrinterUpdated} 
              isSubmitting={false} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Printer Status</CardTitle>
          </CardHeader>
          <CardContent>
            <PrinterStatusDisplay 
              status={printer.status} 
              isOnline={printer.is_online} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Home All Axes
              </Button>
              <Button variant="outline" className="w-full">
                Preheat PLA
              </Button>
              <Button variant="outline" className="w-full">
                Disable Steppers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="control" className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-8 w-full">
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="webcam">Webcam</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="macros">Macros</TabsTrigger>
          <TabsTrigger value="ams">AMS</TabsTrigger>
          <TabsTrigger value="ai">
            <Brain className="h-4 w-4 mr-2" />AI Detection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="mt-6">
          <PrinterControlPanel printer={printer} />
        </TabsContent>

        <TabsContent value="webcam" className="mt-6">
          <PrinterWebcamPanel printer={printer} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <PrinterFileManagementPanel printer={printer} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <PrintJobHistoryPanel printer={printer} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <div className="space-y-6">
            <MaintenanceLogPanel printer={printer} />
            <BedMeshVisualizer printer={printer} />
          </div>
        </TabsContent>

        <TabsContent value="macros" className="mt-6">
          <MacroManagementPanel printer={printer} />
        </TabsContent>

        <TabsContent value="ams" className="mt-6">
          <AmsManagementPanel printer={printer} />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AISettingsPanel printer={printer} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrinterDetails;