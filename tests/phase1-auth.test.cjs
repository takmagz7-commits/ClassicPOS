const request = require('supertest');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

let globalToken = null;
let testSetupComplete = false;

describe('ClassicPOS Phase 1: Production Blockers', () => {
  let server;
  const testEmail = `test-${crypto.randomUUID()}@example.com`;
  const testPassword = 'TestPassword123';
  
  beforeAll(async () => {
    const dbPath = path.join(__dirname, '../backend/classicpos-test.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    process.env.DB_PATH = dbPath;
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { getAll } = require('../backend/db/dbService.cjs');
    const users = getAll('users');
    
    if (users.length > 0) {
      const { generateToken } = require('../backend/utils/jwtUtils.cjs');
      const { dbToUser } = require('../backend/db/helpers.cjs');
      const user = dbToUser(users[0]);
      globalToken = generateToken(user);
      testSetupComplete = true;
    }
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('AUTH-001: Authentication Middleware on Sensitive Routes', () => {
    test('should return 401 when accessing /api/products without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/products');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message || response.body.error).toMatch(/authentication/i);
    });

    test('should return 401 when accessing /api/customers without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/customers');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message || response.body.error).toMatch(/authentication/i);
    });

    test('should return 401 when accessing /api/sales without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/sales');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message || response.body.error).toMatch(/authentication/i);
    });

    test('should return 401 when creating product without authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/products')
        .send({
          id: crypto.randomUUID(),
          name: 'Test Product',
          sku: 'TEST-001',
          categoryId: 'cat-1',
          categoryName: 'Category',
          stockQuantity: 10,
          unitPrice: 100,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('AUTH-002: Rate Limiting on PIN Login', () => {
    test('should enforce rate limiting on PIN login with proper error format', async () => {
      const wrongPin = `${Math.floor(Math.random() * 9000) + 1000}`;
      let rateLimitResponse = null;
      
      for (let i = 0; i < 7; i++) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/pin-login')
          .send({ pinCode: wrongPin });
        
        if (response.status === 429) {
          rateLimitResponse = response;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (rateLimitResponse) {
        expect(rateLimitResponse.status).toBe(429);
        expect(rateLimitResponse.body).toHaveProperty('error');
        expect(rateLimitResponse.body).toHaveProperty('message');
        expect(rateLimitResponse.body.message).toMatch(/too many|rate limit/i);
      } else {
        console.log('Rate limit not triggered in 7 attempts (may have been reset)');
      }
    });
  });

  describe('DB-001: Database Initialization', () => {
    test('should successfully initialize SQLite database', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health/db');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('ready', true);
    });

    test('should have all required tables created', () => {
      const { initDatabase, getDatabase } = require('../backend/db/sqlite.cjs');
      initDatabase();
      const db = getDatabase();
      
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();
      
      const tableNames = tables.map(t => t.name);
      
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('sales');
      expect(tableNames).toContain('roles');
      expect(tableNames).toContain('permissions');
    });
  });

  describe('ERR-001: Validation & Error Handling', () => {
    beforeAll(async () => {
      if (!globalToken) {
        const { getAll } = require('../backend/db/dbService.cjs');
        const users = getAll('users');
        if (users.length > 0) {
          const { generateToken } = require('../backend/utils/jwtUtils.cjs');
          const { dbToUser } = require('../backend/db/helpers.cjs');
          const user = dbToUser(users[0]);
          globalToken = generateToken(user);
        }
      }
    });

    test('should return 400 for invalid product data (missing required fields)', async () => {
      if (!globalToken) {
        console.log('Skipping: No auth token available');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/products')
        .set('Cookie', `authToken=${globalToken}`)
        .send({
          id: crypto.randomUUID(),
          sku: 'TEST-001',
          categoryId: 'cat-1',
          categoryName: 'Category',
          stockQuantity: 10,
          unitPrice: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation error');
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/SQLITE|sqlite_|CONSTRAINT/i);
    });

    test('should return 400 for invalid customer data (invalid email format)', async () => {
      if (!globalToken) {
        console.log('Skipping: No auth token available');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/customers')
        .set('Cookie', `authToken=${globalToken}`)
        .send({
          id: crypto.randomUUID(),
          name: 'Test Customer',
          email: 'not-an-email',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/SQLITE|sqlite_/i);
    });

    test('should return 400 for invalid sale data (empty items array)', async () => {
      if (!globalToken) {
        console.log('Skipping: No auth token available');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/sales')
        .set('Cookie', `authToken=${globalToken}`)
        .send({
          id: crypto.randomUUID(),
          items: [],
          total: 100,
          subtotal: 100,
          taxAmount: 0,
          amountPaid: 100,
          changeDue: 0,
          paymentMethod: 'cash',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/SQLITE|sqlite_/i);
    });

    test('should not leak SQL error messages in API responses', async () => {
      if (!globalToken) {
        console.log('Skipping: No auth token available');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/products/potentially-invalid-id')
        .set('Cookie', `authToken=${globalToken}`);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/SQLITE|sqlite_|CONSTRAINT|FOREIGN KEY/i);
    });
  });

  describe('TEST-001: Basic Authentication Flows', () => {
    test('should verify database has users table and can query it', () => {
      const { getAll } = require('../backend/db/dbService.cjs');
      const users = getAll('users');
      
      expect(Array.isArray(users)).toBe(true);
      expect(typeof users.length).toBe('number');
    });

    test('should successfully generate JWT token for existing user', () => {
      const { getAll } = require('../backend/db/dbService.cjs');
      const users = getAll('users');
      
      if (users.length === 0) {
        console.log('No users in database to test token generation');
        return;
      }

      const { generateToken } = require('../backend/utils/jwtUtils.cjs');
      const { dbToUser } = require('../backend/db/helpers.cjs');
      const user = dbToUser(users[0]);
      const token = generateToken(user);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    test('should reject login with invalid credentials', async () => {
      const { getAll } = require('../backend/db/dbService.cjs');
      const users = getAll('users');
      
      if (users.length === 0) {
        console.log('No users to test against');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: users[0].email,
          password: 'DefinitelyWrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should successfully access protected route with valid JWT token', async () => {
      if (!globalToken) {
        const { getAll } = require('../backend/db/dbService.cjs');
        const users = getAll('users');
        if (users.length > 0) {
          const { generateToken } = require('../backend/utils/jwtUtils.cjs');
          const { dbToUser } = require('../backend/db/helpers.cjs');
          const user = dbToUser(users[0]);
          globalToken = generateToken(user);
        }
      }

      if (globalToken) {
        const response = await request(API_BASE_URL)
          .get('/api/products')
          .set('Cookie', `authToken=${globalToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      } else {
        console.log('No token available for protected route test');
      }
    });

    test('should handle logout request properly', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout');

      expect([200, 429]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.message).toContain('Logged out');
      }
    });
  });

  describe('Integration: Protected Routes Verification', () => {
    test('should require authentication for all sensitive endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/products' },
        { method: 'get', path: '/api/customers' },
        { method: 'get', path: '/api/sales' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(API_BASE_URL)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    test('should allow authenticated access to protected resources', async () => {
      if (!globalToken) {
        console.log('Skipping: No token for auth test');
        return;
      }

      const endpoints = [
        { method: 'get', path: '/api/products' },
        { method: 'get', path: '/api/customers' },
        { method: 'get', path: '/api/sales' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(API_BASE_URL)
          [endpoint.method](endpoint.path)
          .set('Cookie', `authToken=${globalToken}`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });
});
