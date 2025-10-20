import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Printer } from "@/types/printer";
import { Link } from "react-router-dom";

interface PrinterFileManagementPanelProps {
  printer: Printer;
}

const PrinterFileManagementPanel: React.FC<PrinterFileManagementPanelProps> = ({ printer }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" /> Stored Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Live file management is not yet implemented. This is a placeholder for listing and managing files directly on the printer. Files can be added to the print queue from the <Link to="/queue" className="underline text-primary">Queue page</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterFileManagementPanel;