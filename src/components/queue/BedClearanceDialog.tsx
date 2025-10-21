import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, VideoOff } from "lucide-react";

interface BedClearanceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  snapshotUrl: string | null;
  reason: string;
}

const BedClearanceDialog: React.FC<BedClearanceDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  snapshotUrl,
  reason,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="h-6 w-6 mr-3 text-yellow-500" />
            Bed Clearance Check Failed
          </AlertDialogTitle>
          <AlertDialogDescription>
            {reason} Please review the snapshot below before proceeding.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-4 p-2 border rounded-lg">
          {snapshotUrl ? (
            <img
              src={snapshotUrl}
              alt="Bed snapshot"
              className="rounded-md w-full aspect-video object-contain bg-gray-100 dark:bg-gray-900"
            />
          ) : (
            <div className="aspect-video flex items-center justify-center bg-muted rounded-md">
              <VideoOff className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel Print</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Start Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BedClearanceDialog;