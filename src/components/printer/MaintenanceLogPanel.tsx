import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { History, PlusCircle, Loader2, Wrench } from "lucide-react";
import { Printer } from "@/types/printer";
import { fetchMaintenanceLogs } from "@/integrations/supabase/queries";
import { MaintenanceLog } from "@/types/maintenance";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useSession } from "@/context/SessionContext";
import { insertMaintenanceLog } from "@/integrations/supabase/mutations";
import { showSuccess, showError } from "@/utils/toast";

interface MaintenanceLogPanelProps {
  printer: Printer;
}

const LogSchema = z.object({
  task_description: z.string().min(5, "Description must be at least 5 characters."),
  notes: z.string().optional(),
  maintenance_date: z.string().min(1, "Date is required."),
});

type LogFormValues = z.infer<typeof LogSchema>;

const MaintenanceLogPanel: React.FC<MaintenanceLogPanelProps> = ({ printer }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: logs, isLoading, isError } = useQuery<MaintenanceLog[]>({
    queryKey: ["maintenanceLogs", printer.id],
    queryFn: () => fetchMaintenanceLogs(printer.id),
  });

  const form = useForm<LogFormValues>({
    resolver: zodResolver(LogSchema),
    defaultValues: {
      task_description: "",
      notes: "",
      maintenance_date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const insertMutation = useMutation({
    mutationFn: insertMaintenanceLog,
    onSuccess: () => {
      showSuccess("Maintenance log recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["maintenanceLogs", printer.id] });
      setIsDialogOpen(false);
      form.reset({
        task_description: "",
        notes: "",
        maintenance_date: format(new Date(), 'yyyy-MM-dd'),
      });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (data: LogFormValues) => {
    if (!user) {
      showError("User not authenticated.");
      return;
    }
    insertMutation.mutate({
      printer_id: printer.id,
      user_id: user.id,
      task_description: data.task_description,
      notes: data.notes || null,
      maintenance_date: data.maintenance_date,
    });
  };

  const isSubmitting = insertMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Maintenance Log</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading logs...</span>
          </div>
          <Skeleton className="h-40 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !logs) {
    return (
      <Card>
        <CardHeader><CardTitle>Maintenance Log</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load maintenance history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Wrench className="h-5 w-5 mr-2" /> Maintenance Log
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" /> Add Log</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Log Maintenance for {printer.name}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="maintenance_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Performed</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="task_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Description</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Replaced PTFE tube" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Details about the replacement..." {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Log"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-muted-foreground">No maintenance logs recorded for this printer yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{format(new Date(log.maintenance_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{log.task_description}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{log.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceLogPanel;