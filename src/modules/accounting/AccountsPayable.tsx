import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ARAPEntry } from "@/types/accounting";
import { Download } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { exportToCSV } from "@/utils/exportToCSV";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

export default function AccountsPayable() {
  const { currentCurrency } = useCurrency();
  const [payables, setPayables] = useState<ARAPEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayables();
  }, []);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/accounts-payable`);
      if (response.ok) {
        const data = await response.json();
        setPayables(data);
      }
    } catch (error) {
      logger.error("Error fetching payables:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = payables.reduce((sum, entry) => sum + entry.balance, 0);

  const current = payables.filter(e => e.agingDays <= 30);
  const days31to60 = payables.filter(e => e.agingDays > 30 && e.agingDays <= 60);
  const days61to90 = payables.filter(e => e.agingDays > 60 && e.agingDays <= 90);
  const over90 = payables.filter(e => e.agingDays > 90);

  const handleExportCSV = () => {
    const csvData = payables.map(entry => ({
      Supplier: entry.name,
      "Invoice #": entry.invoiceNumber,
      "Invoice Date": format(new Date(entry.invoiceDate), "MMM dd, yyyy"),
      "Total Amount": entry.totalAmount.toFixed(2),
      "Paid Amount": entry.paidAmount.toFixed(2),
      "Balance": entry.balance.toFixed(2),
      "Aging Days": entry.agingDays
    }));

    exportToCSV(csvData, "accounts-payable");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Accounts Payable</CardTitle>
              <CardDescription>Outstanding supplier balances</CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current (0-30 days)</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(current.reduce((sum, e) => sum + e.balance, 0), currentCurrency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>31-60 days</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(days31to60.reduce((sum, e) => sum + e.balance, 0), currentCurrency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>61-90 days</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(days61to90.reduce((sum, e) => sum + e.balance, 0), currentCurrency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Over 90 days</CardDescription>
                <CardTitle className="text-2xl text-red-600">
                  {formatCurrency(over90.reduce((sum, e) => sum + e.balance, 0), currentCurrency)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : payables.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Paid Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Days Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((entry) => (
                  <TableRow key={entry.invoiceNumber}>
                    <TableCell>{entry.name}</TableCell>
                    <TableCell>{entry.invoiceNumber}</TableCell>
                    <TableCell>{format(new Date(entry.invoiceDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.totalAmount, currentCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.paidAmount, currentCurrency)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.balance, currentCurrency)}</TableCell>
                    <TableCell className="text-right">
                      <span className={entry.agingDays > 90 ? "text-red-600 font-semibold" : ""}>
                        {entry.agingDays}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-bold">Total Outstanding</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalBalance, currentCurrency)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No outstanding payables
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
