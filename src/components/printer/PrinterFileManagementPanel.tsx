import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Play, Trash2, Loader2 } from "lucide-react";
import { Printer } from "@/types/printer";
import { showSuccess, showError } from "@/utils/toast";
import DeleteConfirmationDialog from "../DeleteConfirmationDialog";

interface PrinterFileManagementPanelProps {
  printer: Printer;
}

// Mock file structure
interface PrintFile {
  id: string;
  name: string;
  size: string;
  uploaded_at: string;
}

const mockFiles: PrintFile[] = [
  { id: "1", name: "Benchy_Fast.gcode", size: "1.2 MB", uploaded_at: "2024-01-15" },
  { id: "2", name: "Calibration_Cube.gcode", size: "0.5 MB", uploaded_at: "2024-07-20" },
  { id: "3", name: "Tool_Holder.gcode", size: "3.8 MB", uploaded_at: "2024-08-01" },
];

const PrinterFileManagementPanel: React.FC<PrinterFileManagementPanelProps> = ({ printer }) => {
  const [files, setFiles] = useState<PrintFile[]>(mockFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleFileUpload = (file: File) => {
    setIsUploading(true);
    // Simulate upload delay
    setTimeout(() => {
      const newFile: PrintFile = {
        id: Date.now().toString(),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        uploaded_at: new Date().toISOString().split('T')[0],
      };
      setFiles([newFile, ...files]);
      showSuccess(`File "${file.name}" uploaded successfully.`);
      setIsUploading(false);
    }, 1500);
  };

  const handleFileDelete = (fileId: string, fileName: string) => {
    setFiles(files.filter(f => f.id !== fileId));
    showSuccess(`File "${fileName}" deleted.`);
  };

  const handleStartPrint = (fileName: string) => async () => {
    setIsPrinting(true);
    // Simulate sending a command to start print via Edge Function
    try {
      // In a real app, this would call sendPrinterCommand(printer.id, `M23 ${fileName} M24`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSuccess(`Starting print of "${fileName}" on ${printer.name}.`);
    } catch (error) {
      showError("Failed to start print.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" /> Upload G-Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => document.getElementById('file-upload-input')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && file.name.endsWith('.gcode')) {
                handleFileUpload(file);
              } else {
                showError("Please drop a valid .gcode file.");
              }
            }}
          >
            {isUploading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Uploading...</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag 'n' drop a G-Code file here, or click to select.
                </p>
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".gcode"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" /> Stored Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="truncate">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size} | Uploaded: {file.uploaded_at}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={handleStartPrint(file.name)}
                      disabled={isPrinting}
                    >
                      {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <DeleteConfirmationDialog
                      onConfirm={() => handleFileDelete(file.id, file.name)}
                      title={`Delete "${file.name}"?`}
                      description="This will permanently remove the file from the printer's storage."
                      triggerButton={
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterFileManagementPanel;