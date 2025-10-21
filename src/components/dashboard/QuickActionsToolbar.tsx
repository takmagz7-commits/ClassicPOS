"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, PlusCircle, Box, BarChart } from "lucide-react";
import { Link } from "react-router-dom";

const QuickActionsToolbar = () => {
  const actions = [
    { name: "New Sale", icon: ShoppingCart, href: "/sales", color: "bg-blue-500 hover:bg-blue-600" },
    { name: "Add Product", icon: PlusCircle, href: "/products", color: "bg-green-500 hover:bg-green-600" },
    { name: "Inventory", icon: Box, href: "/products", color: "bg-purple-500 hover:bg-purple-600" },
    { name: "View Reports", icon: BarChart, href: "/reports", color: "bg-orange-500 hover:bg-orange-600" },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3 justify-center">
          {actions.map((action) => (
            <Button
              key={action.name}
              asChild
              className={`${action.color} text-white`}
            >
              <Link to={action.href}>
                <action.icon className="mr-2 h-4 w-4" />
                {action.name}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsToolbar;