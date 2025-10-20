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
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, PlusCircle, Cloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Helper function to validate URL/IP
const validateUrlOrIp = (val: string) => {
  if (!val) return false;
  let urlToTest = val;
  if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
    urlToTest = `http://${urlToTest}`;
  }
  try {
    new URL(urlToTest);
    return true;
  } catch {
    return false;
  }
};

const PrinterSchema = z.object({
  name: z.string().min(1, "Printer name is required."),
  connection_type: z.enum(["moonraker", "octoprint", "cloud_agent"], {
    required_error: "Please select a connection type.",
  }),
  base_url: z.string().optional(),
  api_key: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.connection_type !== 'cloud_agent') {
    if (!data.base_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["base_url"],
        message: "Printer address is required for this connection type.",
      });
    } else if (!validateUrlOrIp(data.base_url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["base_url"],
        message: "Must be a valid URL or IP address (e.g., 192.168.1.100:7125).",
      });
    }
  }
});

type PrinterFormValues = z.infer<typeof PrinterSchema>;

interface AddPrinterFormProps {
  onPrinterAdded: () => void;
}

const AddPrinterForm: React.FC<AddPrinterFormProps> = ({ onPrinterAdded }) => {
  const { user } = useSession();
  const form = useForm<PrinterFormValues>({
    resolver: zodResolver(PrinterSchema),
    defaultValues: {
      name: "",
      connection_type: "moonraker",
      base_url: "",
      api_key: "",
    },
    mode: "onChange",
  });
  
  const connectionType = form.watch("connection_type");
  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: PrinterFormValues) => {
    if (!user) {
      showError("User not authenticated.");
      return;
    }

    let printerData: any = {
      user_id: user.id,
      name: data.name,
      connection_type: data.connection_type,
    };

    if (data.connection_type === 'cloud_agent') {
      printerData.cloud_printer_id = crypto.randomUUID();
      printerData.base_url = 'cloud'; // Placeholder
    } else {
      let finalBaseUrl = data.base_url!;
      if (!finalBaseUrl.startsWith('http://') && !finalBaseUrl.startsWith('https://')) {
        finalBaseUrl = `http://${finalBaseUrl}`;
      }
      printerData.base_url = finalBaseUrl;
      printerData.api_key = data.api_key || null;
    }

    const { error } = await supabase.from("printers").insert(printerData);

    if (error) {
      console.error("Error adding printer:", error);
      showError(`Failed to add printer: ${error.message}`);
    } else {
      showSuccess(`Printer "${data.name}" added successfully!`);
      form.reset();
      onPrinterAdded();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Printer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <SelectItem value="moonraker">Local Network (Moonraker)</SelectItem>
                      <SelectItem value="octoprint">Local Network (OctoPrint)</SelectItem>
                      <SelectItem value="cloud_agent"><div className="flex items-center">Cloud Agent (via Obico-like service)<Cloud className="ml-2 h-4 w-4 text-blue-500"/></div></SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {connectionType === 'cloud_agent' ? (
              <div className="p-4 border rounded-lg bg-muted/50 text-sm text-muted-foreground">
                After creating the printer, you will be provided with a setup script to run on a device (like a Raspberry Pi) on your printer's local network.
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="base_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Printer Address (URL/IP)</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., 192.168.1.100:7125 or http://printer.local" {...field} />
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
              </>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Printer
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AddPrinterForm;