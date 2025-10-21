import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useReports, type CustomerReportData, type ReportFilters } from "@/context/ReportContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import { exportToPDF, formatDateForPDF } from "@/utils/exportToPDF";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface CustomerReportProps {
  filters: ReportFilters;
}

export const CustomerReport = ({ filters }: CustomerReportProps) => {
  const { getCustomerReport, isLoading } = useReports();
  const { currentCurrency } = useCurrency();
  const [reportData, setReportData] = useState<CustomerReportData | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const data = await getCustomerReport(filters);
      if (data) {
        setReportData(data);
      }
    };
    loadReport();
  }, [filters, getCustomerReport]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.customers) return;

    const csvData = formatDataForCSV(reportData.customers, {
      name: 'Customer Name',
      email: 'Email',
      phone: 'Phone',
      totalPurchases: 'Total Purchases',
      totalSpent: 'Total Spent',
      averagePurchase: 'Average Purchase',
      loyaltyPoints: 'Loyalty Points',
      lastPurchaseDate: 'Last Purchase'
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `customer-report-${timestamp}`);
  };

  const handleExportPDF = () => {
    if (!reportData || !reportData.customers) return;

    const headers = ['Customer', 'Email', 'Purchases', 'Total Spent', 'Avg Purchase', 'Loyalty Points'];
    const data = reportData.customers
      .filter(c => c.totalPurchases > 0)
      .map(customer => [
        customer.name,
        customer.email,
        customer.totalPurchases.toString(),
        formatCurrency(customer.totalSpent, currentCurrency),
        formatCurrency(customer.averagePurchase, currentCurrency),
        customer.loyaltyPoints.toString()
      ]);

    const summary = reportData.summary ? [
      { label: 'Total Customers', value: reportData.summary.totalCustomers.toString() },
      { label: 'Active Customers', value: reportData.summary.activeCustomers.toString() },
      { label: 'Total Revenue', value: formatCurrency(parseFloat(reportData.summary.totalRevenue), currentCurrency) },
      { label: 'Avg Customer Value', value: formatCurrency(parseFloat(reportData.summary.averageCustomerValue), currentCurrency) }
    ] : [];

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToPDF({
      title: 'Customer Report',
      subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
      headers,
      data,
      filename: `customer-report-${timestamp}`,
      summary
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading customer report...</div>;
  }

  if (!reportData) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalCustomers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Customers</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.activeCustomers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.totalRevenue), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Customer Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.averageCustomerValue), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {reportData.topSpenders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Customers</CardTitle>
            <CardDescription>Highest spending customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.topSpenders.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell className="text-right">{customer.totalPurchases}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(customer.totalSpent, currentCurrency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Customers</CardTitle>
              <CardDescription>Complete customer purchase history</CardDescription>
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Avg Purchase</TableHead>
                  <TableHead className="text-right">Loyalty Points</TableHead>
                  <TableHead>Last Purchase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone || 'N/A'}</TableCell>
                    <TableCell className="text-right">{customer.totalPurchases}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.totalSpent, currentCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.averagePurchase, currentCurrency)}</TableCell>
                    <TableCell className="text-right">{customer.loyaltyPoints}</TableCell>
                    <TableCell>{customer.lastPurchaseDate ? formatDateForPDF(customer.lastPurchaseDate) : 'N/A'}</TableCell>
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
