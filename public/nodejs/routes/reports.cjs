const express = require('express');
const router = express.Router();
const { query } = require('../db/dbService.cjs');

router.get('/sales', (req, res) => {
  try {
    const { startDate, endDate, storeId, userId } = req.query;
    let whereClauses = ["type = 'sale'"];
    const params = [];

    if (startDate && endDate) {
      whereClauses.push('date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }
    if (storeId) {
      whereClauses.push('store_id = ?');
      params.push(storeId);
    }
    if (userId) {
      whereClauses.push('employee_id = ?');
      params.push(userId);
    }

    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const salesData = query(
      `SELECT 
        s.id,
        s.date,
        s.customer_name,
        s.subtotal,
        s.discount_amount,
        s.tax,
        s.total,
        s.payment_method_id,
        s.employee_name,
        s.store_name,
        s.items
      FROM sales s
      ${whereClause}
      ORDER BY s.date DESC`,
      params
    );

    const summary = query(
      `SELECT 
        COUNT(*) as totalTransactions,
        SUM(total) as totalRevenue,
        SUM(subtotal) as totalSubtotal,
        SUM(tax) as totalTax,
        SUM(discount_amount) as totalDiscounts,
        AVG(total) as averageTransaction
      FROM sales s
      ${whereClause}`,
      params
    )[0];

    const costData = query(
      `SELECT items FROM sales s ${whereClause}`,
      params
    );

    let totalCOGS = 0;
    costData.forEach(sale => {
      const items = JSON.parse(sale.items);
      items.forEach(item => {
        totalCOGS += (item.cost || 0) * item.quantity;
      });
    });

    const grossProfit = (summary.totalRevenue || 0) - totalCOGS;
    const profitMargin = summary.totalRevenue > 0 ? (grossProfit / summary.totalRevenue) * 100 : 0;

    res.json({
      sales: salesData,
      summary: {
        ...summary,
        totalCOGS,
        grossProfit,
        profitMargin: profitMargin.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/inventory', (req, res) => {
  try {
    const { storeId } = req.query;

    const inventoryData = query(
      `SELECT 
        p.id,
        p.name,
        p.sku,
        c.name as category_name,
        p.stock,
        p.stock_by_store,
        p.cost,
        p.price,
        p.wholesale_price,
        p.track_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.track_stock = 1
      ORDER BY p.name ASC`
    );

    const valuationData = inventoryData.map(product => {
      let currentStock = product.stock;
      
      if (storeId && product.stock_by_store) {
        const stockByStore = JSON.parse(product.stock_by_store);
        currentStock = stockByStore[storeId] || 0;
      }

      const costValue = currentStock * product.cost;
      const retailValue = currentStock * product.price;
      const wholesaleValue = currentStock * product.wholesale_price;
      const potentialProfit = retailValue - costValue;

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        categoryName: product.category_name,
        currentStock,
        cost: product.cost,
        retailPrice: product.price,
        wholesalePrice: product.wholesale_price,
        costValue: costValue.toFixed(2),
        retailValue: retailValue.toFixed(2),
        wholesaleValue: wholesaleValue.toFixed(2),
        potentialProfit: potentialProfit.toFixed(2)
      };
    });

    const totalCostValue = valuationData.reduce((sum, item) => sum + parseFloat(item.costValue), 0);
    const totalRetailValue = valuationData.reduce((sum, item) => sum + parseFloat(item.retailValue), 0);
    const totalWholesaleValue = valuationData.reduce((sum, item) => sum + parseFloat(item.wholesaleValue), 0);
    const totalPotentialProfit = valuationData.reduce((sum, item) => sum + parseFloat(item.potentialProfit), 0);
    const totalItems = valuationData.reduce((sum, item) => sum + item.currentStock, 0);

    res.json({
      inventory: valuationData,
      summary: {
        totalItems,
        totalProducts: valuationData.length,
        totalCostValue: totalCostValue.toFixed(2),
        totalRetailValue: totalRetailValue.toFixed(2),
        totalWholesaleValue: totalWholesaleValue.toFixed(2),
        totalPotentialProfit: totalPotentialProfit.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/customers', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const customers = query('SELECT * FROM customers ORDER BY name ASC');

    const customerData = customers.map(customer => {
      let whereClauses = ["customer_id = ?", "type = 'sale'"];
      const params = [customer.id];

      if (startDate && endDate) {
        whereClauses.push('date BETWEEN ? AND ?');
        params.push(startDate, endDate);
      }

      const salesSummary = query(
        `SELECT 
          COUNT(*) as totalPurchases,
          SUM(total) as totalSpent,
          SUM(loyalty_points_used) as loyaltyPointsUsed,
          AVG(total) as averagePurchase,
          MAX(date) as lastPurchaseDate
        FROM sales
        WHERE ${whereClauses.join(' AND ')}`,
        params
      )[0];

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        loyaltyPoints: customer.loyalty_points,
        totalPurchases: salesSummary.totalPurchases || 0,
        totalSpent: salesSummary.totalSpent || 0,
        loyaltyPointsUsed: salesSummary.loyaltyPointsUsed || 0,
        averagePurchase: salesSummary.averagePurchase || 0,
        lastPurchaseDate: salesSummary.lastPurchaseDate
      };
    });

    const topSpenders = customerData
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const totalCustomers = customers.length;
    const activeCustomers = customerData.filter(c => c.totalPurchases > 0).length;
    const totalRevenue = customerData.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalLoyaltyPoints = customerData.reduce((sum, c) => sum + c.loyaltyPoints, 0);

    res.json({
      customers: customerData,
      topSpenders,
      summary: {
        totalCustomers,
        activeCustomers,
        totalRevenue: totalRevenue.toFixed(2),
        totalLoyaltyPoints,
        averageCustomerValue: activeCustomers > 0 ? (totalRevenue / activeCustomers).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/suppliers', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const suppliers = query('SELECT * FROM suppliers ORDER BY name ASC');

    const supplierData = suppliers.map(supplier => {
      let whereClauses = ["supplier_id = ?"];
      const params = [supplier.id];

      if (startDate && endDate) {
        whereClauses.push('order_date BETWEEN ? AND ?');
        params.push(startDate, endDate);
      }

      const poSummary = query(
        `SELECT 
          COUNT(*) as totalOrders,
          SUM(total_value) as totalValue,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedOrders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingOrders
        FROM purchase_orders
        WHERE ${whereClauses.join(' AND ')}`,
        params
      )[0];

      const grnSummary = query(
        `SELECT 
          COUNT(*) as totalGRNs,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedGRNs
        FROM grns
        WHERE ${whereClauses.join(' AND ').replace('order_date', 'received_date')}`,
        params
      )[0];

      return {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contact_person,
        email: supplier.email,
        phone: supplier.phone,
        totalOrders: poSummary.totalOrders || 0,
        totalValue: poSummary.totalValue || 0,
        completedOrders: poSummary.completedOrders || 0,
        pendingOrders: poSummary.pendingOrders || 0,
        totalGRNs: grnSummary.totalGRNs || 0,
        approvedGRNs: grnSummary.approvedGRNs || 0,
        performance: poSummary.totalOrders > 0 
          ? ((poSummary.completedOrders / poSummary.totalOrders) * 100).toFixed(2)
          : 0
      };
    });

    const totalSuppliers = suppliers.length;
    const activeSuppliers = supplierData.filter(s => s.totalOrders > 0).length;
    const totalPurchaseValue = supplierData.reduce((sum, s) => sum + s.totalValue, 0);
    const totalOrders = supplierData.reduce((sum, s) => sum + s.totalOrders, 0);

    res.json({
      suppliers: supplierData,
      summary: {
        totalSuppliers,
        activeSuppliers,
        totalPurchaseValue: totalPurchaseValue.toFixed(2),
        totalOrders,
        averageOrderValue: totalOrders > 0 ? (totalPurchaseValue / totalOrders).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tax', (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    let whereClauses = ["type = 'sale'"];
    const params = [];

    if (startDate && endDate) {
      whereClauses.push('date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }
    if (storeId) {
      whereClauses.push('store_id = ?');
      params.push(storeId);
    }

    const whereClause = 'WHERE ' + whereClauses.join(' AND ');

    const taxData = query(
      `SELECT 
        date,
        tax,
        tax_rate_applied,
        total,
        subtotal,
        store_name
      FROM sales
      ${whereClause}
      ORDER BY date DESC`,
      params
    );

    const taxByRate = {};
    const taxByStore = {};
    let totalTaxCollected = 0;

    taxData.forEach(sale => {
      const taxRate = sale.tax_rate_applied || 0;
      const storeName = sale.store_name || 'Unknown';
      
      if (!taxByRate[taxRate]) {
        taxByRate[taxRate] = {
          rate: taxRate,
          taxAmount: 0,
          salesCount: 0,
          totalSales: 0
        };
      }
      
      if (!taxByStore[storeName]) {
        taxByStore[storeName] = {
          store: storeName,
          taxAmount: 0,
          salesCount: 0
        };
      }

      taxByRate[taxRate].taxAmount += sale.tax;
      taxByRate[taxRate].salesCount += 1;
      taxByRate[taxRate].totalSales += sale.total;

      taxByStore[storeName].taxAmount += sale.tax;
      taxByStore[storeName].salesCount += 1;

      totalTaxCollected += sale.tax;
    });

    res.json({
      taxData,
      taxByRate: Object.values(taxByRate),
      taxByStore: Object.values(taxByStore),
      summary: {
        totalTaxCollected: totalTaxCollected.toFixed(2),
        totalTransactions: taxData.length,
        averageTaxPerTransaction: taxData.length > 0 ? (totalTaxCollected / taxData.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/debtors', (req, res) => {
  try {
    const { storeId } = req.query;
    let whereClauses = ["status = 'pending'"];
    const params = [];

    if (storeId) {
      whereClauses.push('store_id = ?');
      params.push(storeId);
    }

    const whereClause = 'WHERE ' + whereClauses.join(' AND ');

    const pendingSales = query(
      `SELECT 
        s.id,
        s.date,
        s.customer_id,
        s.customer_name,
        s.total,
        s.store_name,
        s.employee_name
      FROM sales s
      ${whereClause}
      ORDER BY s.date ASC`,
      params
    );

    const debtorSummary = {};
    let totalOutstanding = 0;

    pendingSales.forEach(sale => {
      const customerId = sale.customer_id || 'walk-in';
      const customerName = sale.customer_name || 'Walk-in Customer';

      if (!debtorSummary[customerId]) {
        debtorSummary[customerId] = {
          customerId,
          customerName,
          outstandingAmount: 0,
          oldestDebtDate: sale.date,
          transactionCount: 0,
          transactions: []
        };
      }

      debtorSummary[customerId].outstandingAmount += sale.total;
      debtorSummary[customerId].transactionCount += 1;
      debtorSummary[customerId].transactions.push({
        id: sale.id,
        date: sale.date,
        amount: sale.total,
        store: sale.store_name
      });

      totalOutstanding += sale.total;
    });

    const debtors = Object.values(debtorSummary)
      .sort((a, b) => b.outstandingAmount - a.outstandingAmount);

    res.json({
      debtors,
      summary: {
        totalDebtors: debtors.length,
        totalOutstanding: totalOutstanding.toFixed(2),
        totalTransactions: pendingSales.length,
        averageDebtPerCustomer: debtors.length > 0 ? (totalOutstanding / debtors.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products', (req, res) => {
  try {
    const { startDate, endDate, storeId, limit = 50 } = req.query;
    let whereClauses = ["type = 'sale'"];
    const params = [];

    if (startDate && endDate) {
      whereClauses.push('date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }
    if (storeId) {
      whereClauses.push('store_id = ?');
      params.push(storeId);
    }

    const whereClause = 'WHERE ' + whereClauses.join(' AND ');

    const salesData = query(
      `SELECT items FROM sales ${whereClause}`,
      params
    );

    const productPerformance = {};

    salesData.forEach(sale => {
      const items = JSON.parse(sale.items);
      items.forEach(item => {
        if (!productPerformance[item.productId]) {
          productPerformance[item.productId] = {
            productId: item.productId,
            productName: item.name,
            quantitySold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            transactionCount: 0
          };
        }

        const itemRevenue = item.price * item.quantity;
        const itemCost = (item.cost || 0) * item.quantity;
        const itemProfit = itemRevenue - itemCost;

        productPerformance[item.productId].quantitySold += item.quantity;
        productPerformance[item.productId].revenue += itemRevenue;
        productPerformance[item.productId].cost += itemCost;
        productPerformance[item.productId].profit += itemProfit;
        productPerformance[item.productId].transactionCount += 1;
      });
    });

    const performanceArray = Object.values(productPerformance);

    const topSelling = [...performanceArray]
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, parseInt(limit));

    const topRevenue = [...performanceArray]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, parseInt(limit));

    const topProfit = [...performanceArray]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, parseInt(limit));

    const bottomSelling = [...performanceArray]
      .sort((a, b) => a.quantitySold - b.quantitySold)
      .slice(0, parseInt(limit));

    const totalRevenue = performanceArray.reduce((sum, p) => sum + p.revenue, 0);
    const totalProfit = performanceArray.reduce((sum, p) => sum + p.profit, 0);
    const totalQuantity = performanceArray.reduce((sum, p) => sum + p.quantitySold, 0);

    res.json({
      topSelling,
      topRevenue,
      topProfit,
      bottomSelling,
      allProducts: performanceArray,
      summary: {
        totalProducts: performanceArray.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        totalQuantitySold: totalQuantity,
        averageRevenuePerProduct: performanceArray.length > 0 
          ? (totalRevenue / performanceArray.length).toFixed(2) 
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/staff', (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    
    const users = query('SELECT id, email, role FROM users');

    const staffData = users.map(user => {
      let whereClauses = ["employee_id = ?", "type = 'sale'"];
      const params = [user.id];

      if (startDate && endDate) {
        whereClauses.push('date BETWEEN ? AND ?');
        params.push(startDate, endDate);
      }
      if (storeId) {
        whereClauses.push('store_id = ?');
        params.push(storeId);
      }

      const salesSummary = query(
        `SELECT 
          COUNT(*) as totalSales,
          SUM(total) as totalRevenue,
          AVG(total) as averageSale,
          MAX(date) as lastSaleDate
        FROM sales
        WHERE ${whereClauses.join(' AND ')}`,
        params
      )[0];

      const refundSummary = query(
        `SELECT 
          COUNT(*) as totalRefunds,
          SUM(total) as totalRefundAmount
        FROM sales
        WHERE employee_id = ? AND type = 'refund'${startDate && endDate ? ' AND date BETWEEN ? AND ?' : ''}`,
        startDate && endDate ? [user.id, startDate, endDate] : [user.id]
      )[0];

      return {
        userId: user.id,
        userName: user.email,
        role: user.role,
        totalSales: salesSummary.totalSales || 0,
        totalRevenue: salesSummary.totalRevenue || 0,
        averageSale: salesSummary.averageSale || 0,
        lastSaleDate: salesSummary.lastSaleDate,
        totalRefunds: refundSummary.totalRefunds || 0,
        totalRefundAmount: refundSummary.totalRefundAmount || 0,
        netRevenue: (salesSummary.totalRevenue || 0) - (refundSummary.totalRefundAmount || 0)
      };
    });

    const topPerformers = staffData
      .filter(s => s.totalSales > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    const totalStaff = users.length;
    const activeStaff = staffData.filter(s => s.totalSales > 0).length;
    const totalRevenue = staffData.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalSales = staffData.reduce((sum, s) => sum + s.totalSales, 0);

    res.json({
      staff: staffData,
      topPerformers,
      summary: {
        totalStaff,
        activeStaff,
        totalRevenue: totalRevenue.toFixed(2),
        totalSales,
        averageRevenuePerStaff: activeStaff > 0 ? (totalRevenue / activeStaff).toFixed(2) : 0,
        averageSalesPerStaff: activeStaff > 0 ? Math.round(totalSales / activeStaff) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
