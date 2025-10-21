# ClassicPOS - Point of Sale System

A modern, full-featured Point of Sale system built with React, TypeScript, and SQLite.

## Architecture

### Async Resource Context Pattern

ClassicPOS uses a standardized async resource context pattern powered by the `createAsyncResourceContext` helper to manage all data flows. This ensures consistent async behavior, eliminates stale closures, and provides centralized error handling across the application.

#### Core Features

- **Automatic async state management**: Loading states, errors, and operation tracking
- **Stale closure prevention**: All state updates use the latest state via functional updates
- **Centralized error handling**: Automatic toast notifications and retry logic
- **Custom operations**: Support for complex business logic beyond basic CRUD
- **Derived selectors**: Memoized computed values for efficient data access
- **Multi-collection support**: Pattern for managing multiple related data collections

#### Creating a New Resource Context

```typescript
import { createAsyncResourceContext } from "@/utils/createAsyncResourceContext";
import { getAll, insert, update as dbUpdate, remove } from "@/services/dbService";

// 1. Define your resource type
interface MyResource {
  id: string;
  name: string;
  // ... other fields
}

// 2. Create the base context
const { Context: BaseContext, Provider: BaseProvider } = createAsyncResourceContext<MyResource>({
  name: "My Resource", // Used in error/success messages
  
  // Required: Load all items
  loadAll: async () => {
    const dbItems = await getAll<any>('my_resources');
    return dbItems.map(dbToMyResource);
  },
  
  // Optional: CRUD operations
  create: async (item: MyResource) => {
    await insert('my_resources', myResourceToDb(item));
    return item;
  },
  
  update: async (id: string, updates: Partial<MyResource>) => {
    await dbUpdate('my_resources', id, myResourceToDb(updates as MyResource));
    return { id, ...updates } as MyResource;
  },
  
  remove: async (id: string) => {
    await remove('my_resources', id);
  },
  
  // Optional: Custom operations with access to context
  customOperations: {
    myCustomOperation: async (ctx, arg1, arg2) => {
      // ctx provides: items, setItems, executeAsync, baseCreate, baseUpdate, baseRemove
      // Perform complex logic
      const result = await someAsyncOperation(arg1, arg2);
      // Update state if needed
      ctx.setItems(prev => [...prev, result]);
      return result;
    },
  },
  
  // Optional: Derived selectors for computed values
  derivedSelectors: {
    getItemById: (items: MyResource[], id: string) => {
      return items.find(item => item.id === id);
    },
  },
  
  // Optional: Custom messages per operation
  operationMessages: {
    myCustomOperation: {
      success: "Operation completed successfully!",
      error: "Operation failed",
    },
  },
  
  // Optional: Enable optimistic updates
  enableOptimistic: false,
  
  // Optional: Enable retry on network errors
  retryOnError: true,
  maxRetries: 3,
});

// 3. Create provider wrapper for cross-context dependencies
export const MyResourceProvider = ({ children }: { children: ReactNode }) => {
  return (
    <BaseProvider>
      <MyResourceProviderWrapper>{children}</MyResourceProviderWrapper>
    </BaseProvider>
  );
};

const MyResourceProviderWrapper = ({ children }: { children: ReactNode }) => {
  const baseContext = useContext(BaseContext);
  const { someData } = useSomeOtherContext();
  
  if (!baseContext) {
    throw new Error("MyResourceProviderWrapper must be used within BaseProvider");
  }

  const { items, asyncState, create, update, remove, refresh, getItemById } = baseContext;

  // Add custom logic or enrich operations
  const addMyResource = useCallback(async (newResource: Omit<MyResource, "id">) => {
    const enriched = {
      ...newResource,
      id: crypto.randomUUID(),
      // Add derived data from other contexts
      derivedField: someData,
    };
    await create(enriched);
  }, [create, someData]);

  return (
    <MyResourceContext.Provider value={{
      items,
      asyncState,
      addMyResource,
      updateMyResource: update,
      deleteMyResource: remove,
      getItemById,
      refresh,
    }}>
      {children}
    </MyResourceContext.Provider>
  );
};

// 4. Export the custom hook
export const useMyResource = () => {
  const context = useContext(MyResourceContext);
  if (context === undefined) {
    throw new Error("useMyResource must be used within a MyResourceProvider");
  }
  return context;
};
```

#### Pattern Variations

**Simple Context (No Wrapper)**
```typescript
// For contexts without cross-context dependencies
export const SimpleProvider = ({ children }: { children: ReactNode }) => {
  return <BaseProvider>{children}</BaseProvider>;
};

export const useSimple = () => {
  const context = useContext(BaseContext);
  return {
    items: context.items,
    add: context.create,
    // ... map to your API
  };
};
```

