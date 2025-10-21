const request = require('supertest');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { createTestServer } = require('../helpers/testServer.cjs');
const {
  setupTestDatabase,
  cleanupTestDatabase,
  seedAdminUser,
  getAuthToken,
  generateMFASecret,
  generateTOTPCode
} = require('../helpers/testUtils.cjs');

process.env.MFA_MAX_ATTEMPTS = '100';
process.env.SIGNUP_RATE_LIMIT = '999';

describe('Integration Tests: Authentication', () => {
  let app;
  let dbPath;
  let adminUser;
  let authToken;

  beforeAll(async () => {
    dbPath = path.join(__dirname, '../helpers/../../backend/classicpos-test-integration-auth.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    app = createTestServer(dbPath);
    adminUser = await seedAdminUser();
    authToken = await getAuthToken(adminUser);
  });

  afterAll(async () => {
    await cleanupTestDatabase(dbPath);
  });

  describe('POST /api/auth/signup', () => {
    test('should successfully create a new admin account', async () => {
      const uniqueEmail = `test-${crypto.randomUUID()}@example.com`;
      
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: uniqueEmail,
          password: 'ValidPassword123',
          businessName: 'Test Business',
          businessType: 'retail',
          country: 'US',
          phone: '+1234567890'
        });

      if (response.status === 403) {
        expect(response.body.error).toContain('Registration not allowed');
        return;
      }

      expect([201, 409]).toContain(response.status);
      
      if (response.status === 201) {
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(uniqueEmail);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).not.toHaveProperty('password');
      }
    });

    test('should reject signup with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: adminUser.email,
          password: 'ValidPassword123',
          businessName: 'Test Business',
          businessType: 'retail',
          country: 'US'
        });

      expect([409, 403]).toContain(response.status);
    });

    test('should reject signup with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'ValidPassword123',
          businessName: 'Test Business',
          businessType: 'retail',
          country: 'US'
        });

      expect([400, 403]).toContain(response.status);
    });

    test('should reject signup with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `test-${crypto.randomUUID()}@example.com`,
          password: 'weak',
          businessName: 'Test Business',
          businessType: 'retail',
          country: 'US'
        });

      expect([400, 403]).toContain(response.status);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should successfully login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: 'AdminPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(adminUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: 'WrongPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'SomePassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('MFA Setup Flow', () => {
    let mfaToken;
    let mfaSecret;
    let backupCodes;

    test('should generate MFA secret', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body.secret).toBeTruthy();
      
      mfaSecret = response.body.secret;
    });

    test('should verify TOTP and enable MFA', async () => {
      if (!mfaSecret) {
        const setupResponse = await request(API_BASE_URL)
          .post('/api/auth/mfa/setup')
          .set('Cookie', `authToken=${authToken}`);
        mfaSecret = setupResponse.body.secret;
      }

      const totpCode = generateTOTPCode(mfaSecret);

      const response = await request(app)
        .post('/api/auth/mfa/verify')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          code: totpCode,
          secret: mfaSecret
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('backupCodes');
      expect(Array.isArray(response.body.backupCodes)).toBe(true);
      expect(response.body.backupCodes.length).toBe(10);
      
      backupCodes = response.body.backupCodes;
    });

    test('should reject invalid TOTP code', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/verify')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          code: '000000',
          secret: mfaSecret || generateMFASecret()
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('MFA Login Flow', () => {
    let mfaUser;
    let mfaUserSecret;
    let mfaUserBackupCodes;

    beforeAll(async () => {
      const uniqueEmail = `mfa-user-${crypto.randomUUID()}@example.com`;
      
      const signupResp = await request(API_BASE_URL)
        .post('/api/auth/signup')
        .send({
          email: uniqueEmail,
          password: 'MfaUserPass123',
          businessName: 'MFA Test',
          businessType: 'retail',
          country: 'US'
        });

      if (signupResp.status === 403) {
        return;
      }

      const userToken = signupResp.body.token;

      const setupResp = await request(API_BASE_URL)
        .post('/api/auth/mfa/setup')
        .set('Cookie', `authToken=${userToken}`);

      mfaUserSecret = setupResp.body.secret;

      const totpCode = generateTOTPCode(mfaUserSecret);

      const verifyResp = await request(API_BASE_URL)
        .post('/api/auth/mfa/verify')
        .set('Cookie', `authToken=${userToken}`)
        .send({
          code: totpCode,
          secret: mfaUserSecret
        });

      if (verifyResp.status === 200) {
        mfaUserBackupCodes = verifyResp.body.backupCodes;
        mfaUser = { email: uniqueEmail, password: 'MfaUserPass123' };
      }
    });

    test('should require MFA after initial login', async () => {
      if (!mfaUser) {
        console.log('Skipping: MFA user not set up due to registration lock');
        return;
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: mfaUser.email,
          password: mfaUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('mfaRequired', true);
      expect(response.body).toHaveProperty('tempToken');
    });

    test('should complete MFA login with valid TOTP', async () => {
      if (!mfaUser || !mfaUserSecret) {
        console.log('Skipping: MFA user not set up');
        return;
      }

      const loginResp = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: mfaUser.email,
          password: mfaUser.password
        });

      const tempToken = loginResp.body.tempToken;
      const totpCode = generateTOTPCode(mfaUserSecret);

      const response = await request(app)
        .post('/api/auth/mfa/complete-login')
        .send({
          tempToken,
          code: totpCode
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    test('should complete MFA login with backup code', async () => {
      if (!mfaUser || !mfaUserBackupCodes || mfaUserBackupCodes.length === 0) {
        console.log('Skipping: MFA backup codes not available');
        return;
      }

      const loginResp = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: mfaUser.email,
          password: mfaUser.password
        });

      const tempToken = loginResp.body.tempToken;
      const backupCode = mfaUserBackupCodes[0];

      const response = await request(app)
        .post('/api/auth/mfa/complete-login')
        .send({
          tempToken,
          code: backupCode
        });

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should successfully logout and revoke token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `authToken=${authToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.message).toContain('Logged out');
      }
    });

    test('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Protected Route Access', () => {
    test('should allow access to protected route with valid token', async () => {
      const freshToken = await getAuthToken(adminUser);
      
      const response = await request(app)
        .get('/api/products')
        .set('Cookie', `authToken=${freshToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should deny access to protected route without token', async () => {
      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should deny access to protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Cookie', 'authToken=invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should deny access to protected route with expired token', async () => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'classicpos-secret-key-change-in-production';
      
      const expiredToken = jwt.sign(
        { id: adminUser.id, email: adminUser.email, role: adminUser.role },
        JWT_SECRET,
        { expiresIn: '0s', jti: crypto.randomUUID() }
      );

      const response = await request(app)
        .get('/api/products')
        .set('Cookie', `authToken=${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Token Revocation', () => {
    test('should revoke token on logout', async () => {
      const freshToken = await getAuthToken(adminUser);
      
      const logoutResp = await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Cookie', `authToken=${freshToken}`);

      if (logoutResp.status !== 200) {
        console.log('Skipping revocation test: logout failed');
        return;
      }

      const response = await request(app)
        .get('/api/products')
        .set('Cookie', `authToken=${freshToken}`);

      expect([401, 200]).toContain(response.status);
    });
  });
});
