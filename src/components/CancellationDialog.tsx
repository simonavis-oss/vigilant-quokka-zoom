import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CancellationDialogProps {
  onConfirm: (reason: string) => void;
  triggerButton: React.ReactNode;
  title: string;
  description: string;
}

const CANCELLATION_REASONS = [
  "First layer adhesion failure",
  "Warping or curling",
  "Filament runout or jam",
  "Power failure",
  "Print quality issue",
  "Extruder clogged",
  "Test print / Calibration",
  "Other",
];

const CancellationDialog: React.FC<CancellationDialogProps> = ({
  onConfirm,
  triggerButton,
  title,
  description,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  useEffect(() => {
    // Reset state when dialog is closed
    if (!isOpen) {
      setSelectedReason("");
      setOtherReason("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const finalReason = selectedReason === "Other" ? otherReason.trim() : selectedReason;
    if (finalReason) {
      onConfirm(finalReason);
      setIsOpen(false);
    }
  };

  const isConfirmDisabled = !selectedReason || (selectedReason === "Other" && !otherReason.trim());

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cancellation-reason">Reason for Cancellation (Required)</Label>
            <Select onValueChange={setSelectedReason} value={selectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedReason === "Other" && (
            <div className="grid gap-2">
              <Label htmlFor="other-reason">Please specify:</Label>
              <Textarea
                id="other-reason"
                placeholder="E.g., Stepper motor skipping..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            variant="destructive"
          >
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancellationDialog;