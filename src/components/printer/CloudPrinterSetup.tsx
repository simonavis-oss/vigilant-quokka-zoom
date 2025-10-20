import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Terminal } from "lucide-react";
import { Printer } from "@/types/printer";
import { showSuccess } from "@/utils/toast";

interface CloudPrinterSetupProps {
  printer: Printer;
}

const SUPABASE_URL = "https://dkgsqkprdpgydybxcwhj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3Nxa3ByZHBneWR5Ynhjd2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NzM0MzcsImV4cCI6MjA3NjU0OTQzN30.NioYL-fuwzTD1Z9C46QSdukeZaAEv01JjSea3JeaRLY";

const pythonScript = (cloudPrinterId: string) => `
import os
import asyncio
import requests
import json
from supabase import create_client, Client
import time

# --- Configuration ---
SUPABASE_URL = "${SUPABASE_URL}"
SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}"
CLOUD_PRINTER_ID = "${cloudPrinterId}"
# IMPORTANT: Update this to your printer's local Moonraker/Klipper URL
PRINTER_BASE_URL = "http://localhost:7125" 
# Optional: Add your Moonraker API key if needed
API_KEY = "" 

# --- Main Agent Logic ---
class PrinterAgent:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        self.command_channel = self.supabase.channel(f"printer-commands:{CLOUD_PRINTER_ID}")
        self.response_channel = self.supabase.channel(f"printer-responses:{CLOUD_PRINTER_ID}")
        print("Agent initialized. Connecting to Supabase...")

    def handle_request(self, payload):
        request_id = payload.get("request_id")
        command_type = payload.get("type")
        print(f"Received command: {command_type} (ID: {request_id})")

        try:
            if command_type == "GET_STATUS":
                response_data = self.get_status()
            elif command_type == "SEND_COMMAND":
                response_data = self.send_command(payload.get("payload", {}).get("command"))
            elif command_type == "LIST_FILES":
                response_data = self.list_files()
            else:
                raise ValueError(f"Unknown command type: {command_type}")
            
            self.send_response(request_id, response_data)
        except Exception as e:
            print(f"Error processing request {request_id}: {e}")
            self.send_response(request_id, {"error": str(e)})

    def send_response(self, request_id, data):
        print(f"Sending response for ID: {request_id}")
        self.response_channel.send({
            "type": "broadcast",
            "event": "agent-response",
            "request_id": request_id,
            "data": data,
        })

    def _make_request(self, method, endpoint, params=None, json_data=None):
        url = f"{PRINTER_BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        if API_KEY:
            headers["X-Api-Key"] = API_KEY
        
        response = requests.request(method, url, headers=headers, params=params, json=json_data, timeout=5)
        response.raise_for_status()
        return response.json()

    def get_status(self):
        endpoint = "/printer/objects/query?webhooks&print_stats&display_status&extruder&heater_bed&virtual_sdcard"
        data = self._make_request("GET", endpoint)
        # Format data similarly to the direct-connection edge function
        status = data.get("result", {}).get("status", {})
        print_stats = status.get("print_stats", {})
        is_printing = print_stats.get("state") in ["printing", "paused"]
        
        def format_time(seconds):
            if not isinstance(seconds, (int, float)) or seconds <= 0: return "N/A"
            h = int(seconds / 3600)
            m = int((seconds % 3600) / 60)
            return f"{h}h {m}m"

        return {
            "data": {
                "is_printing": is_printing,
                "is_paused": print_stats.get("state") == "paused",
                "progress": round((status.get("display_status", {}).get("progress", 0) or 0) * 100),
                "nozzle_temp": f"{status.get('extruder', {}).get('temperature', 0):.1f}°C / {status.get('extruder', {}).get('target', 0):.1f}°C",
                "bed_temp": f"{status.get('heater_bed', {}).get('temperature', 0):.1f}°C / {status.get('heater_bed', {}).get('target', 0):.1f}°C",
                "file_name": print_stats.get("filename", "Idle") if is_printing else "Idle",
                "time_remaining": format_time(print_stats.get("total_duration", 0) - print_stats.get("print_duration", 0)),
            }
        }

    def send_command(self, gcode):
        if not gcode: raise ValueError("G-code command is missing")
        self._make_request("POST", f"/printer/gcode/script?gcode={gcode}")
        return {"status": "success", "message": f"Command executed: {gcode}"}

    def list_files(self):
        data = self._make_request("GET", "/server/files/list")
        files = [
            {"path": f["path"], "modified": f["modified"], "size": f["size"]}
            for f in data.get("result", [])
            if f.get("path", "").lower().endswith(".gcode")
        ]
        return {"status": "success", "data": files}

    async def run(self):
        def on_message(payload):
            self.handle_request(payload)

        self.command_channel.on("proxy-request", on_message)
        self.command_channel.subscribe()
        self.response_channel.subscribe()
        print(f"Agent is listening for commands on channel: printer-commands:{CLOUD_PRINTER_ID}")
        
        # Keep the script running
        while True:
            await asyncio.sleep(60)

if __name__ == "__main__":
    agent = PrinterAgent()
    asyncio.run(agent.run())
`;

const CloudPrinterSetup: React.FC<CloudPrinterSetupProps> = ({ printer }) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copied to clipboard!");
  };

  if (!printer.cloud_printer_id) {
    return (
      <Card>
        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
        <CardContent><p>Cloud Printer ID is missing. Please re-create the printer.</p></CardContent>
      </Card>
    );
  }

  const scriptContent = pythonScript(printer.cloud_printer_id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Terminal className="h-5 w-5 mr-2" /> Cloud Agent Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>To connect this printer, run the following Python script on a computer on the same local network as your printer (e.g., a Raspberry Pi).</p>
          
          <div>
            <h3 className="font-semibold mb-2">Step 1: Install Dependencies</h3>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm relative">
              <code>pip install supabase requests</code>
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => handleCopy("pip install supabase requests")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Step 2: Save and Configure the Agent Script</h3>
            <p className="text-sm text-muted-foreground mb-2">Save the code below as a Python file (e.g., <code className="bg-muted px-1 rounded">agent.py</code>). <span className="font-bold">Important:</span> You must edit the script to set the correct <code className="bg-muted px-1 rounded">PRINTER_BASE_URL</code> for your setup.</p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm relative max-h-96 overflow-auto">
              <pre><code>{scriptContent}</code></pre>
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => handleCopy(scriptContent)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Step 3: Run the Agent</h3>
            <p className="text-sm text-muted-foreground mb-2">Run the script from your terminal. It will connect to the service and wait for commands. For long-term use, consider running it as a system service.</p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm relative">
              <code>python agent.py</code>
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => handleCopy("python agent.py")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudPrinterSetup;