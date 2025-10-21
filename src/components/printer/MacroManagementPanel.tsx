import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, PlusCircle, Trash2, Loader2, TerminalSquare, Sparkles } from "lucide-react";
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

const COMMON_MACROS = [
  { name: "Preheat PLA", gcode: "M140 S60 ; Set bed temperature\nM104 S200 ; Set nozzle temperature" },
  { name: "Preheat PETG", gcode: "M140 S80 ; Set bed temperature\nM104 S240 ; Set nozzle temperature" },
  { name: "Cooldown", gcode: "M104 S0 ; Turn off nozzle heater\nM140 S0 ; Turn off bed heater\nM107 ; Turn off part cooling fan" },
  { name: "Load Filament", gcode: "M109 S210 ; Set nozzle to 210C and wait\nG92 E0 ; Reset extruder\nG1 E100 F300 ; Extrude 100mm of filament\nG92 E0 ; Reset extruder again" },
  { name: "Unload Filament", gcode: "M109 S210 ; Set nozzle to 210C and wait\nG92 E0 ; Reset extruder\nG1 E-5 F1800 ; Retract 5mm quickly\nG1 E-100 F300 ; Retract 100mm slowly\nG92 E0 ; Reset extruder again" },
  { name: "Disable Steppers", gcode: "M84 ; Disable all stepper motors" },
];

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
      queryClient.invalidateQueries({ queryKey: ["printerMacros", printer.id] });
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
    onSuccess: () => {
      showSuccess(`Macro executed successfully.`);
    },
    onError: (err) => showError(err.message),
    onSettled: () => setRunningMacroId(null),
  });

  const onSubmit = (data: MacroFormValues) => {
    if (!user) return showError("Not authenticated.");
    insertMutation.mutate({ ...data, printer_id: printer.id, user_id: user.id }, {
      onSuccess: () => {
        showSuccess("Macro created successfully!");
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const handleRunMacro = (macro: PrinterMacro) => {
    setRunningMacroId(macro.id);
    runMutation.mutate(macro.gcode);
  };

  const handleGenerateCommonMacros = async () => {
    if (!user) return showError("Not authenticated.");
    
    const existingMacroNames = macros?.map(m => m.name) || [];
    const macrosToAdd = COMMON_MACROS.filter(cm => !existingMacroNames.includes(cm.name));

    if (macrosToAdd.length === 0) {
      showSuccess("All common macros already exist.");
      return;
    }

    const promises = macrosToAdd.map(macro => 
      insertMutation.mutateAsync({
        ...macro,
        printer_id: printer.id,
        user_id: user.id,
      })
    );

    try {
      await Promise.all(promises);
      showSuccess(`Added ${macrosToAdd.length} common macros.`);
    } catch (error) {
      showError("An error occurred while adding macros.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center"><TerminalSquare className="h-5 w-5 mr-2" /> Custom Macros</CardTitle>
            <CardDescription>Create and run custom G-code scripts.</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={handleGenerateCommonMacros} disabled={insertMutation.isPending}>
              <Sparkles className="h-4 w-4 mr-2" /> Add Common Macros
            </Button>
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