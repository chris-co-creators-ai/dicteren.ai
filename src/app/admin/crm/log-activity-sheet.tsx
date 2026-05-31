"use client";

import { useMemo, useState, type ReactNode } from "react";

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
import { Label } from "@/components/ui/label";
import {
  ACTIVITY_TYPES,
  ACTIVITY_DIRECTION_LABELS,
  NEXT_ACTION_PRESETS,
  activityTypeMeta,
  directionLabel,
  outcomesForType,
  type ActivityDirection,
  type ActivityType,
} from "@/lib/config/crmActivity";

type Props = {
  orgId: string;
  orgName?: string | null;
  trigger?: ReactNode;
  onLogged?: () => void;
};

// Format a Date for an <input type="datetime-local"> value (local time, no zone).
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function presetDueDate(addDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function LogInteractionSheet({
  orgId,
  orgName,
  trigger,
  onLogged,
}: Props) {
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<ActivityType>("call");
  const [direction, setDirection] = useState<ActivityDirection>("outbound");
  const [outcome, setOutcome] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState<string>(() =>
    toLocalInputValue(new Date()),
  );
  const [note, setNote] = useState<string>("");

  const [nextType, setNextType] = useState<ActivityType>("call");
  const [nextPreset, setNextPreset] = useState<string>("in_3_days");
  const [nextCustomDate, setNextCustomDate] = useState<string>(() =>
    toLocalInputValue(presetDueDate(3)),
  );
  const [nextNote, setNextNote] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = activityTypeMeta(type);
  const directions = meta?.directions ?? [];
  const showDirection = directions.length > 1;
  const outcomes = outcomesForType(type);
  const showOutcome = type !== "note";
  const nextActionRequired = type !== "note";

  const showNextCustomDate = nextPreset === "custom";

  function resetForm() {
    setType("call");
    setDirection("outbound");
    setOutcome("");
    setOccurredAt(toLocalInputValue(new Date()));
    setNote("");
    setNextType("call");
    setNextPreset("in_3_days");
    setNextCustomDate(toLocalInputValue(presetDueDate(3)));
    setNextNote("");
    setError(null);
  }

  function onTypeChange(value: ActivityType) {
    setType(value);
    // Cascade-reset: bij type-wissel direction + outcome opnieuw zetten.
    const next = activityTypeMeta(value);
    setDirection(next?.directions[0] ?? "outbound");
    setOutcome("");
  }

  function nextDueAt(): Date | null {
    if (nextPreset === "custom") {
      if (!nextCustomDate) return null;
      const d = new Date(nextCustomDate);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const preset = NEXT_ACTION_PRESETS.find((p) => p.key === nextPreset);
    if (!preset) return null;
    return presetDueDate(preset.addDays);
  }

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!occurredAt) return false;
    if (nextActionRequired && !nextDueAt()) return false;
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting, nextActionRequired, nextPreset, nextCustomDate, type, occurredAt]);

  async function submit() {
    setError(null);

    const occurred = new Date(occurredAt);
    if (Number.isNaN(occurred.getTime())) {
      setError("Vul een geldig tijdstip in.");
      return;
    }

    let nextTask:
      | { type: ActivityType; dueAt: string; note?: string }
      | undefined;
    if (nextActionRequired) {
      const due = nextDueAt();
      if (!due) {
        setError("Kies een volgende stap met een datum.");
        return;
      }
      nextTask = {
        type: nextType,
        dueAt: due.toISOString(),
        note: nextNote.trim() || undefined,
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/crm/organizations/${orgId}/interactions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type,
            direction,
            outcome: showOutcome && outcome ? outcome : undefined,
            note: note.trim() || undefined,
            occurredAt: occurred.toISOString(),
            nextTask,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error ?? "Loggen mislukt.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setOpen(false);
      resetForm();
      onLogged?.();
    } catch {
      setError("Loggen mislukt door een netwerkfout.");
      setSubmitting(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button variant="outline" size="sm">
              Interactie loggen
            </Button>
          )
        }
      />
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Interactie loggen</SheetTitle>
          <SheetDescription>
            Organisatie{orgName ? ` · ${orgName}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="grid gap-1.5">
            <Label htmlFor="activity-type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => onTypeChange(value as ActivityType)}
              items={ACTIVITY_TYPES.map((t) => ({
                value: t.key,
                label: t.label,
              }))}
            >
              <SelectTrigger id="activity-type" className="w-full">
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

          {showDirection && (
            <div className="grid gap-1.5">
              <Label htmlFor="activity-direction">Richting</Label>
              <Select
                value={direction}
                onValueChange={(value) =>
                  setDirection(value as ActivityDirection)
                }
                items={directions.map((d) => ({
                  value: d,
                  label: ACTIVITY_DIRECTION_LABELS[d],
                }))}
              >
                <SelectTrigger id="activity-direction" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {directions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {directionLabel(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showOutcome && (
            <div className="grid gap-1.5">
              <Label htmlFor="activity-outcome">Resultaat</Label>
              <Select
                value={outcome}
                onValueChange={(value) => setOutcome(value as string)}
                items={outcomes.map((o) => ({
                  value: o.key,
                  label: o.label,
                }))}
              >
                <SelectTrigger id="activity-outcome" className="w-full">
                  <SelectValue placeholder="Kies een resultaat" />
                </SelectTrigger>
                <SelectContent>
                  {outcomes.map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="activity-occurred">Wanneer</Label>
            <input
              id="activity-occurred"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="activity-note">Notitie</Label>
            <Textarea
              id="activity-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optioneel"
            />
          </div>

          {nextActionRequired && (
            <div className="grid gap-3 rounded-lg border border-border p-3">
              <div className="text-sm font-medium text-foreground">
                Volgende stap
              </div>
              <p className="text-xs text-muted-foreground">
                Plan de eerstvolgende actie. Zonder vervolgstap blijft dit
                contact liggen.
              </p>

              <div className="grid gap-1.5">
                <Label htmlFor="next-type">Type</Label>
                <Select
                  value={nextType}
                  onValueChange={(value) => setNextType(value as ActivityType)}
                  items={ACTIVITY_TYPES.map((t) => ({
                    value: t.key,
                    label: t.label,
                  }))}
                >
                  <SelectTrigger id="next-type" className="w-full">
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
                <Label htmlFor="next-when">Wanneer</Label>
                <Select
                  value={nextPreset}
                  onValueChange={(value) => setNextPreset(value as string)}
                  items={[
                    ...NEXT_ACTION_PRESETS.map((p) => ({
                      value: p.key,
                      label: p.label,
                    })),
                    { value: "custom", label: "Eigen datum" },
                  ]}
                >
                  <SelectTrigger id="next-when" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NEXT_ACTION_PRESETS.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Eigen datum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showNextCustomDate && (
                <div className="grid gap-1.5">
                  <Label htmlFor="next-custom-date">Datum</Label>
                  <input
                    id="next-custom-date"
                    type="datetime-local"
                    value={nextCustomDate}
                    onChange={(e) => setNextCustomDate(e.target.value)}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  />
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="next-note">Notitie</Label>
                <Textarea
                  id="next-note"
                  value={nextNote}
                  onChange={(e) => setNextNote(e.target.value)}
                  placeholder="Optioneel"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting ? "Bezig met opslaan" : "Loggen"}
          </Button>
          <SheetClose
            render={
              <Button variant="ghost" disabled={submitting}>
                Annuleren
              </Button>
            }
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
