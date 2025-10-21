"use client";

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePageTitle } from "@/hooks/use-page-title";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "@/components/layout/Sidebar";
import CurrencySelector from "@/components/common/CurrencySelector";
import UserNav from "@/components/layout/UserNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const Header = () => {
  const pageTitle = usePageTitle();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6 z-10">
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      <h1 className="text-xl font-semibold flex-1 min-w-0 truncate">{pageTitle}</h1>
      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <CurrencySelector />
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
};

export default Header;