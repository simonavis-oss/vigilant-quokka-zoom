// Add this import at the top
import AISettingsPanel from "@/components/printer/AISettingsPanel";

// Add this to the tabs in the PrinterDetails component
<TabsTrigger value="ai"><Brain className="h-4 w-4 mr-2" />AI Detection</TabsTrigger>

// Add this to the TabsContent section
<TabsContent value="ai" className="mt-6">
  <AISettingsPanel printer={printer} />
</TabsContent>