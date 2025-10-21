const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { getById } = require('../db/dbService.cjs');
const { dbToSale, dbToCustomer } = require('../db/helpers.cjs');
const { logger } = require('../utils/logger.cjs');

router.post('/send-receipt', async (req, res) => {
  try {
    const { saleId, customerEmail } = req.body;

    if (!saleId || !customerEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Sale ID and customer email are required' 
      });
    }

    const dbSale = getById('sales', saleId);
    if (!dbSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const sale = dbToSale(dbSale);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    });

    const receiptHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f3f4f6; padding: 20px; text-align: center; margin-bottom: 20px; }
            .receipt-details { margin: 20px 0; }
            .line-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .total { font-weight: bold; font-size: 1.2em; margin-top: 20px; padding-top: 20px; border-top: 2px solid #000; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Receipt</h1>
            <p>Sale ID: ${sale.id}</p>
            <p>Date: ${new Date(sale.date).toLocaleString()}</p>
          </div>
          
          <div class="receipt-details">
            <h3>Items:</h3>
            ${sale.items.map(item => `
              <div class="line-item">
                <span>${item.name} x${item.quantity}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            
            <div class="line-item">
              <span>Subtotal:</span>
              <span>$${sale.subtotal.toFixed(2)}</span>
            </div>
            
            <div class="line-item">
              <span>Tax:</span>
              <span>$${sale.tax.toFixed(2)}</span>
            </div>
            
            <div class="total">
              <div style="display: flex; justify-content: space-between;">
                <span>Total:</span>
                <span>$${sale.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <p style="text-align: center; color: #6b7280; margin-top: 40px;">
            Thank you for your business!
          </p>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: customerEmail,
      subject: `Receipt for your purchase - ${sale.id}`,
      html: receiptHtml
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Receipt email sent to ${customerEmail}: ${info.messageId}`);

    res.json({ 
      success: true, 
      message: 'Receipt sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    logger.error('Error sending receipt email:', error);
    res.status(500).json({ 
      error: 'Failed to send receipt',
      message: error.message 
    });
  }
});

module.exports = router;
