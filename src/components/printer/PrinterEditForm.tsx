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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer } from "@/types/printer";
import { Loader2 } from "lucide-react";

// --- Schemas ---

const PrinterEditSchema = z.object({
  name: z.string().min(1, "Printer name is required."),
  connection_type: z.enum(["moonraker", "octoprint", "klipper_go"], {
    required_error: "Please select a connection type.",
  }),
  base_url: z.preprocess(
    (val) => {
      // Prepend http:// if no protocol is present, to allow IP addresses/hostnames
      if (typeof val === 'string' && val.length > 0 && !val.startsWith('http://') && !val.startsWith('https://')) {
        return `http://${val}`;
      }
      return val;
    },
    z.string().url("Must be a valid URL or IP address (e.g., http://192.168.1.100:7125)")
  ),
  api_key: z.string().optional(),
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
      // Note: printer.base_url already contains the protocol if added via the wizard
      base_url: printer.base_url, 
      api_key: printer.api_key || "",
    },
    mode: "onChange",
  });

  const handleSubmit = (data: PrinterFormValues) => {
    // Only submit fields that have changed
    const updates: Partial<Printer> = { id: printer.id };
    
    // Compare preprocessed data (data.base_url) with stored data (printer.base_url)
    if (data.name !== printer.name) updates.name = data.name;
    if (data.connection_type !== printer.connection_type) updates.connection_type = data.connection_type;
    if (data.base_url !== printer.base_url) updates.base_url = data.base_url;
    
    // Handle API key change (empty string should be treated as null in DB)
    const newApiKey = data.api_key || null;
    if (newApiKey !== printer.api_key) updates.api_key = newApiKey;

    if (Object.keys(updates).length > 1) { // Check if more than just 'id' is present
      onSubmit(updates);
    }
  };

  const connectionType = form.watch("connection_type");

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
                  <SelectItem value="octoprint">Octoprint</SelectItem>
                  <SelectItem value="klipper_go">Klipper Go / Marlin (Future Support)</SelectItem>
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
        
        {connectionType === "octoprint" && (
          <FormField
            control={form.control}
            name="api_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OctoPrint API Key (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter API Key" {...field} />
                </FormControl>
                <FormMessage />
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