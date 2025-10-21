import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, PlusCircle, Loader2, Edit, Trash2, X } from "lucide-react";
import { fetchMaterials } from "@/integrations/supabase/queries";
import { insertMaterial, updateMaterial, deleteMaterial } from "@/integrations/supabase/mutations";
import { Material } from "@/types/material";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showError } from "@/utils/toast";
import MaterialForm from "@/components/material/MaterialForm";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";

const MaterialsPage: React.FC = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const { data: materials, isLoading, isError } = useQuery<Material[]>({
    queryKey: ["materials", user?.id],
    queryFn: () => fetchMaterials(user!.id),
    enabled: !!user?.id,
  });

  const insertMutation = useMutation({
    mutationFn: insertMaterial,
    onSuccess: () => {
      showSuccess("Material added successfully!");
      queryClient.invalidateQueries({ queryKey: ["materials", user?.id] });
      setIsFormOpen(false);
      setEditingMaterial(null);
    },
    onError: (err) => showError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateMaterial,
    onSuccess: () => {
      showSuccess("Material updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["materials", user?.id] });
      setIsFormOpen(false);
      setEditingMaterial(null);
    },
    onError: (err) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => {
      showSuccess("Material deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["materials", user?.id] });
    },
    onError: (err) => showError(err.message),
  });

  const handleFormSubmit = (data: any) => {
    if (!user) return showError("User not authenticated.");

    const materialData = {
      ...data,
      density_g_cm3: parseFloat(data.density_g_cm3),
      cost_per_kg: parseFloat(data.cost_per_kg),
    };

    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, ...materialData });
    } else {
      insertMutation.mutate({ ...materialData, user_id: user.id });
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingMaterial(null);
  };

  const isSubmitting = insertMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !materials) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-destructive">Error</h2>
        <p className="text-muted-foreground">Could not load material profiles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center"><Package className="h-7 w-7 mr-3" /> Material Profiles</h1>
        <Button
          onClick={() => {
            setIsFormOpen(!isFormOpen);
            setEditingMaterial(null);
          }}
          variant={isFormOpen ? "secondary" : "default"}
        >
          {isFormOpen ? (
            <>
              <X className="mr-2 h-4 w-4" /> Close Form
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Material
            </>
          )}
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingMaterial ? "Edit Material" : "Add New Material"}</CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialForm 
              initialData={editingMaterial || undefined}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Registered Materials ({materials.length})</CardTitle></CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <p className="text-muted-foreground">No material profiles have been added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-right">Density (g/cm³)</TableHead>
                    <TableHead className="text-right">Cost ($/kg)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>{material.type}</TableCell>
                      <TableCell>{material.color || 'N/A'}</TableCell>
                      <TableCell className="text-right">{material.density_g_cm3.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${material.cost_per_kg.toFixed(2)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(material)} disabled={deleteMutation.isPending}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DeleteConfirmationDialog
                          onConfirm={() => deleteMutation.mutate(material.id)}
                          title={`Delete material "${material.name}"?`}
                          description="This will permanently remove the material profile. This cannot be undone."
                          triggerButton={
                            <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialsPage;