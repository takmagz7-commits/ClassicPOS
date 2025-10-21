export const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const csvHeaders = headers || Object.keys(data[0]);
  
  const csvRows = [
    csvHeaders.join(','),
    ...data.map(row => {
      return csvHeaders.map(header => {
        const value = row[header];
        
        if (value === null || value === undefined) {
          return '';
        }
        
        const stringValue = String(value);
        
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',');
    })
  ];

  const csvContent = csvRows.join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const formatDataForCSV = (data: any[], mapping?: Record<string, string>) => {
  if (!mapping) return data;
  
  return data.map(item => {
    const formatted: any = {};
    Object.entries(mapping).forEach(([key, label]) => {
      formatted[label] = item[key];
    });
    return formatted;
  });
};
