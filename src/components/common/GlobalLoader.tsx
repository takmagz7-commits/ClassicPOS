"use client";

import React from "react";
import { useLoading } from "@/context/LoadingContext";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GlobalLoader = () => {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default GlobalLoader;