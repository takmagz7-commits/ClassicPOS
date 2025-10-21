import { UserRole } from "@/types/user";

export const PERMISSIONS = {
  users: {
    view: [UserRole.ADMIN, UserRole.MANAGER],
    create: [UserRole.ADMIN, UserRole.MANAGER],
    edit: [UserRole.ADMIN, UserRole.MANAGER],
    delete: [UserRole.ADMIN],
  },
  roles: {
    view: [UserRole.ADMIN, UserRole.MANAGER],
    create: [UserRole.ADMIN],
    edit: [UserRole.ADMIN],
    delete: [UserRole.ADMIN],
  },
  attendance: {
    view: [UserRole.ADMIN, UserRole.MANAGER],
    clockIn: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    clockOut: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    edit: [UserRole.ADMIN, UserRole.MANAGER],
    delete: [UserRole.ADMIN, UserRole.MANAGER],
  },
  payroll: {
    view: [UserRole.ADMIN, UserRole.MANAGER],
    calculate: [UserRole.ADMIN, UserRole.MANAGER],
    approve: [UserRole.ADMIN],
    pay: [UserRole.ADMIN],
    edit: [UserRole.ADMIN, UserRole.MANAGER],
    delete: [UserRole.ADMIN],
  },
  auditLogs: {
    view: [UserRole.ADMIN, UserRole.MANAGER],
  },
  sales: {
    view: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    create: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    edit: [UserRole.ADMIN, UserRole.MANAGER],
    delete: [UserRole.ADMIN, UserRole.MANAGER],
  },
  inventory: {
    view: [UserRole.ADMIN, UserRole.MANAGER],
    create: [UserRole.ADMIN, UserRole.MANAGER],
    edit: [UserRole.ADMIN, UserRole.MANAGER],
    delete: [UserRole.ADMIN, UserRole.MANAGER],
  },
  products: {
    view: [UserRole.ADMIN, UserRole.MANAGER],
    create: [UserRole.ADMIN, UserRole.MANAGER],
    edit: [UserRole.ADMIN, UserRole.MANAGER],
    delete: [UserRole.ADMIN, UserRole.MANAGER],
  },
  customers: {
    view: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    create: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    edit: [UserRole.ADMIN, UserRole.MANAGER],
    delete: [UserRole.ADMIN, UserRole.MANAGER],
  },
  reports: {
    view: [UserRole.ADMIN, UserRole.MANAGER],
  },
  accounting: {
    view: [UserRole.ADMIN, UserRole.MANAGER],
    create: [UserRole.ADMIN, UserRole.MANAGER],
    edit: [UserRole.ADMIN],
    delete: [UserRole.ADMIN],
  },
  settings: {
    view: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
    edit: [UserRole.ADMIN, UserRole.MANAGER],
  },
} as const;

export const hasPermission = <M extends keyof typeof PERMISSIONS>(
  userRole: UserRole,
  module: M,
  action: keyof typeof PERMISSIONS[M]
): boolean => {
  const modulePermissions = PERMISSIONS[module];
  if (!modulePermissions) return false;

  const actionPermissions = modulePermissions[action];
  if (!actionPermissions) return false;

  return (actionPermissions as readonly UserRole[]).includes(userRole);
};

export const canView = (userRole: UserRole, module: keyof typeof PERMISSIONS): boolean => {
  return hasPermission(userRole, module, 'view');
};

export const canCreate = (userRole: UserRole, module: keyof typeof PERMISSIONS): boolean => {
  return hasPermission(userRole, module, 'create' as any);
};

export const canEdit = (userRole: UserRole, module: keyof typeof PERMISSIONS): boolean => {
  return hasPermission(userRole, module, 'edit' as any);
};

export const canDelete = (userRole: UserRole, module: keyof typeof PERMISSIONS): boolean => {
  return hasPermission(userRole, module, 'delete' as any);
};

export const getUserPermissions = (userRole: UserRole) => {
  const permissions: Record<string, string[]> = {};

  Object.entries(PERMISSIONS).forEach(([module, actions]) => {
    const allowedActions: string[] = [];
    Object.entries(actions).forEach(([action, roles]) => {
      if ((roles as readonly UserRole[]).includes(userRole)) {
        allowedActions.push(action);
      }
    });
    if (allowedActions.length > 0) {
      permissions[module] = allowedActions;
    }
  });

  return permissions;
};
