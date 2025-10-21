import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  Printer,
  User,
  ListOrdered,
  AlertTriangle,
  Package, // Import Package icon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Printers",
    href: "/printers",
    icon: Printer,
  },
  {
    title: "Print Queue",
    href: "/queue",
    icon: ListOrdered,
  },
  {
    title: "Materials", // New item
    href: "/materials",
    icon: Package,
  },
  {
    title: "Failure Alerts",
    href: "/alerts",
    icon: AlertTriangle,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
];

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();

  return (
    <div className={cn("h-full flex flex-col space-y-4 p-4", className)}>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Navigation
        </h2>
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Button
                variant={
                  location.pathname.startsWith(item.href) &&
                  (item.href !== "/" || location.pathname === "/")
                    ? "secondary"
                    : "ghost"
                }
                className="w-full justify-start"
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;