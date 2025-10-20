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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer } from "@/types/printer";
import { Loader2, Cloud } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// --- Schemas ---

const PrinterEditSchema = z.object({
  name: z.string().min(1, "Printer name is required."),
  connection_type: z.enum(["moonraker", "cloud_agent"], {
    required_error: "Please select a connection type.",
  }),
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
  isSubmitting: boolean;
}

const PrinterEditForm: React.FC<PrinterEditFormProps> = ({ printer, onSubmit, isSubmitting }) => {
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
    
    if (data.name !== printer.name) updates.name = data.name;
    if (data.connection_type !== printer.connection_type) updates.connection_type = data.connection_type;
    if (data.base_url !== printer.base_url) updates.base_url = data.base_url;
    if (data.ai_failure_detection_enabled !== printer.ai_failure_detection_enabled) {
      updates.ai_failure_detection_enabled = data.ai_failure_detection_enabled;
    }
    
    const newApiKey = data.api_key || null;
    if (newApiKey !== printer.api_key) updates.api_key = newApiKey;

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
        
        <FormField
          control={form.control}
          name="connection_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="moonraker">Moonraker / Mainsail / Fluid (Recommended)</SelectItem>
                  <SelectItem value="cloud_agent"><div className="flex items-center">Cloud Agent<Cloud className="ml-2 h-4 w-4 text-blue-500"/></div></SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="base_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Printer Address (URL/IP)</FormLabel>
              <FormControl>
                <Input placeholder="E.g., http://192.168.1.100:7125" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {printer.connection_type === 'cloud_agent' && (
          <FormField
            control={form.control}
            name="ai_failure_detection_enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">AI Failure Detection</FormLabel>
                  <FormDescription>
                    Requires a webcam. The cloud agent will monitor the print for failures.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}
        
        <Button type="submit" disabled={isSubmitting || !form.formState.isDirty || !form.formState.isValid}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
};

export default PrinterEditForm;