import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoOff, Loader2 } from "lucide-react";

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
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!webcamUrl) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const generateProxyUrl = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error("Not authenticated.");
        }
        
        const proxyUrl = `https://dkgsqkprdpgydybxcwhj.supabase.co/functions/v1/proxy-webcam?printer_id=${printerId}&token=${session.access_token}`;
        
        if (isMounted) {
          setStreamUrl(proxyUrl);
        }
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e.message : "Failed to generate stream URL.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    generateProxyUrl();

    return () => {
      isMounted = false;
    };
  }, [webcamUrl, printerId]);

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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-4">
          <Loader2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 animate-spin" />
          <p className="text-sm text-muted-foreground">Initializing stream...</p>
        </div>
      );
    }

    if (error || !streamUrl) {
      return (
        <div className="text-center p-4">
          <VideoOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-destructive">Stream Unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">{error || "No webcam URL configured."}</p>
        </div>
      );
    }

    return (
      <>
        <img 
          src={streamUrl} 
          alt="Webcam Stream" 
          className="w-full h-full object-contain"
          onError={() => setError("Failed to load stream. Check printer connection and webcam server settings if the issue persists.")}
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
    <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
      {renderContent()}
    </div>
  );
};

export default WebcamStream;