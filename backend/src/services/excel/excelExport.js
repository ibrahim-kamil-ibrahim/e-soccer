import ExcelJS from "exceljs";
import { getTemplate } from "./excelTemplates.js";

export async function exportToExcel(entity, records, fields) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(entity.charAt(0).toUpperCase() + entity.slice(1));

  // Header row
  const headerRow = worksheet.addRow(fields.map((f) => f.header));

  // Style header
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      patternType: "solid",
      fgColor: { argb: "FF16A34A" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  // Data rows
  for (const record of records) {
    const row = worksheet.addRow(fields.map((f) => {
      let val = record[f.field];
      if (val === null || val === undefined) return "";
      if (f.type === "boolean") return val ? "Yes" : "No";
      if (f.type === "date" && val instanceof Date) return val.toISOString().split("T")[0];
      return val;
    }));
  }

  // Auto-width columns
  worksheet.columns.forEach((col) => {
    let maxLength = col.header.length;
    col.model.eachRow?.((row) => {
      // simplified: just use header length
    });
    col.width = Math.max(maxLength + 2, 12);
  });

  // Set column widths based on header length
  worksheet.columns = worksheet.columns.map((col) => ({
    ...col,
    width: Math.max(col.width || 12, col.header?.length + 2 || 12),
  }));

  return await workbook.xlsx.writeBuffer();
}

export async function generateTemplate(entity) {
  const template = getTemplate(entity);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(entity.charAt(0).toUpperCase() + entity.slice(1));

  // Header row with styling
  const headerRow = worksheet.addRow(template.columns.map((c) => c.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      patternType: "solid",
      fgColor: { argb: "FF16A34A" },
    };
  });

  // Example row (second row) with example values in italics
  const exampleRow = worksheet.addRow(template.columns.map((c) => {
    const val = c.example;
    if (c.type === "boolean") return val ? "Yes" : "No";
    if (c.type === "number" && typeof val === "number") return val;
    if (c.type === "date" && val) return val;
    return val || "";
  }));
  exampleRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: "FF64748B" } };
  });

  // Add a third empty row for clarity
  worksheet.addRow(template.columns.map(() => ""));

  // Column widths
  worksheet.columns = worksheet.columns.map((col) => ({
    ...col,
    width: Math.max(col.width || 12, String(col.header).length + 4),
  }));

  return await workbook.xlsx.writeBuffer();
}
