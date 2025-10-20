import React, { useState } from "react";
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

interface CancellationDialogProps {
  onConfirm: (reason: string) => void;
  triggerButton: React.ReactNode;
  title: string;
  description: string;
}

const CancellationDialog: React.FC<CancellationDialogProps> = ({
  onConfirm,
  triggerButton,
  title,
  description,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setIsOpen(false);
      setReason("");
    }
  };

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
            <Textarea
              id="cancellation-reason"
              placeholder="E.g., First layer adhesion failed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={() => setReason("")}>Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim()}
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