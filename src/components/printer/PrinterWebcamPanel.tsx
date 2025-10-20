import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Camera, Save, VideoOff, Loader2 } from "lucide-react";
import { Printer } from "@/types/printer";
import { updatePrinter } from "@/integrations/supabase/mutations";
import { showSuccess, showError } from "@/utils/toast";

const WebcamSchema = z.object({
  webcam_url: z.string().url("Must be a valid URL (e.g., http://...)").optional().or(z.literal("")),
});

type WebcamFormValues = z.infer<typeof WebcamSchema>;

interface PrinterWebcamPanelProps {
  printer: Printer;
}

const PrinterWebcamPanel: React.FC<PrinterWebcamPanelProps> = ({ printer }) => {
  const queryClient = useQueryClient();
  
  const form = useForm<WebcamFormValues>({
    resolver: zodResolver(WebcamSchema),
    defaultValues: {
      webcam_url: printer.webcam_url || "",
    },
    mode: "onChange",
  });

  const updateMutation = useMutation({
    mutationFn: updatePrinter,
    onSuccess: () => {
      showSuccess("Webcam URL updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["printerDetails", printer.id] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (data: WebcamFormValues) => {
    if (data.webcam_url !== printer.webcam_url) {
      updateMutation.mutate({ id: printer.id, webcam_url: data.webcam_url || null });
    }
  };

  const webcamUrl = form.watch("webcam_url");
  const isUrlSet = !!webcamUrl;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Camera className="h-5 w-5 mr-2" /> Live Stream
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video w-full bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
            {isUrlSet ? (
              <img 
                src={webcamUrl} 
                alt="Webcam Stream" 
                className="w-full h-full object-contain"
                // Add an error handler in case the stream URL is broken
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div className="text-center p-4">
                <VideoOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No webcam URL configured.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webcam Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="webcam_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webcam Stream URL (MJPEG or similar)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="E.g., http://192.168.1.100/webcam/?action=stream" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={!form.formState.isDirty || !form.formState.isValid || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Webcam Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterWebcamPanel;