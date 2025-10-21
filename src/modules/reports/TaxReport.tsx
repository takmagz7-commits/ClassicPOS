import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useReports, type TaxReportData, type ReportFilters } from "@/context/ReportContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import { exportToPDF, formatDateForPDF } from "@/utils/exportToPDF";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface TaxReportProps {
  filters: ReportFilters;
}

export const TaxReport = ({ filters }: TaxReportProps) => {
  const { getTaxReport, isLoading } = useReports();
  const { currentCurrency } = useCurrency();
  const [reportData, setReportData] = useState<TaxReportData | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const data = await getTaxReport(filters);
      if (data) {
        setReportData(data);
      }
    };
    loadReport();
  }, [filters, getTaxReport]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.taxData) return;

    const csvData = formatDataForCSV(reportData.taxData, {
      date: 'Date',
      tax_rate_applied: 'Tax Rate',
      subtotal: 'Subtotal',
      tax: 'Tax Amount',
      total: 'Total',
      store_name: 'Store'
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `tax-report-${timestamp}`);
  };

  const handleExportPDF = () => {
    if (!reportData || !reportData.taxData) return;

    const headers = ['Date', 'Tax Rate', 'Subtotal', 'Tax Amount', 'Total', 'Store'];
    const data = reportData.taxData.slice(0, 100).map(item => [
      formatDateForPDF(item.date),
      `${item.tax_rate_applied || 0}%`,
      formatCurrency(item.subtotal, currentCurrency),
      formatCurrency(item.tax, currentCurrency),
      formatCurrency(item.total, currentCurrency),
      item.store_name || 'N/A'
    ]);

    const summary = reportData.summary ? [
      { label: 'Total Tax Collected', value: formatCurrency(parseFloat(reportData.summary.totalTaxCollected), currentCurrency) },
      { label: 'Total Transactions', value: reportData.summary.totalTransactions.toString() },
      { label: 'Avg Tax Per Transaction', value: formatCurrency(parseFloat(reportData.summary.averageTaxPerTransaction), currentCurrency) }
    ] : [];

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToPDF({
      title: 'Tax Collection Report',
      subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
      headers,
      data,
      filename: `tax-report-${timestamp}`,
      summary
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading tax report...</div>;
  }

  if (!reportData) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tax Collected</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.totalTaxCollected), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalTransactions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Tax Per Transaction</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.averageTaxPerTransaction), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tax by Rate</CardTitle>
            <CardDescription>Tax collected grouped by rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Rate</TableHead>
                    <TableHead className="text-right">Sales Count</TableHead>
                    <TableHead className="text-right">Tax Amount</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.taxByRate.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.rate}%</TableCell>
                      <TableCell className="text-right">{item.salesCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.taxAmount, currentCurrency)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalSales, currentCurrency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax by Store</CardTitle>
            <CardDescription>Tax collected grouped by store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right">Sales Count</TableHead>
                    <TableHead className="text-right">Tax Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.taxByStore.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.store}</TableCell>
                      <TableCell className="text-right">{item.salesCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.taxAmount, currentCurrency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tax Transactions</CardTitle>
              <CardDescription>Detailed tax collection by transaction</CardDescription>
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
                  <TableHead>Store</TableHead>
                  <TableHead className="text-right">Tax Rate</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax Amount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.taxData.slice(0, 100).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(new Date(item.date), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell>{item.store_name || 'N/A'}</TableCell>
                    <TableCell className="text-right">{item.tax_rate_applied || 0}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.subtotal, currentCurrency)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.tax, currentCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total, currentCurrency)}</TableCell>
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
