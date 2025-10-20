import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/context/SessionContext";
import { Printer } from "@/types/printer";
import { fetchPrinters } from "@/integrations/supabase/queries";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, X, Printer as PrinterIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AddPrinterForm from "@/components/printer/AddPrinterForm";
import PrinterCard from "@/components/printer/PrinterCard";

type ConnectionTypeFilter = Printer["connection_type"] | "all";

const PrintersPage = () => {
  const { user } = useSession();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<ConnectionTypeFilter>("all");

  const {
    data: printers,
    isLoading: isPrintersLoading,
    refetch,
  } = useQuery<Printer[]>({
    queryKey: ["printers", user?.id],
    queryFn: () => fetchPrinters(user!.id),
    enabled: !!user?.id,
  });

  const handlePrinterAdded = () => {
    setIsFormOpen(false);
    refetch();
  };

  const filteredPrinters = useMemo(() => {
    if (!printers) return [];

    return printers.filter((printer) => {
      const matchesSearch = printer.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType =
        filterType === "all" || printer.connection_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [printers, searchTerm, filterType]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <PrinterIcon className="h-7 w-7 mr-3" /> Your Printers
        </h1>
        <Button
          onClick={() => setIsFormOpen(!isFormOpen)}
          variant={isFormOpen ? "secondary" : "default"}
        >
          {isFormOpen ? (
            <>
              <X className="mr-2 h-4 w-4" /> Close Form
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Printer
            </>
          )}
        </Button>
      </div>

      {isFormOpen && (
        <div className="mb-8">
          <AddPrinterForm onPrinterAdded={handlePrinterAdded} />
        </div>
      )}

      {isPrintersLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
        </div>
      ) : printers && printers.length === 0 && !isFormOpen ? (
        <div className="p-8 border rounded-lg bg-card text-center">
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <p>Click "Add Printer" above to connect your first 3D printer.</p>
        </div>
      ) : (
        <div className="space-y-4">
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
              onValueChange={(value: ConnectionTypeFilter) =>
                setFilterType(value)
              }
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
          {filteredPrinters && filteredPrinters.length === 0 ? (
            <div className="p-8 border rounded-lg bg-card text-center">
              <p className="text-muted-foreground">
                No printers match your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPrinters?.map((printer) => (
                <PrinterCard key={printer.id} printer={printer} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrintersPage;