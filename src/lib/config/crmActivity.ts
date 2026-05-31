// Dicteren.ai — CRM activity-engine SSOT
//
// Single source of truth voor de AM-activity-laag: types, richtingen,
// statussen en de outcome-dropdowns per interactie-type. Het drizzle-schema
// (crmActivities.ts) en de SQL-migratie (0024) leiden hun pgEnum-waarden hier
// vandaan via ALL_OUTCOME_KEYS. De UI leest de labels/iconen hier.

export type ActivityType = "call" | "email" | "linkedin" | "meeting" | "note";
export type ActivityDirection = "outbound" | "inbound" | "internal";
export type ActivityStatus = "planned" | "done" | "canceled";

export type ActivityOutcome = {
  key: string;
  label: string;
};

export type ActivityTypeMeta = {
  key: ActivityType;
  label: string;
  icon: string; // lucide-react component-naam
  directions: ActivityDirection[];
  outcomes: ActivityOutcome[];
};

export const ACTIVITY_TYPES: ActivityTypeMeta[] = [
  {
    key: "call",
    label: "Telefoon",
    icon: "Phone",
    directions: ["outbound", "inbound"],
    outcomes: [
      { key: "connected", label: "Contact gehad" },
      { key: "no_answer", label: "Geen gehoor" },
      { key: "voicemail", label: "Voicemail" },
      { key: "wrong_number", label: "Verkeerd nummer" },
      { key: "callback_requested", label: "Wil teruggebeld" },
      { key: "busy", label: "In gesprek" },
    ],
  },
  {
    key: "email",
    label: "E-mail",
    icon: "Mail",
    directions: ["outbound", "inbound"],
    outcomes: [
      { key: "sent", label: "Verstuurd" },
      { key: "replied", label: "Beantwoord" },
      { key: "bounced", label: "Gebounced" },
      { key: "no_reply", label: "Geen reactie" },
    ],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "Linkedin",
    directions: ["outbound", "inbound"],
    outcomes: [
      { key: "request_sent", label: "Verzoek verstuurd" },
      { key: "accepted", label: "Geaccepteerd" },
      { key: "replied", label: "Gereageerd" },
      { key: "no_response", label: "Geen reactie" },
    ],
  },
  {
    key: "meeting",
    label: "Afspraak",
    icon: "CalendarCheck",
    directions: ["internal"],
    outcomes: [
      { key: "held", label: "Gehouden" },
      { key: "no_show", label: "No-show" },
      { key: "rescheduled", label: "Verzet" },
      { key: "canceled", label: "Geannuleerd" },
    ],
  },
  {
    key: "note",
    label: "Notitie",
    icon: "StickyNote",
    directions: ["internal"],
    outcomes: [],
  },
];

export const NEXT_ACTION_PRESETS = [
  { key: "tomorrow", label: "Morgen", addDays: 1 },
  { key: "in_3_days", label: "Over 3 dagen", addDays: 3 },
  { key: "next_week", label: "Volgende week", addDays: 7 },
  { key: "in_2_weeks", label: "Over 2 weken", addDays: 14 },
] as const;

export type NextActionPresetKey = (typeof NEXT_ACTION_PRESETS)[number]["key"];

export const ACTIVITY_DIRECTION_LABELS: Record<ActivityDirection, string> = {
  outbound: "Uitgaand",
  inbound: "Inkomend",
  internal: "Intern",
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  planned: "Gepland",
  done: "Gedaan",
  canceled: "Geannuleerd",
};

// Alle outcome-keys van alle types samengevoegd en uniek. Dit is de bron voor
// de crm_activity_outcome pgEnum — die moet elke key kennen die enige type kan
// produceren.
export const ALL_OUTCOME_KEYS: string[] = Array.from(
  new Set(ACTIVITY_TYPES.flatMap((t) => t.outcomes.map((o) => o.key))),
);

// ---- Helpers ----

export function activityTypeMeta(
  type: ActivityType,
): ActivityTypeMeta | undefined {
  return ACTIVITY_TYPES.find((t) => t.key === type);
}

export function activityTypeLabel(type: ActivityType): string {
  return activityTypeMeta(type)?.label ?? type;
}

export function outcomesForType(type: ActivityType): ActivityOutcome[] {
  return activityTypeMeta(type)?.outcomes ?? [];
}

export function isValidOutcome(type: ActivityType, outcome: string): boolean {
  return outcomesForType(type).some((o) => o.key === outcome);
}

/** Toegestane richtingen voor een type (uit de SSOT). */
export function directionsForType(type: ActivityType): ActivityDirection[] {
  return activityTypeMeta(type)?.directions ?? [];
}

/** Of een richting geldig is voor een type. Houdt de dropdown-vocabulary leidend. */
export function isValidDirection(
  type: ActivityType,
  dir: ActivityDirection,
): boolean {
  return directionsForType(type).includes(dir);
}

/** Standaard-richting voor een type: de eerste toegestane (val terug op intern). */
export function defaultDirectionForType(type: ActivityType): ActivityDirection {
  return directionsForType(type)[0] ?? "internal";
}

export function outcomeLabel(type: ActivityType, outcome: string): string {
  return outcomesForType(type).find((o) => o.key === outcome)?.label ?? outcome;
}

export function directionLabel(dir: ActivityDirection): string {
  return ACTIVITY_DIRECTION_LABELS[dir] ?? dir;
}
