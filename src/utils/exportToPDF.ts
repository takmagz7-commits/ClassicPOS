import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  data: any[][];
  filename: string;
  businessName?: string;
  summary?: Array<{ label: string; value: string }>;
}

export const exportToPDF = (options: PDFExportOptions) => {
  const { title, subtitle, headers, data, filename, businessName, summary } = options;

  const doc = new jsPDF();
  
  let yPosition = 20;

  if (businessName) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, 105, yPosition, { align: 'center' });
    yPosition += 10;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, yPosition, { align: 'center' });
  yPosition += 8;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 105, yPosition, { align: 'center' });
    yPosition += 8;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPosition, { align: 'center' });
  yPosition += 10;

  if (summary && summary.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', 14, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    summary.forEach(item => {
      doc.text(`${item.label}: ${item.value}`, 14, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: yPosition,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 10, left: 14, right: 14 },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`${filename}.pdf`);
};

export const formatNumberForPDF = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};

export const formatDateForPDF = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString();
};
