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
        <CardContent className="space-y-6">
          
          {/* Movement Distance Selection */}
          <div className="flex justify-center">
            <ToggleGroup 
              type="single" 
              value={moveDistance.toString()} 
              onValueChange={(value) => setMoveDistance(parseFloat(value))}
              className="border rounded-md p-1 bg-muted/50"
            >
              {MOVEMENT_DISTANCES.map(dist => (
                <ToggleGroupItem 
                  key={dist} 
                  value={dist.toString()} 
                  aria-label={`Move ${dist}mm`}
                  disabled={isSending}
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-8 px-3 text-sm"
                >
                  {dist} mm
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
            
            {/* Left Column: X/Y Controls (Directional Pad) */}
            <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-2">X/Y Axis</p>
              <div className="grid grid-cols-3 gap-2 w-full max-w-[150px]">
                <div className="col-span-3 flex justify-center">
                  <Button size="icon" variant="outline" onClick={() => handleMove('Y', 1)} disabled={isSending}><ArrowUp className="h-4 w-4" /></Button>
                </div>
                <Button size="icon" variant="outline" onClick={() => handleMove('X', -1)} disabled={isSending}><ArrowLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" onClick={handleQuickCommand("G28 X Y")} disabled={isSending}><Home className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => handleMove('X', 1)} disabled={isSending}><ArrowRight className="h-4 w-4" /></Button>
                <div className="col-span-3 flex justify-center">
                  <Button size="icon" variant="outline" onClick={() => handleMove('Y', -1)} disabled={isSending}><ArrowDown className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            
            {/* Right Column: Z Controls */}
            <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-2">Z Axis</p>
              <Button variant="outline" className="w-full" onClick={() => handleMove('Z', 1)} disabled={isSending}>
                <ArrowUp className="h-4 w-4 mr-2" /> Z +{moveDistance} mm
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleMove('Z', -1)} disabled={isSending}>
                <ArrowDown className="h-4 w-4 mr-2" /> Z -{moveDistance} mm
              </Button>
              <Button variant="secondary" className="w-full mt-4" onClick={handleQuickCommand("G28 Z")} disabled={isSending}>
                <Home className="h-4 w-4 mr-2" /> Home Z
              </Button>
            </div>
          </div>
          
          {/* Global Homing */}
          <div className="pt-4 border-t flex justify-center">
            <Button variant="secondary" onClick={handleQuickCommand("G28")} disabled={isSending}>
              <Home className="h-4 w-4 mr-2" /> Home All Axes
            </Button>
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