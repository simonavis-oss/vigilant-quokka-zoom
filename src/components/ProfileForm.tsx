import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { Profile } from "@/integrations/supabase/queries";

// --- Schemas ---

const ProfileSchema = z.object({
  first_name: z.string().min(1, "First name is required.").max(50),
  last_name: z.string().min(1, "Last name is required.").max(50),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

// --- Component ---

interface ProfileFormProps {
  profile: Profile;
  onSubmit: (data: Partial<Profile>) => void;
  isSubmitting: boolean;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onSubmit, isSubmitting }) => {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
    },
    mode: "onChange",
  });

  const handleSubmit = (data: ProfileFormValues) => {
    // Only submit fields that have changed
    const updates: Partial<Profile> = { id: profile.id };
    
    if (data.first_name !== profile.first_name) updates.first_name = data.first_name;
    if (data.last_name !== profile.last_name) updates.last_name = data.last_name;

    if (Object.keys(updates).length > 1) { // Check if more than just 'id' is present
      onSubmit(updates);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting || !form.formState.isDirty || !form.formState.isValid}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </form>
    </Form>
  );
};

export default ProfileForm;