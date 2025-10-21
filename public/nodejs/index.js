const { loadAndValidateEnv } = require('./utils/envValidator.cjs');

loadAndValidateEnv();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./db/sqlite.cjs');
const { seedDefaultChartOfAccounts } = require('./services/accountingService.cjs');
const { logger } = require('./utils/logger.cjs');

const productsRouter = require('./routes/products.cjs');
const customersRouter = require('./routes/customers.cjs');
const salesRouter = require('./routes/sales.cjs');
const suppliersRouter = require('./routes/suppliers.cjs');
const categoriesRouter = require('./routes/categories.cjs');
const storesRouter = require('./routes/stores.cjs');
const taxRatesRouter = require('./routes/taxRates.cjs');
const paymentMethodsRouter = require('./routes/paymentMethods.cjs');
const purchaseOrdersRouter = require('./routes/purchaseOrders.cjs');
const grnsRouter = require('./routes/grns.cjs');
const stockAdjustmentsRouter = require('./routes/stockAdjustments.cjs');
const transfersRouter = require('./routes/transfers.cjs');
const inventoryHistoryRouter = require('./routes/inventoryHistory.cjs');
const authRouter = require('./routes/auth.cjs');
const settingsRouter = require('./routes/settings.cjs');
const reportsRouter = require('./routes/reports.cjs');
const accountingRouter = require('./routes/accounting.cjs');
const attendanceRouter = require('./routes/attendance.cjs');
const payrollRouter = require('./routes/payroll.cjs');
const activityLogsRouter = require('./routes/activityLogs.cjs');
const rolesRouter = require('./routes/roles.cjs');
const emailReceiptRouter = require('./routes/emailReceipt.cjs');
const backupsRouter = require('./routes/backups.cjs');
const swaggerRouter = require('./routes/swagger.cjs');

const authMiddleware = require('./middleware/authMiddleware.cjs');
const roleMiddleware = require('./middleware/roleMiddleware.cjs');
const httpsRedirectMiddleware = require('./middleware/httpsRedirect.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting ClassicPOS Embedded Backend...');

// Initialize database
initDatabase();
seedDefaultChartOfAccounts();

// Start backup scheduler
const backupScheduler = require('./utils/backupScheduler.cjs');
backupScheduler.start();

// Simplified CORS for embedded environment (allow localhost)
app.use(cors({
  origin: true,
  credentials: true
}));

// Simplified security middleware for embedded environment
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// API Documentation (Public)
app.use('/api-docs', swaggerRouter);

// Routes (Auth routes are public with rate limiting)
app.use('/api/auth', authLimiter, authRouter);

// Protected routes (require authentication)
app.use('/api/products', authMiddleware, productsRouter);
app.use('/api/customers', authMiddleware, customersRouter);
app.use('/api/sales', authMiddleware, salesRouter);
app.use('/api/suppliers', authMiddleware, suppliersRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/stores', authMiddleware, storesRouter);
app.use('/api/tax-rates', authMiddleware, taxRatesRouter);
app.use('/api/payment-methods', authMiddleware, paymentMethodsRouter);

// Inventory routes (status validation is handled inside each router)
app.use('/api/purchase-orders', authMiddleware, purchaseOrdersRouter);
app.use('/api/grns', authMiddleware, grnsRouter);
app.use('/api/stock-adjustments', authMiddleware, stockAdjustmentsRouter);
app.use('/api/transfers', authMiddleware, transfersRouter);

app.use('/api/inventory-history', authMiddleware, inventoryHistoryRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/reports', authMiddleware, reportsRouter);
app.use('/api/accounting', authMiddleware, accountingRouter);
app.use('/api/attendance', authMiddleware, attendanceRouter);
app.use('/api/payroll', authMiddleware, payrollRouter);
app.use('/api/activity-logs', authMiddleware, activityLogsRouter);
app.use('/api/roles', authMiddleware, rolesRouter);
app.use('/api/sales', authMiddleware, emailReceiptRouter);
app.use('/api/backups', authMiddleware, backupsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ ClassicPOS Backend running on http://127.0.0.1:${PORT}`);
  logger.info(`✅ Backend server running on port ${PORT}`);
});
