import React, { useState } from "react";
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

// --- Schemas ---

const Step1Schema = z.object({
  name: z.string().min(1, "Printer name is required."),
  connection_type: z.enum(["moonraker", "octoprint", "klipper_go"], {
    required_error: "Please select a connection type.",
  }),
});

const Step2Schema = z.object({
  base_url: z.string().url("Must be a valid URL (e.g., http://192.168.1.100)"),
  api_key: z.string().optional(),
});

const FullSchema = Step1Schema.merge(Step2Schema);

type PrinterFormValues = z.infer<typeof FullSchema>;

// --- Component ---

const PrinterConnectionWizard = ({ onPrinterAdded }: { onPrinterAdded: () => void }) => {
  const { user } = useSession();
  const [step, setStep] = useState(1);
  const form = useForm<PrinterFormValues>({
    resolver: zodResolver(FullSchema),
    defaultValues: {
      name: "",
      connection_type: "moonraker",
      base_url: "",
      api_key: "",
    },
    mode: "onChange",
  });

  const { trigger, getValues, formState: { isValid } } = form;

  const handleNext = async () => {
    if (step === 1) {
      const step1Valid = await trigger(["name", "connection_type"]);
      if (step1Valid) {
        setStep(2);
      }
    }
  };

  const onSubmit = async (data: PrinterFormValues) => {
    if (!user) {
      showError("User not authenticated.");
      return;
    }

    const { error } = await supabase.from("printers").insert({
      user_id: user.id,
      name: data.name,
      connection_type: data.connection_type,
      base_url: data.base_url,
      api_key: data.api_key || null,
    });

    if (error) {
      console.error("Error adding printer:", error);
      showError(`Failed to add printer: ${error.message}`);
    } else {
      showSuccess(`Printer "${data.name}" added successfully!`);
      form.reset();
      setStep(1);
      onPrinterAdded();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
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
          </div>
        );
      case 2:
        const type = getValues("connection_type");
        return (
          <div className="space-y-4">
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
            {type === "octoprint" && (
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
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {renderStep()}

        <div className="flex justify-between pt-4">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button type="button" onClick={handleNext} disabled={!isValid}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={!isValid}>
              Connect Printer
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};

export default PrinterConnectionWizard;