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
import AutoDiscoverySuggestions from "./AutoDiscoverySuggestions";

// Helper function to validate URL/IP
const validateUrlOrIp = (val: string) => {
  if (!val) return false;
  let urlToTest = val;
  // Prepend http:// if missing for validation purposes
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
  connection_type: z.literal("moonraker"),
  base_url: z.string().min(1, "Printer address is required."),
  api_key: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!validateUrlOrIp(data.base_url)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["base_url"],
      message: "Must be a valid URL or IP address (e.g., 192.168.1.100:7125).",
    });
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
  
  const isSubmitting = form.formState.isSubmitting;

  const handleSelectSuggestion = (url: string) => {
    form.setValue("base_url", url, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (data: PrinterFormValues) => {
    if (!user) {
      showError("User not authenticated.");
      return;
    }

    let finalBaseUrl = data.base_url!;
    // Ensure protocol is present before saving
    if (!finalBaseUrl.startsWith('http://') && !finalBaseUrl.startsWith('https://')) {
      finalBaseUrl = `http://${finalBaseUrl}`;
    }

    const printerData: any = {
      user_id: user.id,
      name: data.name,
      connection_type: data.connection_type,
      base_url: finalBaseUrl,
      api_key: data.api_key || null,
      cloud_printer_id: null, // Ensure cloud fields are null
    };

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
            <FormField
              control={form.control}
              name="api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moonraker API Key (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter API Key if required by your setup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AutoDiscoverySuggestions onSelect={handleSelectSuggestion} />

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