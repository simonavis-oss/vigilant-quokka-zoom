import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Camera, Save, Loader2 } from "lucide-react";
import { Printer } from "@/types/printer";
import { updatePrinter } from "@/integrations/supabase/mutations";
import { showSuccess, showError } from "@/utils/toast";
import WebcamStream from "./WebcamStream";

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
    // Convert empty string to null for database storage
    const newUrl = data.webcam_url || null;
    const currentUrl = printer.webcam_url || null;

    if (newUrl !== currentUrl) {
      updateMutation.mutate({ id: printer.id, webcam_url: newUrl });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Camera className="h-5 w-5 mr-2" /> Live Stream
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WebcamStream webcamUrl={printer.webcam_url} printerId={printer.id} />
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