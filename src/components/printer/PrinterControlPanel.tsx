import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Move, Thermometer, Loader2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, Camera, VideoOff } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Printer } from "@/types/printer";
import { sendPrinterCommand } from "@/integrations/supabase/functions";
import PreheatDropdown from "./PreheatDropdown";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";

interface PrinterControlPanelProps {
  printer: Printer;
}

const MOVEMENT_DISTANCES = [0.1, 1, 10, 50];

const PrinterControlPanel: React.FC<PrinterControlPanelProps> = ({ printer }) => {
  const [gcode, setGcode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [moveDistance, setMoveDistance] = useState<number>(10);
  const [customMoveValue, setCustomMoveValue] = useState<string>("");

  useEffect(() => {
    if (customMoveValue) {
      const customNum = parseFloat(customMoveValue);
      if (!isNaN(customNum) && customNum > 0) {
        setMoveDistance(customNum);
      }
    }
  }, [customMoveValue]);

  const handleSendGcode = async (e: React.FormEvent) => {
    e.preventDefault();
    const command = gcode.trim();
    if (!command) return;
    setIsSending(true);
    try {
      await sendPrinterCommand(printer, command);
      showSuccess(`Command sent: "${command.substring(0, 20)}..."`);
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
    const command = `G91\\nG0 ${axis}${distance}`;
    handleQuickCommand(command)();
  };

  const handleToggleChange = (value: string) => {
    if (value) {
      setMoveDistance(parseFloat(value));
      setCustomMoveValue("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Thermometer className="h-5 w-5 mr-2" /> Temperature Controls</CardTitle></CardHeader>
        <CardContent><PreheatDropdown printer={printer} /></CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Move className="h-5 w-5 mr-2" /> Manual Control</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground flex items-center"><Camera className="h-4 w-4 mr-2" />Live View</Label>
            <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {printer.webcam_url ? (
                <img src={printer.webcam_url} alt="Webcam Stream" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-4"><VideoOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No webcam URL.</p></div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Movement Distance (mm)</Label>
              <div className="flex items-center gap-2 mt-1">
                <ToggleGroup type="single" value={customMoveValue ? "" : moveDistance.toString()} onValueChange={handleToggleChange} className="border rounded-md bg-muted/50">
                  {MOVEMENT_DISTANCES.map(dist => (
                    <ToggleGroupItem key={dist} value={dist.toString()} aria-label={`Move ${dist}mm`} disabled={isSending} className="h-9 px-3 text-xs">
                      {dist}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Input type="number" placeholder="Custom" value={customMoveValue} onChange={(e) => setCustomMoveValue(e.target.value)} className="h-9 w-24" disabled={isSending} />
              </div>
            </div>
            <div className="flex items-center justify-center pt-4">
              <div className="flex items-center justify-center gap-x-6 p-4 border rounded-lg bg-muted/25">
                <div className="grid grid-cols-3 grid-rows-3 w-36 h-36">
                  <Button size="icon" variant="outline" onClick={() => handleMove('Y', 1)} disabled={isSending} className="col-start-2 row-start-1 rounded-t-full rounded-b-none w-full h-full"><ArrowUp className="h-5 w-5" /></Button>
                  <Button size="icon" variant="outline" onClick={() => handleMove('X', -1)} disabled={isSending} className="col-start-1 row-start-2 rounded-l-full rounded-r-none w-full h-full"><ArrowLeft className="h-5 w-5" /></Button>
                  <Button size="icon" variant="outline" onClick={handleQuickCommand("G28 X Y")} disabled={isSending} className="col-start-2 row-start-2 rounded-full z-10 border-2 border-primary w-full h-full"><Home className="h-5 w-5" /></Button>
                  <Button size="icon" variant="outline" onClick={() => handleMove('X', 1)} disabled={isSending} className="col-start-3 row-start-2 rounded-r-full rounded-l-none w-full h-full"><ArrowRight className="h-5 w-5" /></Button>
                  <Button size="icon" variant="outline" onClick={() => handleMove('Y', -1)} disabled={isSending} className="col-start-2 row-start-3 rounded-b-full rounded-t-none w-full h-full"><ArrowDown className="h-5 w-5" /></Button>
                </div>
                <div className="flex flex-col items-center justify-center space-y-2 pl-6 border-l">
                  <Label className="text-sm font-medium text-muted-foreground mb-2">Z Axis</Label>
                  <Button variant="outline" size="icon" onClick={() => handleMove('Z', 1)} disabled={isSending}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={handleQuickCommand("G28 Z")} disabled={isSending}><Home className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => handleMove('Z', -1)} disabled={isSending}><ArrowDown className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t flex justify-center">
              <Button variant="secondary" onClick={handleQuickCommand("G28")} disabled={isSending}><Home className="h-4 w-4 mr-2" /> Home All Axes</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Send className="h-5 w-5 mr-2" /> Send Command</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSendGcode} className="flex space-x-2">
            <Input placeholder="Enter G-Code (e.g., G28)" value={gcode} onChange={(e) => setGcode(e.target.value)} disabled={isSending} />
            <Button type="submit" disabled={isSending || !gcode.trim()}>{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterControlPanel;