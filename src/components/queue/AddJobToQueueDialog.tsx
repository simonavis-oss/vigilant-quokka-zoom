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
import { insertMultiplePrintJobs } from "@/integrations/supabase/queueMutations";
import { useSession } from "@/context/SessionContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

const JobSchema = z.object({
  priority: z.coerce.number().min(0).max(100).default(10),
});

type JobFormValues = z.infer<typeof JobSchema>;

const AddJobToQueueDialog: React.FC = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(JobSchema),
    defaultValues: { priority: 10 },
    mode: "onChange",
  });

  const insertMutation = useMutation({
    mutationFn: insertMultiplePrintJobs,
    onSuccess: (data) => {
      showSuccess(`Successfully added ${data.length} job(s) to the queue.`);
      queryClient.invalidateQueries({ queryKey: ["printQueue"] });
      setIsOpen(false);
      form.reset();
      setSelectedFiles([]);
    },
    onError: (err) => {
      showError(`Failed to add jobs: ${err.message}`);
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const allFiles = Array.from(files);
      const gcodeFiles = allFiles.filter(file => file.name.toLowerCase().endsWith('.gcode'));
      
      if (gcodeFiles.length !== allFiles.length) {
        showError("Some selected files were not .gcode files and have been ignored.");
      }

      if (gcodeFiles.length > 0) {
        setSelectedFiles(gcodeFiles);
        form.clearErrors("root");
      } else {
        setSelectedFiles([]);
        if (allFiles.length > 0) {
            form.setError("root", { message: "No valid .gcode files were selected." });
        }
      }
    }
  };

  const onSubmit = async (data: JobFormValues) => {
    if (!user) {
      showError("User not authenticated.");
      return;
    }
    if (selectedFiles.length === 0) {
      form.setError("root", { message: "Please select at least one G-Code file." });
      return;
    }
    
    setIsUploading(true);

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('gcode-files')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
        
        return {
          user_id: user.id,
          file_name: file.name,
          storage_path: filePath,
          priority: data.priority,
        };
      });

      const jobsToInsert = await Promise.all(uploadPromises);
      insertMutation.mutate(jobsToInsert);

    } catch (error) {
      showError(error instanceof Error ? error.message : "An unknown error occurred during upload.");
      setIsUploading(false);
    }
  };

  const isSubmitting = insertMutation.isPending || isUploading;
  
  const buttonText = isUploading 
    ? `Uploading ${selectedFiles.length} file(s)...`
    : insertMutation.isPending
      ? "Adding jobs to queue..."
      : `Upload & Add ${selectedFiles.length > 0 ? selectedFiles.length : ''} Job(s)`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Job(s)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Print Job(s)</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormItem>
              <FormLabel>G-Code File(s)</FormLabel>
              <FormControl>
                <div 
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('gcode-upload-input')?.click()}
                >
                  {selectedFiles.length > 0 ? (
                    <div className="text-sm">
                      <p className="font-medium">{selectedFiles.length} file(s) selected:</p>
                      <ul className="text-left mt-2 max-h-24 overflow-y-auto text-muted-foreground list-disc list-inside">
                        {selectedFiles.map(f => <li key={f.name} className="truncate">{f.name}</li>)}
                      </ul>
                    </div>
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
                    multiple
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
              disabled={isSubmitting || selectedFiles.length === 0}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonText}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddJobToQueueDialog;