import React, { useState } from "react";
import { useSession } from "@/context/SessionContext";
import { Navigate, Outlet, Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, Settings, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Sidebar from "@/components/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "@/types/printer";
import { fetchPrinters } from "@/integrations/supabase/queries";
import { usePrintJobAutomation } from "@/hooks/use-print-job-automation";

const MainLayout = () => {
  const { user, isLoading } = useSession();
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: printers } = useQuery<Printer[]>({
    queryKey: ["printers", user?.id],
    queryFn: () => fetchPrinters(user!.id),
    enabled: !!user?.id,
  });

  usePrintJobAutomation(printers);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading application...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderSidebar = () => {
    if (isMobile) {
      return (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <div className="pt-10"><Sidebar /></div>
          </SheetContent>
        </Sheet>
      );
    }
    return <aside className="hidden lg:block w-64 border-r bg-sidebar/50"><Sidebar /></aside>;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between lg:justify-end">
          <div className="flex items-center lg:hidden">{renderSidebar()}<Link to="/" className="ml-4 text-xl font-bold hover:opacity-80 transition-opacity">Farm Manager</Link></div>
          <div className="hidden lg:block"><Link to="/" className="text-xl font-bold hover:opacity-80 transition-opacity">3D Print Farm Manager</Link></div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile" className="flex items-center"><Settings className="mr-2 h-4 w-4" />Profile Settings</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:block w-64 border-r bg-card/50"><Sidebar /></aside>
        <main className="flex-1 overflow-y-auto p-4 md:p-8"><Outlet /></main>
      </div>
      <footer className="border-t"><MadeWithDyad /></footer>
    </div>
  );
};

export default MainLayout;