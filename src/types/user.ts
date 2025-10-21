export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  EMPLOYEE = "employee",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  department?: string;
  jobTitle?: string;
  salary?: number;
  pinCode?: string;
  status?: UserStatus;
  mfaEnabled: boolean;
  mfaSecret?: string;
  backupCodes?: string[];
  businessName?: string;
  businessType?: string;
  country?: string;
  phone?: string;
  vatNumber?: string;
  tinNumber?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
  createdAt?: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  clockIn: string;
  clockOut?: string;
  totalHours: number;
  date: string;
  remarks?: string;
  createdAt?: string;
}

export interface Payroll {
  id: string;
  userId: string;
  userName: string;
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  overtimeAmount: number;
  netSalary: number;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  journalEntryId?: string;
  createdAt?: string;
}

export enum PayrollStatus {
  PENDING = "pending",
  APPROVED = "approved",
  PAID = "paid",
  CANCELLED = "cancelled",
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}
