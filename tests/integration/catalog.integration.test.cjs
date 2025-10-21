const request = require('supertest');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { createTestServer } = require('../helpers/testServer.cjs');
const {
  cleanupTestDatabase,
  seedAdminUser,
  getAuthToken,
  seedCategories
} = require('../helpers/testUtils.cjs');

describe('Integration Tests: Catalog Management', () => {
  let app;
  let dbPath;
  let adminUser;
  let authToken;

  beforeAll(async () => {
    dbPath = path.join(__dirname, '../helpers/../../backend/classicpos-test-integration-catalog.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    
    app = createTestServer(dbPath);
    adminUser = await seedAdminUser();
    authToken = await getAuthToken(adminUser);
    await seedCategories();
  });

  afterAll(async () => {
    await cleanupTestDatabase(dbPath);
  });

  describe('Product CRUD Operations', () => {
    let productId;

    test('should create a new product', async () => {
      productId = crypto.randomUUID();
      
      const response = await request(app)
        .post('/api/products')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: productId,
          name: 'Test Product',
          sku: 'TEST-SKU-001',
          barcode: '1234567890123',
          categoryId: 'cat-electronics',
          categoryName: 'Electronics',
          stockQuantity: 100,
          unitPrice: 99.99,
          costPrice: 50.00
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', productId);
    });

    test('should reject product creation without auth', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          id: crypto.randomUUID(),
          name: 'Unauthorized Product',
          sku: 'UNAUTH-001',
          categoryId: 'cat-electronics',
          categoryName: 'Electronics',
          stockQuantity: 50,
          unitPrice: 25.00
        });

      expect(response.status).toBe(401);
    });

    test('should get all products', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should get product by id', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', productId);
    });

    test('should update product', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Cookie', `authToken=${authToken}`)
        .send({
          name: 'Updated Product Name',
          unitPrice: 149.99
        });

      expect(response.status).toBe(200);
    });

    test('should delete product', async () => {
      const tempProductId = crypto.randomUUID();
      
      await request(app)
        .post('/api/products')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: tempProductId,
          name: 'Product to Delete',
          sku: 'DELETE-001',
          categoryId: 'cat-electronics',
          categoryName: 'Electronics',
          stockQuantity: 10,
          unitPrice: 10.00
        });

      const response = await request(app)
        .delete(`/api/products/${tempProductId}`)
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(204);
    });
  });

  describe('Customer CRUD Operations', () => {
    let customerId;

    test('should create a new customer', async () => {
      customerId = crypto.randomUUID();
      
      const response = await request(app)
        .post('/api/customers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: customerId,
          name: 'Test Customer',
          email: `customer-${crypto.randomUUID()}@example.com`,
          phone: '+1234567890'
        });

      expect(response.status).toBe(201);
    });

    test('should get all customers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
    });

    test('should update customer', async () => {
      const response = await request(app)
        .put(`/api/customers/${customerId}`)
        .set('Cookie', `authToken=${authToken}`)
        .send({
          name: 'Updated Customer Name'
        });

      expect(response.status).toBe(200);
    });

    test('should delete customer', async () => {
      const tempCustomerId = crypto.randomUUID();
      
      await request(app)
        .post('/api/customers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: tempCustomerId,
          name: 'Customer to Delete',
          email: `delete-${crypto.randomUUID()}@example.com`,
          phone: '+9999999999'
        });

      const response = await request(app)
        .delete(`/api/customers/${tempCustomerId}`)
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(204);
    });
  });

  describe('Supplier CRUD Operations', () => {
    let supplierId;

    test('should create a new supplier', async () => {
      supplierId = crypto.randomUUID();
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: supplierId,
          name: 'Test Supplier',
          email: `supplier-${crypto.randomUUID()}@example.com`,
          phone: '+1234567890'
        });

      expect(response.status).toBe(201);
    });

    test('should get all suppliers', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
    });

    test('should update supplier', async () => {
      const response = await request(app)
        .put(`/api/suppliers/${supplierId}`)
        .set('Cookie', `authToken=${authToken}`)
        .send({
          name: 'Updated Supplier Name'
        });

      expect(response.status).toBe(200);
    });

    test('should delete supplier', async () => {
      const tempSupplierId = crypto.randomUUID();
      
      await request(app)
        .post('/api/suppliers')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: tempSupplierId,
          name: 'Supplier to Delete',
          email: `delete-supplier-${crypto.randomUUID()}@example.com`
        });

      const response = await request(app)
        .delete(`/api/suppliers/${tempSupplierId}`)
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(204);
    });
  });

  describe('Category Operations', () => {
    let categoryId;

    test('should create a new category', async () => {
      categoryId = crypto.randomUUID();
      
      const response = await request(app)
        .post('/api/categories')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: categoryId,
          name: 'Test Category',
          description: 'A test category'
        });

      expect(response.status).toBe(201);
    });

    test('should get all categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should update category', async () => {
      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Cookie', `authToken=${authToken}`)
        .send({
          name: 'Updated Category Name'
        });

      expect(response.status).toBe(200);
    });

    test('should delete category', async () => {
      const tempCategoryId = crypto.randomUUID();
      
      await request(app)
        .post('/api/categories')
        .set('Cookie', `authToken=${authToken}`)
        .send({
          id: tempCategoryId,
          name: 'Category to Delete'
        });

      const response = await request(app)
        .delete(`/api/categories/${tempCategoryId}`)
        .set('Cookie', `authToken=${authToken}`);

      expect(response.status).toBe(204);
    });

    test('should require authentication for all category operations', async () => {
      const responses = await Promise.all([
        request(app).get('/api/categories'),
        request(app).post('/api/categories').send({ id: 'test', name: 'Test' }),
        request(app).put('/api/categories/test').send({ name: 'Updated' }),
        request(app).delete('/api/categories/test')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });
});
