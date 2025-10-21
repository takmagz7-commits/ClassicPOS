import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useReports, type SupplierReportData, type ReportFilters } from "@/context/ReportContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import { exportToPDF } from "@/utils/exportToPDF";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface SupplierReportProps {
  filters: ReportFilters;
}

export const SupplierReport = ({ filters }: SupplierReportProps) => {
  const { getSupplierReport, isLoading } = useReports();
  const { currentCurrency } = useCurrency();
  const [reportData, setReportData] = useState<SupplierReportData | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const data = await getSupplierReport(filters);
      if (data) {
        setReportData(data);
      }
    };
    loadReport();
  }, [filters, getSupplierReport]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.suppliers) return;

    const csvData = formatDataForCSV(reportData.suppliers, {
      name: 'Supplier',
      contactPerson: 'Contact Person',
      email: 'Email',
      phone: 'Phone',
      totalOrders: 'Total Orders',
      completedOrders: 'Completed Orders',
      pendingOrders: 'Pending Orders',
      totalValue: 'Total Value',
      performance: 'Performance %'
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `supplier-report-${timestamp}`);
  };

  const handleExportPDF = () => {
    if (!reportData || !reportData.suppliers) return;

    const headers = ['Supplier', 'Contact', 'Orders', 'Completed', 'Total Value', 'Performance'];
    const data = reportData.suppliers.map(supplier => [
      supplier.name,
      supplier.contactPerson || 'N/A',
      supplier.totalOrders.toString(),
      supplier.completedOrders.toString(),
      formatCurrency(supplier.totalValue, currentCurrency),
      `${supplier.performance}%`
    ]);

    const summary = reportData.summary ? [
      { label: 'Total Suppliers', value: reportData.summary.totalSuppliers.toString() },
      { label: 'Active Suppliers', value: reportData.summary.activeSuppliers.toString() },
      { label: 'Total Purchase Value', value: formatCurrency(parseFloat(reportData.summary.totalPurchaseValue), currentCurrency) }
    ] : [];

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToPDF({
      title: 'Supplier Performance Report',
      subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
      headers,
      data,
      filename: `supplier-report-${timestamp}`,
      summary
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading supplier report...</div>;
  }

  if (!reportData) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Suppliers</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalSuppliers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Suppliers</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.activeSuppliers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Purchase Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.totalPurchaseValue), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalOrders}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Supplier Performance</CardTitle>
              <CardDescription>Purchase orders and GRN tracking</CardDescription>
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Total GRNs</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
                    <TableCell>{supplier.email || 'N/A'}</TableCell>
                    <TableCell className="text-right">{supplier.totalOrders}</TableCell>
                    <TableCell className="text-right">{supplier.completedOrders}</TableCell>
                    <TableCell className="text-right">{supplier.pendingOrders}</TableCell>
                    <TableCell className="text-right">{supplier.totalGRNs}</TableCell>
                    <TableCell className="text-right">{formatCurrency(supplier.totalValue, currentCurrency)}</TableCell>
                    <TableCell className="text-right font-semibold">{supplier.performance}%</TableCell>
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
