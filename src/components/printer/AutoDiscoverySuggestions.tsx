import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Copy } from "lucide-react";
import { showSuccess } from "@/utils/toast";

interface Suggestion {
  name: string;
  url: string;
}

const COMMON_MOONRAKER_SUGGESTIONS: Suggestion[] = [
  { name: "Raspberry Pi (Default)", url: "192.168.1.100:7125" },
  { name: "OctoPi/Klipper (Common)", url: "http://octopi.local:7125" },
  { name: "Mainsail/Fluid (Default)", url: "http://mainsail.local" },
  { name: "Localhost (Testing)", url: "http://127.0.0.1:7125" },
];

interface AutoDiscoverySuggestionsProps {
  onSelect: (url: string) => void;
}

const AutoDiscoverySuggestions: React.FC<AutoDiscoverySuggestionsProps> = ({ onSelect }) => {
  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    showSuccess(`Copied ${url} to clipboard.`);
  };

  return (
    <Card className="bg-muted/50 border-dashed">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center">
          <Search className="h-4 w-4 mr-2" /> Auto-Discovery Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-sm text-muted-foreground mb-3">
          We cannot scan your local network directly. Try these common addresses or click to copy them into the address field above.
        </p>
        <div className="space-y-2">
          {COMMON_MOONRAKER_SUGGESTIONS.map((suggestion) => (
            <div key={suggestion.url} className="flex justify-between items-center p-2 bg-background rounded-md border">
              <div className="text-sm font-mono truncate pr-2">
                {suggestion.url}
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onSelect(suggestion.url)}
                >
                  Use
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => handleCopy(suggestion.url)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoDiscoverySuggestions;