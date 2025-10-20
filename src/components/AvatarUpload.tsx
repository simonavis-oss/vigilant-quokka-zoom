import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Loader2, User } from "lucide-react";
import { Profile } from "@/integrations/supabase/queries";
import { showSuccess, showError } from "@/utils/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "@/integrations/supabase/mutations";

interface AvatarUploadProps {
  profile: Profile;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ profile }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newUrl, setNewUrl] = useState(profile.avatar_url || "");

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      showSuccess("Avatar URL updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
      setIsEditing(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleSave = () => {
    const urlToSave = newUrl.trim() || null;
    if (urlToSave && !urlToSave.match(/^https?:\/\/.+/)) {
        showError("Please enter a valid URL or leave blank.");
        return;
    }
    
    if (urlToSave !== profile.avatar_url) {
      updateMutation.mutate({ id: profile.id, avatar_url: urlToSave });
    } else {
      setIsEditing(false);
    }
  };
  
  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName ? firstName[0] : '';
    const last = lastName ? lastName[0] : '';
    return (first + last).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-24 w-24">
        <AvatarImage src={profile.avatar_url || undefined} alt="User Avatar" />
        <AvatarFallback className="text-3xl">
          {getInitials(profile.first_name, profile.last_name) || <User className="h-10 w-10" />}
        </AvatarFallback>
      </Avatar>

      {isEditing ? (
        <div className="flex w-full max-w-sm space-x-2">
          <Input
            placeholder="Enter image URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            disabled={updateMutation.isPending}
          />
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
          <Button variant="outline" onClick={() => setIsEditing(false)} disabled={updateMutation.isPending}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setIsEditing(true)} size="sm">
          <Camera className="h-4 w-4 mr-2" /> Change Avatar
        </Button>
      )}
    </div>
  );
};

export default AvatarUpload;