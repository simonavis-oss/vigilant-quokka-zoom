import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoOff, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WebcamStreamProps {
  webcamUrl: string | null;
  printerId: string;
}

const WebcamStream: React.FC<WebcamStreamProps> = ({ webcamUrl, printerId }) => {
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true); // Start streaming by default

  useEffect(() => {
    if (!printerId) return;

    const channel = supabase
      .channel(`printer-bbox-${printerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'printers',
          filter: `id=eq.${printerId}`,
        },
        (payload) => {
          const newBox = payload.new.ai_bounding_box as BoundingBox | null;
          setBoundingBox(newBox);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [printerId]);

  // Reset error state if the URL changes
  useEffect(() => {
    setStreamError(false);
    // If URL changes, restart streaming
    if (webcamUrl) {
      setIsStreaming(true);
    }
  }, [webcamUrl]);

  const handleToggleStream = () => {
    setIsStreaming(prev => !prev);
    if (streamError) {
      // If we try to play after an error, reset the error state
      setStreamError(false);
    }
  };

  const renderContent = () => {
    if (!webcamUrl) {
      return (
        <div className="text-center p-4">
          <VideoOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No Webcam Configured</p>
          <p className="text-xs text-muted-foreground mt-1">Add a stream URL in the webcam settings.</p>
        </div>
      );
    }

    if (!isStreaming) {
      return (
        <div className="text-center p-4">
          <VideoOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Stream Paused</p>
          <p className="text-xs text-muted-foreground mt-1">Click Play to resume live feed.</p>
        </div>
      );
    }

    if (streamError) {
        return (
            <div className="text-center p-4">
              <VideoOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-destructive">Stream Unavailable</p>
              <p className="text-xs text-muted-foreground mt-1">Could not connect. Check the URL and CORS settings on your webcam server.</p>
            </div>
          );
    }

    // Key change: Only render the img tag if isStreaming is true
    return (
      <>
        <img 
          src={webcamUrl} 
          alt="Webcam Stream" 
          className="w-full h-full object-contain"
          onError={() => setStreamError(true)}
        />
        {boundingBox && (
          <div
            className="absolute border-2 border-red-500 bg-red-500/20"
            style={{
              left: `${boundingBox.x * 100}%`,
              top: `${boundingBox.y * 100}%`,
              width: `${boundingBox.width * 100}%`,
              height: `${boundingBox.height * 100}%`,
            }}
          />
        )}
      </>
    );
  };

  return (
    <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden flex flex-col">
      <div className="relative flex-1 flex items-center justify-center">
        {renderContent()}
      </div>
      {webcamUrl && (
        <div className="absolute bottom-2 right-2">
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={handleToggleStream}
            className="h-8 w-8"
          >
            {isStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WebcamStream;