import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Material } from "@/types/material";
import { PlusCircle } from "lucide-react";

interface CommonMaterialsDropdownProps {
  onMaterialSelect: (material: Material) => void;
  existingMaterials: Material[];
}

const COMMON_MATERIALS: Omit<Material, "id" | "user_id" | "created_at">[] = [
  {
    name: "Polymaker PLA Pro White",
    type: "PLA",
    color: "White",
    density_g_cm3: 1.24,
    cost_per_kg: 18.0, // Updated to £
  },
  {
    name: "eSUN PLA+ Black",
    type: "PLA",
    color: "Black",
    density_g_cm3: 1.24,
    cost_per_kg: 16.0, // Updated to £
  },
  {
    name: "Overture PETG Clear",
    type: "PETG",
    color: "Clear",
    density_g_cm3: 1.27,
    cost_per_kg: 20.0, // Updated to £
  },
  {
    name: "Prusa ABS Natural",
    type: "ABS",
    color: "Natural",
    density_g_cm3: 1.04,
    cost_per_kg: 19.0, // Updated to £
  },
  {
    name: "NinjaTek Flexa ELA Black",
    type: "TPU",
    color: "Black",
    density_g_cm3: 1.22,
    cost_per_kg: 65.0, // Updated to £
  },
];

const CommonMaterialsDropdown: React.FC<CommonMaterialsDropdownProps> = ({
  onMaterialSelect,
  existingMaterials,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    type: "",
    color: "",
    density_g_cm3: 1.24,
    cost_per_kg: 16.0, // Default to £
  });

  const handleSelect = (value: string) => {
    if (value === "custom") {
      setIsDialogOpen(true);
    } else {
      const selectedMaterial = COMMON_MATERIALS.find(
        (mat) => `${mat.name} (${mat.type})` === value,
      );
      if (selectedMaterial) {
        onMaterialSelect({
          ...selectedMaterial,
          id: `common-${value.replace(/\s+/g, "-").toLowerCase()}`,
          user_id: "common",
          created_at: new Date().toISOString(),
        } as Material);
      }
    }
  };

  const handleAddCustomMaterial = () => {
    onMaterialSelect({
      ...newMaterial,
      id: `custom-${Date.now()}`,
      user_id: "custom",
      created_at: new Date().toISOString(),
    } as Material);
    setIsDialogOpen(false);
    setNewMaterial({
      name: "",
      type: "",
      color: "",
      density_g_cm3: 1.24,
      cost_per_kg: 16.0, // Reset to £
    });
  };

  // Filter out common materials that already exist in the user's library
  const availableCommonMaterials = COMMON_MATERIALS.filter(
    (commonMat) =>
      !existingMaterials.some(
        (userMat) =>
          userMat.name === commonMat.name && userMat.type === commonMat.type,
      ),
  );

  return (
    <>
      <Select onValueChange={handleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a material or add custom" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">
            <div className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Material
            </div>
          </SelectItem>
          <SelectItem value="divider" disabled>
            ────────── Common Materials ──────────
          </SelectItem>
          {availableCommonMaterials.map((material, index) => (
            <SelectItem
              key={index}
              value={`${material.name} (${material.type})`}
            >
              {material.name} ({material.type}) - £{material.cost_per_kg}/kg
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Material</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newMaterial.name}
                onChange={(e) =>
                  setNewMaterial({ ...newMaterial, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Input
                id="type"
                value={newMaterial.type}
                onChange={(e) =>
                  setNewMaterial({ ...newMaterial, type: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <Input
                id="color"
                value={newMaterial.color}
                onChange={(e) =>
                  setNewMaterial({ ...newMaterial, color: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="density" className="text-right">
                Density (g/cm³)
              </Label>
              <Input
                id="density"
                type="number"
                step="0.01"
                value={newMaterial.density_g_cm3}
                onChange={(e) =>
                  setNewMaterial({
                    ...newMaterial,
                    density_g_cm3: parseFloat(e.target.value) || 0,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost" className="text-right">
                Cost (£/kg)
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={newMaterial.cost_per_kg}
                onChange={(e) =>
                  setNewMaterial({
                    ...newMaterial,
                    cost_per_kg: parseFloat(e.target.value) || 0,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <Button onClick={handleAddCustomMaterial}>Add Material</Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommonMaterialsDropdown;