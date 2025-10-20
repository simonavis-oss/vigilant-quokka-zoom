import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PrinterConnectionWizard from "@/components/printer/PrinterConnectionWizard";

const Index = () => {
  const { user } = useSession();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  // Placeholder for fetching printers (will be implemented next)
  const [printers, setPrinters] = useState<any[]>([]); 
  
  const handlePrinterAdded = () => {
    setIsWizardOpen(false);
    // In a real scenario, we would refetch the printer list here.
    // For now, we just close the dialog.
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          Welcome, {user?.email || "User"}!
        </h1>
        <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Printer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Printer Connection Wizard</DialogTitle>
            </DialogHeader>
            <PrinterConnectionWizard onPrinterAdded={handlePrinterAdded} />
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-muted-foreground">
        This is your 3D Print Farm Dashboard. Start by adding a printer.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Printers Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{printers.length}</div>
            <p className="text-xs text-muted-foreground">
              {printers.length === 0 ? "No printers connected yet." : "Printers registered."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Prints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Ready to start printing.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {printers.length === 0 && (
        <div className="p-8 border rounded-lg bg-card text-center">
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <p>Click "Add Printer" to connect your first 3D printer.</p>
        </div>
      )}
      
      {/* Placeholder for Printer List */}
      {printers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Printers</h2>
          {/* Printer cards will go here */}
        </div>
      )}
    </div>
  );
};

export default Index;