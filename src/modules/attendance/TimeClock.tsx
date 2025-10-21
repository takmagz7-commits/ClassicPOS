import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Attendance } from "@/types/attendance";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

export const TimeClock = () => {
  const { user } = useAuth();
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null);
  const [remarks, setRemarks] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      checkCurrentStatus();
    }
  }, [user]);

  const checkCurrentStatus = async () => {
    if (!user) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await fetch(
        `${API_BASE_URL}/attendance?userId=${user.id}&startDate=${today}&endDate=${today}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const attendances: Attendance[] = await response.json();
        const activeAttendance = attendances.find(a => !a.clockOut);
        setCurrentAttendance(activeAttendance || null);
      }
    } catch (error) {
      logger.error('Error checking attendance status:', error);
    }
  };

  const handleClockIn = async () => {
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          userName: user.email,
          date: format(new Date(), 'yyyy-MM-dd'),
          remarks: remarks || undefined,
        }),
      });

      if (response.ok) {
        const newAttendance: Attendance = await response.json();
        setCurrentAttendance(newAttendance);
        setRemarks("");
        toast.success("Clocked in successfully!");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to clock in");
      }
    } catch (error) {
      toast.error("Failed to clock in");
      logger.error('Clock in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentAttendance) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: currentAttendance.id }),
      });

      if (response.ok) {
        const updatedAttendance: Attendance = await response.json();
        toast.success(`Clocked out! Total hours: ${updatedAttendance.totalHours.toFixed(2)}`);
        setCurrentAttendance(null);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to clock out");
      }
    } catch (error) {
      toast.error("Failed to clock out");
      logger.error('Clock out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCurrentHours = () => {
    if (!currentAttendance?.clockIn) return 0;
    const clockInTime = new Date(currentAttendance.clockIn);
    const diff = currentTime.getTime() - clockInTime.getTime();
    return diff / (1000 * 60 * 60);
  };

  const currentHours = calculateCurrentHours();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Clock
          </CardTitle>
          <CardDescription>Clock in and out to track your work hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-6">
            <div className="text-4xl font-bold mb-2">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-muted-foreground">
              {format(currentTime, 'EEEE, MMMM dd, yyyy')}
            </div>
          </div>

          {currentAttendance ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-green-900 dark:text-green-100">Currently Clocked In</span>
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Since {format(new Date(currentAttendance.clockIn), 'HH:mm')}
                  </span>
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {currentHours.toFixed(2)} hours
                </div>
                {currentAttendance.remarks && (
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    Remarks: {currentAttendance.remarks}
                  </div>
                )}
              </div>

              <Button
                onClick={handleClockOut}
                disabled={isLoading}
                className="w-full"
                size="lg"
                variant="destructive"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Clock Out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input
                  id="remarks"
                  placeholder="e.g., Working on inventory"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <Button
                onClick={handleClockIn}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Clock In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Your attendance information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Employee</div>
                <div className="font-semibold">{user.email}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-semibold">
                  {currentAttendance ? (
                    <span className="text-green-600">Clocked In</span>
                  ) : (
                    <span className="text-gray-600">Clocked Out</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
