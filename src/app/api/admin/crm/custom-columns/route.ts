import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  createCustomColumn,
  listCustomColumns,
  type CustomColumnType,
} from "@/lib/services/customColumns";

export async function GET() {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const columns = await listCustomColumns();
  return NextResponse.json({ success: true, columns });
}

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;

  let body: {
    name?: string;
    type?: CustomColumnType;
    options?: string[] | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!body.name?.trim() || !body.type) {
    return NextResponse.json(
      { success: false, error: "name en type verplicht" },
      { status: 400 },
    );
  }
  if (!["text", "number", "date", "select"].includes(body.type)) {
    return NextResponse.json(
      { success: false, error: "type moet text/number/date/select zijn" },
      { status: 400 },
    );
  }
  if (body.type === "select" && (!body.options || body.options.length === 0)) {
    return NextResponse.json(
      { success: false, error: "options[] verplicht voor select" },
      { status: 400 },
    );
  }

  const column = await createCustomColumn({
    name: body.name.trim(),
    type: body.type,
    options: body.options ?? null,
    ownerUserId: session.user.id,
  });

  return NextResponse.json({ success: true, column });
}
