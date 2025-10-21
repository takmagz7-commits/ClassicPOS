import { useState } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Calculator } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

interface PayrollCalculation {
  userId: string;
  userName: string;
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  overtimeAmount: number;
  totalHours: number;
  periodStart: string;
  periodEnd: string;
  netSalary: number;
}

export const PayrollCalculator = () => {
  const { users } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<Date>();
  const [periodEnd, setPeriodEnd] = useState<Date>();
  const [calculation, setCalculation] = useState<PayrollCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCalculate = async () => {
    if (!selectedUserId || !periodStart || !periodEnd) {
      toast.error("Please select an employee and date range");
      return;
    }

    setIsCalculating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/payroll/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedUserId,
          periodStart: format(periodStart, 'yyyy-MM-dd'),
          periodEnd: format(periodEnd, 'yyyy-MM-dd'),
        }),
      });

      if (response.ok) {
        const data: PayrollCalculation = await response.json();
        setCalculation(data);
        toast.success("Payroll calculated successfully");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to calculate payroll");
      }
    } catch (error) {
      logger.error('Error calculating payroll:', error);
      toast.error("Failed to calculate payroll");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreatePayroll = async () => {
    if (!calculation) return;

    setIsCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: calculation.userId,
          userName: calculation.userName,
          baseSalary: calculation.baseSalary,
          totalAllowances: calculation.totalAllowances,
          totalDeductions: calculation.totalDeductions,
          overtimeAmount: calculation.overtimeAmount,
          periodStart: calculation.periodStart,
          periodEnd: calculation.periodEnd,
        }),
      });

      if (response.ok) {
        toast.success("Payroll record created successfully");
        setCalculation(null);
        setSelectedUserId("");
        setPeriodStart(undefined);
        setPeriodEnd(undefined);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create payroll record");
      }
    } catch (error) {
      logger.error('Error creating payroll:', error);
      toast.error("Failed to create payroll record");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Calculate Payroll</CardTitle>
          <CardDescription>
            Auto-calculate payroll based on attendance records and employee salary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodStart && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodStart ? format(periodStart, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={periodStart}
                    onSelect={setPeriodStart}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Period End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodEnd && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodEnd ? format(periodEnd, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={periodEnd}
                    onSelect={setPeriodEnd}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mt-4">
            <Button
              onClick={handleCalculate}
              disabled={!selectedUserId || !periodStart || !periodEnd || isCalculating}
              className="w-full"
            >
              <Calculator className="mr-2 h-4 w-4" />
              {isCalculating ? "Calculating..." : "Calculate Payroll"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {calculation && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll Breakdown</CardTitle>
            <CardDescription>
              Calculated payroll for {calculation.userName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Employee</div>
                  <div className="font-medium">{calculation.userName}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Period</div>
                  <div className="font-medium">
                    {format(new Date(calculation.periodStart), 'MMM dd')} - {format(new Date(calculation.periodEnd), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Hours Worked</span>
                  <span className="font-medium">{calculation.totalHours.toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span className="font-medium">${calculation.baseSalary.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Allowances</span>
                  <span className="font-medium">${calculation.totalAllowances.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Deductions</span>
                  <span className="font-medium text-destructive">-${calculation.totalDeductions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overtime Amount</span>
                  <span className="font-medium text-green-600">${calculation.overtimeAmount.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center bg-primary/10 p-4 rounded-lg">
                <span className="text-lg font-semibold">Net Salary</span>
                <span className="text-2xl font-bold">${calculation.netSalary.toFixed(2)}</span>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleCreatePayroll}
                  disabled={isCreating}
                  className="w-full"
                  size="lg"
                >
                  {isCreating ? "Creating..." : "Create Payroll Record"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
