import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

const SystemReset = () => {
  const [confirmCode, setConfirmCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (confirmCode !== "RESET") {
      toast.error("Please enter the confirmation code 'RESET'");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-system`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmCode }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("System reset successful!");
        toast.info("Registration is now re-enabled. You may need to clear application data.");
        setConfirmCode("");
      } else {
        toast.error(data.message || "System reset failed");
      }
    } catch (error) {
      toast.error("An error occurred during system reset");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          System Reset
        </CardTitle>
        <CardDescription>
          Reset the system to allow new admin registration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning: This action is permanent!</AlertTitle>
          <AlertDescription>
            Resetting the system will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Re-enable the registration page</li>
              <li>Allow a new admin account to be created</li>
              <li>Mark the system as uninitialized</li>
            </ul>
            <p className="mt-2 font-semibold">
              Note: This does NOT delete user data or system settings - it only allows new registration.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="confirm-code">
            Type <span className="font-mono font-bold">RESET</span> to confirm
          </Label>
          <Input
            id="confirm-code"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            placeholder="Enter RESET to confirm"
            disabled={isLoading}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full"
              disabled={confirmCode !== "RESET" || isLoading}
            >
              {isLoading ? "Resetting..." : "Reset System"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset the system initialization state and allow new admin registration.
                This action is permanent and should only be used if you need to reconfigure the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Reset System
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default SystemReset;
