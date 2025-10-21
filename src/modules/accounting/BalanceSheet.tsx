import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BalanceSheetEntry } from "@/types/accounting";
import { Download } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/utils/exportToCSV";

export default function BalanceSheet() {
  const { currentCurrency } = useCurrency();
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBalanceSheet();
  }, [asOfDate]);

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/balance-sheet?asOfDate=${format(asOfDate, "yyyy-MM-dd")}`
      );
      if (response.ok) {
        const data = await response.json();
        setBalanceSheet(data);
      }
    } catch (error) {
      logger.error("Error fetching balance sheet:", error);
    } finally {
      setLoading(false);
    }
  };

  const assets = balanceSheet.filter(e => e.accountCategory.includes("asset"));
  const liabilities = balanceSheet.filter(e => e.accountCategory.includes("liability"));
  const equity = balanceSheet.filter(e => e.accountCategory === "equity");

  const totalAssets = assets.reduce((sum, e) => sum + e.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, e) => sum + e.amount, 0);
  const totalEquity = equity.reduce((sum, e) => sum + e.amount, 0);

  const handleExportCSV = () => {
    const csvData: Array<Record<string, string>> = [
      { Section: "Assets", Account: "", Amount: "" },
      ...assets.map(e => ({
        Section: "",
        Account: `${e.accountCode} - ${e.accountName}`,
        Amount: e.amount.toFixed(2)
      })),
      { Section: "", Account: "Total Assets", Amount: totalAssets.toFixed(2) },
      { Section: "", Account: "", Amount: "" },
      { Section: "Liabilities", Account: "", Amount: "" },
      ...liabilities.map(e => ({
        Section: "",
        Account: `${e.accountCode} - ${e.accountName}`,
        Amount: e.amount.toFixed(2)
      })),
      { Section: "", Account: "Total Liabilities", Amount: totalLiabilities.toFixed(2) },
      { Section: "", Account: "", Amount: "" },
      { Section: "Equity", Account: "", Amount: "" },
      ...equity.map(e => ({
        Section: "",
        Account: `${e.accountCode} - ${e.accountName}`,
        Amount: e.amount.toFixed(2)
      })),
      { Section: "", Account: "Total Equity", Amount: totalEquity.toFixed(2) },
      { Section: "", Account: "", Amount: "" },
      { Section: "", Account: "Total Liabilities & Equity", Amount: (totalLiabilities + totalEquity).toFixed(2) }
    ];

    exportToCSV(csvData, `balance-sheet-${format(asOfDate, "yyyy-MM-dd")}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>Financial position as of a specific date</CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label>As of Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !asOfDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {asOfDate ? format(asOfDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={asOfDate} onSelect={(date) => date && setAsOfDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Assets</h3>
                {assets.map(entry => (
                  <div key={entry.accountCode} className="flex justify-between py-1">
                    <span className="text-sm">{entry.accountCode} - {entry.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(entry.amount, currentCurrency)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t font-bold text-lg">
                  <span>Total Assets</span>
                  <span>{formatCurrency(totalAssets, currentCurrency)}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Liabilities</h3>
                {liabilities.map(entry => (
                  <div key={entry.accountCode} className="flex justify-between py-1">
                    <span className="text-sm">{entry.accountCode} - {entry.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(entry.amount, currentCurrency)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t font-semibold">
                  <span>Total Liabilities</span>
                  <span>{formatCurrency(totalLiabilities, currentCurrency)}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Equity</h3>
                {equity.map(entry => (
                  <div key={entry.accountCode} className="flex justify-between py-1">
                    <span className="text-sm">{entry.accountCode} - {entry.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(entry.amount, currentCurrency)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t font-semibold">
                  <span>Total Equity</span>
                  <span>{formatCurrency(totalEquity, currentCurrency)}</span>
                </div>
              </div>

              <div className="flex justify-between py-4 border-t-2 border-b-2 font-bold text-xl">
                <span>Total Liabilities & Equity</span>
                <span>{formatCurrency(totalLiabilities + totalEquity, currentCurrency)}</span>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 ? (
                  <span className="text-green-600">✓ Balanced</span>
                ) : (
                  <span className="text-red-600">✗ Not Balanced</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
