"use client";

import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Sales from "@/pages/Sales";
import SalesHistory from "@/pages/SalesHistory";
import Stores from "@/pages/Stores";
import Suppliers from "@/pages/Suppliers";
import PurchaseOrders from "@/pages/PurchaseOrders";
import GoodsReceivedNotes from "@/pages/GoodsReceivedNotes";
import StockAdjustments from "@/pages/StockAdjustments";
import TransferOfGoodsPage from "@/pages/TransferOfGoods";
import InventoryHistory from "@/pages/InventoryHistory";
import Accounting from "@/pages/Accounting";
import Reports from "@/pages/Reports";
import Attendance from "@/pages/Attendance";
import Payroll from "@/pages/Payroll";
import Settings from "@/pages/Settings";
import RoleManagement from "@/pages/RoleManagement";
import AuditLogs from "@/pages/AuditLogs";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import PinSetup from "@/pages/PinSetup";
import { UserRole } from "@/types/user";

export const routesConfig = [
  { path: "/", title: "Dashboard", component: Dashboard, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/products", title: "Products", component: Products, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/customers", title: "Customers", component: Customers, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
  { path: "/customers/:id", title: "Customer Details", component: CustomerDetail, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
  { path: "/suppliers", title: "Suppliers", component: Suppliers, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/purchase-orders", title: "Purchase Orders", component: PurchaseOrders, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/goods-received-notes", title: "Goods Received Notes", component: GoodsReceivedNotes, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/stock-adjustments", title: "Stock Adjustments", component: StockAdjustments, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/transfer-of-goods", title: "Transfer of Goods", component: TransferOfGoodsPage, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/inventory-history", title: "Inventory History", component: InventoryHistory, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] }, // New route
  { path: "/sales", title: "New Sale", component: Sales, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
  { path: "/sales-history", title: "Sales History", component: SalesHistory, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
  { path: "/stores", title: "Multi-Store", component: Stores, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/accounting", title: "Accounting", component: Accounting, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/reports", title: "Reports", component: Reports, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/attendance", title: "Attendance", component: Attendance, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
  { path: "/payroll", title: "Payroll", component: Payroll, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/role-management", title: "Role Management", component: RoleManagement, requiredRoles: [UserRole.ADMIN] },
  { path: "/audit-logs", title: "Audit Logs", component: AuditLogs, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER] },
  { path: "/settings", title: "Settings", component: Settings, requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
  { path: "/login", title: "Login", component: Login },
  { path: "/signup", title: "Sign Up", component: Signup },
  { path: "/setup-pin", title: "PIN Setup", component: PinSetup },
];