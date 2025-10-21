/**
 * Database Helper Functions
 * Utilities for converting between TypeScript types and database formats
 */

import { Product } from '@/types/product';
import { Customer } from '@/types/customer';
import { Sale } from '@/types/sale';
import { Supplier } from '@/types/supplier';
import { Category } from '@/types/category';
import { Store } from '@/types/store';
import { TaxRate } from '@/types/tax';
import { PaymentMethod } from '@/types/payment';
import { PurchaseOrder, GoodsReceivedNote, StockAdjustment, TransferOfGoods, InventoryHistoryEntry } from '@/types/inventory';

// Boolean to integer conversion
export const boolToInt = (value: boolean): number => value ? 1 : 0;
export const intToBool = (value: number | null | undefined): boolean => value === 1;

// Product conversion
export interface DbProduct {
  id: string;
  name: string;
  category_id: string;
  price: number;
  cost: number;
  wholesale_price: number;
  stock: number;
  stock_by_store: string | null; // JSON string
  track_stock: number;
  available_for_sale: number;
  sku: string;
  image_url: string | null;
  created_at?: string;
}

export const productToDb = (product: Product): DbProduct => ({
  id: product.id,
  name: product.name,
  category_id: product.categoryId,
  price: product.price,
  cost: product.cost,
  wholesale_price: product.wholesalePrice,
  stock: product.stock,
  stock_by_store: product.stockByStore ? JSON.stringify(product.stockByStore) : null,
  track_stock: boolToInt(product.trackStock),
  available_for_sale: boolToInt(product.availableForSale),
  sku: product.sku,
  image_url: product.imageUrl || null,
});

export const dbToProduct = (dbProduct: DbProduct): Product => ({
  id: dbProduct.id,
  name: dbProduct.name,
  categoryId: dbProduct.category_id,
  price: dbProduct.price,
  cost: dbProduct.cost,
  wholesalePrice: dbProduct.wholesale_price,
  stock: dbProduct.stock,
  stockByStore: dbProduct.stock_by_store ? JSON.parse(dbProduct.stock_by_store) : undefined,
  trackStock: intToBool(dbProduct.track_stock),
  availableForSale: intToBool(dbProduct.available_for_sale),
  sku: dbProduct.sku,
  imageUrl: dbProduct.image_url || undefined,
});

// Customer conversion
export interface DbCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  loyalty_points: number;
  vat_number: string | null;
  tin_number: string | null;
  created_at?: string;
}

export const customerToDb = (customer: Customer): DbCustomer => ({
  id: customer.id,
  name: customer.name,
  email: customer.email,
  phone: customer.phone || null,
  address: customer.address || null,
  loyalty_points: customer.loyaltyPoints,
  vat_number: customer.vatNumber || null,
  tin_number: customer.tinNumber || null,
});

export const dbToCustomer = (dbCustomer: DbCustomer): Customer => ({
  id: dbCustomer.id,
  name: dbCustomer.name,
  email: dbCustomer.email,
  phone: dbCustomer.phone || undefined,
  address: dbCustomer.address || undefined,
  loyaltyPoints: dbCustomer.loyalty_points,
  vatNumber: dbCustomer.vat_number || undefined,
  tinNumber: dbCustomer.tin_number || undefined,
});

// Sale conversion
export interface DbSale {
  id: string;
  date: string;
  items: string; // JSON string
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  type: string;
  gift_card_amount_used: number | null;
  customer_id: string | null;
  customer_name: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  loyalty_points_used: number | null;
  loyalty_points_discount_amount: number | null;
  original_sale_id: string | null;
  tax_rate_applied: number | null;
  payment_method_id: string | null;
  employee_id: string | null;
  employee_name: string | null;
  held_by_employee_id: string | null;
  held_by_employee_name: string | null;
  store_id: string | null;
  store_name: string | null;
  created_at?: string;
}

export const saleToDb = (sale: Sale): DbSale => ({
  id: sale.id,
  date: sale.date,
  items: JSON.stringify(sale.items),
  subtotal: sale.subtotal,
  tax: sale.tax,
  total: sale.total,
  status: sale.status,
  type: sale.type,
  gift_card_amount_used: sale.giftCardAmountUsed || null,
  customer_id: sale.customerId || null,
  customer_name: sale.customerName || null,
  discount_percentage: sale.discountPercentage || null,
  discount_amount: sale.discountAmount || null,
  loyalty_points_used: sale.loyaltyPointsUsed || null,
  loyalty_points_discount_amount: sale.loyaltyPointsDiscountAmount || null,
  original_sale_id: sale.originalSaleId || null,
  tax_rate_applied: sale.taxRateApplied || null,
  payment_method_id: sale.paymentMethodId || null,
  employee_id: sale.employeeId || null,
  employee_name: sale.employeeName || null,
  held_by_employee_id: sale.heldByEmployeeId || null,
  held_by_employee_name: sale.heldByEmployeeName || null,
  store_id: sale.storeId || null,
  store_name: sale.storeName || null,
});

export const dbToSale = (dbSale: DbSale): Sale => ({
  id: dbSale.id,
  date: dbSale.date,
  items: JSON.parse(dbSale.items),
  subtotal: dbSale.subtotal,
  tax: dbSale.tax,
  total: dbSale.total,
  status: dbSale.status as Sale['status'],
  type: dbSale.type as Sale['type'],
  giftCardAmountUsed: dbSale.gift_card_amount_used || undefined,
  customerId: dbSale.customer_id || undefined,
  customerName: dbSale.customer_name || undefined,
  discountPercentage: dbSale.discount_percentage || undefined,
  discountAmount: dbSale.discount_amount || undefined,
  loyaltyPointsUsed: dbSale.loyalty_points_used || undefined,
  loyaltyPointsDiscountAmount: dbSale.loyalty_points_discount_amount || undefined,
  originalSaleId: dbSale.original_sale_id || undefined,
  taxRateApplied: dbSale.tax_rate_applied || undefined,
  paymentMethodId: dbSale.payment_method_id || undefined,
  employeeId: dbSale.employee_id || undefined,
  employeeName: dbSale.employee_name || undefined,
  heldByEmployeeId: dbSale.held_by_employee_id || undefined,
  heldByEmployeeName: dbSale.held_by_employee_name || undefined,
  storeId: dbSale.store_id || undefined,
  storeName: dbSale.store_name || undefined,
});

// Supplier, Category, Store conversions (simple, mostly direct mapping with snake_case)
export const supplierToDb = (supplier: Supplier) => ({
  id: supplier.id,
  name: supplier.name,
  contact_person: supplier.contactPerson || null,
  email: supplier.email || null,
  phone: supplier.phone || null,
  address: supplier.address || null,
  notes: supplier.notes || null,
  vat_number: supplier.vatNumber || null,
  tin_number: supplier.tinNumber || null,
});

export const dbToSupplier = (dbSupplier: any): Supplier => ({
  id: dbSupplier.id,
  name: dbSupplier.name,
  contactPerson: dbSupplier.contact_person || undefined,
  email: dbSupplier.email || undefined,
  phone: dbSupplier.phone || undefined,
  address: dbSupplier.address || undefined,
  notes: dbSupplier.notes || undefined,
  vatNumber: dbSupplier.vat_number || undefined,
  tinNumber: dbSupplier.tin_number || undefined,
});

export const categoryToDb = (category: Category) => ({
  id: category.id,
  name: category.name,
  is_uncategorized: boolToInt(category.isUncategorized || false),
});

export const dbToCategory = (dbCategory: any): Category => ({
  id: dbCategory.id,
  name: dbCategory.name,
  isUncategorized: intToBool(dbCategory.is_uncategorized),
});

export const storeToDb = (store: Store) => ({
  id: store.id,
  name: store.name,
  address: store.address,
  phone: store.phone || null,
  email: store.email || null,
});

export const dbToStore = (dbStore: any): Store => ({
  id: dbStore.id,
  name: dbStore.name,
  address: dbStore.address,
  phone: dbStore.phone || undefined,
  email: dbStore.email || undefined,
});

export const taxRateToDb = (taxRate: TaxRate) => ({
  id: taxRate.id,
  name: taxRate.name,
  rate: taxRate.rate,
  is_default: boolToInt(taxRate.isDefault),
});

export const dbToTaxRate = (dbTaxRate: any): TaxRate => ({
  id: dbTaxRate.id,
  name: dbTaxRate.name,
  rate: dbTaxRate.rate,
  isDefault: intToBool(dbTaxRate.is_default),
});

export const paymentMethodToDb = (method: PaymentMethod) => ({
  id: method.id,
  name: method.name,
  is_cash_equivalent: boolToInt(method.isCashEquivalent),
  is_credit: boolToInt(method.isCredit),
  is_bnpl: boolToInt(method.isBNPL),
});

export const dbToPaymentMethod = (dbMethod: any): PaymentMethod => ({
  id: dbMethod.id,
  name: dbMethod.name,
  isCashEquivalent: intToBool(dbMethod.is_cash_equivalent),
  isCredit: intToBool(dbMethod.is_credit),
  isBNPL: intToBool(dbMethod.is_bnpl),
});

// Inventory types (PO, GRN, Stock Adjustment, Transfer)
export const purchaseOrderToDb = (po: PurchaseOrder) => ({
  id: po.id,
  reference_no: po.referenceNo,
  supplier_id: po.supplierId,
  supplier_name: po.supplierName,
  order_date: po.orderDate,
  expected_delivery_date: po.expectedDeliveryDate || null,
  status: po.status,
  items: JSON.stringify(po.items),
  total_value: po.totalValue,
  notes: po.notes || null,
});

export const dbToPurchaseOrder = (dbPo: any): PurchaseOrder => ({
  id: dbPo.id,
  referenceNo: dbPo.reference_no,
  supplierId: dbPo.supplier_id,
  supplierName: dbPo.supplier_name,
  orderDate: dbPo.order_date,
  expectedDeliveryDate: dbPo.expected_delivery_date || undefined,
  status: dbPo.status,
  items: JSON.parse(dbPo.items),
  totalValue: dbPo.total_value,
  notes: dbPo.notes || undefined,
});

export const grnToDb = (grn: GoodsReceivedNote) => ({
  id: grn.id,
  reference_no: grn.referenceNo,
  purchase_order_id: grn.purchaseOrderId || null,
  supplier_id: grn.supplierId,
  supplier_name: grn.supplierName,
  received_date: grn.receivedDate,
  receiving_store_id: grn.receivingStoreId,
  receiving_store_name: grn.receivingStoreName,
  status: grn.status,
  items: JSON.stringify(grn.items),
  total_value: grn.totalValue,
  notes: grn.notes || null,
  approved_by_user_id: grn.approvedByUserId || null,
  approved_by_user_name: grn.approvedByUserName || null,
  approval_date: grn.approvalDate || null,
});

export const dbToGrn = (dbGrn: any): GoodsReceivedNote => ({
  id: dbGrn.id,
  referenceNo: dbGrn.reference_no,
  purchaseOrderId: dbGrn.purchase_order_id || undefined,
  supplierId: dbGrn.supplier_id,
  supplierName: dbGrn.supplier_name,
  receivedDate: dbGrn.received_date,
  receivingStoreId: dbGrn.receiving_store_id,
  receivingStoreName: dbGrn.receiving_store_name,
  status: dbGrn.status,
  items: JSON.parse(dbGrn.items),
  totalValue: dbGrn.total_value,
  notes: dbGrn.notes || undefined,
  approvedByUserId: dbGrn.approved_by_user_id || undefined,
  approvedByUserName: dbGrn.approved_by_user_name || undefined,
  approvalDate: dbGrn.approval_date || undefined,
});

export const stockAdjustmentToDb = (adj: StockAdjustment) => ({
  id: adj.id,
  adjustment_date: adj.adjustmentDate,
  store_id: adj.storeId,
  store_name: adj.storeName,
  items: JSON.stringify(adj.items),
  notes: adj.notes || null,
  approved_by_user_id: adj.approvedByUserId || null,
  approved_by_user_name: adj.approvedByUserName || null,
  approval_date: adj.approvalDate || null,
});

export const dbToStockAdjustment = (dbAdj: any): StockAdjustment => ({
  id: dbAdj.id,
  adjustmentDate: dbAdj.adjustment_date,
  storeId: dbAdj.store_id,
  storeName: dbAdj.store_name,
  items: JSON.parse(dbAdj.items),
  notes: dbAdj.notes || undefined,
  approvedByUserId: dbAdj.approved_by_user_id || undefined,
  approvedByUserName: dbAdj.approved_by_user_name || undefined,
  approvalDate: dbAdj.approval_date || undefined,
});

export const transferToDb = (transfer: TransferOfGoods) => ({
  id: transfer.id,
  transfer_date: transfer.transferDate,
  transfer_from_store_id: transfer.transferFromStoreId,
  transfer_from_store_name: transfer.transferFromStoreName,
  transfer_to_store_id: transfer.transferToStoreId,
  transfer_to_store_name: transfer.transferToStoreName,
  status: transfer.status,
  items: JSON.stringify(transfer.items),
  notes: transfer.notes || null,
  approved_by_user_id: transfer.approvedByUserId || null,
  approved_by_user_name: transfer.approvedByUserName || null,
  approval_date: transfer.approvalDate || null,
  received_by_user_id: transfer.receivedByUserId || null,
  received_by_user_name: transfer.receivedByUserName || null,
  received_date: transfer.receivedDate || null,
});

export const dbToTransfer = (dbTransfer: any): TransferOfGoods => ({
  id: dbTransfer.id,
  transferDate: dbTransfer.transfer_date,
  transferFromStoreId: dbTransfer.transfer_from_store_id,
  transferFromStoreName: dbTransfer.transfer_from_store_name,
  transferToStoreId: dbTransfer.transfer_to_store_id,
  transferToStoreName: dbTransfer.transfer_to_store_name,
  status: dbTransfer.status,
  items: JSON.parse(dbTransfer.items),
  notes: dbTransfer.notes || undefined,
  approvedByUserId: dbTransfer.approved_by_user_id || undefined,
  approvedByUserName: dbTransfer.approved_by_user_name || undefined,
  approvalDate: dbTransfer.approval_date || undefined,
  receivedByUserId: dbTransfer.received_by_user_id || undefined,
  receivedByUserName: dbTransfer.received_by_user_name || undefined,
  receivedDate: dbTransfer.received_date || undefined,
});

export const inventoryHistoryToDb = (entry: InventoryHistoryEntry) => ({
  id: entry.id,
  date: entry.date,
  type: entry.type,
  reference_id: entry.referenceId,
  description: entry.description,
  product_id: entry.productId,
  product_name: entry.productName,
  quantity_change: entry.quantityChange,
  current_stock: entry.currentStock,
  store_id: entry.storeId || null,
  store_name: entry.storeName || null,
  user_id: entry.userId || null,
  user_name: entry.userName || null,
});

export const dbToInventoryHistory = (dbEntry: any): InventoryHistoryEntry => ({
  id: dbEntry.id,
  date: dbEntry.date,
  type: dbEntry.type,
  referenceId: dbEntry.reference_id,
  description: dbEntry.description,
  productId: dbEntry.product_id,
  productName: dbEntry.product_name,
  quantityChange: dbEntry.quantity_change,
  currentStock: dbEntry.current_stock,
  storeId: dbEntry.store_id || undefined,
  storeName: dbEntry.store_name || undefined,
  userId: dbEntry.user_id || undefined,
  userName: dbEntry.user_name || undefined,
});

// User conversion - Extended for HR functionality
export interface DbUser {
  id: string;
  email: string;
  password: string;
  full_name: string | null;
  role: string;
  department: string | null;
  job_title: string | null;
  salary: number;
  pin_code: string | null;
  status: string;
  mfa_enabled: number;
  mfa_secret: string | null;
  backup_codes: string | null;
  business_name: string | null;
  business_type: string | null;
  country: string | null;
  phone: string | null;
  vat_number: string | null;
  tin_number: string | null;
  created_at?: string;
  updated_at?: string;
}

export const userToDb = (user: any): DbUser => ({
  id: user.id,
  email: user.email,
  password: user.password,
  full_name: user.fullName || null,
  role: user.role,
  department: user.department || null,
  job_title: user.jobTitle || null,
  salary: user.salary || 0,
  pin_code: user.pinCode || null,
  status: user.status || 'active',
  mfa_enabled: boolToInt(user.mfaEnabled || false),
  mfa_secret: user.mfaSecret || null,
  backup_codes: user.backupCodes ? JSON.stringify(user.backupCodes) : null,
  business_name: user.businessName || null,
  business_type: user.businessType || null,
  country: user.country || null,
  phone: user.phone || null,
  vat_number: user.vatNumber || null,
  tin_number: user.tinNumber || null,
});

