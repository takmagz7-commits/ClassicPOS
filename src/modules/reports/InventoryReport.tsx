import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useReports, type InventoryReportData, type ReportFilters } from "@/context/ReportContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import { exportToPDF } from "@/utils/exportToPDF";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface InventoryReportProps {
  filters: ReportFilters;
}

export const InventoryReport = ({ filters }: InventoryReportProps) => {
  const { getInventoryReport, isLoading } = useReports();
  const { currentCurrency } = useCurrency();
  const [reportData, setReportData] = useState<InventoryReportData | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const data = await getInventoryReport(filters);
      if (data) {
        setReportData(data);
      }
    };
    loadReport();
  }, [filters, getInventoryReport]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.inventory) return;

    const csvData = formatDataForCSV(reportData.inventory, {
      name: 'Product',
      sku: 'SKU',
      categoryName: 'Category',
      currentStock: 'Stock',
      cost: 'Cost',
      retailPrice: 'Retail Price',
      costValue: 'Cost Value',
      retailValue: 'Retail Value',
      potentialProfit: 'Potential Profit'
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `inventory-valuation-${timestamp}`);
  };

  const handleExportPDF = () => {
    if (!reportData || !reportData.inventory) return;

    const headers = ['Product', 'SKU', 'Category', 'Stock', 'Cost Value', 'Retail Value', 'Potential Profit'];
    const data = reportData.inventory.map(item => [
      item.name,
      item.sku,
      item.categoryName || 'N/A',
      item.currentStock.toString(),
      formatCurrency(parseFloat(item.costValue), currentCurrency),
      formatCurrency(parseFloat(item.retailValue), currentCurrency),
      formatCurrency(parseFloat(item.potentialProfit), currentCurrency)
    ]);

    const summary = reportData.summary ? [
      { label: 'Total Products', value: reportData.summary.totalProducts.toString() },
      { label: 'Total Items', value: reportData.summary.totalItems.toString() },
      { label: 'Total Cost Value', value: formatCurrency(parseFloat(reportData.summary.totalCostValue), currentCurrency) },
      { label: 'Total Retail Value', value: formatCurrency(parseFloat(reportData.summary.totalRetailValue), currentCurrency) },
      { label: 'Potential Profit', value: formatCurrency(parseFloat(reportData.summary.totalPotentialProfit), currentCurrency) }
    ] : [];

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToPDF({
      title: 'Inventory Valuation Report',
      subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
      headers,
      data,
      filename: `inventory-valuation-${timestamp}`,
      summary
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading inventory report...</div>;
  }

  if (!reportData) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cost Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.totalCostValue), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Retail Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.totalRetailValue), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Potential Profit</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.totalPotentialProfit), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalItems}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Valuation</CardTitle>
              <CardDescription>Current stock valuation by cost and retail price</CardDescription>
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
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Cost Value</TableHead>
                  <TableHead className="text-right">Retail Value</TableHead>
                  <TableHead className="text-right">Potential Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.categoryName || 'N/A'}</TableCell>
                    <TableCell className="text-right">{item.currentStock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parseFloat(item.costValue), currentCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parseFloat(item.retailValue), currentCurrency)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(parseFloat(item.potentialProfit), currentCurrency)}</TableCell>
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
