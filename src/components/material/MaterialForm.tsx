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
import { Loader2 } from "lucide-react";
import { Material } from "@/types/material";

// --- Schemas ---

const MaterialSchema = z.object({
  name: z.string().min(1, "Name is required.").max(50),
  type: z.string().min(1, "Type is required (e.g., PLA, ABS).").max(50),
  color: z.string().optional(),
  density_g_cm3: z.coerce.number().min(0.5, "Density must be positive.").max(5.0),
  cost_per_kg: z.coerce.number().min(0.01, "Cost must be positive."),
});

type MaterialFormValues = z.infer<typeof MaterialSchema>;

// --- Component ---

interface MaterialFormProps {
  initialData?: Material;
  onSubmit: (data: MaterialFormValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

const MaterialForm: React.FC<MaterialFormProps> = ({ initialData, onSubmit, isSubmitting, onCancel }) => {
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(MaterialSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "",
      color: initialData?.color || "",
      density_g_cm3: initialData?.density_g_cm3 || 1.24,
      cost_per_kg: initialData?.cost_per_kg || 16.0, // Default to £
    },
    mode: "onChange",
  });

  const handleSubmit = (data: MaterialFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material Name</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., Polymaker PLA Pro White" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material Type</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., PLA, PETG, ABS" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., White, Black" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="density_g_cm3"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Density (g/cm³)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cost_per_kg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost (£/kg)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !form.formState.isDirty || !form.formState.isValid}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Add Material"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default MaterialForm;