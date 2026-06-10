// SSOT voor call-center dispositions in het CRM. Eén bron: de UI-dropdown, de API-
// validatie, de timeline-labels en de taak-aanmaak lezen hier allemaal uit. Geen
// string-literals elders. Een nieuwe dispositie voeg je hier toe, nergens anders.
//
// Een dispositie is de uitkomst van één belpoging. Hij logt altijd een crm_event
// (timeline + touch-count) en zet — afhankelijk van `task` — een vervolgtaak met een
// datum. Stages wijzigt de AM zelf; een dispositie raakt de stage nooit aan.

export type DispositionGroup =
  | "no_contact" // geen contact gehad
  | "wrong_person" // contact, niet de beslisser
  | "spoke_followup" // beslisser gesproken, er volgt iets
  | "spoke_rejection"; // beslisser gesproken, afwijzing

/** Wat de dispositie als vervolgtaak zet. */
export type TaskBehavior =
  | "callback" // terugbel-taak
  | "task" // andere taak (deck/offerte/demo sturen)
  | "nurture" // taak ver in de toekomst
  | "none"; // geen taak, alleen loggen

/** Hoe de datum van de vervolgtaak bepaald wordt. */
export type DateMode =
  | "auto" // systeem zet due_at op vandaag + defaultDays
  | "am_choice" // AM kiest de datum (en bij callback ook tijd)
  | "none";

/** Permanente markering op de organisatie, los van de timeline. */
export type DispositionFlag = "do_not_call" | "wrong_number";

export interface Disposition {
  key: string; // opgeslagen in crm_org_tasks.kind en crm_events
  label: string; // NL, getoond in de dropdown + timeline
  group: DispositionGroup;
  task: TaskBehavior;
  taskTitle?: string; // titel van de gezette taak (bij task/callback/nurture)
  dateMode: DateMode;
  defaultDays?: number; // bij dateMode 'auto'
  flag?: DispositionFlag; // zet een permanente vlag op de org
}

export const DISPOSITION_GROUP_LABEL: Record<DispositionGroup, string> = {
  no_contact: "Geen contact",
  wrong_person: "Niet de beslisser",
  spoke_followup: "Gesproken — vervolg",
  spoke_rejection: "Gesproken — afwijzing",
};

export const DISPOSITIONS: Disposition[] = [
  // --- Geen contact ---
  { key: "no_answer", label: "Geen gehoor", group: "no_contact", task: "callback", taskTitle: "Terugbellen", dateMode: "auto", defaultDays: 1 },
  { key: "busy", label: "In gesprek / bezet", group: "no_contact", task: "callback", taskTitle: "Terugbellen", dateMode: "auto", defaultDays: 0 },
  { key: "voicemail_left", label: "Voicemail — ingesproken", group: "no_contact", task: "callback", taskTitle: "Terugbellen na voicemail", dateMode: "auto", defaultDays: 2 },
  { key: "voicemail_none", label: "Voicemail — niet ingesproken", group: "no_contact", task: "callback", taskTitle: "Terugbellen", dateMode: "auto", defaultDays: 1 },
  { key: "unreachable", label: "Niet bereikbaar", group: "no_contact", task: "callback", taskTitle: "Terugbellen", dateMode: "auto", defaultDays: 3 },
  { key: "wrong_number", label: "Verkeerd / ongeldig nummer", group: "no_contact", task: "none", dateMode: "none", flag: "wrong_number" },

  // --- Niet de beslisser ---
  { key: "gatekeeper", label: "Gatekeeper gesproken", group: "wrong_person", task: "callback", taskTitle: "Terugbellen voor beslisser", dateMode: "am_choice" },
  { key: "dm_absent", label: "Beslisser afwezig", group: "wrong_person", task: "callback", taskTitle: "Terugbellen voor beslisser", dateMode: "am_choice" },
  { key: "wrong_person", label: "Verkeerde persoon / afdeling", group: "wrong_person", task: "callback", taskTitle: "Terugbellen juiste persoon", dateMode: "am_choice" },

  // --- Gesproken — vervolg ---
  { key: "call_back_later", label: "Bel later terug", group: "spoke_followup", task: "callback", taskTitle: "Terugbellen (afspraak)", dateMode: "am_choice" },
  { key: "send_deck", label: "Partnerdeck sturen", group: "spoke_followup", task: "task", taskTitle: "Partnerdeck sturen", dateMode: "am_choice" },
  { key: "send_quote", label: "Offerte sturen", group: "spoke_followup", task: "task", taskTitle: "Offerte sturen", dateMode: "am_choice" },
  { key: "plan_demo", label: "Demo / afspraak plannen", group: "spoke_followup", task: "task", taskTitle: "Demo plannen", dateMode: "am_choice" },
  { key: "thinking", label: "Bedenktijd / nabellen", group: "spoke_followup", task: "callback", taskTitle: "Nabellen", dateMode: "am_choice" },
  { key: "interested", label: "Geïnteresseerd (warm)", group: "spoke_followup", task: "callback", taskTitle: "Opvolgen", dateMode: "am_choice" },

  // --- Gesproken — afwijzing ---
  { key: "not_interested", label: "Niet geïnteresseerd", group: "spoke_rejection", task: "none", dateMode: "none" },
  { key: "bad_timing", label: "Timing niet goed", group: "spoke_rejection", task: "nurture", taskTitle: "Later opnieuw benaderen", dateMode: "am_choice" },
  { key: "has_solution", label: "Heeft al een oplossing", group: "spoke_rejection", task: "none", dateMode: "none" },
  { key: "no_budget", label: "Geen budget", group: "spoke_rejection", task: "none", dateMode: "none" },
  { key: "do_not_call", label: "Niet meer bellen (opt-out)", group: "spoke_rejection", task: "none", dateMode: "none", flag: "do_not_call" },
];

export const DISPOSITION_BY_KEY: Record<string, Disposition> = Object.fromEntries(
  DISPOSITIONS.map((d) => [d.key, d]),
);

export function dispositionLabel(key: string | null | undefined): string {
  if (!key) return "—";
  return DISPOSITION_BY_KEY[key]?.label ?? key;
}

/** Dispositions gegroepeerd, voor een gegroepeerde dropdown in de UI. */
export function dispositionsByGroup(): Array<{ group: DispositionGroup; label: string; items: Disposition[] }> {
  const order: DispositionGroup[] = ["no_contact", "wrong_person", "spoke_followup", "spoke_rejection"];
  return order.map((g) => ({
    group: g,
    label: DISPOSITION_GROUP_LABEL[g],
    items: DISPOSITIONS.filter((d) => d.group === g),
  }));
}