**Multi-Collection Context**
```typescript
// For managing multiple related collections (e.g., completed vs held sales)
const { Provider: CompletedProvider } = createAsyncResourceContext<Sale>({
  name: "Completed Sale",
  loadAll: async () => {
    const response = await fetch('/api/sales/completed');
    return response.json();
  },
  // ...
});

const { Provider: HeldProvider } = createAsyncResourceContext<Sale>({
  name: "Held Sale",
  loadAll: async () => {
    const response = await fetch('/api/sales/held');
    return response.json();
  },
  // ...
});

export const SaleProvider = ({ children }: { children: ReactNode }) => {
  return (
    <CompletedProvider>
      <HeldProvider>
        <SaleProviderWrapper>{children}</SaleProviderWrapper>
      </HeldProvider>
    </CompletedProvider>
  );
};

// Wrapper combines both contexts into a unified API
const SaleProviderWrapper = ({ children }: { children: ReactNode }) => {
  const completed = useContext(CompletedContext);
  const held = useContext(HeldContext);
  
  return (
    <SaleContext.Provider value={{
      salesHistory: completed.items,
      heldSales: held.items,
      addSale: completed.create,
      holdSale: held.create,
      // ... combined API
    }}>
      {children}
    </SaleContext.Provider>
  );
};
```

#### Async State Tracking

All contexts expose `asyncState` for tracking operations:

```typescript
const { items, asyncState } = useMyResource();

// asyncState provides:
// - isLoading: boolean - true during any async operation
// - error: Error | null - last error encountered
// - operationInProgress: string | null - name of current operation

{asyncState.isLoading && <Spinner />}
{asyncState.error && <ErrorMessage error={asyncState.error} />}
```

#### Best Practices

1. **State Updates**: Always use functional updates to access latest state
2. **Error Handling**: Let the helper handle errors via toast - don't duplicate
3. **Custom Operations**: Use for complex workflows that need context access
4. **Derived Selectors**: Use for computed values that depend only on items array
5. **Provider Hierarchy**: Ensure dependencies are available before usage (check App.tsx)
6. **Naming**: Use consistent naming for operations (add/create, update, delete/remove)

#### Migration Guide

When refactoring an existing context:

1. Create base context with `loadAll` and CRUD operations
2. Move complex operations to `customOperations` config
3. Convert computed values to `derivedSelectors`
4. Create wrapper provider for cross-context dependencies
5. Test all workflows to ensure no regressions

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **State Management**: React Context with async resource pattern
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Radix UI primitives
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd classicpos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**

   The application will automatically create a `.env` file from `.env.example` on first run with secure defaults. To customize:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your specific configuration (see Environment Variables section below).

4. **Start Development Server**
   ```bash
   npm run dev:all
   ```

   This starts both the backend (port 3001) and frontend (port 5000) concurrently.

5. **Access the Application**
   - Frontend: `http://localhost:5000`
   - Backend API: `http://localhost:3001/api`
   - API Documentation: `http://localhost:3001/api-docs`

### First-Time Setup

1. **Create Admin Account**: The first user to sign up automatically becomes an Admin
2. **Configure Store**: Add at least one store in Settings → Stores
3. **Add Products**: Import or manually add products to the catalog
4. **Set up Tax Rates**: Configure applicable tax rates for your region
5. **Configure Receipt**: Customize receipt template in Settings

## Environment Variables

### Required Variables

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api
PORT=3001
DB_PATH=./backend/classicpos.db

# CORS Configuration
CORS_ORIGIN=http://localhost:5000,http://127.0.0.1:5000

# Node Environment
NODE_ENV=development

# Authentication & Security
JWT_SECRET=<auto-generated-128-char-hex-string>
JWT_EXPIRES_IN=1h

# MFA Configuration
MFA_RATE_LIMIT_WINDOW_MS=60000
MFA_MAX_ATTEMPTS=5
```

### Optional Variables

```env
# Email Configuration (for receipt emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
SMTP_FROM=ClassicPOS <noreply@yourapp.com>

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2:00 AM
BACKUP_RETENTION_DAYS=14

# Logging
VITE_LOG_LEVEL=info  # debug, info, warn, error
```

### Environment Variable Details

- **JWT_SECRET**: Automatically generated 128-character hex string using cryptographically secure random bytes. Must be kept secret.
- **DB_PATH**: Location of SQLite database file
- **CORS_ORIGIN**: Comma-separated list of allowed origins
- **BACKUP_SCHEDULE**: Cron expression for backup schedule (default: daily at 2 AM)
- **BACKUP_RETENTION_DAYS**: Number of daily backups to retain (default: 14)
- **MFA_RATE_LIMIT_WINDOW_MS**: Time window for MFA attempt tracking (default: 60 seconds)
- **MFA_MAX_ATTEMPTS**: Maximum failed MFA attempts before rate limiting (default: 5)

## Production Deployment

### Build for Production

```bash
# Build frontend
npm run build:prod

