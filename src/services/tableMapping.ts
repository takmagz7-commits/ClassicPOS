export const TABLE_API_MAP: Record<string, string> = {
  'products': 'products',
  'customers': 'customers',
  'sales': 'sales',
  'suppliers': 'suppliers',
  'categories': 'categories',
  'stores': 'stores',
  'tax_rates': 'tax-rates',
  'payment_methods': 'payment-methods',
  'purchase_orders': 'purchase-orders',
  'grns': 'grns',
  'stock_adjustments': 'stock-adjustments',
  'transfers': 'transfers',
  'inventory_history': 'inventory-history',
  'users': 'auth/users',
  'settings': 'settings',
  'attendance': 'attendance',
  'payroll': 'payroll',
  'activity_logs': 'activity-logs',
  'roles': 'roles',
  'permissions': 'roles/permissions',
  'role_permissions': 'roles'
};

export const getApiEndpoint = (table: string): string => {
  return TABLE_API_MAP[table] || table;
};
