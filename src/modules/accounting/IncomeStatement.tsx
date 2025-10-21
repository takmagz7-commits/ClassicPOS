import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IncomeStatementEntry } from "@/types/accounting";
import { Download } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/utils/exportToCSV";

export default function IncomeStatement() {
  const { currentCurrency } = useCurrency();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIncomeStatement();
  }, [startDate, endDate]);

  const fetchIncomeStatement = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/income-statement?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`
      );
      if (response.ok) {
        const data = await response.json();
        setIncomeStatement(data);
      }
    } catch (error) {
      logger.error("Error fetching income statement:", error);
    } finally {
      setLoading(false);
    }
  };

  const revenue = incomeStatement.filter(e => e.accountCategory === "revenue");
  const cogs = incomeStatement.filter(e => e.accountCategory === "cost_of_goods_sold");
  const operatingExpenses = incomeStatement.filter(e => e.accountCategory === "operating_expense");
  const otherIncome = incomeStatement.filter(e => e.accountCategory === "other_income");
  const otherExpenses = incomeStatement.filter(e => e.accountCategory === "other_expense");

  const totalRevenue = revenue.reduce((sum, e) => sum + e.amount, 0);
  const totalCOGS = cogs.reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalOperatingExpenses = operatingExpenses.reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const operatingIncome = grossProfit - totalOperatingExpenses;
  const totalOtherIncome = otherIncome.reduce((sum, e) => sum + e.amount, 0);
  const totalOtherExpenses = otherExpenses.reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const netIncome = operatingIncome + totalOtherIncome - totalOtherExpenses;

  const handleExportCSV = () => {
    const csvData: Array<Record<string, string>> = [
      { Section: "Revenue", Account: "", Amount: "" },
      ...revenue.map(e => ({
        Section: "",
        Account: `${e.accountCode} - ${e.accountName}`,
        Amount: e.amount.toFixed(2)
      })),
      { Section: "", Account: "Total Revenue", Amount: totalRevenue.toFixed(2) },
      { Section: "", Account: "", Amount: "" },
      { Section: "Cost of Goods Sold", Account: "", Amount: "" },
      ...cogs.map(e => ({
        Section: "",
        Account: `${e.accountCode} - ${e.accountName}`,
        Amount: Math.abs(e.amount).toFixed(2)
      })),
      { Section: "", Account: "Total COGS", Amount: totalCOGS.toFixed(2) },
      { Section: "", Account: "Gross Profit", Amount: grossProfit.toFixed(2) },
      { Section: "", Account: "", Amount: "" },
      { Section: "Operating Expenses", Account: "", Amount: "" },
      ...operatingExpenses.map(e => ({
        Section: "",
        Account: `${e.accountCode} - ${e.accountName}`,
        Amount: Math.abs(e.amount).toFixed(2)
      })),
      { Section: "", Account: "Total Operating Expenses", Amount: totalOperatingExpenses.toFixed(2) },
      { Section: "", Account: "Operating Income", Amount: operatingIncome.toFixed(2) },
      { Section: "", Account: "", Amount: "" },
      { Section: "", Account: "Net Income", Amount: netIncome.toFixed(2) }
    ];

    exportToCSV(csvData, `income-statement-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Income Statement (P&L)</CardTitle>
              <CardDescription>Profit and loss for the selected period</CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Revenue</h3>
                {revenue.map(entry => (
                  <div key={entry.accountCode} className="flex justify-between py-1">
                    <span className="text-sm">{entry.accountCode} - {entry.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(entry.amount, currentCurrency)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t font-semibold">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(totalRevenue, currentCurrency)}</span>
                </div>
              </div>

              {cogs.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Cost of Goods Sold</h3>
                  {cogs.map(entry => (
                    <div key={entry.accountCode} className="flex justify-between py-1">
                      <span className="text-sm">{entry.accountCode} - {entry.accountName}</span>
                      <span className="text-sm font-medium">{formatCurrency(Math.abs(entry.amount), currentCurrency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t font-semibold">
                    <span>Total COGS</span>
                    <span>{formatCurrency(totalCOGS, currentCurrency)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t font-bold text-lg">
                    <span>Gross Profit</span>
                    <span className={grossProfit >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(grossProfit, currentCurrency)}
                    </span>
                  </div>
                </div>
              )}

              {operatingExpenses.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Operating Expenses</h3>
                  {operatingExpenses.map(entry => (
                    <div key={entry.accountCode} className="flex justify-between py-1">
                      <span className="text-sm">{entry.accountCode} - {entry.accountName}</span>
                      <span className="text-sm font-medium">{formatCurrency(Math.abs(entry.amount), currentCurrency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t font-semibold">
                    <span>Total Operating Expenses</span>
                    <span>{formatCurrency(totalOperatingExpenses, currentCurrency)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t font-bold text-lg">
                    <span>Operating Income</span>
                    <span className={operatingIncome >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(operatingIncome, currentCurrency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between py-4 border-t-2 border-b-2 font-bold text-xl">
                <span>Net Income</span>
                <span className={netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(netIncome, currentCurrency)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
