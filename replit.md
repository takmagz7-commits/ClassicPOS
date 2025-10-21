# Overview

ClassicPOS is a comprehensive Point of Sale (POS) system built with React and TypeScript, designed to provide end-to-end retail management capabilities. It supports sales processing, inventory management, customer relationship management, multi-store operations, and financial reporting for retail businesses, restaurants, cafes, and service-based operations. Key features include loyalty programs, multi-currency support, barcode scanning, receipt printing, and comprehensive reporting with export capabilities, aiming to deliver a robust and scalable solution for modern businesses.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

### Core Technology Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite with SWC
- **Routing**: React Router v6
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with CSS variables
- **State Management**: React Context API with custom hooks
- **Forms**: React Hook Form with Zod validation
- **Mobile Support**: Capacitor for iOS/Android builds

### Application Structure
Organized into `pages/`, `components/`, `context/`, `hooks/`, `types/`, `data/`, `config/`, and `lib/` for modularity.

### State Management Pattern
Utilizes an **Async Resource Context Pattern** for data management, with dedicated context providers for major domains (Sales, Products, Customers, Inventory). It integrates with a SQLite + Express API for persistence and features automatic state synchronization and provider composition.

### Key Architectural Decisions
- **Role-Based Access Control (RBAC)**: Three user roles (Admin, Manager, Employee) with route-level permission checking.
- **Multi-Store Support**: Per-store inventory tracking, stock adjustments, and transfers.
- **Inventory Management System**: Four-step workflow (Purchase Orders → GRN → Stock Adjustments → Transfers) with audit trails and automatic stock updates.
- **Sales Processing**: Supports multi-payment methods, loyalty programs, gift cards, discounts, and sale hold/resume.
- **Customer Management**: Includes loyalty programs, VAT/TIN tracking, purchase history, and credit accounts.
- **UI/UX**: Light/Dark mode, responsive design, confirmation dialogs, toast notifications, loading states, and real-time form validation.

## Data Layer

### Storage Strategy
- **Primary Storage**: SQLite database (better-sqlite3) accessed via a Node.js + Express REST API.
- **Backend**: Node.js + Express server on port 3001.
- **Frontend**: React app on port 5000, proxying `/api` requests to the backend.
- **Data Format**: JSON over HTTP.
- **Initial Data**: Database schema is initialized on first run.

### Key Data Models
Product, Sale, and Inventory Document schemas capture essential retail entities and their relationships.

## Authentication & Authorization

### Comprehensive Security Implementation
- **Password Security**: bcryptjs hashing (10 salt rounds), password complexity policy enforced (uppercase, lowercase, number, special character, minimum 8 characters).
- **Session Management**: JWT Tokens with 7-day expiration, stored in secure HTTP-Only cookies (`secure`, `sameSite: 'strict'`). Server-side token revocation with blacklist table and jti claim tracking.
- **Multi-Factor Authentication (MFA)**: Enterprise-grade TOTP with server-side secret generation, rate limiting (5 attempts/minute), and backup codes. Backup codes bcrypt-hashed in separate table (`mfa_backup_codes`), never stored in plaintext.
- **Input Validation**: Zod schemas for both frontend and backend validation on all authentication endpoints.
- **Role-Based Access Control (RBAC)**: Enforced via `ProtectedRoute` on frontend and `authMiddleware` and `roleMiddleware` on backend for all protected routes.
- **Security Best Practices**: SQL injection prevention, XSS/CSRF protection, rate limiting on MFA, security headers (Helmet.js), CORS, and token expiration.
- **Production Readiness**: Auto-generated JWT_SECRET, environment validation, structured logging with Winston, HTTPS redirect, CORS whitelist, and inventory validation middleware.

### Phase 2 Security Hardening (October 2025)
- **SEC-001: MFA Backup Code Encryption**: Backup codes stored as bcrypt hashes in dedicated `mfa_backup_codes` table with automatic migration from plaintext. One-time display during MFA setup, immediate deletion after use.
- **SEC-002: Session Revocation**: Token blacklist system with `revoked_tokens` table. All JWT tokens include unique `jti` claim. Logout endpoint revokes tokens immediately. Automatic cleanup prevents table bloat.
- **SEC-003: Password Complexity Policy**: Regex validation enforces uppercase, lowercase, number, special character, 8+ characters. Applied to signup, user creation, and password changes.

### First-Admin Registration & PIN System (October 2025)
- **Bootstrap Security**: Single-admin registration enforced through `system_settings` table tracking initialization state.
- **Registration Lock**: `registrationLockMiddleware` blocks additional signups after first admin is created, preventing unauthorized access during setup.
- **Mandatory PIN Setup**: After first registration, admin must complete 4-6 digit numeric PIN setup before accessing the system. PINs are bcrypt-hashed before storage.
- **System Initialization Flow**: First signup → Auto-redirect to PIN setup page → Complete PIN setup → Access dashboard → Registration permanently locked.
- **System Reset**: Admin users can reset the system initialization from Settings using a "RESET" confirmation code, re-enabling registration for new deployments.
- **API Endpoints**: `/auth/system-status` (check initialization), `/auth/setup-pin` (create PIN), `/auth/reset-system` (admin reset).
- **Frontend Pages**: `/setup-pin` (PIN setup page), updated `/signup` (checks system status), Settings → System Reset component.
- **Database Schema**: `system_settings` table with `is_initialized` and `pin_setup_complete` flags.

