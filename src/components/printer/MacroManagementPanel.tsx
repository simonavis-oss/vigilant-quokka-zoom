import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, PlusCircle, Trash2, Loader2, TerminalSquare } from "lucide-react";
import { Printer } from "@/types/printer";
import { PrinterMacro } from "@/types/printer-macro";
import { fetchPrinterMacros } from "@/integrations/supabase/queries";
import { insertPrinterMacro, deletePrinterMacro } from "@/integrations/supabase/mutations";
import { sendPrinterCommand } from "@/integrations/supabase/functions";
import { useSession } from "@/context/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";

interface MacroManagementPanelProps {
  printer: Printer;
}

const MacroSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  gcode: z.string().min(1, "G-code cannot be empty."),
});
type MacroFormValues = z.infer<typeof MacroSchema>;

const MacroManagementPanel: React.FC<MacroManagementPanelProps> = ({ printer }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [runningMacroId, setRunningMacroId] = useState<string | null>(null);

  const { data: macros, isLoading } = useQuery<PrinterMacro[]>({
    queryKey: ["printerMacros", printer.id],
    queryFn: () => fetchPrinterMacros(printer.id),
  });

  const form = useForm<MacroFormValues>({
    resolver: zodResolver(MacroSchema),
    defaultValues: { name: "", gcode: "" },
  });

  const insertMutation = useMutation({
    mutationFn: insertPrinterMacro,
    onSuccess: () => {
      showSuccess("Macro created successfully!");
      queryClient.invalidateQueries({ queryKey: ["printerMacros", printer.id] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrinterMacro,
    onSuccess: () => {
      showSuccess("Macro deleted.");
      queryClient.invalidateQueries({ queryKey: ["printerMacros", printer.id] });
    },
    onError: (err) => showError(err.message),
  });

  const runMutation = useMutation({
    mutationFn: (gcode: string) => sendPrinterCommand(printer, gcode),
    onSuccess: (data, gcode) => {
      showSuccess(`Macro executed successfully.`);
    },
    onError: (err) => showError(err.message),
    onSettled: () => setRunningMacroId(null),
  });

  const onSubmit = (data: MacroFormValues) => {
    if (!user) return showError("Not authenticated.");
    insertMutation.mutate({ ...data, printer_id: printer.id, user_id: user.id });
  };

  const handleRunMacro = (macro: PrinterMacro) => {
    setRunningMacroId(macro.id);
    runMutation.mutate(macro.gcode);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center"><TerminalSquare className="h-5 w-5 mr-2" /> Custom Macros</CardTitle>
            <CardDescription>Create and run custom G-code scripts.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><PlusCircle className="h-4 w-4 mr-2" /> Add Macro</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Macro</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Macro Name</FormLabel><FormControl><Input placeholder="e.g., Load Filament" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="gcode" render={({ field }) => (<FormItem><FormLabel>G-Code Script</FormLabel><FormControl><Textarea placeholder="G28 ; Home all axes&#10;M109 S210 ; Set nozzle temp and wait" {...field} className="font-mono" rows={5} /></FormControl><FormMessage /></FormItem>)} />
                  <DialogFooter><Button type="submit" disabled={insertMutation.isPending}>{insertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Macro"}</Button></DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Loading macros...</span></div>
        ) : macros && macros.length > 0 ? (
          <div className="space-y-2">
            {macros.map((macro) => (
              <div key={macro.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <p className="font-medium">{macro.name}</p>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleRunMacro(macro)} disabled={runMutation.isPending}>
                    {runningMacroId === macro.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <DeleteConfirmationDialog
                    onConfirm={() => deleteMutation.mutate(macro.id)}
                    title={`Delete "${macro.name}"?`}
                    description="This action cannot be undone."
                    triggerButton={<Button size="sm" variant="destructive" disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4" /></Button>}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No custom macros created yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MacroManagementPanel;