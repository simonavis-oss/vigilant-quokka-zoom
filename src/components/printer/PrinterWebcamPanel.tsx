import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera, Save, VideoOff } from "lucide-react";
import { Printer } from "@/types/printer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { showSuccess } from "@/utils/toast";

// Mock Webcam URL storage (in a real app, this would be stored in the DB/printer object)
const WebcamSchema = z.object({
  webcam_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type WebcamFormValues = z.infer<typeof WebcamSchema>;

interface PrinterWebcamPanelProps {
  printer: Printer;
}

const PrinterWebcamPanel: React.FC<PrinterWebcamPanelProps> = ({ printer }) => {
  const form = useForm<WebcamFormValues>({
    resolver: zodResolver(WebcamSchema),
    defaultValues: {
      webcam_url: "",
    },
    mode: "onChange",
  });

  const onSubmit = (data: WebcamFormValues) => {
    // In a real application, this would update the printer's webcam_url field in the database
    console.log("Saving webcam URL:", data.webcam_url);
    showSuccess(`Webcam URL saved for ${printer.name}.`);
    form.reset(data); // Reset form state to reflect saved data
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
              // In a real app, this would be an <img> or <video> tag pointing to the stream URL
              <div className="text-center p-4">
                <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Live stream placeholder. URL: {webcamUrl}
                </p>
              </div>
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
                disabled={!form.formState.isDirty || !form.formState.isValid}
              >
                <Save className="mr-2 h-4 w-4" /> Save Webcam Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterWebcamPanel;