import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoOff } from "lucide-react";

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

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [printerId]);

  return (
    <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
      {webcamUrl ? (
        <>
          <img 
            src={webcamUrl} 
            alt="Webcam Stream" 
            className="w-full h-full object-contain"
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
      ) : (
        <div className="text-center p-4">
          <VideoOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No webcam URL configured.
          </p>
        </div>
      )}
    </div>
  );
};

export default WebcamStream;