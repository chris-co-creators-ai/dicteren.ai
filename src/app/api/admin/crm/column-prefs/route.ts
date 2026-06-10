import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  getColumnPrefs,
  setColumnPrefs,
  type ColumnKey,
} from "@/lib/services/columnPrefs";
import {
  COLUMN_LABELS,
  COLUMN_MIN_WIDTH,
  COLUMN_MAX_WIDTH,
} from "@/lib/services/columnPrefsShared";

// Sanering: alleen bekende built-in keys of "custom:…"-keys, gecapt zodat een
// kwaadwillende of kapotte client de jsonb-kolom niet onbeperkt kan vullen.
const MAX_KEYS = 100;

function isValidKey(v: unknown): v is string {
  return (
    typeof v === "string" &&
    (v in COLUMN_LABELS || (v.startsWith("custom:") && v.length <= 120))
  );
}

function sanitizeKeys(arr: unknown[]): ColumnKey[] {
  return arr.filter(isValidKey).slice(0, MAX_KEYS) as ColumnKey[];
}

function sanitizeWidths(obj: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!isValidKey(k) || typeof v !== "number" || Number.isNaN(v)) continue;
    out[k] = Math.min(COLUMN_MAX_WIDTH, Math.max(COLUMN_MIN_WIDTH, Math.round(v)));
    if (Object.keys(out).length >= MAX_KEYS) break;
  }
  return out;
}

export async function GET() {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const prefs = await getColumnPrefs(guard.session.user.id);
  return NextResponse.json({ success: true, prefs });
}

export async function PATCH(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;

  let body: {
    visibleColumns?: ColumnKey[];
    columnOrder?: ColumnKey[];
    columnWidths?: Record<string, number>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(body.visibleColumns) ||
    !Array.isArray(body.columnOrder)
  ) {
    return NextResponse.json(
      { success: false, error: "visibleColumns[] en columnOrder[] verplicht" },
      { status: 400 },
    );
  }

  await setColumnPrefs(session.user.id, {
    visibleColumns: sanitizeKeys(body.visibleColumns),
    columnOrder: sanitizeKeys(body.columnOrder),
    columnWidths:
      body.columnWidths && typeof body.columnWidths === "object"
        ? sanitizeWidths(body.columnWidths as Record<string, unknown>)
        : {},
  });

  return NextResponse.json({ success: true });
}
