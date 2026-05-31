"use client";

// Dicteren.ai — Campagne-builder per lead-lijst
//
// Sheet waarin de account-manager de vervolgstappen van een lijst opbouwt: een
// keten van geplande acties (call/email/linkedin/meeting/note). Timing is
// relatief — elke stap valt een aantal dagen na de vorige. De AM kan stappen
// toevoegen, bewerken, herordenen en verwijderen, en de hele keten in één keer
// toepassen op alle lijst-leden. Mutaties alleen als canEdit waar is.
//
// Endpoint-contract (orchestrator bouwt de routes):
//   GET    /api/admin/lead-lists/{listId}/steps          -> { success, steps }
//   POST   /api/admin/lead-lists/{listId}/steps          -> { success, step }
//   PATCH  /api/admin/lead-lists/{listId}/steps/{stepId} -> { success, step }
//   DELETE /api/admin/lead-lists/{listId}/steps/{stepId} -> { success }
//   PATCH  /api/admin/lead-lists/{listId}/steps/reorder  -> { success }
//   POST   /api/admin/lead-lists/{listId}/apply-cadence  -> { success, membersAffected, activitiesCreated }

import { useState, type ReactNode } from "react";
import {
  Phone,
  Mail,
  Share2,
  CalendarCheck,
  StickyNote,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ACTIVITY_TYPES,
  activityTypeMeta,
  activityTypeLabel,
  type ActivityType,
} from "@/lib/config/crmActivity";

// ───── Types ─────

// Over de API komen dates als string (JSON). Spiegelt CrmCampaignStep uit
// services/leadListSteps.ts, maar met serialiseerbare velden.
type Step = {
  id: string;
  listId: string;
  position: number;
  type: ActivityType;
  delayDays: number;
  required: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  listId: string;
  listName: string;
  canEdit: boolean;
  trigger?: ReactNode;
  onApplied?: () => void;
};

// lucide-naam (uit SSOT) → component
const ICONS: Record<string, LucideIcon> = {
  Phone,
  Mail,
  Linkedin: Share2, // lucide-react in deze versie heeft geen LinkedIn-icon
  CalendarCheck,
  StickyNote,
};

function iconFor(type: ActivityType): LucideIcon {
  const meta = activityTypeMeta(type);
  return (meta && ICONS[meta.icon]) || StickyNote;
}

function delayLabel(delayDays: number, index: number): string {
  if (delayDays <= 0) {
    return index === 0 ? "Meteen bij start" : "Zelfde dag";
  }
  if (delayDays === 1) return "Na 1 dag";
  return `Na ${delayDays} dagen`;
}

// ───── Component ─────

export function LeadListCampaignSheet({
  listId,
  listName,
  canEdit,
  trigger,
  onApplied,
}: Props) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  async function loadSteps() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lead-lists/${listId}/steps`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error ?? "Stappen laden mislukt.");
        setLoading(false);
        return;
      }
      setSteps(Array.isArray(data.steps) ? data.steps : []);
      setLoading(false);
    } catch {
      setError("Stappen laden mislukt door een netwerkfout.");
      setLoading(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setApplyResult(null);
      void loadSteps();
    } else {
      setSteps([]);
      setError(null);
      setApplyResult(null);
    }
  }

  async function addStep() {
    setBusy(true);
    setError(null);
    setApplyResult(null);
    try {
      const res = await fetch(`/api/admin/lead-lists/${listId}/steps`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "call",
          delayDays: 2,
          required: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error ?? "Stap toevoegen mislukt.");
        setBusy(false);
        return;
      }
      await loadSteps();
      setBusy(false);
    } catch {
      setError("Stap toevoegen mislukt door een netwerkfout.");
      setBusy(false);
    }
  }

  async function patchStep(
    id: string,
    patch: Partial<Pick<Step, "type" | "delayDays" | "required" | "note">>,
  ) {
    // Optimistisch bijwerken zodat inline-edits soepel voelen.
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
    setError(null);
    setApplyResult(null);
    try {
      const res = await fetch(
        `/api/admin/lead-lists/${listId}/steps/${id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error ?? "Stap opslaan mislukt.");
        await loadSteps();
      }
    } catch {
      setError("Stap opslaan mislukt door een netwerkfout.");
      await loadSteps();
    }
  }

  async function removeStep(id: string) {
    setBusy(true);
    setError(null);
    setApplyResult(null);
    try {
      const res = await fetch(
        `/api/admin/lead-lists/${listId}/steps/${id}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error ?? "Stap verwijderen mislukt.");
        setBusy(false);
        return;
      }
      await loadSteps();
      setBusy(false);
    } catch {
      setError("Stap verwijderen mislukt door een netwerkfout.");
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;

    const next = [...steps];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setSteps(next);

    setBusy(true);
    setError(null);
    setApplyResult(null);
    try {
      const res = await fetch(
        `/api/admin/lead-lists/${listId}/steps/reorder`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderedIds: next.map((s) => s.id) }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error ?? "Volgorde opslaan mislukt.");
        await loadSteps();
        setBusy(false);
        return;
      }
      await loadSteps();
      setBusy(false);
    } catch {
      setError("Volgorde opslaan mislukt door een netwerkfout.");
      await loadSteps();
      setBusy(false);
    }
  }

  async function apply() {
    const ok = window.confirm(
      `Alle stappen toepassen op de leden van ${listName}? Voor elk lid worden de taken aangemaakt op zijn organisatie.`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setApplyResult(null);
    try {
      const res = await fetch(
        `/api/admin/lead-lists/${listId}/apply-cadence`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error ?? "Toepassen mislukt.");
        setBusy(false);
        return;
      }
      const members = Number(data.membersAffected ?? 0);
      const created = Number(data.tasksCreated ?? 0);
      const skipped = Number(data.skippedNoOrg ?? 0);
      setApplyResult(
        `${members} leden, ${created} taken gepland.` +
          (skipped > 0 ? ` ${skipped} overgeslagen (geen organisatie).` : ""),
      );
      setBusy(false);
      onApplied?.();
    } catch {
      setError("Toepassen mislukt door een netwerkfout.");
      setBusy(false);
    }
  }

  const hasSteps = steps.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button variant="outline" size="sm">
              Campagne
            </Button>
          )
        }
      />
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Campagne-stappen</SheetTitle>
          <SheetDescription>{listName}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {loading && (
            <p className="text-sm text-muted-foreground">Bezig met laden</p>
          )}

          {!loading && !hasSteps && (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">
                Nog geen stappen
              </p>
              <p>
                Hier bouw je de vaste vervolgstappen voor deze campagne op. Elke
                stap is een geplande actie die een aantal dagen na de vorige
                volgt. Voeg stappen toe en pas ze daarna in één keer toe op alle
                leden van de lijst.
              </p>
            </div>
          )}

          {!loading &&
            steps.map((step, index) => {
              const Icon = iconFor(step.type);
              return (
                <div
                  key={step.id}
                  className="grid gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Stap {index + 1}</Badge>
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {activityTypeLabel(step.type)}
                      </span>
                      {step.required ? (
                        <Badge variant="outline">Verplicht</Badge>
                      ) : null}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy || index === 0}
                          onClick={() => void move(index, -1)}
                          aria-label="Stap omhoog"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy || index === steps.length - 1}
                          onClick={() => void move(index, 1)}
                          aria-label="Stap omlaag"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          onClick={() => void removeStep(step.id)}
                          aria-label="Stap verwijderen"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {canEdit ? (
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor={`step-type-${step.id}`}>Type</Label>
                          <Select
                            value={step.type}
                            onValueChange={(value) =>
                              void patchStep(step.id, {
                                type: value as ActivityType,
                              })
                            }
                            items={ACTIVITY_TYPES.map((t) => ({
                              value: t.key,
                              label: t.label,
                            }))}
                          >
                            <SelectTrigger
                              id={`step-type-${step.id}`}
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTIVITY_TYPES.map((t) => (
                                <SelectItem key={t.key} value={t.key}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor={`step-delay-${step.id}`}>
                            Dagen na vorige stap
                          </Label>
                          <Input
                            id={`step-delay-${step.id}`}
                            type="number"
                            min={0}
                            value={step.delayDays}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const value =
                                Number.isFinite(raw) && raw >= 0
                                  ? Math.floor(raw)
                                  : 0;
                              void patchStep(step.id, { delayDays: value });
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id={`step-required-${step.id}`}
                          checked={step.required}
                          onCheckedChange={(checked) =>
                            void patchStep(step.id, { required: checked })
                          }
                        />
                        <Label htmlFor={`step-required-${step.id}`}>
                          Verplichte stap
                        </Label>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor={`step-note-${step.id}`}>Notitie</Label>
                        <Textarea
                          id={`step-note-${step.id}`}
                          value={step.note ?? ""}
                          onChange={(e) =>
                            void patchStep(step.id, {
                              note: e.target.value || null,
                            })
                          }
                          placeholder="Optioneel"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-1 text-sm text-muted-foreground">
                      <span>{delayLabel(step.delayDays, index)}</span>
                      {step.note ? (
                        <span className="text-foreground">{step.note}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}

          {canEdit && (
            <Button
              variant="outline"
              onClick={() => void addStep()}
              disabled={busy || loading}
            >
              <Plus className="size-4" />
              Stap toevoegen
            </Button>
          )}

          {applyResult && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
              {applyResult}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        {canEdit && (
          <>
            <Separator />
            <SheetFooter>
              <Button onClick={() => void apply()} disabled={busy || !hasSteps}>
                {busy ? "Bezig" : "Toepassen op lijst-leden"}
              </Button>
              <SheetClose
                render={
                  <Button variant="ghost" disabled={busy}>
                    Sluiten
                  </Button>
                }
              />
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