### Database Initialization & Readiness System (October 2025)
- **Async Initialization**: Database is fully initialized via `initializeApp()` before Express server starts accepting requests, ensuring no race conditions on startup.
- **Synchronous Safety**: better-sqlite3 is synchronous by design - when `initDatabase()` completes, database is fully ready with no background operations.
- **Health Check Endpoints**: 
  - `/api/health/db` - Returns database-specific readiness status with `{status, message, ready}` response
  - `/api/health` - Returns general server health including database status
- **Database Readiness Middleware**: Applied to all public auth routes (`/signup`, `/login`, `/verify-mfa`, `/complete-mfa-login`, `/pin-login`, `/system-status`) to ensure 503 errors when database unavailable.
- **Frontend Health Checks**: `databaseHealth.ts` utility provides retry logic (10 attempts, 2-second intervals) with user-friendly messages during initialization.
- **AuthContext Integration**: Checks database readiness before all authentication operations (login, register, pinLogin) with proper error handling and user feedback.
- **Error Messages**: Specific, actionable error messages - "Database initializing...", "Email already used", "Invalid credentials" with appropriate HTTP status codes (503 for DB not ready, 401 for invalid auth, 409 for duplicates).
- **Security Logging**: All authentication attempts (successful and failed) are logged for security auditing via Winston structured logging.

## Accounting Module
Implemented a comprehensive double-entry accounting system fully integrated with the POS, including Chart of Accounts, Journal Entries, General Ledger, Trial Balance, Income Statement, Balance Sheet, Cash Flow Statement, Accounts Receivable, and Accounts Payable. Features automatic double-entry posting, transaction safety, and balance enforcement.

## Reporting & Analytics

### Complete Reporting System
ClassicPOS features a comprehensive reporting module with 8 production-ready report types, backend aggregation, and export capabilities.

### Report Types
1. **Sales Report**
2. **Inventory Report**
3. **Customer Report**
4. **Supplier Report**
5. **Tax Report**
6. **Debtor Report**
7. **Product Performance Report**
8. **Staff Report**

### Technical Architecture
- **Backend**: RESTful API endpoints (`/api/reports/*`) with optimized SQL queries using SQLite aggregation functions.
- **Frontend**: ReportContext provider following async resource pattern for state management.
- **Filtering**: Global filters for date range, store, and staff member.
- **Export**: CSV and PDF generation.
- **UI Components**: Individual report components with responsive tables, summary cards, and charts.
- **Dashboard Metrics**: Revenue tracking, sales trends, inventory status, and customer analytics.
- **Chart Library**: Recharts for all data visualizations.

## Print & Receipt System
Customizable receipt templates, generated using browser print API (`window.print()`) with in-app previews. Supports thermal and standard printers.

## Inventory Workflows
Streamlined processes for Purchase Order to GRN flow, Stock Adjustment flow, and Transfer of Goods flow, including status tracking and audit trails.

## Error Handling
Build-time validation with TypeScript, ESLint, and Vite. Runtime error handling via `createAsyncResourceContext`, automatic toast notifications, and console logging.

### Phase 2 Error Handling Enhancement (October 2025)
- **ERR-002: Centralized Error Sanitization**: Middleware intercepts all errors and sanitizes SQLite errors before sending to client. No internal database details (table names, constraints) exposed. User-friendly messages provided while full technical errors logged server-side with Winston.

## Data Integrity & Constraints

### Phase 2 Data Integrity (October 2025)
- **DB-002: Dependency Checks for Cascading Deletes**: Foreign key constraints enforced at database level with `ON DELETE RESTRICT`. Application-level checks prevent deletion of suppliers with linked purchase orders/GRNs, customers with linked sales. Returns 409 error with dependency count.
- **DB-003: Inventory Document Deletion Protection**: Approved/completed inventory documents (GRNs, Stock Adjustments, Transfers) cannot be deleted (400 error). Only pending documents (that haven't affected inventory) can be deleted. Prevents accidental data corruption and maintains accurate stock levels.

# External Dependencies

## UI Component Libraries
- **@radix-ui/**: Headless UI primitives.
- **shadcn/ui**: Pre-built components.
- **lucide-react**: Icon library.
- **cmdk**: Command menu component.
- **recharts**: Charting library.
- **sonner**: Toast notifications.
- **input-otp**: OTP input component.
- **embla-carousel-react**: Carousel component.

## Form & Validation
- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Zod integration.
- **zod**: Schema validation.

## Data & State Management
- **@tanstack/react-query**: Async state management (minimal).
- **date-fns**: Date manipulation.

## Styling & UI Utilities
- **tailwindcss**: Utility-first CSS.
- **class-variance-authority**: Component variant management.
- **clsx** + **tailwind-merge**: CSS class utilities.

## Mobile & Native Features
- **@capacitor/core**, **@capacitor/cli**, **@capacitor/android**, **@capacitor/ios**: Cross-platform native runtime.
- **html5-qrcode**: Barcode/QR code scanning.

## Backend Dependencies
- **better-sqlite3**: SQLite database driver.
- **express**: Node.js web framework.
- **bcryptjs**: Password hashing.
- **jsonwebtoken**: JWT for authentication.
- **speakeasy**: MFA (TOTP) implementation.
- **helmet**: Security headers.
- **cors**: Cross-Origin Resource Sharing.
- **express-rate-limit**: Rate limiting middleware.
- **winston**: Structured logging.

## Build & Development Tools
- **vite**: Build tool and dev server.
- **@vitejs/plugin-react-swc**: Fast React compilation.
- **typescript-eslint**: TypeScript linting.
- **eslint-plugin-react-hooks**, **eslint-plugin-react-refresh**: React linting.
- **postcss** + **autoprefixer**: CSS processing.
- **jsPDF** + **jspdf-autotable**: PDF generation.