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
  connection_type: z.enum(["moonraker", "octoprint", "klipper_go"], {
    required_error: "Please select a connection type.",
  }),
  base_url: z.string()
    .min(1, "Printer address is required.")
    .refine(validateUrlOrIp, {
      message: "Must be a valid URL or IP address (e.g., 192.168.1.100:7125).",
    }),
  api_key: z.string().optional(),
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

    // Manually ensure the URL has a protocol before saving to DB
    let finalBaseUrl = data.base_url;
    if (!finalBaseUrl.startsWith('http://') && !finalBaseUrl.startsWith('https://')) {
      finalBaseUrl = `http://${finalBaseUrl}`;
    }

    const { error } = await supabase.from("printers").insert({
      user_id: user.id,
      name: data.name,
      connection_type: data.connection_type,
      base_url: finalBaseUrl, // Use the protocol-prefixed URL for DB storage
      api_key: data.api_key || null,
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
                      <SelectItem value="moonraker">Moonraker / Mainsail / Fluid (Recommended)</SelectItem>
                      <SelectItem value="octoprint">OctoPrint</SelectItem>
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