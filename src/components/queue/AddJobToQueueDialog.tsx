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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Loader2, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertPrintJob } from "@/integrations/supabase/queueMutations";
import { useSession } from "@/context/SessionContext";
import { showError, showSuccess } from "@/utils/toast";

// --- Schemas ---

const JobSchema = z.object({
  priority: z.coerce.number().min(0).max(100).default(10),
});

type JobFormValues = z.infer<typeof JobSchema>;

// --- Component ---

const AddJobToQueueDialog: React.FC = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(JobSchema),
    defaultValues: {
      priority: 10,
    },
    mode: "onChange",
  });

  const insertMutation = useMutation({
    mutationFn: insertPrintJob,
    onSuccess: (data) => {
      showSuccess(`Job "${data.file_name}" added to the queue.`);
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      setIsOpen(false);
      form.reset();
      setSelectedFile(null);
      setIsUploading(false);
    },
    onError: (err) => {
      showError(`Failed to add job: ${err.message}`);
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.gcode')) {
        setSelectedFile(file);
        form.clearErrors("root");
      } else {
        setSelectedFile(null);
        form.setError("root", { message: "Only .gcode files are supported." });
      }
    }
  };

  const onSubmit = (data: JobFormValues) => {
    if (!user) {
      showError("User not authenticated.");
      return;
    }
    if (!selectedFile) {
      form.setError("root", { message: "Please select a G-Code file." });
      return;
    }
    
    setIsUploading(true);
    
    // --- Mock File Upload and Queue Insertion ---
    // In a real app, this would upload the file to storage (e.g., Supabase Storage) 
    // and then insert the job record with the file path/name.
    
    setTimeout(() => {
      insertMutation.mutate({
        user_id: user.id,
        file_name: selectedFile.name,
        priority: data.priority,
      });
    }, 1000); // Simulate upload delay
    // --- End Mock ---
  };

  const isSubmitting = insertMutation.isPending || isUploading;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Print Job</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormItem>
              <FormLabel>G-Code File</FormLabel>
              <FormControl>
                <div 
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('gcode-upload-input')?.click()}
                >
                  {selectedFile ? (
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">
                        Click to select or drag 'n' drop (.gcode only)
                      </p>
                    </div>
                  )}
                  <input
                    id="gcode-upload-input"
                    type="file"
                    accept=".gcode"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </div>
              </FormControl>
              {form.formState.errors.root && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}
            </FormItem>
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority (0-100)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="10" 
                      {...field} 
                      disabled={isSubmitting} 
                      min={0}
                      max={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add to Queue"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddJobToQueueDialog;