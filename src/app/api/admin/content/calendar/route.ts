import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listCalendar } from "@/lib/services/content";
import { signDownload } from "@/lib/services/r2";

type Channel = Parameters<typeof listCalendar>[0]["channel"];

// Posts in een datumbereik voor de maand/week/dag-views, met een verse
// presigned thumbnail-URL per post.
export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  if (!fromStr || !toStr) {
    return NextResponse.json(
      { success: false, error: "from en to (ISO-datum) zijn verplicht" },
      { status: 400 },
    );
  }
  const from = new Date(fromStr);
  const to = new Date(toStr);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json(
      { success: false, error: "Ongeldige datum" },
      { status: 400 },
    );
  }

  const spaceId = url.searchParams.get("space") || undefined;
  const channel = (url.searchParams.get("channel") as Channel) || undefined;
  const assigneeUserId = url.searchParams.get("assignee") || undefined;

  const posts = await listCalendar({ from, to, spaceId, channel, assigneeUserId });

  // Thumbnails resolven naar presigned URL's (kort geldig).
  const withThumbs = await Promise.all(
    posts.map(async (p) => ({
      ...p,
      thumbnailUrl: p.thumbnailR2Key
        ? await signDownload(p.thumbnailR2Key, 1800).catch(() => null)
        : null,
    })),
  );

  return NextResponse.json({ success: true, posts: withThumbs });
}
