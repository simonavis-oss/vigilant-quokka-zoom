import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PrinterConnectionWizard from "@/components/printer/PrinterConnectionWizard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer } from "@/types/printer";
import PrinterCard from "@/components/printer/PrinterCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarmStatus } from "@/hooks/use-farm-status";
import { useTotalPrintTime } from "@/hooks/use-total-print-time";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type ConnectionTypeFilter = Printer['connection_type'] | 'all';

const Index = () => {
  const { user } = useSession();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<ConnectionTypeFilter>('all');
  
  const { data: printers, isLoading: isPrintersLoading, refetch } = useQuery<Printer[]>({
    queryKey: ["printers", user?.id],
    queryFn: () => fetchPrinters(user!.id),
    enabled: !!user?.id,
  });
  
  const { totalPrinters, onlineCount, activePrints, isLoading: isStatusLoading } = useFarmStatus(printers);
  const { totalPrintTime, isLoading: isTimeLoading } = useTotalPrintTime();
  
  const handlePrinterAdded = () => {
    setIsWizardOpen(false);
    refetch(); // Refetch the list after a new printer is added
  };

  const filteredPrinters = useMemo(() => {
    if (!printers) return [];
    
    return printers.filter(printer => {
      const matchesSearch = printer.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || printer.connection_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [printers, searchTerm, filterType]);

  const printerCount = totalPrinters;
  const isLoading = isPrintersLoading || isStatusLoading || isTimeLoading;

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
            <div className="text-2xl font-bold">
              {isPrintersLoading ? <Skeleton className="h-8 w-12" /> : printerCount}
            </div>
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
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : onlineCount}
            </div>
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
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : activePrints}
            </div>
            <p className="text-xs text-muted-foreground">
              {activePrints > 0 ? `${activePrints} prints running.` : "Ready to start printing."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Print Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isTimeLoading ? <Skeleton className="h-8 w-24" /> : totalPrintTime}
            </div>
            <p className="text-xs text-muted-foreground">
              Accumulated time across all printers (Mocked)
            </p>
          </CardContent>
        </Card>
      </div>
      
      {isPrintersLoading ? (
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
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search printers by name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select 
              onValueChange={(value: ConnectionTypeFilter) => setFilterType(value)} 
              defaultValue="all"
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="moonraker">Moonraker</SelectItem>
                <SelectItem value="octoprint">OctoPrint</SelectItem>
                <SelectItem value="klipper_go">Klipper Go</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredPrinters.length === 0 ? (
            <div className="p-8 border rounded-lg bg-card text-center">
              <p className="text-muted-foreground">No printers match your search or filter criteria.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPrinters.map((printer) => (
                <PrinterCard key={printer.id} printer={printer} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;