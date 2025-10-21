import React, { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { PrintJob } from "@/types/print-job";
import { Material } from "@/types/material";

const JobDetailsSchema = z.object({
  material_id: z.string().min(1, "Please select a material."),
  material_used_grams: z.coerce.number().min(0.1, "Must be a positive value."),
});

type JobDetailsFormValues = z.infer<typeof JobDetailsSchema>;

interface JobDetailsFormProps {
  job: PrintJob;
  materials: Material[];
  onSubmit: (data: Partial<PrintJob>) => void;
  isSubmitting: boolean;
}

const JobDetailsForm: React.FC<JobDetailsFormProps> = ({ job, materials, onSubmit, isSubmitting }) => {
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  const form = useForm<JobDetailsFormValues>({
    resolver: zodResolver(JobDetailsSchema),
    defaultValues: {
      material_id: job.material_id || "",
      material_used_grams: job.material_used_grams || 0,
    },
    mode: "onChange",
  });

  const selectedMaterialId = form.watch("material_id");
  const materialUsedGrams = form.watch("material_used_grams");

  useEffect(() => {
    if (selectedMaterialId && materialUsedGrams > 0) {
      const material = materials.find(m => m.id === selectedMaterialId);
      if (material) {
        const cost = (materialUsedGrams / 1000) * material.cost_per_kg;
        setCalculatedCost(cost);
      }
    } else {
      setCalculatedCost(null);
    }
  }, [selectedMaterialId, materialUsedGrams, materials]);

  const handleSubmit = (data: JobDetailsFormValues) => {
    onSubmit({
      id: job.id,
      material_id: data.material_id,
      material_used_grams: data.material_used_grams,
      cost: calculatedCost,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="material_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Material Used</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a material profile..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="material_used_grams"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Material Used (grams)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" placeholder="e.g., 45.5" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="p-3 border rounded-lg bg-muted/50">
          <p className="text-sm font-medium">Calculated Cost</p>
          <p className="text-2xl font-bold">
            {calculatedCost !== null ? `£${calculatedCost.toFixed(2)}` : "£0.00"}
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Details
        </Button>
      </form>
    </Form>
  );
};

export default JobDetailsForm;