export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateEnum(value, enumValues, fieldName) {
  if (!value || String(value).trim() === "") return null;
  const upper = String(value).trim().toUpperCase();
  if (!enumValues.includes(upper)) {
    return `${fieldName}: "${value}" is not valid. Allowed values: ${enumValues.join(", ")}`;
  }
  return null;
}

export async function validateUnique(checkFn, value, fieldName, rowNumber) {
  if (!value || String(value).trim() === "") return null;
  const isDuplicate = await checkFn(String(value).trim());
  if (isDuplicate) {
    return `${fieldName} "${value}" already exists (row ${rowNumber})`;
  }
  return null;
}

export async function validateLookup(resolveFn, value, fieldName, rowNumber) {
  if (!value || String(value).trim() === "") return { id: null, error: null };
  const result = await resolveFn(String(value).trim());
  if (result === null || result === undefined) {
    return { id: null, error: `${fieldName} "${value}" not found (row ${rowNumber})` };
  }
  return { id: result, error: null };
}
