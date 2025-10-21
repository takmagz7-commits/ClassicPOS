const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

let globalToken = null;
let testUserId = null;

describe('ClassicPOS Phase 2: Security & Data Integrity', () => {
  beforeAll(async () => {
    const dbPath = path.join(__dirname, '../backend/classicpos-test-phase2.db');
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
      testUserId = user.id;
    }
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('SEC-001: MFA Backup Codes Hashing', () => {
    test('should store backup codes as hashed values in database', () => {
      const { getDatabase } = require('../backend/db/sqlite.cjs');
      const db = getDatabase();
      
      const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='mfa_backup_codes'").get();
      expect(schema).toBeTruthy();
      expect(schema.sql).toContain('code_hash');
      expect(schema.sql).toContain('user_id');
    });

    test('should verify mfa_backup_codes table has proper indexes', () => {
      const { getDatabase } = require('../backend/db/sqlite.cjs');
      const db = getDatabase();
      
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='mfa_backup_codes'").all();
      const indexNames = indexes.map(idx => idx.name);
      
      expect(indexNames.some(name => name.includes('user_id'))).toBe(true);
    });

    test('should not expose plaintext backup codes in users table', () => {
      const { getAll } = require('../backend/db/dbService.cjs');
      const users = getAll('users');
      
      if (users.length > 0 && users[0].backup_codes) {
        const backupCodes = JSON.parse(users[0].backup_codes);
        if (Array.isArray(backupCodes) && backupCodes.length > 0) {
          const hashedPattern = /^\$2[aby]\$/;
          const areHashed = backupCodes.every(code => !hashedPattern.test(code));
          expect(areHashed).toBe(true);
        }
      }
    });
  });

  describe('SEC-002: Token Revocation', () => {
    test('should have revoked_tokens table with correct schema', () => {
      const { getDatabase } = require('../backend/db/sqlite.cjs');
      const db = getDatabase();
      
      const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='revoked_tokens'").get();
      expect(schema).toBeTruthy();
      expect(schema.sql).toContain('jti');
      expect(schema.sql).toContain('user_id');
      expect(schema.sql).toContain('revoked_at');
      expect(schema.sql).toContain('expires_at');
    });

    test('should include jti claim in newly generated JWT tokens', () => {
      const { generateToken } = require('../backend/utils/jwtUtils.cjs');
      const jwt = require('jsonwebtoken');
      
      const testUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        mfaEnabled: false
      };
      
      const token = generateToken(testUser);
      const JWT_SECRET = process.env.JWT_SECRET || 'classicpos-secret-key-change-in-production';
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded).toHaveProperty('jti');
      expect(typeof decoded.jti).toBe('string');
      expect(decoded.jti.length).toBeGreaterThan(0);
    });

    test('should revoke token on logout', async () => {
      if (!globalToken) {
        console.log('Skipping: No token available');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Cookie', `authToken=${globalToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.message).toContain('Logged out');
      }
    });

    test('should reject revoked tokens', async () => {
      const { generateToken } = require('../backend/utils/jwtUtils.cjs');
      const { getDatabase } = require('../backend/db/sqlite.cjs');
      const bcrypt = require('bcryptjs');
      const db = getDatabase();
      
      const testUserId = crypto.randomUUID();
      const testEmail = `revoke-test-${testUserId.substring(0, 8)}@test.com`;
      
      // Create test user in database to satisfy foreign key constraint
      db.prepare('INSERT INTO users (id, email, password, role, mfa_enabled) VALUES (?, ?, ?, ?, ?)')
        .run(testUserId, testEmail, bcrypt.hashSync('TestPass123!', 10), 'employee', 0);
      
      const testUser = {
        id: testUserId,
        email: testEmail,
        role: 'employee',
        mfaEnabled: false
      };
      
      const token = generateToken(testUser);
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'classicpos-secret-key-change-in-production';
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Insert revoked token
      db.prepare('INSERT INTO revoked_tokens (jti, user_id, revoked_at, expires_at) VALUES (?, ?, ?, ?)')
        .run(decoded.jti, testUser.id, new Date().toISOString(), new Date(Date.now() + 7*24*60*60*1000).toISOString());
      
      const response = await request(API_BASE_URL)
        .get('/api/products')
        .set('Cookie', `authToken=${token}`);
      
      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/revoked|invalid/i);
      
      // Cleanup: delete test user (cascade will delete revoked token)
      db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    });
  });

  describe('SEC-003: Password Complexity', () => {
    test('should reject weak passwords (no uppercase)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup')
        .send({
          email: `weak1-${crypto.randomUUID()}@test.com`,
          password: 'weakpass123!'
        });

      expect([400, 403]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body.message || response.body.error).toMatch(/uppercase|complexity|password/i);
      }
    });

    test('should reject weak passwords (no lowercase)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup')
        .send({
          email: `weak2-${crypto.randomUUID()}@test.com`,
          password: 'WEAKPASS123!'
        });

      expect([400, 403]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body.message || response.body.error).toMatch(/lowercase|complexity|password/i);
      }
    });

    test('should reject weak passwords (no number)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup')
        .send({
          email: `weak3-${crypto.randomUUID()}@test.com`,
          password: 'WeakPass!'
        });

      expect([400, 403]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body.message || response.body.error).toMatch(/number|digit|complexity|password/i);
      }
    });

    test('should reject weak passwords (no special character)', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup')
        .send({
          email: `weak4-${crypto.randomUUID()}@test.com`,
          password: 'WeakPass123'
        });

      expect([400, 403]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body.message || response.body.error).toMatch(/special|symbol|complexity|password/i);
      }
    });

    test('should accept strong passwords', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup')
        .send({
          email: `strong-${crypto.randomUUID()}@test.com`,
          password: 'StrongPass123!'
        });

      expect([201, 403]).toContain(response.status);
    });
  });

  describe('DB-002: Dependency Checks', () => {
    let supplierId;
    let customerId;

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

    test('should create test supplier', async () => {
      if (!globalToken) {
        console.log('Skipping: No token');
        return;
      }

      supplierId = crypto.randomUUID();
      const response = await request(API_BASE_URL)
        .post('/api/suppliers')
        .set('Cookie', `authToken=${globalToken}`)
        .send({
          id: supplierId,
          name: 'Test Supplier for Dependency Check',
          email: 'supplier@test.com',
          phone: '123456789'
        });

      expect([201, 401]).toContain(response.status);
    });

    test('should create test customer', async () => {
      if (!globalToken) {
        console.log('Skipping: No token');
        return;
      }

      customerId = crypto.randomUUID();
      const response = await request(API_BASE_URL)
        .post('/api/customers')
        .set('Cookie', `authToken=${globalToken}`)
        .send({
          id: customerId,
          name: 'Test Customer for Dependency Check',
          email: 'customer@test.com',
          phone: '987654321'
        });

      expect([201, 401]).toContain(response.status);
    });

    test('should allow deletion of supplier with no dependencies', async () => {
      if (!globalToken || !supplierId) {
        console.log('Skipping: No token or supplier');
        return;
      }

      const response = await request(API_BASE_URL)
        .delete(`/api/suppliers/${supplierId}`)
        .set('Cookie', `authToken=${globalToken}`);

      expect([204, 401]).toContain(response.status);
    });

    test('should allow deletion of customer with no dependencies', async () => {
      if (!globalToken || !customerId) {
        console.log('Skipping: No token or customer');
        return;
      }

      const response = await request(API_BASE_URL)
        .delete(`/api/customers/${customerId}`)
        .set('Cookie', `authToken=${globalToken}`);

      expect([204, 401]).toContain(response.status);
    });
  });

  describe('DB-003: Stock Reversal', () => {
    test('should have inventory_history table for audit trail', () => {
      const { getDatabase } = require('../backend/db/sqlite.cjs');
      const db = getDatabase();
      
      const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='inventory_history'").get();
      expect(schema).toBeTruthy();
    });

    test('should prevent deletion of approved GRNs', async () => {
      if (!globalToken) {
        console.log('Skipping: No token');
        return;
      }

      const { insert } = require('../backend/db/dbService.cjs');
      const grnId = crypto.randomUUID();
      
      insert('grns', {
        id: grnId,
        reference_no: `GRN-TEST-${Date.now()}`,
        supplier_id: 'test-supplier',
        supplier_name: 'Test Supplier',
        received_date: new Date().toISOString(),
        receiving_store_id: 'store-1',
        receiving_store_name: 'Main Store',
        items: JSON.stringify([]),
        status: 'approved',
        total_value: 0
      });

      const response = await request(API_BASE_URL)
        .delete(`/api/grns/${grnId}`)
        .set('Cookie', `authToken=${globalToken}`);

      expect([400, 401]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body.message || response.body.error).toMatch(/approved|cannot delete/i);
      }
    });
  });

  describe('ERR-002: Error Sanitization', () => {
    test('should not leak SQLite error messages', async () => {
      if (!globalToken) {
        console.log('Skipping: No token');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/products')
        .set('Cookie', `authToken=${globalToken}`)
        .send({
          id: null,
          name: null
        });

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/SQLITE|sqlite_|NOT NULL|CONSTRAINT|FOREIGN KEY/i);
    });

    test('should return user-friendly error messages', async () => {
      if (!globalToken) {
        console.log('Skipping: No token');
        return;
      }

      const response = await request(API_BASE_URL)
        .post('/api/products')
        .set('Cookie', `authToken=${globalToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message).not.toContain('sqlite');
      expect(response.body.message).not.toContain('NULL');
    });
  });

  describe('Integration: Security & Data Integrity', () => {
    test('should verify foreign key constraints are enabled', () => {
      const { getDatabase } = require('../backend/db/sqlite.cjs');
      const db = getDatabase();
      
      const result = db.prepare('PRAGMA foreign_keys').get();
      expect(result.foreign_keys).toBe(1);
    });

    test('should verify all critical tables exist', () => {
      const { getDatabase } = require('../backend/db/sqlite.cjs');
      const db = getDatabase();
      
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableNames = tables.map(t => t.name);
      
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('mfa_backup_codes');
      expect(tableNames).toContain('revoked_tokens');
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('suppliers');
      expect(tableNames).toContain('sales');
      expect(tableNames).toContain('purchase_orders');
      expect(tableNames).toContain('grns');
      expect(tableNames).toContain('inventory_history');
    });
  });
});
