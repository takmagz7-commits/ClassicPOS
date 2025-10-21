export interface PrinterSettings {
  printerName: string;
  printerType: "thermal" | "inkjet" | "laser" | "dot-matrix";
  connectionType: "usb" | "network" | "bluetooth";
  ipAddress?: string;
  port?: number;
  bluetoothAddress?: string;
}