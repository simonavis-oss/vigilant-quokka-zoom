import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PrinterConnectionWizard from "@/components/printer/PrinterConnectionWizard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import PrinterCard from "@/components/printer/PrinterCard";
import { Skeleton } from "@/components/ui/skeleton";

const fetchPrinters = async (userId: string): Promise<Printer[]> => {
  const { data, error } = await supabase
    .from("printers")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
  return data as Printer[];
};

const Index = () => {
  const { user } = useSession();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  const { data: printers, isLoading, refetch } = useQuery<Printer[]>({
    queryKey: ["printers", user?.id],
    queryFn: () => fetchPrinters(user!.id),
    enabled: !!user?.id,
  });
  
  const handlePrinterAdded = () => {
    setIsWizardOpen(false);
    refetch(); // Refetch the list after a new printer is added
  };

  const printerCount = printers?.length || 0;
  const onlineCount = printers?.filter(p => p.is_online).length || 0;

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
        This is your 3D Print Farm Dashboard.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Printers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{printerCount}</div>
            <p className="text-xs text-muted-foreground">
              {printerCount === 0 ? "No printers registered." : `${onlineCount} online.`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Printers Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineCount}</div>
            <p className="text-xs text-muted-foreground">
              {printerCount > 0 ? `${printerCount - onlineCount} offline.` : "Ready to connect."}
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
      
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[250px]" />
          <Skeleton className="h-[250px]" />
          <Skeleton className="h-[250px]" />
        </div>
      ) : printerCount === 0 ? (
        <div className="p-8 border rounded-lg bg-card text-center">
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <p>Click "Add Printer" to connect your first 3D printer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Printers</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {printers.map((printer) => (
              <PrinterCard key={printer.id} printer={printer} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;