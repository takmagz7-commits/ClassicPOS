import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileDown, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { Payroll } from "@/types/user";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

export const PayslipGenerator = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string>("");
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayrolls();
  }, []);

  useEffect(() => {
    if (selectedPayrollId) {
      const payroll = payrolls.find(p => p.id === selectedPayrollId);
      setSelectedPayroll(payroll || null);
    } else {
      setSelectedPayroll(null);
    }
  }, [selectedPayrollId, payrolls]);

  const loadPayrolls = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/payroll?status=paid`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data: Payroll[] = await response.json();
        setPayrolls(data);
      }
    } catch (error) {
      logger.error('Error loading payrolls:', error);
      toast.error("Failed to load payroll records");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = () => {
    if (!selectedPayroll) {
      toast.error("Please select a payroll record");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("PAYSLIP", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${format(new Date(), "PPP")}`, pageWidth / 2, 28, { align: "center" });

      doc.setLineWidth(0.5);
      doc.line(margin, 35, pageWidth - margin, 35);

      let yPos = 45;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Employee Information", margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Employee Name: ${selectedPayroll.userName}`, margin, yPos);
      yPos += 6;
      doc.text(`Pay Period: ${format(new Date(selectedPayroll.periodStart), "MMM dd, yyyy")} - ${format(new Date(selectedPayroll.periodEnd), "MMM dd, yyyy")}`, margin, yPos);
      yPos += 6;
      doc.text(`Status: ${selectedPayroll.status.toUpperCase()}`, margin, yPos);
      yPos += 12;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Salary Breakdown", margin, yPos);
      yPos += 8;

      const salaryData = [
        ["Component", "Amount"],
        ["Base Salary", `$${selectedPayroll.baseSalary.toFixed(2)}`],
        ["Total Allowances", `$${selectedPayroll.totalAllowances.toFixed(2)}`],
        ["Overtime Amount", `$${selectedPayroll.overtimeAmount.toFixed(2)}`],
        ["Total Deductions", `-$${selectedPayroll.totalDeductions.toFixed(2)}`],
      ];

      doc.autoTable({
        startY: yPos,
        head: [salaryData[0]],
        body: salaryData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 50, halign: 'right' },
        },
      });

      yPos = doc.lastAutoTable.finalY + 10;

      doc.setFillColor(66, 139, 202);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 15, 'F');

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Net Salary:", margin + 5, yPos + 10);
      doc.text(`$${selectedPayroll.netSalary.toFixed(2)}`, pageWidth - margin - 5, yPos + 10, { align: "right" });

      doc.setTextColor(0, 0, 0);
      yPos += 25;

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("This is a computer-generated payslip and does not require a signature.", pageWidth / 2, yPos, { align: "center" });

      const filename = `payslip_${selectedPayroll.userName.replace(/\s/g, '_')}_${format(new Date(selectedPayroll.periodStart), 'yyyyMMdd')}.pdf`;
      doc.save(filename);

      toast.success("Payslip generated successfully");
    } catch (error) {
      logger.error('Error generating PDF:', error);
      toast.error("Failed to generate payslip");
    }
  };

  const printPayslip = () => {
    if (!selectedPayroll) {
      toast.error("Please select a payroll record");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("PAYSLIP", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${format(new Date(), "PPP")}`, pageWidth / 2, 28, { align: "center" });

      doc.setLineWidth(0.5);
      doc.line(margin, 35, pageWidth - margin, 35);

      let yPos = 45;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Employee Information", margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Employee Name: ${selectedPayroll.userName}`, margin, yPos);
      yPos += 6;
      doc.text(`Pay Period: ${format(new Date(selectedPayroll.periodStart), "MMM dd, yyyy")} - ${format(new Date(selectedPayroll.periodEnd), "MMM dd, yyyy")}`, margin, yPos);
      yPos += 6;
      doc.text(`Status: ${selectedPayroll.status.toUpperCase()}`, margin, yPos);
      yPos += 12;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Salary Breakdown", margin, yPos);
      yPos += 8;

      const salaryData = [
        ["Component", "Amount"],
        ["Base Salary", `$${selectedPayroll.baseSalary.toFixed(2)}`],
        ["Total Allowances", `$${selectedPayroll.totalAllowances.toFixed(2)}`],
        ["Overtime Amount", `$${selectedPayroll.overtimeAmount.toFixed(2)}`],
        ["Total Deductions", `-$${selectedPayroll.totalDeductions.toFixed(2)}`],
      ];

      doc.autoTable({
        startY: yPos,
        head: [salaryData[0]],
        body: salaryData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 50, halign: 'right' },
        },
      });

      yPos = doc.lastAutoTable.finalY + 10;

      doc.setFillColor(66, 139, 202);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 15, 'F');

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Net Salary:", margin + 5, yPos + 10);
      doc.text(`$${selectedPayroll.netSalary.toFixed(2)}`, pageWidth - margin - 5, yPos + 10, { align: "right" });

      doc.setTextColor(0, 0, 0);
      yPos += 25;

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("This is a computer-generated payslip and does not require a signature.", pageWidth / 2, yPos, { align: "center" });

      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');

      toast.success("Payslip ready for printing");
    } catch (error) {
      logger.error('Error printing payslip:', error);
      toast.error("Failed to print payslip");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Payroll Record</CardTitle>
          <CardDescription>Choose a paid payroll record to generate a payslip</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paid Payroll Records</Label>
              <Select value={selectedPayrollId} onValueChange={setSelectedPayrollId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a payroll record" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : payrolls.length === 0 ? (
                    <SelectItem value="none" disabled>No paid payroll records found</SelectItem>
                  ) : (
                    payrolls.map((payroll) => (
                      <SelectItem key={payroll.id} value={payroll.id}>
                        {payroll.userName} - {format(new Date(payroll.periodStart), 'MMM dd')} to {format(new Date(payroll.periodEnd), 'MMM dd, yyyy')} - ${payroll.netSalary.toFixed(2)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPayroll && (
              <div className="flex gap-2">
                <Button onClick={generatePDF} className="flex-1">
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button onClick={printPayslip} variant="outline" className="flex-1">
                  <Printer className="mr-2 h-4 w-4" />
                  Print Payslip
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedPayroll && (
        <Card>
          <CardHeader>
            <CardTitle>Payslip Preview</CardTitle>
            <CardDescription>Preview of the payslip that will be generated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white space-y-4">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">PAYSLIP</h2>
                <p className="text-sm text-muted-foreground">Generated on: {format(new Date(), "PPP")}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Employee Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Employee Name:</span>{" "}
                    <span className="font-medium">{selectedPayroll.userName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pay Period:</span>{" "}
                    <span className="font-medium">
                      {format(new Date(selectedPayroll.periodStart), "MMM dd, yyyy")} - {format(new Date(selectedPayroll.periodEnd), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span className="font-medium uppercase">{selectedPayroll.status}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Salary Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Base Salary</span>
                    <span className="font-medium">${selectedPayroll.baseSalary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Allowances</span>
                    <span className="font-medium">${selectedPayroll.totalAllowances.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Overtime Amount</span>
                    <span className="font-medium text-green-600">${selectedPayroll.overtimeAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Deductions</span>
                    <span className="font-medium text-destructive">-${selectedPayroll.totalDeductions.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="bg-primary text-primary-foreground p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Net Salary:</span>
                  <span className="text-2xl font-bold">${selectedPayroll.netSalary.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground italic pt-4">
                This is a computer-generated payslip and does not require a signature.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
