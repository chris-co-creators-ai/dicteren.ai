// Dicteren.ai — SourceBadge
//
// Eén chip die de bron van een klant toont. Leest CUSTOMER_SOURCE_BADGES
// uit lib/services/customerSource (SSOT). Hergebruikt in /admin/users +
// /admin/organizations + /admin/crm.

import {
  Clock,
  FileText,
  Gift,
  Heart,
  Megaphone,
  Phone,
  ShoppingCart,
  TrendingUp,
  Upload,
  User,
  Users,
  Zap,
} from "lucide-react";
import {
  CUSTOMER_SOURCE_BADGES,
  type CustomerSourceKey,
} from "@/lib/services/customerSource";

const ICONS = {
  User,
  Clock,
  Phone,
  ShoppingCart,
  TrendingUp,
  Users,
  Heart,
  Gift,
  Upload,
  FileText,
  Zap,
  Megaphone,
} as const;

const CHIP_CLASS: Record<string, string> = {
  navy:   "bg-[color:var(--bg-deep)] text-[color:var(--navy)]",
  aqua:   "bg-cyan-50 text-cyan-800",
  orange: "bg-orange-50 text-[color:var(--orange-600)]",
  green:  "bg-green-50 text-green-800",
  purple: "bg-purple-50 text-purple-800",
  gray:   "bg-gray-100 text-gray-700",
  red:    "bg-red-50 text-red-700",
};

export function SourceBadge({
  source,
  detail,
  compact = false,
}: {
  source: CustomerSourceKey;
  detail?: string | null;
  compact?: boolean;
}) {
  const meta = CUSTOMER_SOURCE_BADGES[source];
  if (!meta) return null;
  const Icon = ICONS[meta.icon];
  const cls = CHIP_CLASS[meta.color] ?? CHIP_CLASS.gray;
  const title = detail ? `${meta.label}: ${detail}` : meta.label;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold ${cls}`}
    >
      <Icon className="size-3" strokeWidth={2.2} />
      {!compact && <span>{meta.label}</span>}
      {!compact && detail && (
        <span className="font-normal opacity-70">· {detail}</span>
      )}
    </span>
  );
}
