import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  getColumnPrefs,
  setColumnPrefs,
  type ColumnKey,
} from "@/lib/services/columnPrefs";

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
    visibleColumns: body.visibleColumns,
    columnOrder: body.columnOrder,
    columnWidths:
      body.columnWidths && typeof body.columnWidths === "object"
        ? body.columnWidths
        : {},
  });

  return NextResponse.json({ success: true });
}
