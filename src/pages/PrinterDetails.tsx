import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import { showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Camera, Zap, LayoutDashboard, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

const PrinterDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: printer, isLoading, isError, error } = useQuery<Printer>({
    queryKey: ["printer", id],
    queryFn: () => fetchPrinterDetails(id!),
    enabled: !!id,
  });

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
          <Card>
            <CardHeader>
              <CardTitle>Real-time Status (Mock)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Printer Status: {printer.is_online ? "Connected" : "Disconnected"}</p>
              <p className="mt-2 text-muted-foreground">
                This section will eventually display live data, print progress, and AI detection status.
              </p>
            </CardContent>
          </Card>
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
        
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Printer Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Connection URL: {printer.base_url}</p>
              <p>Type: {printer.connection_type}</p>
              <p className="mt-2 text-muted-foreground">
                Advanced settings and connection details will be managed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrinterDetails;