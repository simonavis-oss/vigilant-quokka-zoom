import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Thermometer, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Printer } from "@/types/printer";
import { fetchTemperaturePresets, TemperaturePreset, sendPrinterCommand } from "@/integrations/supabase/functions";
import { showSuccess, showError } from "@/utils/toast";

interface PreheatDropdownProps {
  printer: Printer;
}

const PreheatDropdown: React.FC<PreheatDropdownProps> = ({ printer }) => {
  const { data: presets, isLoading: isLoadingPresets, isError: isErrorPresets } = useQuery<TemperaturePreset[]>({
    queryKey: ["temperaturePresets", printer.id],
    queryFn: () => fetchTemperaturePresets(printer),
    // Presets don't change often, so a longer stale time is fine
    staleTime: 5 * 60 * 1000, 
  });

  const preheatMutation = useMutation({
    mutationFn: (gcode: string) => sendPrinterCommand(printer, gcode),
    onSuccess: (response) => {
      showSuccess(`Preheat command sent: ${response.message}`);
    },
    onError: (err) => {
      showError(`Failed to apply preset: ${err.message}`);
    },
  });

  const handleSelectPreset = (preset: TemperaturePreset) => {
    // Moonraker uses the G-Code command SET_HEATER_TEMPERATURE HEATER=extruder TARGET=200
    // We need to send commands for both bed and extruder.
    const gcodeCommands = [];
    
    if (preset.extruder !== undefined && preset.extruder !== null) {
      gcodeCommands.push(`SET_HEATER_TEMPERATURE HEATER=extruder TARGET=${preset.extruder}`);
    }
    if (preset.heater_bed !== undefined && preset.heater_bed !== null) {
      gcodeCommands.push(`SET_HEATER_TEMPERATURE HEATER=heater_bed TARGET=${preset.heater_bed}`);
    }
    
    if (gcodeCommands.length === 0) {
        showError("Preset is empty.");
        return;
    }
    
    // Join commands with a newline for sequential execution
    const combinedGcode = gcodeCommands.join('\n');
    preheatMutation.mutate(combinedGcode);
  };
  
  const handleTurnOff = () => {
    const turnOffGcode = "SET_HEATER_TEMPERATURE HEATER=extruder TARGET=0\nSET_HEATER_TEMPERATURE HEATER=heater_bed TARGET=0";
    preheatMutation.mutate(turnOffGcode);
  };

  const isPending = preheatMutation.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoadingPresets || isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Thermometer className="h-4 w-4 mr-2" />}
          Preheat
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Temperature Presets</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoadingPresets && <DropdownMenuItem disabled><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...</DropdownMenuItem>}
        
        {isErrorPresets && <DropdownMenuItem disabled className="text-destructive">Failed to load presets</DropdownMenuItem>}

        {presets && presets.length > 0 ? (
          presets.map((preset) => (
            <DropdownMenuItem 
              key={preset.name} 
              onSelect={() => handleSelectPreset(preset)}
              disabled={isPending}
            >
              {preset.name} ({preset.extruder}°C / {preset.heater_bed}°C)
            </DropdownMenuItem>
          ))
        ) : (
          !isLoadingPresets && !isErrorPresets && (
            <DropdownMenuItem disabled>No presets found</DropdownMenuItem>
          )
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onSelect={handleTurnOff}
          disabled={isPending}
          className="text-destructive focus:text-destructive"
        >
          Turn Off Heaters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PreheatDropdown;