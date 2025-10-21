import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { showError, showSuccess } from "@/utils/toast";
import { analyzePrintFailure } from "@/integrations/supabase/functions";

interface AIFailureDetectionOptions {
  printerId: string;
  enabled: boolean;
  interval?: number; // seconds
}

export const useAIFailureDetection = ({ printerId, enabled, interval = 30 }: AIFailureDetectionOptions) => {
  const { user } = useSession();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !user || !printerId) return;

    const analyze = async () => {
      if (isAnalyzing) return;
      
      setIsAnalyzing(true);
      try {
        const result = await analyzePrintFailure(printerId);
        setLastAnalysis(new Date());
        
        if (result.is_failure && result.requires_action) {
          // This will trigger the existing failure alert system
          const { error } = await supabase.from("failure_alerts").insert({
            user_id: user.id,
            printer_id: printerId,
            screenshot_url: result.screenshot_url,
            status: 'detected',
          });
          
          if (error) {
            showError("Failed to create failure alert");
          } else {
            showSuccess(`AI detected potential ${result.failure_type} failure (${Math.round(result.confidence * 100)}% confidence)`);
          }
        }
      } catch (error) {
        console.error("AI analysis failed:", error);
        // Don't show user-facing errors for routine analysis failures
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Initial analysis
    analyze();

    // Set up interval
    const intervalId = setInterval(analyze, interval * 1000);

    return () => clearInterval(intervalId);
  }, [printerId, enabled, user, interval, isAnalyzing]);

  return {
    isAnalyzing,
    lastAnalysis,
  };
};