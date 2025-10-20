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
import { PlusCircle, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertPrintJob } from "@/integrations/supabase/queueMutations";
import { useSession } from "@/context/SessionContext";
import { showError, showSuccess } from "@/utils/toast";

// --- Schemas ---

const JobSchema = z.object({
  file_name: z.string().min(1, "File name is required (e.g., Benchy.gcode)"),
  priority: z.coerce.number().min(0).max(100).default(10),
});

type JobFormValues = z.infer<typeof JobSchema>;

// --- Component ---

const AddJobToQueueDialog: React.FC = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(JobSchema),
    defaultValues: {
      file_name: "",
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
    },
    onError: (err) => {
      showError(`Failed to add job: ${err.message}`);
    },
  });

  const onSubmit = (data: JobFormValues) => {
    if (!user) {
      showError("User not authenticated.");
      return;
    }
    insertMutation.mutate({
      user_id: user.id,
      file_name: data.file_name,
      priority: data.priority,
    });
  };

  const isSubmitting = insertMutation.isPending;

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
            <FormField
              control={form.control}
              name="file_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Benchy.gcode" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add to Queue"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddJobToQueueDialog;