const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

async function setupTestDatabase(suiteName) {
  const dbPath = path.join(__dirname, `../../backend/classicpos-test-integration.db`);
  
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  process.env.DB_PATH = dbPath;
  
  const { initDatabase } = require('../../backend/db/sqlite.cjs');
  initDatabase();
  
  const { seedDefaultChartOfAccounts } = require('../../backend/services/accountingService.cjs');
  seedDefaultChartOfAccounts();
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return dbPath;
}

async function cleanupTestDatabase(dbPath) {
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
    }
  }
}

async function seedAdminUser() {
  const { getAll } = require('../../backend/db/dbService.cjs');
  const users = getAll('users');
  
  if (users.length === 0) {
    const { hashPassword } = require('../../backend/utils/passwordUtils.cjs');
    const { userToDb } = require('../../backend/db/helpers.cjs');
    const { insert } = require('../../backend/db/dbService.cjs');
    
    const hashedPassword = await hashPassword('AdminPassword123');
    const adminUser = {
      id: crypto.randomUUID(),
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin',
      mfaEnabled: false,
      businessName: 'Test Business',
      businessType: 'retail',
      country: 'US',
      phone: '+1234567890',
      vatNumber: null,
      tinNumber: null
    };
    
    const dbUser = userToDb(adminUser);
    insert('users', dbUser);
    
    const { initializeSystem } = require('../../backend/utils/systemSettings.cjs');
    initializeSystem(adminUser.email);
    
    return adminUser;
  }
  
  const { dbToUser } = require('../../backend/db/helpers.cjs');
  return dbToUser(users[0]);
}

async function getAuthToken(user) {
  if (!user) {
    user = await seedAdminUser();
  }
  
  const { generateToken } = require('../../backend/utils/jwtUtils.cjs');
  return generateToken(user);
}

async function seedCategories() {
  const { insert } = require('../../backend/db/dbService.cjs');
  const { categoryToDb } = require('../../backend/db/helpers.cjs');
  
  const categories = [
    {
      id: 'cat-electronics',
      name: 'Electronics',
      description: 'Electronic devices and gadgets'
    },
    {
      id: 'cat-clothing',
      name: 'Clothing',
      description: 'Apparel and accessories'
    },
    {
      id: 'cat-food',
      name: 'Food & Beverage',
      description: 'Food and drinks'
    }
  ];
  
  for (const category of categories) {
    insert('categories', categoryToDb(category));
  }
  
  return categories;
}

async function seedProducts() {
  const { insert } = require('../../backend/db/dbService.cjs');
  const { productToDb } = require('../../backend/db/helpers.cjs');
  
  const products = [
    {
      id: 'prod-laptop',
      name: 'Laptop Computer',
      sku: 'LAPTOP-001',
      barcode: '1234567890123',
      categoryId: 'cat-electronics',
      categoryName: 'Electronics',
      stockQuantity: 50,
      unitPrice: 999.99,
      costPrice: 750.00,
      taxRateId: '',
      taxRateName: '',
      taxRate: 0,
      lowStockThreshold: 10,
      reorderPoint: 15,
      reorderQuantity: 20,
      unit: 'piece',
      description: 'High-performance laptop'
    },
    {
      id: 'prod-tshirt',
      name: 'T-Shirt',
      sku: 'TSHIRT-001',
      barcode: '9876543210987',
      categoryId: 'cat-clothing',
      categoryName: 'Clothing',
      stockQuantity: 100,
      unitPrice: 19.99,
      costPrice: 10.00,
      taxRateId: '',
      taxRateName: '',
      taxRate: 0,
      lowStockThreshold: 20,
      reorderPoint: 30,
      reorderQuantity: 50,
      unit: 'piece',
      description: 'Cotton t-shirt'
    }
  ];
  
  for (const product of products) {
    insert('products', productToDb(product));
  }
  
  return products;
}

async function seedCustomers() {
  const { insert } = require('../../backend/db/dbService.cjs');
  const { customerToDb } = require('../../backend/db/helpers.cjs');
  
  const customers = [
    {
      id: 'cust-john',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St',
      loyaltyPoints: 100,
      vatNumber: 'VAT123',
      tinNumber: 'TIN123'
    },
    {
      id: 'cust-jane',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+0987654321',
      address: '456 Oak Ave',
      loyaltyPoints: 50,
      vatNumber: '',
      tinNumber: ''
    }
  ];
  
  for (const customer of customers) {
    insert('customers', customerToDb(customer));
  }
  
  return customers;
}

async function seedSuppliers() {
  const { insert } = require('../../backend/db/dbService.cjs');
  const { supplierToDb } = require('../../backend/db/helpers.cjs');
  
  const suppliers = [
    {
      id: 'supp-acme',
      name: 'ACME Corporation',
      email: 'contact@acme.com',
      phone: '+1111111111',
      address: '789 Industrial Blvd',
      vatNumber: 'ACME-VAT-001',
      tinNumber: 'ACME-TIN-001'
    },
    {
      id: 'supp-globex',
      name: 'Globex Industries',
      email: 'sales@globex.com',
      phone: '+2222222222',
      address: '321 Commerce Dr',
      vatNumber: 'GLOBEX-VAT-001',
      tinNumber: 'GLOBEX-TIN-001'
    }
  ];
  
  for (const supplier of suppliers) {
    insert('suppliers', supplierToDb(supplier));
  }
  
  return suppliers;
}

async function seedStores() {
  const { insert } = require('../../backend/db/dbService.cjs');
  const { storeToDb } = require('../../backend/db/helpers.cjs');
  
  const stores = [
    {
      id: 'store-main',
      name: 'Main Store',
      location: 'Downtown',
      phone: '+1234567890',
      email: 'main@store.com',
      address: '100 Main Street'
    },
    {
      id: 'store-branch',
      name: 'Branch Store',
      location: 'Suburb',
      phone: '+0987654321',
      email: 'branch@store.com',
      address: '200 Oak Avenue'
    }
  ];
  
  for (const store of stores) {
    insert('stores', storeToDb(store));
  }
  
  return stores;
}

async function seedAllTestData() {
  const user = await seedAdminUser();
  const categories = await seedCategories();
  const products = await seedProducts();
  const customers = await seedCustomers();
  const suppliers = await seedSuppliers();
  const stores = await seedStores();
  
  return {
    user,
    categories,
    products,
    customers,
    suppliers,
    stores
  };
}

function generateMFASecret() {
  const { Secret } = require('otpauth');
  const secret = new Secret();
  return secret.base32;
}

function generateTOTPCode(secret) {
  const { TOTP } = require('otpauth');
  const totp = new TOTP({
    secret: secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30
  });
  return totp.generate();
}

module.exports = {
  API_BASE_URL,
  setupTestDatabase,
  cleanupTestDatabase,
  seedAdminUser,
  getAuthToken,
  seedCategories,
  seedProducts,
  seedCustomers,
  seedSuppliers,
  seedStores,
  seedAllTestData,
  generateMFASecret,
  generateTOTPCode
};
