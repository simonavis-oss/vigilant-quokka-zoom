import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Move, Thermometer, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Printer } from "@/types/printer";

interface PrinterControlPanelProps {
  printer: Printer;
}

const PrinterControlPanel: React.FC<PrinterControlPanelProps> = ({ printer }) => {
  const [gcode, setGcode] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendGcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gcode.trim()) return;

    setIsSending(true);
    
    // Simulate API call to an Edge Function for sending command
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    try {
      // In a real scenario, this would call an Edge Function that forwards the command
      // const response = await sendPrinterCommand(printer.id, gcode);
      
      showSuccess(`Command sent to ${printer.name}: "${gcode.substring(0, 20)}..."`);
      setGcode("");
    } catch (error) {
      showError("Failed to send command. Check printer connection.");
    } finally {
      setIsSending(false);
    }
  };
  
  const handleQuickCommand = (command: string) => async () => {
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    showSuccess(`Quick command executed: ${command}`);
    setIsSending(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" /> Send G-Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendGcode} className="flex space-x-2">
            <Input
              placeholder="Enter G-Code (e.g., G28)"
              value={gcode}
              onChange={(e) => setGcode(e.target.value)}
              disabled={isSending}
            />
            <Button type="submit" disabled={isSending || !gcode.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Move className="h-5 w-5 mr-2" /> Movement Controls (Mock)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Button variant="outline" onClick={handleQuickCommand("Home X/Y")} disabled={isSending}>Home X/Y</Button>
          <Button variant="outline" onClick={handleQuickCommand("Home Z")} disabled={isSending}>Home Z</Button>
          <Button variant="outline" onClick={handleQuickCommand("Move X+10")} disabled={isSending}>X +10</Button>
          <Button variant="outline" onClick={handleQuickCommand("Move Y+10")} disabled={isSending}>Y +10</Button>
          <Button variant="outline" onClick={handleQuickCommand("Move Z+1")} disabled={isSending}>Z +1</Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Thermometer className="h-5 w-5 mr-2" /> Temperature Controls (Mock)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={handleQuickCommand("Set Nozzle 200")} disabled={isSending}>Set Nozzle 200°C</Button>
          <Button variant="outline" onClick={handleQuickCommand("Set Bed 60")} disabled={isSending}>Set Bed 60°C</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterControlPanel;