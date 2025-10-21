import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useReports, type StaffReportData, type ReportFilters } from "@/context/ReportContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import { exportToPDF, formatDateForPDF } from "@/utils/exportToPDF";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface StaffReportProps {
  filters: ReportFilters;
}

export const StaffReport = ({ filters }: StaffReportProps) => {
  const { getStaffReport, isLoading } = useReports();
  const { currentCurrency } = useCurrency();
  const [reportData, setReportData] = useState<StaffReportData | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const data = await getStaffReport(filters);
      if (data) {
        setReportData(data);
      }
    };
    loadReport();
  }, [filters, getStaffReport]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.staff) return;

    const csvData = formatDataForCSV(reportData.staff, {
      userName: 'Staff Member',
      role: 'Role',
      totalSales: 'Total Sales',
      totalRevenue: 'Total Revenue',
      averageSale: 'Average Sale',
      totalRefunds: 'Total Refunds',
      netRevenue: 'Net Revenue'
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `staff-performance-${timestamp}`);
  };

  const handleExportPDF = () => {
    if (!reportData || !reportData.staff) return;

    const headers = ['Staff Member', 'Role', 'Sales', 'Revenue', 'Avg Sale', 'Net Revenue'];
    const data = reportData.staff
      .filter(s => s.totalSales > 0)
      .map(staff => [
        staff.userName,
        staff.role,
        staff.totalSales.toString(),
        formatCurrency(staff.totalRevenue, currentCurrency),
        formatCurrency(staff.averageSale, currentCurrency),
        formatCurrency(staff.netRevenue, currentCurrency)
      ]);

    const summary = reportData.summary ? [
      { label: 'Total Staff', value: reportData.summary.totalStaff.toString() },
      { label: 'Active Staff', value: reportData.summary.activeStaff.toString() },
      { label: 'Total Revenue', value: formatCurrency(parseFloat(reportData.summary.totalRevenue), currentCurrency) },
      { label: 'Avg Revenue Per Staff', value: formatCurrency(parseFloat(reportData.summary.averageRevenuePerStaff), currentCurrency) }
    ] : [];

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToPDF({
      title: 'Staff Performance Report',
      subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
      headers,
      data,
      filename: `staff-performance-${timestamp}`,
      summary
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading staff report...</div>;
  }

  if (!reportData) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Staff</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalStaff}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Staff</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.activeStaff}</CardTitle>
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
            <CardDescription>Avg Revenue Per Staff</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.averageRevenuePerStaff), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {reportData.topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Highest revenue staff members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Sale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.topPerformers.map((staff) => (
                    <TableRow key={staff.userId}>
                      <TableCell className="font-medium">{staff.userName}</TableCell>
                      <TableCell>{staff.role}</TableCell>
                      <TableCell className="text-right">{staff.totalSales}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(staff.totalRevenue, currentCurrency)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(staff.averageSale, currentCurrency)}</TableCell>
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
              <CardTitle>All Staff Performance</CardTitle>
              <CardDescription>Complete staff sales performance</CardDescription>
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
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg Sale</TableHead>
                  <TableHead className="text-right">Refunds</TableHead>
                  <TableHead className="text-right">Net Revenue</TableHead>
                  <TableHead>Last Sale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.staff.map((staff) => (
                  <TableRow key={staff.userId}>
                    <TableCell className="font-medium">{staff.userName}</TableCell>
                    <TableCell>{staff.role}</TableCell>
                    <TableCell className="text-right">{staff.totalSales}</TableCell>
                    <TableCell className="text-right">{formatCurrency(staff.totalRevenue, currentCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(staff.averageSale, currentCurrency)}</TableCell>
                    <TableCell className="text-right">{staff.totalRefunds}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(staff.netRevenue, currentCurrency)}</TableCell>
                    <TableCell>{staff.lastSaleDate ? formatDateForPDF(staff.lastSaleDate) : 'N/A'}</TableCell>
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
