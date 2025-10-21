const request = require('supertest');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { createTestServer } = require('../helpers/testServer.cjs');
const {
  cleanupTestDatabase,
  seedAdminUser,
  getAuthToken,
  seedProducts,
  seedSuppliers,
  seedStores
} = require('../helpers/testUtils.cjs');

describe('Integration Tests: Inventory Management', () => {
  let app;
  let dbPath;
  let adminUser;
  let authToken;
  let products;
  let suppliers;
  let stores;

  beforeAll(async () => {
    dbPath = path.join(__dirname, '../helpers/../../backend/classicpos-test-integration-inventory.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    app = createTestServer(dbPath);
    adminUser = await seedAdminUser();
    authToken = await getAuthToken(adminUser);
    products = await seedProducts();
    suppliers = await seedSuppliers();
    stores = await seedStores();
  });

  afterAll(async () => {
    await cleanupTestDatabase(dbPath);
  });

  describe('GRN Lifecycle', () => {
    let grnId;

    test('should create a new GRN', async () => {
      grnId = crypto.randomUUID();
      
      const response = await request(app)
        .post('/api/grns')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: grnId,
          referenceNumber: `GRN-${Date.now()}`,
          supplierId: suppliers[0].id,
          supplierName: suppliers[0].name,
          receivedDate: new Date().toISOString(),
          status: 'pending',
          items: JSON.stringify([]),
          totalAmount: 500.00
        });

      expect(response.status).toBe(201);
    });

    test('should get all GRNs', async () => {
      const response = await request(app)
        .get('/api/grns')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should prevent deletion of approved GRN', async () => {
      const approvedGrnId = crypto.randomUUID();
      
      await request(app)
        .post('/api/grns')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: approvedGrnId,
          referenceNumber: `GRN-APPROVED-${Date.now()}`,
          supplierId: suppliers[0].id,
          supplierName: suppliers[0].name,
          receivedDate: new Date().toISOString(),
          status: 'approved',
          items: '[]',
          totalAmount: 0
        });

      const response = await request(app)
        .delete(`/api/grns/${approvedGrnId}`)
        .set('Cookie', `authToken=${authToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Stock Adjustment Lifecycle', () => {
    let adjustmentId;

    test('should create a new stock adjustment', async () => {
      adjustmentId = crypto.randomUUID();
      
      const response = await request(app)
        .post('/api/stock-adjustments')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: adjustmentId,
          referenceNumber: `ADJ-${Date.now()}`,
          adjustmentDate: new Date().toISOString(),
          reason: 'damaged',
          items: '[]'
        });

      expect(response.status).toBe(201);
    });

    test('should get all stock adjustments', async () => {
      const response = await request(app)
        .get('/api/stock-adjustments')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
    });

    test('should update stock adjustment', async () => {
      const response = await request(app)
        .put(`/api/stock-adjustments/${adjustmentId}`)
        .set('Cookie', `authToken=${authToken}`)
        .send({
          notes: 'Updated notes'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Transfer Lifecycle', () => {
    let transferId;

    test('should create a new transfer', async () => {
      transferId = crypto.randomUUID();
      
      const response = await request(app)
        .post('/api/transfers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: transferId,
          referenceNumber: `TRF-${Date.now()}`,
          fromStoreId: stores[0].id,
          fromStoreName: stores[0].name,
          toStoreId: stores[1].id,
          toStoreName: stores[1].name,
          transferDate: new Date().toISOString(),
          status: 'pending',
          items: '[]'
        });

      expect(response.status).toBe(201);
    });

    test('should get all transfers', async () => {
      const response = await request(app)
        .get('/api/transfers')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
    });

    test('should prevent deletion of in-transit transfer', async () => {
      const transitTransferId = crypto.randomUUID();
      
      await request(app)
        .post('/api/transfers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: transitTransferId,
          referenceNumber: `TRF-TRANSIT-${Date.now()}`,
          fromStoreId: stores[0].id,
          fromStoreName: stores[0].name,
          toStoreId: stores[1].id,
          toStoreName: stores[1].name,
          transferDate: new Date().toISOString(),
          status: 'in-transit',
          items: '[]'
        });

      const response = await request(app)
        .delete(`/api/transfers/${transitTransferId}`)
        .set('Cookie', `authToken=${authToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Purchase Order Operations', () => {
    test('should create a new purchase order', async () => {
      const poId = crypto.randomUUID();
      
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: poId,
          orderNumber: `PO-${Date.now()}`,
          supplierId: suppliers[0].id,
          supplierName: suppliers[0].name,
          orderDate: new Date().toISOString(),
          expectedDeliveryDate: new Date().toISOString(),
          status: 'pending',
          items: '[]',
          totalAmount: 0
        });

      expect(response.status).toBe(201);
    });

    test('should get all purchase orders', async () => {
      const response = await request(app)
        .get('/api/purchase-orders')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Inventory History Tracking', () => {
    test('should get inventory history', async () => {
      const response = await request(app)
        .get('/api/inventory-history')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});
