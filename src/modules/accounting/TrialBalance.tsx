import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { TrialBalanceEntry } from "@/types/accounting";
import { Download } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { exportToCSV } from "@/utils/exportToCSV";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

export default function TrialBalance() {
  const { currentCurrency } = useCurrency();
  const [trialBalance, setTrialBalance] = useState<TrialBalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/accounting/trial-balance`);
      if (response.ok) {
        const data = await response.json();
        setTrialBalance(data);
      }
    } catch (error) {
      logger.error("Error fetching trial balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = trialBalance.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = trialBalance.reduce((sum, entry) => sum + entry.credit, 0);

  const handleExportCSV = () => {
    const csvData = trialBalance.map(entry => ({
      "Account Code": entry.accountCode,
      "Account Name": entry.accountName,
      "Type": entry.accountType,
      "Debit": entry.debit.toFixed(2),
      "Credit": entry.credit.toFixed(2),
      "Balance": entry.balance.toFixed(2)
    }));

    const totalRow = {
      "Account Code": "",
      "Account Name": "TOTAL",
      "Type": "" as const,
      "Debit": totalDebit.toFixed(2),
      "Credit": totalCredit.toFixed(2),
      "Balance": ""
    };
    
    csvData.push(totalRow as any);

    exportToCSV(csvData, "trial-balance");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trial Balance</CardTitle>
              <CardDescription>Summary of all account balances</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance.map((entry) => (
                  <TableRow key={entry.accountCode}>
                    <TableCell className="font-medium">{entry.accountCode}</TableCell>
                    <TableCell>{entry.accountName}</TableCell>
                    <TableCell className="capitalize">{entry.accountType}</TableCell>
                    <TableCell className="text-right">
                      {entry.debit > 0 ? formatCurrency(entry.debit, currentCurrency) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.credit > 0 ? formatCurrency(entry.credit, currentCurrency) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Math.abs(entry.balance), currentCurrency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-bold">TOTAL</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(totalDebit, currentCurrency)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(totalCredit, currentCurrency)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {Math.abs(totalDebit - totalCredit) < 0.01 ? (
                      <span className="text-green-600">Balanced ✓</span>
                    ) : (
                      <span className="text-red-600">Not Balanced</span>
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
