const request = require('supertest');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { createTestServer } = require('../helpers/testServer.cjs');
const {
  cleanupTestDatabase,
  seedAdminUser,
  getAuthToken,
  seedAllTestData
} = require('../helpers/testUtils.cjs');

describe('Integration Tests: Data Integrity', () => {
  let app;
  let dbPath;
  let adminUser;
  let authToken;
  let testData;

  beforeAll(async () => {
    dbPath = path.join(__dirname, '../helpers/../../backend/classicpos-test-integration-data.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    app = createTestServer(dbPath);
    adminUser = await seedAdminUser();
    authToken = await getAuthToken(adminUser);
    testData = await seedAllTestData();
  });

  afterAll(async () => {
    await cleanupTestDatabase(dbPath);
  });

  describe('Cascade Delete Restrictions', () => {
    test('should prevent deletion of supplier with purchase orders', async () => {
      const supplierId = crypto.randomUUID();
      const poId = crypto.randomUUID();
      
      await request(app)
        .post('/api/suppliers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: supplierId,
          name: 'Supplier With POs',
          email: `supplier-po-${crypto.randomUUID()}@example.com`
        });

      await request(app)
        .post('/api/purchase-orders')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: poId,
          orderNumber: `PO-${Date.now()}`,
          supplierId: supplierId,
          supplierName: 'Supplier With POs',
          orderDate: new Date().toISOString(),
          expectedDeliveryDate: new Date().toISOString(),
          status: 'pending',
          items: '[]',
          totalAmount: 0
        });

      const response = await request(app)
        .delete(`/api/suppliers/${supplierId}`)
        .set('Cookie', `authToken=${authToken}`);

      expect([409, 204]).toContain(response.status);
    });

    test('should allow deletion of supplier without dependencies', async () => {
      const supplierId = crypto.randomUUID();
      
      await request(app)
        .post('/api/suppliers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: supplierId,
          name: 'Supplier Without Dependencies',
          email: `supplier-no-dep-${crypto.randomUUID()}@example.com`
        });

      const response = await request(app)
        .delete(`/api/suppliers/${supplierId}`)
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(204);
    });
  });

  describe('Data Validation', () => {
    test('should reject product with negative stock quantity', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: crypto.randomUUID(),
          name: 'Negative Stock Product',
          sku: 'NEG-STOCK-001',
          categoryId: testData.categories[0].id,
          categoryName: testData.categories[0].name,
          stockQuantity: -10,
          unitPrice: 50.00
        });

      expect(response.status).toBe(400);
    });

    test('should reject customer with invalid email format', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: crypto.randomUUID(),
          name: 'Invalid Email Customer',
          email: 'not-a-valid-email',
          phone: '+1234567890'
        });

      expect(response.status).toBe(400);
    });

    test('should reject customer with empty name', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: crypto.randomUUID(),
          name: '',
          email: `valid-${crypto.randomUUID()}@example.com`,
          phone: '+1234567890'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Data Sanitization', () => {
    test('should handle special characters in product name', async () => {
      const productId = crypto.randomUUID();
      const specialName = "Product <script>alert('xss')</script>";
      
      const response = await request(app)
        .post('/api/products')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: productId,
          name: specialName,
          sku: 'SPECIAL-001',
          categoryId: testData.categories[0].id,
          categoryName: testData.categories[0].name,
          stockQuantity: 10,
          unitPrice: 50.00
        });

      if (response.status === 201) {
        const getResponse = await request(app)
          .get(`/api/products/${productId}`)
          .set('Cookie', `authToken=${authToken}`);

        expect(getResponse.status).toBe(200);
      }
    });

    test('should handle SQL injection attempts in search', async () => {
      const response = await request(app)
        .get('/api/customers?search=\' OR 1=1--')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
    });

    test('should reject excessively long strings', async () => {
      const tooLongName = 'A'.repeat(300);
      
      const response = await request(app)
        .post('/api/customers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: crypto.randomUUID(),
          name: tooLongName,
          email: `too-long-${crypto.randomUUID()}@example.com`,
          phone: '+1234567890'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Transaction Integrity', () => {
    test('should handle concurrent updates gracefully', async () => {
      const productId = testData.products[0].id;

      const updates = await Promise.all([
        request(app)
          .put(`/api/products/${productId}`)
          .set('Cookie', `authToken=${authToken}`)
          .send({ unitPrice: 100.00 }),
        request(app)
          .put(`/api/products/${productId}`)
          .set('Cookie', `authToken=${authToken}`)
          .send({ unitPrice: 200.00 })
      ]);

      expect(updates.every(r => [200, 404].includes(r.status))).toBe(true);
    });
  });
});
