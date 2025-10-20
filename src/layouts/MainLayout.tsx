import React from "react";
import { useSession } from "@/context/SessionContext";
import { Navigate, Outlet } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

const MainLayout = () => {
  const { user, isLoading } = useSession();

  if (isLoading) {
    // Simple loading state while checking session
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading application...
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated users to login
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-bold">3D Print Farm Manager</h1>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-grow container py-8">
        <Outlet />
      </main>
      <footer className="border-t">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default MainLayout;