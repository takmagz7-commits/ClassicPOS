import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { logger } from '@/utils/logger';

let db: Database.Database | null = null;

export const initDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  // Initialize database connection
  db = new Database('./classicpos.db');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create all tables
  createTables(db);

  // Run migrations on every boot to handle legacy data
  migratePlaintextPins(db);

  // Seed default roles and permissions
  seedDefaultData(db);

  logger.info('✅ SQLite Database Initialized');
  return db;
};

export const getDatabase = (): Database.Database => {
  if (!db) {
    return initDatabase();
  }
  return db;
};

const migratePlaintextPins = (database: Database.Database) => {
  try {
    const usersWithPins = database.prepare('SELECT id, pin_code FROM users WHERE pin_code IS NOT NULL AND pin_code != ?').all('') as { id: string; pin_code: string }[];
    
    for (const user of usersWithPins) {
      if (user.pin_code && !user.pin_code.startsWith('$2')) {
        const hashedPin = bcrypt.hashSync(user.pin_code, 10);
        database.prepare('UPDATE users SET pin_code = ? WHERE id = ?').run(hashedPin, user.id);
      }
    }
    
    if (usersWithPins.length > 0) {
      logger.info(`✅ Migrated ${usersWithPins.length} plaintext PINs to bcrypt hashes`);
    }
  } catch (error) {
    logger.error('PIN migration error:', error);
  }
};

