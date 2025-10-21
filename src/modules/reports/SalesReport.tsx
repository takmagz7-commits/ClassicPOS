import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useReports, type SalesReportData, type ReportFilters } from "@/context/ReportContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import { exportToPDF, formatDateForPDF } from "@/utils/exportToPDF";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface SalesReportProps {
  filters: ReportFilters;
}

export const SalesReport = ({ filters }: SalesReportProps) => {
  const { getSalesReport, isLoading } = useReports();
  const { currentCurrency } = useCurrency();
  const [reportData, setReportData] = useState<SalesReportData | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const data = await getSalesReport(filters);
      if (data) {
        setReportData(data);
      }
    };
    loadReport();
  }, [filters, getSalesReport]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.sales) return;

    const csvData = formatDataForCSV(reportData.sales, {
      id: 'Sale ID',
      date: 'Date',
      customer_name: 'Customer',
      subtotal: 'Subtotal',
      discount_amount: 'Discount',
      tax: 'Tax',
      total: 'Total',
      payment_method_id: 'Payment Method',
      employee_name: 'Employee',
      store_name: 'Store'
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `sales-report-${timestamp}`);
  };

  const handleExportPDF = () => {
    if (!reportData || !reportData.sales) return;

    const headers = ['Date', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Total', 'Employee', 'Store'];
    const data = reportData.sales.map(sale => [
      formatDateForPDF(sale.date),
      sale.customer_name || 'Walk-in',
      formatCurrency(sale.subtotal, currentCurrency),
      formatCurrency(sale.discount_amount || 0, currentCurrency),
      formatCurrency(sale.tax, currentCurrency),
      formatCurrency(sale.total, currentCurrency),
      sale.employee_name || 'N/A',
      sale.store_name || 'N/A'
    ]);

    const summary = reportData.summary ? [
      { label: 'Total Transactions', value: reportData.summary.totalTransactions.toString() },
      { label: 'Total Revenue', value: formatCurrency(reportData.summary.totalRevenue, currentCurrency) },
      { label: 'Total Tax', value: formatCurrency(reportData.summary.totalTax, currentCurrency) },
      { label: 'Gross Profit', value: formatCurrency(reportData.summary.grossProfit, currentCurrency) },
      { label: 'Profit Margin', value: `${reportData.summary.profitMargin}%` }
    ] : [];

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToPDF({
      title: 'Sales Report',
      subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
      headers,
      data,
      filename: `sales-report-${timestamp}`,
      summary
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading sales report...</div>;
  }

  if (!reportData) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(reportData.summary.totalRevenue, currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gross Profit</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(reportData.summary.grossProfit, currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>COGS</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(reportData.summary.totalCOGS, currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profit Margin</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.profitMargin}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transactions</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalTransactions}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Transactions</CardTitle>
              <CardDescription>Detailed list of all sales transactions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Store</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{format(new Date(sale.date), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                    <TableCell>{formatCurrency(sale.subtotal, currentCurrency)}</TableCell>
                    <TableCell>{formatCurrency(sale.discount_amount || 0, currentCurrency)}</TableCell>
                    <TableCell>{formatCurrency(sale.tax, currentCurrency)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(sale.total, currentCurrency)}</TableCell>
                    <TableCell>{sale.employee_name || 'N/A'}</TableCell>
                    <TableCell>{sale.store_name || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
