import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Printer } from "@/types/printer";
import { Loader2, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";

// --- Schemas ---

const PrinterEditSchema = z.object({
  name: z.string().min(1, "Printer name is required."),
  connection_type: z.literal("moonraker"),
  base_url: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.length > 0 && !val.startsWith('http://') && !val.startsWith('https://')) {
        return `http://${val}`;
      }
      return val;
    },
    z.string().url("Must be a valid URL or IP address (e.g., http://192.168.1.100:7125)")
  ),
  api_key: z.string().optional(),
  ai_failure_detection_enabled: z.boolean().default(false),
});

type PrinterFormValues = z.infer<typeof PrinterEditSchema>;

// --- Component ---

interface PrinterEditFormProps {
  printer: Printer;
  onSubmit: (data: Partial<Printer>) => void;
  onDelete: () => void; // New prop for delete action
  isSubmitting: boolean;
}

const PrinterEditForm: React.FC<PrinterEditFormProps> = ({ printer, onSubmit, onDelete, isSubmitting }) => {
  const form = useForm<PrinterFormValues>({
    resolver: zodResolver(PrinterEditSchema),
    defaultValues: {
      name: printer.name,
      connection_type: printer.connection_type,
      base_url: printer.base_url, 
      api_key: printer.api_key || "",
      ai_failure_detection_enabled: printer.ai_failure_detection_enabled,
    },
    mode: "onChange",
  });

  const handleSubmit = (data: PrinterFormValues) => {
    const updates: Partial<Printer> = { id: printer.id };

    if (data.name !== printer.name) {
      updates.name = data.name;
    }
    if (data.base_url !== printer.base_url) {
      updates.base_url = data.base_url;
    }
    
    const oldApiKey = printer.api_key || "";
    const newApiKey = data.api_key || "";
    if (newApiKey !== oldApiKey) {
      updates.api_key = newApiKey || null;
    }

    if (data.ai_failure_detection_enabled !== printer.ai_failure_detection_enabled) {
      updates.ai_failure_detection_enabled = data.ai_failure_detection_enabled;
    }

    // Only submit if there are actual changes
    if (Object.keys(updates).length > 1) {
      onSubmit(updates);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Printer Name</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Ender 3 Pro - Farm 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormItem>
          <FormLabel>Connection Type</FormLabel>
          <div className="p-3 border rounded-lg bg-muted/50 text-sm font-medium">
            Local Network (Moonraker)
          </div>
          <FormDescription>
            The system is configured for local network communication only.
          </FormDescription>
        </FormItem>
        
        <FormField
          control={form.control}
          name="base_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Printer Address (URL/IP)</FormLabel>
              <FormControl>
                <Input placeholder="E.g., http://192.168.1.100:7125" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="api_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Moonraker API Key (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter API Key if required by your setup" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ai_failure_detection_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">AI Failure Detection</FormLabel>
                <FormDescription>
                  Requires a webcam. The system will monitor the print for failures.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-between items-center pt-4 border-t">
          <DeleteConfirmationDialog
            onConfirm={onDelete}
            title={`Delete printer "${printer.name}"?`}
            description="This will permanently remove the printer and all associated data. This action cannot be undone."
            triggerButton={
              <Button variant="destructive" type="button" disabled={isSubmitting}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Printer
              </Button>
            }
          />
          <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PrinterEditForm;