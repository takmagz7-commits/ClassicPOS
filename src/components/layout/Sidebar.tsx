"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, ShoppingCart, Users, LineChart, Settings, Boxes, Store, DollarSign, History, Truck, Package, FileText, SlidersHorizontal, Repeat, BookText, Clock, Wallet, Shield, ScrollText } from "lucide-react";
import BrandLogo from "@/components/layout/BrandLogo";
import { useAuth } from "@/components/auth/AuthContext";
import { UserRole } from "@/types/user";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean;
  onLinkClick?: () => void;
}

const Sidebar = ({ className, onLinkClick }: SidebarProps) => {
  const { hasPermission } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/products", icon: Boxes, label: "Products", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/customers", icon: Users, label: "Customers", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { to: "/suppliers", icon: Truck, label: "Suppliers", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/purchase-orders", icon: Package, label: "Purchase Orders", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/goods-received-notes", icon: FileText, label: "Goods Received Notes", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/stock-adjustments", icon: SlidersHorizontal, label: "Stock Adjustments", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/transfer-of-goods", icon: Repeat, label: "Transfer of Goods", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/inventory-history", icon: BookText, label: "Inventory History", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] }, // New navigation item
    { to: "/sales", icon: ShoppingCart, label: "Sales Terminal", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { to: "/sales-history", icon: History, label: "Sales History", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { to: "/stores", icon: Store, label: "Multi-Store", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/accounting", icon: DollarSign, label: "Accounting", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/reports", icon: LineChart, label: "Reports", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/attendance", icon: Clock, label: "Attendance", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { to: "/payroll", icon: Wallet, label: "Payroll", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/role-management", icon: Shield, label: "Role Management", requiredRoles: [UserRole.ADMIN] },
    { to: "/audit-logs", icon: ScrollText, label: "Audit Logs", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: "/settings", icon: Settings, label: "Settings", requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
  ];

  return (
    <div className={cn("flex-1 overflow-auto", className)}>
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <BrandLogo />
      </div>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
                return (
                  (item.requiredRoles && hasPermission(item.requiredRoles)) && (
                    <Button
                      key={item.to}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        isActive && "bg-accent text-accent-foreground hover:bg-accent"
                      )}
                      asChild
                      onClick={onLinkClick}
                    >
                      <Link to={item.to}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Link>
                    </Button>
                  )
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;