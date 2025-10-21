import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useReports, type DebtorReportData, type ReportFilters } from "@/context/ReportContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import { exportToPDF, formatDateForPDF } from "@/utils/exportToPDF";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface DebtorReportProps {
  filters: ReportFilters;
}

export const DebtorReport = ({ filters }: DebtorReportProps) => {
  const { getDebtorReport, isLoading } = useReports();
  const { currentCurrency } = useCurrency();
  const [reportData, setReportData] = useState<DebtorReportData | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const data = await getDebtorReport(filters);
      if (data) {
        setReportData(data);
      }
    };
    loadReport();
  }, [filters, getDebtorReport]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.debtors) return;

    const csvData = formatDataForCSV(reportData.debtors, {
      customerName: 'Customer',
      outstandingAmount: 'Outstanding Amount',
      transactionCount: 'Transactions',
      oldestDebtDate: 'Oldest Debt Date'
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `debtor-report-${timestamp}`);
  };

  const handleExportPDF = () => {
    if (!reportData || !reportData.debtors) return;

    const headers = ['Customer', 'Outstanding Amount', 'Transactions', 'Oldest Debt'];
    const data = reportData.debtors.map(debtor => [
      debtor.customerName,
      formatCurrency(debtor.outstandingAmount, currentCurrency),
      debtor.transactionCount.toString(),
      formatDateForPDF(debtor.oldestDebtDate)
    ]);

    const summary = reportData.summary ? [
      { label: 'Total Debtors', value: reportData.summary.totalDebtors.toString() },
      { label: 'Total Outstanding', value: formatCurrency(parseFloat(reportData.summary.totalOutstanding), currentCurrency) },
      { label: 'Total Transactions', value: reportData.summary.totalTransactions.toString() }
    ] : [];

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToPDF({
      title: 'Debtor Report',
      subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
      headers,
      data,
      filename: `debtor-report-${timestamp}`,
      summary
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading debtor report...</div>;
  }

  if (!reportData) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Debtors</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalDebtors}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Outstanding</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.totalOutstanding), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding Transactions</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalTransactions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Debt Per Customer</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.averageDebtPerCustomer), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Outstanding Debts</CardTitle>
              <CardDescription>Customers with pending payments</CardDescription>
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
                  <TableHead className="text-right">Outstanding Amount</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead>Oldest Debt Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.debtors.map((debtor) => (
                  <TableRow key={debtor.customerId}>
                    <TableCell className="font-medium">{debtor.customerName}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(debtor.outstandingAmount, currentCurrency)}</TableCell>
                    <TableCell className="text-right">{debtor.transactionCount}</TableCell>
                    <TableCell>{format(new Date(debtor.oldestDebtDate), 'MMM dd, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {reportData.debtors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No outstanding debts found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
