import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CashFlowEntry } from "@/types/accounting";
import { Download } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/utils/exportToCSV";

export default function CashFlow() {
  const { currentCurrency } = useCurrency();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCashFlow();
  }, [startDate, endDate]);

  const fetchCashFlow = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/cash-flow?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`
      );
      if (response.ok) {
        const data = await response.json();
        setCashFlow(data);
      }
    } catch (error) {
      logger.error("Error fetching cash flow:", error);
    } finally {
      setLoading(false);
    }
  };

  const operating = cashFlow.filter(e => e.category === "operating");
  const investing = cashFlow.filter(e => e.category === "investing");
  const financing = cashFlow.filter(e => e.category === "financing");

  const operatingTotal = operating.reduce((sum, e) => sum + e.amount, 0);
  const investingTotal = investing.reduce((sum, e) => sum + e.amount, 0);
  const financingTotal = financing.reduce((sum, e) => sum + e.amount, 0);
  const netCashFlow = operatingTotal + investingTotal + financingTotal;

  const handleExportCSV = () => {
    const csvData = cashFlow.map(entry => ({
      Date: entry.date,
      Description: entry.description,
      Category: entry.category,
      Amount: entry.amount.toFixed(2)
    }));

    exportToCSV(csvData, `cash-flow-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cash Flow Statement</CardTitle>
              <CardDescription>Cash movement for the selected period</CardDescription>
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
                <h3 className="font-semibold text-lg mb-2">Operating Activities</h3>
                {operating.length > 0 ? (
                  <>
                    {operating.map((entry, idx) => (
                      <div key={idx} className="flex justify-between py-1">
                        <span className="text-sm">{entry.description}</span>
                        <span className="text-sm font-medium">{formatCurrency(entry.amount, currentCurrency)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t font-semibold">
                      <span>Net Cash from Operating</span>
                      <span className={operatingTotal >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(operatingTotal, currentCurrency)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No operating activities</p>
                )}
              </div>

              {investing.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Investing Activities</h3>
                  {investing.map((entry, idx) => (
                    <div key={idx} className="flex justify-between py-1">
                      <span className="text-sm">{entry.description}</span>
                      <span className="text-sm font-medium">{formatCurrency(entry.amount, currentCurrency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t font-semibold">
                    <span>Net Cash from Investing</span>
                    <span className={investingTotal >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(investingTotal, currentCurrency)}
                    </span>
                  </div>
                </div>
              )}

              {financing.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Financing Activities</h3>
                  {financing.map((entry, idx) => (
                    <div key={idx} className="flex justify-between py-1">
                      <span className="text-sm">{entry.description}</span>
                      <span className="text-sm font-medium">{formatCurrency(entry.amount, currentCurrency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t font-semibold">
                    <span>Net Cash from Financing</span>
                    <span className={financingTotal >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(financingTotal, currentCurrency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between py-4 border-t-2 border-b-2 font-bold text-xl">
                <span>Net Change in Cash</span>
                <span className={netCashFlow >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(netCashFlow, currentCurrency)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
