import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export interface FailureAlert {
  id: string;
  printer_id: string;
  screenshot_url: string | null;
  printerName: string; // We'll enrich this
}

export const useFailureAlerts = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [activeAlert, setActiveAlert] = useState<FailureAlert | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('failure-alerts-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'failure_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newAlert = payload.new as any;

          // Fetch printer name to enrich the alert
          const { data: printer } = await supabase
            .from('printers')
            .select('name')
            .eq('id', newAlert.printer_id)
            .single();

          const enrichedAlert: FailureAlert = {
            id: newAlert.id,
            printer_id: newAlert.printer_id,
            screenshot_url: newAlert.screenshot_url,
            printerName: printer?.name || 'Unknown Printer',
          };

          toast.warning(`AI Failure Detected on ${enrichedAlert.printerName}`, {
            description: "A potential print failure has been detected. Click to review.",
            duration: Infinity,
            action: {
              label: "View Alert",
              onClick: () => {
                setActiveAlert(enrichedAlert);
                setIsAlertOpen(true);
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    activeAlert,
    isAlertOpen,
    closeAlert: () => setIsAlertOpen(false),
  };
};