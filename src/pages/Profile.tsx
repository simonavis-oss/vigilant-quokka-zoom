import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/context/SessionContext";
import { fetchProfile, Profile } from "@/integrations/supabase/queries";
import { updateProfile } from "@/integrations/supabase/mutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import ProfileForm from "@/components/ProfileForm";
import { User } from "lucide-react";

const ProfilePage = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const queryClient = useQueryClient();

  const userId = user?.id;

  const { data: profile, isLoading: isProfileLoading, isError, error } = useQuery<Profile>({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data, variables) => {
      showSuccess("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleUpdate = (updates: Partial<Profile>) => {
    updateMutation.mutate(updates);
  };

  if (isSessionLoading || isProfileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !profile) {
    showError(`Error loading profile: ${error?.message || "Profile data missing."}`);
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-destructive">Error</h2>
        <p className="text-muted-foreground">Could not load user profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center">
        <User className="h-7 w-7 mr-3" /> Profile Settings
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm 
            profile={profile} 
            onSubmit={handleUpdate} 
            isSubmitting={updateMutation.isPending} 
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            <span className="font-medium">Email:</span> {user?.email}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            To change your email or password, please use the Supabase authentication flow (not implemented here).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;