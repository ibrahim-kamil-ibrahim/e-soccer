import ExcelJS from "exceljs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { getTemplate } from "./excelTemplates.js";
import { validateLookup } from "./validators.js";
import { matchStatusFlags, slugify } from "../helpers.js";

export async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error("No worksheet found in the Excel file");

  const rows = [];
  const headers = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      let val = cell.value;
      if (val instanceof Date) val = val.toISOString().split("T")[0];
      if (val === null || val === undefined) val = "";
      values.push(val);
    });
    if (rowNumber === 1) {
      headers.push(...values);
    } else if (values.some((v) => v !== "" && v !== null)) {
      rows.push(values);
    }
  });

  return { headers, rows };
}

const ENTITY_MODELS = {
  teams: "team",
  players: "player",
  matches: "match",
  competitions: "competition",
  cities: "city",
  news: "newsArticle",
  users: "adminUser",
  media: "media",
};

function resolveModelName(entity) {
  if (ENTITY_MODELS[entity]) return ENTITY_MODELS[entity];
  return entity.charAt(0).toLowerCase() + entity.slice(1);
}

function toModelRecord(entity, record) {
  const data = { ...record };
  if (entity === "teams") {
    data.competitionId = data.competitionName ?? undefined;
    delete data.competitionName;
    if (!data.slug && data.name) data.slug = slugify(data.name);
  }
  if (entity === "players") {
    data.teamId = data.teamName ?? undefined;
    delete data.teamName;
    if (!data.age && data.dateOfBirth) {
      data.age = Math.floor((Date.now() - new Date(data.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
  }
  if (entity === "matches") {
    data.competitionId = data.competitionName ?? undefined;
    data.homeTeamId = data.homeTeamName ?? undefined;
    data.awayTeamId = data.awayTeamName ?? undefined;
    delete data.competitionName;
    delete data.homeTeamName;
    delete data.awayTeamName;
    if (data.status) {
      const flags = matchStatusFlags(data.status);
      data.status = flags.status;
      data.isLive = flags.isLive;
      data.isFinished = flags.isFinished;
    }
    if (data.timeField === null || data.timeField === undefined) delete data.timeField;
  }
  if (entity === "users") {
    if (data.email) data.email = String(data.email).toLowerCase().trim();
    if (data.username === "") delete data.username;
    if (data.password) data.passwordHash = bcrypt.hashSync(String(data.password), 12);
    delete data.password;
    if (!data.role) data.role = "EDITOR";
    if (!data.status) data.status = "ACTIVE";
  }
  if (entity === "media") {
    if (!data.filename && data.url) data.filename = path.basename(String(data.url));
    if (data.size === undefined || data.size === null || Number.isNaN(data.size)) data.size = 0;
    if (!data.mimeType && data.url) {
      const ext = path.extname(String(data.url)).toLowerCase();
      const types = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };
      data.mimeType = types[ext] || "application/octet-stream";
    }
  }
  // Drop nulls so Prisma applies column defaults instead of rejecting explicit nulls
  for (const key of Object.keys(data)) {
    if (data[key] === null) delete data[key];
  }
  return data;
}

export async function validateAndImport(entity, rows, headers, userId, prisma, logActivity) {
  const template = getTemplate(entity);
  const columns = template.columns;
  const errors = [];
  const validRecords = [];
  const warningRecords = [];

  // Map header names to column indices (case-insensitive)
  const headerIndex = {};
  columns.forEach((col, idx) => {
    headerIndex[col.header.toLowerCase()] = idx;
  });

  // Map each data row to a record using header names if available, else column order
  const mappedRows = [];
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const record = {};
    const rowErrors = [];
    const rowWarnings = [];

    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const col = columns[colIdx];
      // Find the value index: prefer header match, fallback to column order
      let val;
      const headerLower = col.header.toLowerCase();
      if (headers && headers.length > colIdx && headers[colIdx].toLowerCase() === headerLower) {
        val = row[colIdx];
      } else if (headers) {
        // Try to find by header name
        const foundIdx = headers.findIndex((h) => h.toLowerCase() === headerLower);
        val = foundIdx >= 0 ? row[foundIdx] : row[colIdx];
      } else {
        val = row[colIdx];
      }

      if (val === null || val === undefined) val = "";
      val = String(val).trim();

      if (col.lookup) {
        if (val === "") {
          if (col.required) rowErrors.push(`${col.header} is required`);
          record[col.field] = null;
          continue;
        }
        const resolved = await validateLookup(
          async (name) => {
            const model = col.lookup.model;
            const result = await prisma[model].findFirst({
              where: { [col.lookup.displayField]: { contains: name, mode: "insensitive" } },
              select: { id: true },
            });
            return result ? result.id : null;
          },
          val,
          col.header,
          idx + 1
        );
        if (resolved.error) {
          rowErrors.push(resolved.error);
          record[col.field] = null;
        } else {
          record[col.field] = resolved.id;
        }
        continue;
      }

      if (col.enum && val !== "") {
        const upperVal = val.toUpperCase();
        if (!col.enum.includes(upperVal)) {
          rowErrors.push(`${col.header}: "${val}" is not valid. Allowed: ${col.enum.join(", ")}`);
          record[col.field] = null;
          continue;
        }
        record[col.field] = upperVal;
        continue;
      }

      if (col.type === "boolean") {
        const lower = val.toLowerCase();
        if (lower === "true" || lower === "yes" || lower === "1") record[col.field] = true;
        else if (lower === "false" || lower === "no" || lower === "0" || val === "") record[col.field] = col.required ? true : false;
        else rowErrors.push(`${col.header}: "${val}" is not a valid boolean (use true/false, yes/no, 1/0)`);
        continue;
      }

      if (col.type === "number") {
        if (val === "") {
          record[col.field] = null;
          if (col.required) rowErrors.push(`${col.header} is required`);
          continue;
        }
        const num = Number(val);
        if (isNaN(num)) {
          rowErrors.push(`${col.header}: "${val}" is not a valid number`);
          record[col.field] = null;
        } else {
          record[col.field] = num;
        }
        continue;
      }

      if (col.type === "date") {
        if (val === "") {
          record[col.field] = null;
          if (col.required) rowErrors.push(`${col.header} is required`);
          continue;
        }
        const parsed = new Date(val);
        if (isNaN(parsed.getTime())) {
          rowErrors.push(`${col.header}: "${val}" is not a valid date`);
          record[col.field] = null;
        } else {
          record[col.field] = parsed;
        }
        continue;
      }

      // String fields
      if (col.required && val === "") {
        rowErrors.push(`${col.header} is required`);
      }
      record[col.field] = val || null;
    }

    mappedRows.push({ idx, record, errors: rowErrors, warnings: rowWarnings });
  }

  // Validate uniqueness
  const uniqueFields = {
    teams: [{ field: "name", model: "Team", label: "Team Name" }],
    players: [{ field: "name", model: "Player", label: "Name" }],
    competitions: [{ field: "name", model: "Competition", label: "Name" }],
    cities: [{ field: "name", model: "City", label: "Name" }],
    news: [{ field: "slug", model: "NewsArticle", label: "Slug" }],
    users: [{ field: "email", model: "AdminUser", label: "Email" }],
  };

  const uniqueChecks = uniqueFields[entity] || [];
  for (const row of mappedRows) {
    for (const uc of uniqueChecks) {
      if (row.record[uc.field] && row.record[uc.field] !== null) {
        const existing = await prisma[uc.model].findFirst({
          where: { [uc.field]: row.record[uc.field] },
        });
        if (existing) {
          row.errors.push(`${uc.label} "${row.record[uc.field]}" already exists`);
        }
      }
    }
  }

  // News slug auto-generation
  if (entity === "news") {
    for (const row of mappedRows) {
      if (!row.record.slug || row.record.slug === null || row.record.slug === "") {
        row.record.slug = slugify(row.record.title || `article-${row.idx + 1}`);
      }
    }
  }

  // Users password handling
  if (entity === "users") {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    for (const row of mappedRows) {
      if (!row.record.password || row.record.password === null || row.record.password === "") {
        let pw = "";
        for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
        row.record.password = pw;
        row.warnings.push("Password not provided — a placeholder password was generated");
      }
    }
  }

  const validRows = mappedRows.filter((r) => r.errors.length === 0);
  const invalidRows = mappedRows.filter((r) => r.errors.length > 0);

  for (const row of invalidRows) {
    errors.push({ row: row.idx + 1, errors: row.errors, warnings: row.warnings });
  }
  for (const row of validRows) {
    if (row.warnings.length > 0) {
      warningRecords.push({ ...row.record, _warnings: row.warnings, _row: row.idx + 1 });
    }
    validRecords.push(row.record);
  }

  // Import in transaction
  let imported = 0;
  if (validRecords.length > 0) {
    const modelName = resolveModelName(entity);
    try {
      await prisma.$transaction(async (tx) => {
        for (const record of validRecords) {
          await tx[modelName].create({ data: toModelRecord(entity, record) });
          imported++;
        }
      });

      const entityLabel = entity.charAt(0).toUpperCase() + entity.slice(1);
      await logActivity(`Imported ${imported} ${entityLabel}${imported > 1 ? "s" : ""} from Excel`, {
        entity: entityLabel,
        userId,
      });
    } catch (err) {
      errors.push({ row: 0, errors: [`Import failed: ${err.message}`] });
      return {
        total: rows.length,
        valid: 0,
        failed: rows.length,
        imported: 0,
        errors,
        importedRecords: [],
      };
    }
  }

  return {
    total: rows.length,
    valid: validRecords.length,
    failed: invalidRows.length,
    imported,
    errors,
    warningRecords: warningRecords.map((w) => ({ row: w._row, warnings: w._warnings })),
    importedRecords:
      entity === "users"
        ? validRecords.map(({ password, ...rest }) => rest)
        : validRecords,
  };
}
