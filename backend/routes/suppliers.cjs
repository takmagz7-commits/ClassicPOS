const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { supplierToDb, dbToSupplier } = require('../db/helpers.cjs');

router.get('/', (req, res) => {
  try {
    const dbSuppliers = getAll('suppliers');
    const suppliers = dbSuppliers.map(dbToSupplier);
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbSupplier = getById('suppliers', req.params.id);
    if (!dbSupplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(dbToSupplier(dbSupplier));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const dbSupplier = supplierToDb(req.body);
    insert('suppliers', dbSupplier);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const dbSupplier = supplierToDb(req.body);
    update('suppliers', req.params.id, dbSupplier);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { count } = require('../db/dbService.cjs');
    const { logger } = require('../utils/logger.cjs');
    
    const supplierId = req.params.id;
    
    // Check for related purchase orders
    const poCount = count('purchase_orders', 'supplier_id = ?', [supplierId]);
    if (poCount > 0) {
      logger.warn(`Cannot delete supplier ${supplierId}: ${poCount} purchase orders depend on this supplier`);
      return res.status(409).json({ 
        error: 'Cannot delete supplier',
        message: `Cannot delete supplier. ${poCount} purchase orders depend on this supplier.`
      });
    }
    
    // Check for related GRNs
    const grnCount = count('grns', 'supplier_id = ?', [supplierId]);
    if (grnCount > 0) {
      logger.warn(`Cannot delete supplier ${supplierId}: ${grnCount} GRNs depend on this supplier`);
      return res.status(409).json({ 
        error: 'Cannot delete supplier',
        message: `Cannot delete supplier. ${grnCount} goods received notes depend on this supplier.`
      });
    }
    
    remove('suppliers', req.params.id);
    logger.info(`Supplier ${supplierId} deleted successfully`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting supplier:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
