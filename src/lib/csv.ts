// Dicteren.ai — Shared CSV parser
// Eén canonieke implementatie voor admin-CRM CSV-imports + scripts.
// Auto-detect separator (`,` of `;`) tenzij expliciet meegegeven.
// Verwerkt quoted fields, escaped quotes (""), BOM, CRLF/LF.

export type CsvOptions = {
  /** Forceer een separator. Anders auto-detect uit de header-regel. */
  separator?: "," | ";";
};

/** Parseer CSV naar een array van rijen (zonder header-interpretatie). */
export function parseCsv(input: string, options?: CsvOptions): string[][] {
  const rows: string[][] = [];
  // Strip UTF-8 BOM als die er in zit (Excel-exports).
  const trimmed = input.replace(/^﻿/, "");

  const sep =
    options?.separator ??
    (() => {
      const firstLine = trimmed.split(/\r?\n/)[0] ?? "";
      return firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
    })();

  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inQuotes) {
      if (c === '"') {
        if (trimmed[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === sep) {
        current.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (field !== "" || current.length > 0) {
          current.push(field);
          rows.push(current);
          current = [];
          field = "";
        }
        if (c === "\r" && trimmed[i + 1] === "\n") i++;
      } else {
        field += c;
      }
    }
  }
  if (field !== "" || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows.filter((r) => r.length > 0 && r.some((c) => c.trim()));
}

/** Parseer CSV met header-rij en data-rijen apart terug. */
export function parseCsvWithHeader(
  input: string,
  options?: CsvOptions,
): { header: string[]; rows: string[][] } {
  const all = parseCsv(input, options);
  const [header = [], ...rest] = all;
  return { header, rows: rest };
}

/** Lege string → null. Handig voor optionele DB-velden uit CSV. */
export function emptyToNull(v: string): string | null {
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}
