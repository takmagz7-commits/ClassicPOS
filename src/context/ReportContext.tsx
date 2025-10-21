import { createContext, useContext, ReactNode, useState, useCallback } from "react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  storeId?: string;
  userId?: string;
  limit?: number;
}

export interface SalesReportData {
  sales: any[];
  summary: {
    totalTransactions: number;
    totalRevenue: number;
    totalSubtotal: number;
    totalTax: number;
    totalDiscounts: number;
    averageTransaction: number;
    totalCOGS: number;
    grossProfit: number;
    profitMargin: string;
  };
}

export interface InventoryReportData {
  inventory: any[];
  summary: {
    totalItems: number;
    totalProducts: number;
    totalCostValue: string;
    totalRetailValue: string;
    totalWholesaleValue: string;
    totalPotentialProfit: string;
  };
}

export interface CustomerReportData {
  customers: any[];
  topSpenders: any[];
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    totalRevenue: string;
    totalLoyaltyPoints: number;
    averageCustomerValue: string;
  };
}

export interface SupplierReportData {
  suppliers: any[];
  summary: {
    totalSuppliers: number;
    activeSuppliers: number;
    totalPurchaseValue: string;
    totalOrders: number;
    averageOrderValue: string;
  };
}

export interface TaxReportData {
  taxData: any[];
  taxByRate: any[];
  taxByStore: any[];
  summary: {
    totalTaxCollected: string;
    totalTransactions: number;
    averageTaxPerTransaction: string;
  };
}

export interface DebtorReportData {
  debtors: any[];
  summary: {
    totalDebtors: number;
    totalOutstanding: string;
    totalTransactions: number;
    averageDebtPerCustomer: string;
  };
}

export interface ProductReportData {
  topSelling: any[];
  topRevenue: any[];
  topProfit: any[];
  bottomSelling: any[];
  allProducts: any[];
  summary: {
    totalProducts: number;
    totalRevenue: string;
    totalProfit: string;
    totalQuantitySold: number;
    averageRevenuePerProduct: string;
  };
}

export interface StaffReportData {
  staff: any[];
  topPerformers: any[];
  summary: {
    totalStaff: number;
    activeStaff: number;
    totalRevenue: string;
    totalSales: number;
    averageRevenuePerStaff: string;
    averageSalesPerStaff: number;
  };
}

interface ReportContextType {
  isLoading: boolean;
  error: string | null;
  getSalesReport: (filters?: ReportFilters) => Promise<SalesReportData | null>;
  getInventoryReport: (filters?: ReportFilters) => Promise<InventoryReportData | null>;
  getCustomerReport: (filters?: ReportFilters) => Promise<CustomerReportData | null>;
  getSupplierReport: (filters?: ReportFilters) => Promise<SupplierReportData | null>;
  getTaxReport: (filters?: ReportFilters) => Promise<TaxReportData | null>;
  getDebtorReport: (filters?: ReportFilters) => Promise<DebtorReportData | null>;
  getProductReport: (filters?: ReportFilters) => Promise<ProductReportData | null>;
  getStaffReport: (filters?: ReportFilters) => Promise<StaffReportData | null>;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = (filters?: ReportFilters): string => {
    if (!filters) return '';
    
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  const fetchReport = useCallback(async <T,>(endpoint: string, filters?: ReportFilters): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`${API_BASE_URL}/reports/${endpoint}${queryString}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint} report`);
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch report';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSalesReport = useCallback(
    (filters?: ReportFilters) => fetchReport<SalesReportData>('sales', filters),
    [fetchReport]
  );

  const getInventoryReport = useCallback(
    (filters?: ReportFilters) => fetchReport<InventoryReportData>('inventory', filters),
    [fetchReport]
  );

  const getCustomerReport = useCallback(
    (filters?: ReportFilters) => fetchReport<CustomerReportData>('customers', filters),
    [fetchReport]
  );

  const getSupplierReport = useCallback(
    (filters?: ReportFilters) => fetchReport<SupplierReportData>('suppliers', filters),
    [fetchReport]
  );

  const getTaxReport = useCallback(
    (filters?: ReportFilters) => fetchReport<TaxReportData>('tax', filters),
    [fetchReport]
  );

  const getDebtorReport = useCallback(
    (filters?: ReportFilters) => fetchReport<DebtorReportData>('debtors', filters),
    [fetchReport]
  );

  const getProductReport = useCallback(
    (filters?: ReportFilters) => fetchReport<ProductReportData>('products', filters),
    [fetchReport]
  );

  const getStaffReport = useCallback(
    (filters?: ReportFilters) => fetchReport<StaffReportData>('staff', filters),
    [fetchReport]
  );

  const value: ReportContextType = {
    isLoading,
    error,
    getSalesReport,
    getInventoryReport,
    getCustomerReport,
    getSupplierReport,
    getTaxReport,
    getDebtorReport,
    getProductReport,
    getStaffReport,
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
};

export const useReports = () => {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error("useReports must be used within a ReportProvider");
  }
  return context;
};
