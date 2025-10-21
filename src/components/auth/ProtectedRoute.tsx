"use client";

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { routesConfig } from "@/config/routesConfig"; // Import routesConfig
import { toast } from "sonner"; // Import toast
import { UserRole } from "@/types/user"; // Import UserRole

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, hasPermission, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Find the current route configuration
  const currentRoute = routesConfig.find(r => {
    // Handle root path specifically
    if (r.path === "/" && location.pathname === "/") {
      return true;
    }
    // For other paths, check if the path starts with the route path
    // This handles nested routes or dynamic segments if they were implemented
    return location.pathname.startsWith(r.path) && r.path !== "/";
  });

  // If route is not found or has no specific role requirements, allow access
  if (!currentRoute || !currentRoute.requiredRoles) {
    return <MainLayout>{children || <Outlet />}</MainLayout>;
  }

  // Check if the user has permission for the current route
  if (!hasPermission(currentRoute.requiredRoles)) {
    toast.error("You do not have permission to access this page.");
    // Redirect employees to /sales if they try to access a forbidden page
    if (user?.role === UserRole.EMPLOYEE) {
      return <Navigate to="/sales" replace />;
    }
    return <Navigate to="/" replace />; // Redirect to dashboard or an access denied page for other roles
  }

  return <MainLayout>{children || <Outlet />}</MainLayout>;
};

export default ProtectedRoute;