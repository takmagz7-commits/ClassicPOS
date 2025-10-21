import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Clock, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { AttendanceSummary as AttendanceSummaryType } from "@/types/attendance";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

export const AttendanceSummary = () => {
  const { users } = useAuth();
  const [summary, setSummary] = useState<AttendanceSummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userFilter, setUserFilter] = useState<string>(users.length > 0 ? users[0].id : "");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });

  useEffect(() => {
    if (userFilter) {
      loadSummary();
    }
  }, [userFilter, dateRange]);

  const loadSummary = async () => {
    if (!userFilter) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append("startDate", format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        params.append("endDate", format(dateRange.to, 'yyyy-MM-dd'));
      }

      const response = await fetch(
        `${API_BASE_URL}/attendance/summary/${userFilter}?${params.toString()}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data: AttendanceSummaryType = await response.json();
        setSummary(data);
      }
    } catch (error) {
      logger.error('Error loading summary:', error);
      toast.error("Failed to load attendance summary");
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = summary?.attendances.slice(0, 10).map(att => ({
    date: format(new Date(att.date), 'MMM dd'),
    hours: parseFloat(att.totalHours.toFixed(2)),
  })) || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select employee and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, yyyy")} -{" "}
                          {format(dateRange.to, "LLL dd, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      setDateRange({
                        from: range?.from,
                        to: range?.to
                      });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading summary...</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Days</CardDescription>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl">{summary.totalDays}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Days worked in period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Hours</CardDescription>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl">{summary.totalHours.toFixed(2)}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Total hours worked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Average Hours/Day</CardDescription>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl">{summary.averageHoursPerDay.toFixed(2)}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Average per working day
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Over Time</CardTitle>
              <CardDescription>Hours worked per day (last 10 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" name="Hours Worked" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance data available for chart
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Select an employee to view summary
        </div>
      )}
    </div>
  );
};
