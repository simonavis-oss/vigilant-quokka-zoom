import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Move, Thermometer, Loader2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Printer } from "@/types/printer";
import { sendPrinterCommand } from "@/integrations/supabase/functions";
import PreheatDropdown from "./PreheatDropdown";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PrinterControlPanelProps {
  printer: Printer;
}

const MOVEMENT_DISTANCES = [0.1, 1, 10, 50];

const PrinterControlPanel: React.FC<PrinterControlPanelProps> = ({ printer }) => {
  const [gcode, setGcode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [moveDistance, setMoveDistance] = useState<number>(10); // Default movement distance in mm

  const handleSendGcode = async (e: React.FormEvent) => {
    e.preventDefault();
    const command = gcode.trim();
    if (!command) return;

    setIsSending(true);
    
    try {
      await sendPrinterCommand(printer, command);
      
      showSuccess(`Command sent to ${printer.name}: "${command.substring(0, 20)}..."`);
      setGcode("");
    } catch (error) {
      showError(`Failed to send command: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleQuickCommand = (command: string) => async () => {
    setIsSending(true);
    try {
      await sendPrinterCommand(printer, command);
      showSuccess(`Quick command executed: ${command}`);
    } catch (error) {
      showError(`Failed to execute quick command: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleMove = (axis: 'X' | 'Y' | 'Z', direction: 1 | -1) => {
    const distance = moveDistance * direction;
    // G91 sets relative positioning, G0 performs the move
    const command = `G91\\nG0 ${axis}${distance}`;
    handleQuickCommand(command)();
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
            <Move className="h-5 w-5 mr-2" /> Movement Controls (mm)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center space-x-2">
            <ToggleGroup 
              type="single" 
              value={moveDistance.toString()} 
              onValueChange={(value) => setMoveDistance(parseFloat(value))}
              className="w-full justify-center"
            >
              {MOVEMENT_DISTANCES.map(dist => (
                <ToggleGroupItem 
                  key={dist} 
                  value={dist.toString()} 
                  aria-label={`Move ${dist}mm`}
                  disabled={isSending}
                >
                  {dist}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {/* X/Y Controls */}
            <div className="col-span-3 flex justify-center">
              <Button size="icon" variant="outline" onClick={() => handleMove('Y', 1)} disabled={isSending}><ArrowUp className="h-4 w-4" /></Button>
            </div>
            <Button size="icon" variant="outline" onClick={() => handleMove('X', -1)} disabled={isSending}><ArrowLeft className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" onClick={handleQuickCommand("G28")} disabled={isSending}><Home className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" onClick={() => handleMove('X', 1)} disabled={isSending}><ArrowRight className="h-4 w-4" /></Button>
            <div className="col-span-3 flex justify-center">
              <Button size="icon" variant="outline" onClick={() => handleMove('Y', -1)} disabled={isSending}><ArrowDown className="h-4 w-4" /></Button>
            </div>
          </div>
          
          {/* Z Controls */}
          <div className="flex justify-center space-x-4 pt-4 border-t">
            <Button variant="outline" onClick={() => handleMove('Z', 1)} disabled={isSending}>
              <ArrowUp className="h-4 w-4 mr-2" /> Z +{moveDistance}
            </Button>
            <Button variant="outline" onClick={() => handleMove('Z', -1)} disabled={isSending}>
              <ArrowDown className="h-4 w-4 mr-2" /> Z -{moveDistance}
            </Button>
          </div>
          
          {/* Quick Commands */}
          <div className="grid grid-cols-2 gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={handleQuickCommand("G28 X Y")} disabled={isSending}>Home X/Y</Button>
            <Button variant="secondary" onClick={handleQuickCommand("G28 Z")} disabled={isSending}>Home Z</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Thermometer className="h-5 w-5 mr-2" /> Temperature Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PreheatDropdown printer={printer} />
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterControlPanel;