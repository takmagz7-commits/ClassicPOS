"use client";

import { useLocation } from "react-router-dom";
import { routesConfig } from "@/config/routesConfig";

export function usePageTitle() {
  const location = useLocation();
  const route = routesConfig.find(r => r.path === location.pathname);
  return route ? route.title : "ClassicPOS"; // Default title if route not found
}