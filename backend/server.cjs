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
const syncRouter = require('./routes/sync.cjs');

const authMiddleware = require('./middleware/authMiddleware.cjs');
const roleMiddleware = require('./middleware/roleMiddleware.cjs');
const httpsRedirectMiddleware = require('./middleware/httpsRedirect.cjs');
const errorHandler = require('./middleware/errorHandler.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for Replit environment
app.set('trust proxy', 1);

// Database readiness flag
let isDatabaseReady = false;

// Initialize database asynchronously
const initializeApp = async () => {
  try {
    logger.info('🔄 Initializing SQLite database...');
    await new Promise((resolve) => {
      try {
        initDatabase();
        seedDefaultChartOfAccounts();
        isDatabaseReady = true;
        logger.info('✅ SQLite database initialized and ready');
        resolve();
      } catch (error) {
        logger.error('❌ Database initialization failed:', error);
        throw error;
      }
    });
  } catch (error) {
    logger.error('Fatal error during initialization:', error);
    process.exit(1);
  }
};

// Start backup scheduler
const backupScheduler = require('./utils/backupScheduler.cjs');
backupScheduler.start();

// HTTPS redirect middleware (production only)
app.use(httpsRedirectMiddleware);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Rate limiting for auth routes (disabled during tests)
const authLimiter = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });

// CORS with whitelist support
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5000'];

// Add Replit domains automatically in development
if (process.env.NODE_ENV !== 'production') {
  if (process.env.REPLIT_DEV_DOMAIN) {
    corsOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPLIT_DOMAINS) {
    const replitDomains = process.env.REPLIT_DOMAINS.split(',').map(d => `https://${d.trim()}`);
    corsOrigins.push(...replitDomains);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
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
app.use('/api/sync', authMiddleware, syncRouter);

// Health check - General server health
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    database: isDatabaseReady ? 'ready' : 'initializing'
  });
});

// Health check - Database specific
app.get('/api/health/db', (req, res) => {
  if (!isDatabaseReady) {
    return res.status(503).json({ 
      status: 'initializing', 
      message: 'Database is still initializing. Please wait...',
      ready: false
    });
  }
  
  try {
    const { getDatabase } = require('./db/sqlite.cjs');
    const db = getDatabase();
    
    // Quick test query to verify database is accessible
    const result = db.prepare('SELECT 1 as test').get();
    
    res.json({ 
      status: 'ready', 
      message: 'Database is initialized and ready',
      ready: true
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({ 
      status: 'error', 
      message: 'Database connection error',
      ready: false,
      error: error.message
    });
  }
});

// Centralized error handling middleware
app.use(errorHandler);

// Initialize database and start server
initializeApp().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`✅ Backend server running on port ${PORT}`);
    logger.info(`✅ Database ready for connections`);
  });
}).catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
