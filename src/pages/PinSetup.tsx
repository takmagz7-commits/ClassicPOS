import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

const PinSetup = () => {
  const [pinCode, setPinCode] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pinCode !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    if (pinCode.length < 4 || pinCode.length > 6) {
      toast.error("PIN must be 4-6 digits");
      return;
    }

    if (!/^\d+$/.test(pinCode)) {
      toast.error("PIN must contain only numbers");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/setup-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pinCode }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("PIN setup successful!");
        
        const roleStr = user?.role?.toString().toLowerCase();
        if (roleStr === 'employee') {
          navigate("/sales");
        } else {
          navigate("/");
        }
      } else {
        toast.error(data.message || "PIN setup failed");
      }
    } catch (error) {
      toast.error("An error occurred during PIN setup");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Set Up Security PIN</CardTitle>
          <CardDescription>
            Create a 4-6 digit PIN for quick access and secure operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pin">PIN Code (4-6 digits)</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter PIN"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
                required
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Your PIN will be used for:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 text-blue-700 dark:text-blue-300 space-y-1">
                <li>Quick login access</li>
                <li>Sensitive operations</li>
                <li>System settings access</li>
              </ul>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Setting up PIN..." : "Set Up PIN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PinSetup;
