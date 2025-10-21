const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ClassicPOS API',
      version: '1.0.0',
      description: 'Comprehensive Point of Sale System REST API',
      contact: {
        name: 'ClassicPOS Support',
        email: 'support@classicpos.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server'
      },
      {
        url: 'https://your-production-domain.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT token stored in HTTP-only cookie'
        }
      },
      schemas: {
        Product: {
          type: 'object',
          required: ['name', 'sku', 'price'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            sku: { type: 'string' },
            price: { type: 'number', format: 'double' },
            cost: { type: 'number', format: 'double' },
            stock: { type: 'integer' },
            categoryId: { type: 'string', format: 'uuid' },
            supplierId: { type: 'string', format: 'uuid' },
            description: { type: 'string' },
            barcode: { type: 'string' },
            taxRateId: { type: 'string', format: 'uuid' },
            image: { type: 'string' },
            isActive: { type: 'boolean' }
          }
        },
        Sale: {
          type: 'object',
          required: ['items', 'storeId'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            receiptNumber: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            customerId: { type: 'string', format: 'uuid' },
            items: { type: 'array', items: { type: 'object' } },
            subtotal: { type: 'number', format: 'double' },
            tax: { type: 'number', format: 'double' },
            discount: { type: 'number', format: 'double' },
            total: { type: 'number', format: 'double' },
            paymentMethod: { type: 'string' },
            status: { type: 'string', enum: ['completed', 'pending', 'cancelled', 'refunded'] },
            storeId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' }
          }
        },
        Customer: {
          type: 'object',
          required: ['name'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            loyaltyPoints: { type: 'integer' },
            totalSpent: { type: 'number', format: 'double' },
            vatNumber: { type: 'string' },
            creditLimit: { type: 'number', format: 'double' }
          }
        },
        PurchaseOrder: {
          type: 'object',
          required: ['supplierId', 'items'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            poNumber: { type: 'string' },
            supplierId: { type: 'string', format: 'uuid' },
            orderDate: { type: 'string', format: 'date-time' },
            expectedDeliveryDate: { type: 'string', format: 'date' },
            items: { type: 'array', items: { type: 'object' } },
            subtotal: { type: 'number', format: 'double' },
            tax: { type: 'number', format: 'double' },
            total: { type: 'number', format: 'double' },
            status: { type: 'string', enum: ['pending', 'approved', 'completed', 'cancelled'] },
            notes: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        cookieAuth: []
      }
    ]
  },
  apis: ['./backend/routes/*.cjs']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
