import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getColumnPrefs,
  setColumnPrefs,
  type ColumnKey,
} from "@/lib/services/columnPrefs";

export async function GET() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Admin-rechten vereist" },
      { status: 403 },
    );
  }
  const prefs = await getColumnPrefs(session.user.id);
  return NextResponse.json({ success: true, prefs });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Admin-rechten vereist" },
      { status: 403 },
    );
  }

  let body: {
    visibleColumns?: ColumnKey[];
    columnOrder?: ColumnKey[];
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
  });

  return NextResponse.json({ success: true });
}
