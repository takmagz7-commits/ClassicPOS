const { getById } = require('../db/dbService.cjs');
const { logger } = require('../utils/logger.cjs');

function validateGRNStatus(req, res, next) {
  if (req.method === 'PUT' || req.method === 'DELETE') {
    const grnId = req.params.id;
    const grn = getById('grns', grnId);
    
    if (!grn) {
      return res.status(404).json({
        error: 'GRN not found',
        message: 'The specified GRN does not exist'
      });
    }

    if (grn.status === 'approved') {
      logger.warn(`Attempt to modify approved GRN: ${grnId} by user ${req.user?.id}`);
      return res.status(400).json({
        error: 'Cannot modify approved GRN',
        message: 'Approved GRNs cannot be modified or deleted. This protects audit trail integrity.'
      });
    }
  }
  next();
}

function validatePurchaseOrderStatus(req, res, next) {
  if (req.method === 'PUT' || req.method === 'DELETE') {
    const poId = req.params.id;
    const po = getById('purchase_orders', poId);
    
    if (!po) {
      return res.status(404).json({
        error: 'Purchase order not found',
        message: 'The specified purchase order does not exist'
      });
    }

    if (po.status === 'completed' || po.status === 'cancelled') {
      logger.warn(`Attempt to modify ${po.status} PO: ${poId} by user ${req.user?.id}`);
      return res.status(400).json({
        error: `Cannot modify ${po.status} purchase order`,
        message: `${po.status.charAt(0).toUpperCase() + po.status.slice(1)} purchase orders cannot be modified or deleted.`
      });
    }
  }
  next();
}

function validateStockAdjustmentStatus(req, res, next) {
  if (req.method === 'PUT' || req.method === 'DELETE') {
    const saId = req.params.id;
    const sa = getById('stock_adjustments', saId);
    
    if (!sa) {
      return res.status(404).json({
        error: 'Stock adjustment not found',
        message: 'The specified stock adjustment does not exist'
      });
    }

    if (sa.status === 'approved') {
      logger.warn(`Attempt to modify approved stock adjustment: ${saId} by user ${req.user?.id}`);
      return res.status(400).json({
        error: 'Cannot modify approved stock adjustment',
        message: 'Approved stock adjustments cannot be modified or deleted. This protects audit trail integrity.'
      });
    }
  }
  next();
}

function validateTransferStatus(req, res, next) {
  if (req.method === 'PUT' || req.method === 'DELETE') {
    const transferId = req.params.id;
    const transfer = getById('transfers', transferId);
    
    if (!transfer) {
      return res.status(404).json({
        error: 'Transfer not found',
        message: 'The specified transfer does not exist'
      });
    }

    if (transfer.status === 'completed') {
      logger.warn(`Attempt to modify completed transfer: ${transferId} by user ${req.user?.id}`);
      return res.status(400).json({
        error: 'Cannot modify completed transfer',
        message: 'Completed transfers cannot be modified or deleted. This protects audit trail integrity.'
      });
    }
  }
  next();
}

module.exports = {
  validateGRNStatus,
  validatePurchaseOrderStatus,
  validateStockAdjustmentStatus,
  validateTransferStatus
};