const createTables = (database: Database.Database) => {
  // Users table - Extended for HR functionality
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'employee',
      department TEXT,
      job_title TEXT,
      salary REAL DEFAULT 0,
      pin_code TEXT,
      status TEXT DEFAULT 'active',
      mfa_enabled INTEGER DEFAULT 0,
      mfa_secret TEXT,
      backup_codes TEXT,
      business_name TEXT,
      business_type TEXT,
      country TEXT,
      phone TEXT,
      vat_number TEXT,
      tin_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate existing users table if needed
  try {
    const columns = database.pragma('table_info(users)') as any[];
    const columnNames = columns.map((col: any) => col.name);

    if (!columnNames.includes('full_name')) {
      database.exec('ALTER TABLE users ADD COLUMN full_name TEXT');
    }
    if (!columnNames.includes('department')) {
      database.exec('ALTER TABLE users ADD COLUMN department TEXT');
    }
    if (!columnNames.includes('job_title')) {
      database.exec('ALTER TABLE users ADD COLUMN job_title TEXT');
    }
    if (!columnNames.includes('salary')) {
      database.exec('ALTER TABLE users ADD COLUMN salary REAL DEFAULT 0');
    }
    if (!columnNames.includes('pin_code')) {
      database.exec('ALTER TABLE users ADD COLUMN pin_code TEXT');
    }
    if (!columnNames.includes('status')) {
      database.exec('ALTER TABLE users ADD COLUMN status TEXT DEFAULT \'active\'');
    }
    if (!columnNames.includes('updated_at')) {
      database.exec('ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    }
  } catch (error) {
    logger.error('User table migration error:', error);
  }

  // Roles table
  database.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Permissions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(module, action)
    );
  `);

  // Role-Permission mapping table
  database.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
      UNIQUE(role_id, permission_id)
    );
  `);

  // Attendance table
  database.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      clock_in TEXT NOT NULL,
      clock_out TEXT,
      total_hours REAL DEFAULT 0,
      date TEXT NOT NULL,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Payroll table
  database.exec(`
    CREATE TABLE IF NOT EXISTS payroll (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      base_salary REAL NOT NULL,
      total_allowances REAL DEFAULT 0,
      total_deductions REAL DEFAULT 0,
      overtime_amount REAL DEFAULT 0,
      net_salary REAL NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      journal_entry_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
    );
  `);

  // Activity Logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Products table
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL,
      wholesale_price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      stock_by_store TEXT,
      track_stock INTEGER DEFAULT 1,
      available_for_sale INTEGER DEFAULT 1,
      sku TEXT UNIQUE NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  // Customers table
  database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      loyalty_points INTEGER DEFAULT 0,
      vat_number TEXT,
      tin_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sales table
  database.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'completed',
      type TEXT DEFAULT 'sale',
      gift_card_amount_used REAL,
      customer_id TEXT,
      customer_name TEXT,
      discount_percentage REAL,
      discount_amount REAL,
      loyalty_points_used INTEGER,
      loyalty_points_discount_amount REAL,
      original_sale_id TEXT,
      tax_rate_applied REAL,
      payment_method_id TEXT,
      employee_id TEXT,
      employee_name TEXT,
      held_by_employee_id TEXT,
      held_by_employee_name TEXT,
      store_id TEXT,
      store_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );
  `);

  // Suppliers table
  database.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      notes TEXT,
      vat_number TEXT,
      tin_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Categories table
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      is_uncategorized INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Stores table
  database.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tax Rates table
  database.exec(`
    CREATE TABLE IF NOT EXISTS tax_rates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Payment Methods table
  database.exec(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_cash_equivalent INTEGER DEFAULT 0,
      is_credit INTEGER DEFAULT 0,
      is_bnpl INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Purchase Orders table
  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      reference_no TEXT UNIQUE NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      order_date TEXT NOT NULL,
      expected_delivery_date TEXT,
      status TEXT DEFAULT 'pending',
      items TEXT NOT NULL,
      total_value REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
  `);

  // Goods Received Notes table
  database.exec(`
    CREATE TABLE IF NOT EXISTS grns (
      id TEXT PRIMARY KEY,
      reference_no TEXT UNIQUE NOT NULL,
      purchase_order_id TEXT,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      received_date TEXT NOT NULL,
      receiving_store_id TEXT NOT NULL,
      receiving_store_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      items TEXT NOT NULL,
      total_value REAL NOT NULL,
      notes TEXT,
      approved_by_user_id TEXT,
      approved_by_user_name TEXT,
      approval_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (receiving_store_id) REFERENCES stores(id)
    );
  `);

  // Stock Adjustments table
  database.exec(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id TEXT PRIMARY KEY,
      adjustment_date TEXT NOT NULL,
      store_id TEXT NOT NULL,
      store_name TEXT NOT NULL,
      items TEXT NOT NULL,
      notes TEXT,
      approved_by_user_id TEXT,
      approved_by_user_name TEXT,
      approval_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );
  `);

  // Transfer of Goods table
  database.exec(`
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      transfer_date TEXT NOT NULL,
      transfer_from_store_id TEXT NOT NULL,
      transfer_from_store_name TEXT NOT NULL,
      transfer_to_store_id TEXT NOT NULL,
      transfer_to_store_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      items TEXT NOT NULL,
      notes TEXT,
      approved_by_user_id TEXT,
      approved_by_user_name TEXT,
      approval_date TEXT,
      received_by_user_id TEXT,
      received_by_user_name TEXT,
      received_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transfer_from_store_id) REFERENCES stores(id),
      FOREIGN KEY (transfer_to_store_id) REFERENCES stores(id)
    );
  `);

  // Inventory History table
  database.exec(`
    CREATE TABLE IF NOT EXISTS inventory_history (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      description TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      current_stock INTEGER NOT NULL,
      store_id TEXT,
      store_name TEXT,
      user_id TEXT,
      user_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );
  `);

  // Settings table (for app-wide settings)
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Chart of Accounts table
  database.exec(`
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY,
      account_code TEXT UNIQUE NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      account_category TEXT NOT NULL,
      parent_account_id TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id)
    );
  `);

  // Journal Entries table
  database.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      entry_date TEXT NOT NULL,
      entry_number TEXT UNIQUE NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      description TEXT NOT NULL,
      posted_by_user_id TEXT,
      posted_by_user_name TEXT,
      is_posted INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (posted_by_user_id) REFERENCES users(id)
    );
  `);

  // Journal Entry Lines table
  database.exec(`
    CREATE TABLE IF NOT EXISTS journal_entry_lines (
      id TEXT PRIMARY KEY,
      journal_entry_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      account_code TEXT NOT NULL,
      account_name TEXT NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
    );
  `);

  // Bank Accounts table
  database.exec(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      account_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT UNIQUE NOT NULL,
      account_type TEXT DEFAULT 'checking',
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      currency_code TEXT DEFAULT 'USD',
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for better query performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
    CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_payroll_user ON payroll(user_id);
    CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_start, period_end);
    CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_grns_po ON grns(purchase_order_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_history_product ON inventory_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_history_date ON inventory_history(date);
    CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal ON journal_entry_lines(journal_entry_id);
    CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);
  `);
};

const seedDefaultData = (database: Database.Database) => {
  try {
    // Check if roles already exist
    const roleCount = database.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
    
    if (roleCount.count === 0) {
      // Define default roles
      const roles = [
        {
          id: randomUUID(),
          name: 'Admin',
          description: 'Full system access with all permissions'
        },
        {
          id: randomUUID(),
          name: 'Manager',
          description: 'Access to most features except user management'
        },
        {
          id: randomUUID(),
          name: 'Employee',
          description: 'Limited access for daily operations'
        }
      ];

      // Insert roles
      const insertRole = database.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)');
      for (const role of roles) {
        insertRole.run(role.id, role.name, role.description);
      }

      logger.info(`✅ Seeded ${roles.length} default roles`);

      // Check if permissions already exist
      const permissionCount = database.prepare('SELECT COUNT(*) as count FROM permissions').get() as { count: number };
      
      if (permissionCount.count === 0) {
        // Define modules and actions
        const modules = ['Products', 'Sales', 'Customers', 'Inventory', 'Accounting', 'Reports', 'Settings', 'Users'];
        const actions = ['view', 'create', 'edit', 'delete'];

        // Create permissions for each module and action
        const permissions: { id: string; module: string; action: string; description: string }[] = [];
        const insertPermission = database.prepare('INSERT INTO permissions (id, module, action, description) VALUES (?, ?, ?, ?)');
        
        for (const module of modules) {
          for (const action of actions) {
            const permission = {
              id: randomUUID(),
              module,
              action,
              description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.toLowerCase()}`
            };
            permissions.push(permission);
            insertPermission.run(permission.id, permission.module, permission.action, permission.description);
          }
        }

        logger.info(`✅ Seeded ${permissions.length} default permissions`);

        // Create role-permission mappings
        const insertRolePermission = database.prepare('INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)');
        
        // Get role IDs
        const adminRole = roles.find(r => r.name === 'Admin');
        const managerRole = roles.find(r => r.name === 'Manager');
        const employeeRole = roles.find(r => r.name === 'Employee');

        let mappingCount = 0;

        // Admin: All permissions
        if (adminRole) {
          for (const permission of permissions) {
            insertRolePermission.run(randomUUID(), adminRole.id, permission.id);
            mappingCount++;
          }
        }

        // Manager: All permissions except Users module
        if (managerRole) {
          const managerPermissions = permissions.filter(p => p.module !== 'Users');
          for (const permission of managerPermissions) {
            insertRolePermission.run(randomUUID(), managerRole.id, permission.id);
            mappingCount++;
          }
        }

        // Employee: Limited permissions (view sales, customers; create sales)
        if (employeeRole) {
          const employeePermissions = permissions.filter(p => 
            (p.module === 'Sales' && (p.action === 'view' || p.action === 'create')) ||
            (p.module === 'Customers' && p.action === 'view') ||
            (p.module === 'Products' && p.action === 'view')
          );
          for (const permission of employeePermissions) {
            insertRolePermission.run(randomUUID(), employeeRole.id, permission.id);
            mappingCount++;
          }
        }

        logger.info(`✅ Seeded ${mappingCount} role-permission mappings`);
      }
    }
  } catch (error) {
    logger.error('Error seeding default data:', error);
  }
};

export const closeDatabase = () => {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
};
