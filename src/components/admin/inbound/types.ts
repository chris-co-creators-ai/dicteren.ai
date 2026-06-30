// Inbound — shared client types for the dashboard shell + pages.
import type { Proposal, ProposalStatus } from "@/lib/inbound/data";

export type Page = "overview" | "campaign" | "keywords" | "proposals" | "vicky";
export type NavFn = (page: Page, arg?: string | null) => void;

export interface InboundStore {
  proposals: Proposal[];
  session: Set<string>;
  setStatus: (id: string, status: ProposalStatus, extra?: Partial<Proposal>) => void;
  addProposal: (p: Proposal) => void;
  toast: (msg: string) => void;
}
