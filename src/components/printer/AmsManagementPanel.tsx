import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Layers, Loader2, Package } from "lucide-react";
import { Printer } from "@/types/printer";
import { Material } from "@/types/material";
import { PrinterMaterial } from "@/types/printer-material";
import { fetchMaterials, fetchLoadedMaterials } from "@/integrations/supabase/queries";
import { assignMaterialToSlot, clearMaterialFromSlot } from "@/integrations/supabase/mutations";
import { useSession } from "@/context/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

interface AmsManagementPanelProps {
  printer: Printer;
}

const AMS_SLOTS = [1, 2, 3, 4];

const AmsManagementPanel: React.FC<AmsManagementPanelProps> = ({ printer }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const { data: allMaterials, isLoading: isLoadingAllMaterials } = useQuery<Material[]>({
    queryKey: ["materials", user?.id],
    queryFn: () => fetchMaterials(user!.id),
    enabled: !!user,
  });

  const { data: loadedMaterials, isLoading: isLoadingLoaded } = useQuery<PrinterMaterial[]>({
    queryKey: ["loadedMaterials", printer.id],
    queryFn: () => fetchLoadedMaterials(printer.id),
  });

  const assignMutation = useMutation({
    mutationFn: assignMaterialToSlot,
    onSuccess: () => {
      showSuccess("Material slot updated.");
      queryClient.invalidateQueries({ queryKey: ["loadedMaterials", printer.id] });
    },
    onError: (err) => showError(err.message),
  });

  const clearMutation = useMutation({
    mutationFn: clearMaterialFromSlot,
    onSuccess: () => {
      showSuccess("Material slot cleared.");
      queryClient.invalidateQueries({ queryKey: ["loadedMaterials", printer.id] });
    },
    onError: (err) => showError(err.message),
  });

  const handleSelectChange = (slotNumber: number, value: string) => {
    if (!user) return;
    const loadedMaterial = loadedMaterials?.find(m => m.slot_number === slotNumber);

    if (value === "unload") {
      if (loadedMaterial) {
        clearMutation.mutate(loadedMaterial.id);
      }
    } else {
      assignMutation.mutate({
        printer_id: printer.id,
        material_id: value,
        slot_number: slotNumber,
        user_id: user.id,
      });
    }
  };

  const isLoading = isLoadingAllMaterials || isLoadingLoaded;

  if (isLoading) {
    return <Card><CardHeader><CardTitle>AMS / Material Slots</CardTitle></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Layers className="h-5 w-5 mr-2" /> AMS / Material Slots</CardTitle>
        <CardDescription>Assign materials from your library to this printer's slots.</CardDescription>
      </CardHeader>
      <CardContent>
        {allMaterials && allMaterials.length > 0 ? (
          <div className="space-y-4">
            {AMS_SLOTS.map(slot => {
              const loaded = loadedMaterials?.find(m => m.slot_number === slot);
              return (
                <div key={slot} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="font-medium">Slot {slot}</div>
                  <Select
                    value={loaded?.material_id || "empty"}
                    onValueChange={(value) => handleSelectChange(slot, value)}
                    disabled={assignMutation.isPending || clearMutation.isPending}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select a material..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empty" disabled>Empty</SelectItem>
                      {loaded && <SelectItem value="unload" className="text-destructive">Unload</SelectItem>}
                      {allMaterials.map(material => (
                        <SelectItem key={material.id} value={material.id}>
                          <div className="flex items-center">
                            <Package className="h-4 w-4 mr-2" /> {material.name} ({material.type})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-4 border-dashed border rounded-lg">
            <p className="text-muted-foreground">No materials found in your library.</p>
            <Button asChild variant="link"><Link to="/materials">Add a Material Profile</Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmsManagementPanel;