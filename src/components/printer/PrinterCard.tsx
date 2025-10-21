// Add this to the imports
import { Brain } from "lucide-react";

// Add this in the CardHeader section, after the printer name
{printer.ai_failure_detection_enabled && (
  <Badge variant="secondary" className="ml-2">
    <Brain className="h-3 w-3 mr-1" />
    AI
  </Badge>
)}