# Start production server
npm run start:prod
```

### Production Checklist

- [ ] Set `NODE_ENV=production` in environment
- [ ] Configure secure `JWT_SECRET` (auto-generated or custom)
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure production `CORS_ORIGIN` with actual domain(s)
- [ ] Enable and configure SMTP for email receipts
- [ ] Set up automated backups (enabled by default)
- [ ] Configure firewall to allow only necessary ports
- [ ] Set up monitoring and logging
- [ ] Review and adjust backup retention period
- [ ] Test backup and restore procedures

### Backup & Restore

#### Automated Backups

Backups run automatically based on `BACKUP_SCHEDULE` (default: daily at 2:00 AM).

- Backups are stored in `/backups/` directory
- Uses SQLite's `VACUUM INTO` for safe, consistent backups
- Automatic rotation keeps last N backups (configurable via `BACKUP_RETENTION_DAYS`)
- Backup files named: `classicpos_backup_YYYY-MM-DD_HH-MM-SS.db`

#### Manual Backup via API

```bash
# Trigger manual backup (requires admin authentication)
curl -X POST http://localhost:3001/api/backups/manual \
  -H "Cookie: token=<your-jwt-token>"

# List available backups
curl http://localhost:3001/api/backups/list \
  -H "Cookie: token=<your-jwt-token>"
```

#### Restore from Backup

```bash
# Restore from specific backup file (requires admin authentication)
curl -X POST http://localhost:3001/api/backups/restore/classicpos_backup_2025-10-18_02-00-00.db \
  -H "Cookie: token=<your-jwt-token>"
```

**Note**: After restore, restart the server for changes to take effect.

### Security Considerations

- JWT tokens are stored in HTTP-only cookies with `SameSite: strict`
- Passwords are hashed with bcrypt (10 salt rounds)
- MFA uses TOTP with server-side verification
- Rate limiting on authentication endpoints (20 attempts per 15 minutes)
- Rate limiting on MFA verification (5 attempts per minute)
- SQL injection prevention through parameterized queries
- XSS protection via React's built-in escaping
- Helmet.js security headers in production
- Database backups use read-only connections for safety

### API Documentation

Interactive API documentation is available via Swagger UI:

- **Development**: `http://localhost:3001/api-docs`
- **Production**: `https://your-domain.com/api-docs`

The documentation includes:
- All API endpoints with request/response schemas
- Authentication requirements
- Example requests and responses
- Model schemas and data types

### Docker Deployment (Optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build:prod
EXPOSE 3001 5000
CMD ["npm", "run", "start:prod"]
```

### Monitoring & Logs

- Backend logs: Winston with daily file rotation (14-day retention)
- Log files stored in: `backend/logs/`
- Log levels: DEBUG (dev), INFO (staging), WARN (production)
- Frontend logs: Conditional based on `VITE_LOG_LEVEL`

## Database

The application uses SQLite for data persistence. The database is automatically initialized on first run.

### Database Schema

25 tables including:
- **Core**: products, categories, customers, suppliers, stores
- **Sales**: sales, payment_methods, tax_rates
- **Inventory**: purchase_orders, grns, stock_adjustments, transfers, inventory_history
- **Accounting**: chart_of_accounts, journal_entries, journal_entry_lines, bank_accounts
- **HR**: attendance, payroll
- **System**: users, roles, permissions, role_permissions, activity_logs, settings

### Database Backups

- Automated nightly backups using `VACUUM INTO`
- Manual backup API available for admins
- Retention: 14 days (configurable)
- Location: `/backups/` directory

### Database Migrations

Migrations run automatically on server startup. No manual intervention required.

## Project Structure

```
src/
├── components/        # UI components organized by feature
│   ├── auth/         # Authentication components
│   ├── common/       # Shared components
│   ├── customers/    # Customer management
│   ├── dashboard/    # Dashboard widgets
│   ├── inventory/    # Inventory management
│   ├── products/     # Product management
│   ├── sales/        # Sales components
│   ├── settings/     # Settings pages
│   ├── stores/       # Store management
│   ├── suppliers/    # Supplier management
│   └── ui/           # Base UI components (shadcn)
├── context/          # React contexts (all use async resource pattern)
├── db/               # Database helpers and transformers
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── pages/            # Page components
├── services/         # API and database services
├── types/            # TypeScript type definitions
└── utils/            # Utility functions and helpers
    └── createAsyncResourceContext.tsx  # Core async pattern helper
```

## Features

- **Sales Management**: POS interface with barcode scanning, multiple payment methods
- **Inventory**: Stock tracking, adjustments, transfers between stores
- **Purchase Orders**: Supplier management, GRN (Goods Received Notes)
- **Customer Management**: Loyalty points, purchase history
- **Multi-store**: Support for multiple store locations
- **Reporting**: Sales reports, inventory history
- **Authentication**: Multi-factor authentication support

## Database

The application uses SQLite for data persistence. The database is automatically initialized on first run with the following tables:

- Products, Categories
- Customers, Suppliers
- Sales, Sale Items
- Purchase Orders, GRNs
- Stock Adjustments, Transfers
- Inventory History
- Stores, Users, Settings

## Contributing

When adding new features:

1. Use the async resource context pattern for all data management
2. Follow the existing component structure
3. Add TypeScript types for all new data structures
4. Include error handling and loading states
5. Test CRUD operations thoroughly

## License

MIT
