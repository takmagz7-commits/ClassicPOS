import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileSpreadsheet } from "lucide-react";
import { useReports, type ProductReportData, type ReportFilters } from "@/context/ReportContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import { exportToPDF } from "@/utils/exportToPDF";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface ProductReportProps {
  filters: ReportFilters;
}

export const ProductReport = ({ filters }: ProductReportProps) => {
  const { getProductReport, isLoading } = useReports();
  const { currentCurrency } = useCurrency();
  const [reportData, setReportData] = useState<ProductReportData | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      const data = await getProductReport(filters);
      if (data) {
        setReportData(data);
      }
    };
    loadReport();
  }, [filters, getProductReport]);

  const handleExportCSV = (data: any[], filename: string) => {
    const csvData = formatDataForCSV(data, {
      productName: 'Product',
      quantitySold: 'Qty Sold',
      revenue: 'Revenue',
      cost: 'Cost',
      profit: 'Profit',
      transactionCount: 'Transactions'
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `${filename}-${timestamp}`);
  };

  const handleExportPDF = (data: any[], title: string, filename: string) => {
    const headers = ['Product', 'Qty Sold', 'Revenue', 'Profit', 'Transactions'];
    const pdfData = data.map(item => [
      item.productName,
      item.quantitySold.toString(),
      formatCurrency(item.revenue, currentCurrency),
      formatCurrency(item.profit, currentCurrency),
      item.transactionCount.toString()
    ]);

    const summary = reportData?.summary ? [
      { label: 'Total Products', value: reportData.summary.totalProducts.toString() },
      { label: 'Total Revenue', value: formatCurrency(parseFloat(reportData.summary.totalRevenue), currentCurrency) },
      { label: 'Total Profit', value: formatCurrency(parseFloat(reportData.summary.totalProfit), currentCurrency) }
    ] : [];

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToPDF({
      title,
      subtitle: `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
      headers,
      data: pdfData,
      filename: `${filename}-${timestamp}`,
      summary
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading product report...</div>;
  }

  if (!reportData) {
    return <div className="text-center py-8">No data available</div>;
  }

  const renderProductTable = (products: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead className="text-right">Qty Sold</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Profit</TableHead>
          <TableHead className="text-right">Transactions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{product.productName}</TableCell>
            <TableCell className="text-right">{product.quantitySold}</TableCell>
            <TableCell className="text-right">{formatCurrency(product.revenue, currentCurrency)}</TableCell>
            <TableCell className="text-right">{formatCurrency(product.cost, currentCurrency)}</TableCell>
            <TableCell className="text-right font-semibold">{formatCurrency(product.profit, currentCurrency)}</TableCell>
            <TableCell className="text-right">{product.transactionCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Products</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalProducts}</CardTitle>
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
            <CardDescription>Total Profit</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(parseFloat(reportData.summary.totalProfit), currentCurrency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Qty Sold</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalQuantitySold}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="top-selling" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="top-selling">Top Selling</TabsTrigger>
          <TabsTrigger value="top-revenue">Top Revenue</TabsTrigger>
          <TabsTrigger value="top-profit">Top Profit</TabsTrigger>
          <TabsTrigger value="bottom-selling">Bottom Selling</TabsTrigger>
        </TabsList>

        <TabsContent value="top-selling">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>Products by quantity sold</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleExportCSV(reportData.topSelling, 'top-selling-products')} variant="outline" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button onClick={() => handleExportPDF(reportData.topSelling, 'Top Selling Products', 'top-selling-products')} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[600px] overflow-auto">
                {renderProductTable(reportData.topSelling)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-revenue">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Revenue Products</CardTitle>
                  <CardDescription>Products by total revenue</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleExportCSV(reportData.topRevenue, 'top-revenue-products')} variant="outline" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button onClick={() => handleExportPDF(reportData.topRevenue, 'Top Revenue Products', 'top-revenue-products')} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[600px] overflow-auto">
                {renderProductTable(reportData.topRevenue)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-profit">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Profit Products</CardTitle>
                  <CardDescription>Products by total profit</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleExportCSV(reportData.topProfit, 'top-profit-products')} variant="outline" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button onClick={() => handleExportPDF(reportData.topProfit, 'Top Profit Products', 'top-profit-products')} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[600px] overflow-auto">
                {renderProductTable(reportData.topProfit)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bottom-selling">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bottom Selling Products</CardTitle>
                  <CardDescription>Products with lowest sales</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleExportCSV(reportData.bottomSelling, 'bottom-selling-products')} variant="outline" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button onClick={() => handleExportPDF(reportData.bottomSelling, 'Bottom Selling Products', 'bottom-selling-products')} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[600px] overflow-auto">
                {renderProductTable(reportData.bottomSelling)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
