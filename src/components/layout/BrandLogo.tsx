"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Package2 } from "lucide-react";

const BrandLogo = () => {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold">
      <Package2 className="h-6 w-6" />
      <span className="">ClassicPOS</span>
    </Link>
  );
};

export default BrandLogo;