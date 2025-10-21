# ClassicPOS Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-18

### Added - Production Readiness Features

#### Database & Backup
- **Automated Database Backup System**
  - Nightly backups using SQLite's VACUUM INTO for safe, consistent backups
  - Configurable backup schedule (default: daily at 2:00 AM)
  - Automatic rotation with retention of last 14 backups
  - Manual backup API endpoint for admin users: `POST /api/backups/manual`
  - Backup listing endpoint: `GET /api/backups/list`
  - Database restore functionality: `POST /api/backups/restore/:filename`
  - Environment variables: `BACKUP_ENABLED`, `BACKUP_SCHEDULE`, `BACKUP_RETENTION_DAYS`
  - Backups stored in `/backups/` directory (gitignored)

#### API Documentation
- **Swagger/OpenAPI Documentation**
  - Interactive API documentation available at `/api-docs`
  - OpenAPI 3.0 specification with comprehensive schema definitions
  - JSDoc annotations for key API endpoints (Products, Auth)
  - JSON spec available at `/api-docs/spec`
  - Security scheme documentation (cookie-based JWT auth)
  - Schema definitions for Product, Sale, Customer, PurchaseOrder models

#### Environment & Configuration
- **Enhanced Environment Validation**
  - Automatic `.env` file generation from `.env.example` if missing
  - Secure JWT_SECRET auto-generation using crypto.randomBytes(64)
  - Validation of required environment variables on startup
  - Default values for optional configuration
  - Comprehensive logging of environment setup

### Enhanced

#### Security & Validation
- **Backend Inventory Validation**
  - Purchase orders cannot be modified after completion/cancellation
  - GRNs cannot be modified after approval
  - Stock adjustments cannot be modified after approval
  - Transfer of goods cannot be modified after completion/in-transit
  - Comprehensive logging of unauthorized modification attempts

#### Logging System
- **Environment-Based Logging Levels**
  - Development mode: DEBUG level (all logs visible)
  - Production mode: WARN level (only warnings and errors)
  - Configurable via `VITE_LOG_LEVEL` environment variable
  - Winston logger on backend with daily file rotation
  - Frontend logger with conditional output based on environment

#### Code Quality
- **Console.log Cleanup**
  - Removed inappropriate console.log statements throughout codebase
  - Standardized logging using winston (backend) and logger utility (frontend)
  - Consistent error handling and reporting

### Fixed

#### Critical Issues
- Database backup corruption risk eliminated by using VACUUM INTO instead of file copy
- Swagger API paths corrected to match actual endpoints (/api/products vs /products)
- JWT_SECRET placeholder warning in production environments
- TypeScript compilation warnings resolved

#### Configuration
- .gitignore updated to exclude backup files but preserve directory structure
- CORS configuration supports multiple origins for development
- Proper environment variable handling with fallback defaults

### Security

#### Authentication & Authorization
- Secure JWT secret generation (128 characters hex)
- MFA implementation with server-side TOTP verification
- Rate limiting on authentication endpoints (20 attempts per 15 minutes)
- HTTP-only cookies with SameSite policy
- bcrypt password hashing with 10 salt rounds

#### Data Protection
- SQL injection prevention through parameterized queries
- XSS protection via React's built-in safeguards
- CSRF protection through SameSite cookie policy
- Helmet.js security headers in production

### Documentation

- Comprehensive API documentation via Swagger UI
- Updated environment variable documentation
- Backup system usage guide
- Security best practices documentation

## [0.9.5] - Prior to October 18, 2025

### Existing Features

#### Core POS Functionality
- Complete sales processing with multi-payment methods
- Barcode scanning support
- Receipt printing and email delivery
- Customer loyalty program
- Gift card management
- Sale hold/resume functionality
- Refund processing

#### Inventory Management
- Purchase order workflow
- Goods received notes (GRN)
- Stock adjustments
- Transfer of goods between stores
- Multi-store inventory tracking
- Comprehensive inventory history

#### Customer Relationship Management
- Customer database with purchase history
- Loyalty points tracking
- Credit account management
- VAT/TIN number tracking
- Customer analytics

#### Accounting Module
- Double-entry bookkeeping
- Chart of accounts management
- Journal entries
- General ledger
- Trial balance
- Income statement (P&L)
- Balance sheet
- Cash flow statement
- Accounts receivable aging
- Accounts payable aging

#### Reporting
- Sales reports with trends and analytics
- Inventory reports with valuation
- Customer analytics reports
- Supplier performance reports
- Tax reports
- Debtor/creditor reports
- Product performance analysis
- Staff performance tracking

#### Human Resources
- Employee management
- Time and attendance tracking
- Payroll processing
- Department organization
- Role-based access control (RBAC)

#### Settings & Configuration
- Multi-store management
- Tax rate configuration
- Payment method setup
- Category management
- Receipt customization
- Printer settings

---

## Version History

- **1.0.0** (2025-10-18): Production-ready release with backup system, API docs, enhanced security
- **0.9.5**: Feature-complete beta with all major modules functional
- **0.9.0**: Initial beta with core POS, inventory, and accounting features

---

## Upgrade Notes

### Upgrading to 1.0.0

1. **Environment Variables**: Review and update your `.env` file with new backup-related variables
2. **Backups**: The backup system will automatically start on server launch
3. **API Documentation**: Access Swagger docs at `http://your-domain:3001/api-docs`
4. **Security**: Ensure JWT_SECRET is properly set (auto-generated if missing)

### Database Migrations

No manual database migrations required. All schema updates are handled automatically on startup.

---

## Support & Contributing

For issues, feature requests, or contributions, please contact the development team.

## License

Copyright © 2025 ClassicPOS. All rights reserved.
