import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "@/integrations/supabase/mutations";
import { Profile } from "@/integrations/supabase/queries";
import { showSuccess, showError } from "@/utils/toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ProfilePreferencesProps {
  profile: Profile;
}

const ProfilePreferences: React.FC<ProfilePreferencesProps> = ({ profile }) => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      showSuccess("Preference updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleToggle = (key: keyof Profile, value: boolean) => {
    const updates: Partial<Profile> = { id: profile.id, [key]: value };
    updateMutation.mutate(updates);
  };

  const isSubmitting = updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="advanced-metrics" className="text-base">
            Enable Advanced Dashboard Metrics
          </Label>
          <p className="text-sm text-muted-foreground">
            Show detailed charts and analytics on the main dashboard.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            id="advanced-metrics"
            checked={profile.enable_advanced_metrics}
            onCheckedChange={(checked) => handleToggle("enable_advanced_metrics", checked)}
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      {/* Add more preference toggles here */}
    </div>
  );
};

export default ProfilePreferences;