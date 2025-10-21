const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { initDatabase } = require('../../backend/db/sqlite.cjs');
const { seedDefaultChartOfAccounts } = require('../../backend/services/accountingService.cjs');

function createTestServer(dbPath) {
  process.env.DB_PATH = dbPath;
  process.env.NODE_ENV = 'test';
  
  initDatabase();
  seedDefaultChartOfAccounts();
  
  const app = express();
  
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());
  
  const authRouter = require('../../backend/routes/auth.cjs');
  const productsRouter = require('../../backend/routes/products.cjs');
  const customersRouter = require('../../backend/routes/customers.cjs');
  const suppliersRouter = require('../../backend/routes/suppliers.cjs');
  const categoriesRouter = require('../../backend/routes/categories.cjs');
  const grnsRouter = require('../../backend/routes/grns.cjs');
  const stockAdjustmentsRouter = require('../../backend/routes/stockAdjustments.cjs');
  const transfersRouter = require('../../backend/routes/transfers.cjs');
  const inventoryHistoryRouter = require('../../backend/routes/inventoryHistory.cjs');
  const purchaseOrdersRouter = require('../../backend/routes/purchaseOrders.cjs');
  const salesRouter = require('../../backend/routes/sales.cjs');
  const storesRouter = require('../../backend/routes/stores.cjs');
  
  const authMiddleware = require('../../backend/middleware/authMiddleware.cjs');
  
  app.use('/api/auth', authRouter);
  app.use('/api/products', authMiddleware, productsRouter);
  app.use('/api/customers', authMiddleware, customersRouter);
  app.use('/api/suppliers', authMiddleware, suppliersRouter);
  app.use('/api/categories', authMiddleware, categoriesRouter);
  app.use('/api/grns', authMiddleware, grnsRouter);
  app.use('/api/stock-adjustments', authMiddleware, stockAdjustmentsRouter);
  app.use('/api/transfers', authMiddleware, transfersRouter);
  app.use('/api/inventory-history', authMiddleware, inventoryHistoryRouter);
  app.use('/api/purchase-orders', authMiddleware, purchaseOrdersRouter);
  app.use('/api/sales', authMiddleware, salesRouter);
  app.use('/api/stores', authMiddleware, storesRouter);
  
  return app;
}

module.exports = { createTestServer };