export const dbToUser = (dbUser: DbUser): any => ({
  id: dbUser.id,
  email: dbUser.email,
  password: dbUser.password,
  fullName: dbUser.full_name || undefined,
  role: dbUser.role,
  department: dbUser.department || undefined,
  jobTitle: dbUser.job_title || undefined,
  salary: dbUser.salary || undefined,
  pinCode: dbUser.pin_code || undefined,
  status: dbUser.status || undefined,
  mfaEnabled: intToBool(dbUser.mfa_enabled),
  mfaSecret: dbUser.mfa_secret || undefined,
  backupCodes: dbUser.backup_codes ? JSON.parse(dbUser.backup_codes) : undefined,
  businessName: dbUser.business_name || undefined,
  businessType: dbUser.business_type || undefined,
  country: dbUser.country || undefined,
  phone: dbUser.phone || undefined,
  vatNumber: dbUser.vat_number || undefined,
  tinNumber: dbUser.tin_number || undefined,
});

// Import user management types
import { Attendance, Payroll, ActivityLog, Role, Permission, RolePermission } from '@/types/user';

// Attendance conversion
export const attendanceToDb = (attendance: Attendance) => ({
  id: attendance.id,
  user_id: attendance.userId,
  user_name: attendance.userName,
  clock_in: attendance.clockIn,
  clock_out: attendance.clockOut || null,
  total_hours: attendance.totalHours,
  date: attendance.date,
  remarks: attendance.remarks || null,
});

export const dbToAttendance = (dbAttendance: any): Attendance => ({
  id: dbAttendance.id,
  userId: dbAttendance.user_id,
  userName: dbAttendance.user_name,
  clockIn: dbAttendance.clock_in,
  clockOut: dbAttendance.clock_out || undefined,
  totalHours: dbAttendance.total_hours,
  date: dbAttendance.date,
  remarks: dbAttendance.remarks || undefined,
});

// Payroll conversion
export const payrollToDb = (payroll: Payroll) => ({
  id: payroll.id,
  user_id: payroll.userId,
  user_name: payroll.userName,
  base_salary: payroll.baseSalary,
  total_allowances: payroll.totalAllowances,
  total_deductions: payroll.totalDeductions,
  overtime_amount: payroll.overtimeAmount,
  net_salary: payroll.netSalary,
  period_start: payroll.periodStart,
  period_end: payroll.periodEnd,
  status: payroll.status,
  journal_entry_id: payroll.journalEntryId || null,
});

export const dbToPayroll = (dbPayroll: any): Payroll => ({
  id: dbPayroll.id,
  userId: dbPayroll.user_id,
  userName: dbPayroll.user_name,
  baseSalary: dbPayroll.base_salary,
  totalAllowances: dbPayroll.total_allowances,
  totalDeductions: dbPayroll.total_deductions,
  overtimeAmount: dbPayroll.overtime_amount,
  netSalary: dbPayroll.net_salary,
  periodStart: dbPayroll.period_start,
  periodEnd: dbPayroll.period_end,
  status: dbPayroll.status,
  journalEntryId: dbPayroll.journal_entry_id || undefined,
});

// Activity Log conversion
export const activityLogToDb = (log: ActivityLog) => ({
  id: log.id,
  user_id: log.userId,
  user_name: log.userName,
  action: log.action,
  module: log.module,
  details: log.details || null,
  ip_address: log.ipAddress || null,
  timestamp: log.timestamp,
});

export const dbToActivityLog = (dbLog: any): ActivityLog => ({
  id: dbLog.id,
  userId: dbLog.user_id,
  userName: dbLog.user_name,
  action: dbLog.action,
  module: dbLog.module,
  details: dbLog.details || undefined,
  ipAddress: dbLog.ip_address || undefined,
  timestamp: dbLog.timestamp,
});

// Role conversion
export const roleToDb = (role: Role) => ({
  id: role.id,
  name: role.name,
  description: role.description || null,
});

export const dbToRole = (dbRole: any): Role => ({
  id: dbRole.id,
  name: dbRole.name,
  description: dbRole.description || undefined,
});

// Permission conversion
export const permissionToDb = (permission: Permission) => ({
  id: permission.id,
  module: permission.module,
  action: permission.action,
  description: permission.description || null,
});

export const dbToPermission = (dbPermission: any): Permission => ({
  id: dbPermission.id,
  module: dbPermission.module,
  action: dbPermission.action,
  description: dbPermission.description || undefined,
});

// Role Permission conversion
export const rolePermissionToDb = (rp: RolePermission) => ({
  id: rp.id,
  role_id: rp.roleId,
  permission_id: rp.permissionId,
});

export const dbToRolePermission = (dbRp: any): RolePermission => ({
  id: dbRp.id,
  roleId: dbRp.role_id,
  permissionId: dbRp.permission_id,
});
