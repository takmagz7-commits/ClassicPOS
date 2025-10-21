import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Calculator, FileText } from "lucide-react";
import { PayrollList } from "@/modules/payroll/PayrollList";
import { PayrollCalculator } from "@/modules/payroll/PayrollCalculator";
import { PayslipGenerator } from "@/modules/payroll/PayslipGenerator";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/utils/permissions";

const Payroll = () => {
  const { user } = useAuth();
  
  if (!user) {
    return null;
  }

  const canView = hasPermission(user.role, 'payroll', 'view');
  const canCalculate = hasPermission(user.role, 'payroll', 'calculate');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">
            Manage employee salaries and generate payslips
          </p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {canView && (
            <TabsTrigger value="list" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payroll List
            </TabsTrigger>
          )}
          {canCalculate && (
            <TabsTrigger value="calculate" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculate Payroll
            </TabsTrigger>
          )}
          {canView && (
            <TabsTrigger value="payslip" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Payslip
            </TabsTrigger>
          )}
        </TabsList>

        {canView && (
          <TabsContent value="list" className="mt-6">
            <PayrollList />
          </TabsContent>
        )}

        {canCalculate && (
          <TabsContent value="calculate" className="mt-6">
            <PayrollCalculator />
          </TabsContent>
        )}

        {canView && (
          <TabsContent value="payslip" className="mt-6">
            <PayslipGenerator />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Payroll;
