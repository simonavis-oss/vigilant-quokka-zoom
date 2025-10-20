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
import { Loader2, PlusCircle } from "lucide-react";
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
  connection_type: z.enum(["moonraker", "octoprint", "klipper_go", "obico"], {
    required_error: "Please select a connection type.",
  }),
  base_url: z.string().optional(),
  api_key: z.string().optional(),
  cloud_printer_id: z.string().optional(),
}).superRefine((data, ctx) => {
  if (["moonraker", "octoprint"].includes(data.connection_type)) {
    if (!data.base_url || !validateUrlOrIp(data.base_url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A valid URL or IP address is required for this connection type.",
        path: ["base_url"],
      });
    }
  }
  if (data.connection_type === "obico") {
    if (!data.api_key) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Obico API Key is required.", path: ["api_key"] });
    }
    if (!data.cloud_printer_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Obico Printer ID is required.", path: ["cloud_printer_id"] });
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
      cloud_printer_id: "",
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

    let finalBaseUrl = data.base_url;
    if (finalBaseUrl && !finalBaseUrl.startsWith('http://') && !finalBaseUrl.startsWith('https://')) {
      finalBaseUrl = `http://${finalBaseUrl}`;
    }

    const { error } = await supabase.from("printers").insert({
      user_id: user.id,
      name: data.name,
      connection_type: data.connection_type,
      base_url: finalBaseUrl || null,
      api_key: data.api_key || null,
      cloud_printer_id: data.cloud_printer_id || null,
    });

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
                      <SelectItem value="moonraker">Moonraker / Mainsail / Fluid (Local)</SelectItem>
                      <SelectItem value="octoprint">OctoPrint (Local)</SelectItem>
                      <SelectItem value="obico">Obico (Cloud)</SelectItem>
                      <SelectItem value="klipper_go" disabled>Klipper Go (Future Support)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {["moonraker", "octoprint"].includes(connectionType) && (
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
            )}
            
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

            {connectionType === "obico" && (
              <>
                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obico API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your Obico API key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cloud_printer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obico Printer ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the Printer ID from Obico" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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