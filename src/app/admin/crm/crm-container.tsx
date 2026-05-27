"use client";

// Client-side tab-switcher tussen Personen-view (CrmView) en Organisaties-
// view (OrganizationsView). Geen navigatie naar andere URL — beide
// datasets zijn server-side opgehaald en client-side gemount.

import { useState, type ComponentProps } from "react";
import { CrmView } from "./crm-view";
import { OrganizationsView } from "./organizations/organizations-view";

type PeopleProps = Omit<ComponentProps<typeof CrmView>, "activeTab" | "onTabChange">;
type OrgsProps = Omit<ComponentProps<typeof OrganizationsView>, "activeTab" | "onTabChange">;

export function CrmContainer({
  peopleProps,
  orgsProps,
  initialTab,
}: {
  peopleProps: PeopleProps;
  orgsProps: OrgsProps;
  initialTab?: "people" | "organizations";
}) {
  const [tab, setTab] = useState<"people" | "organizations">(
    initialTab ?? "people",
  );

  if (tab === "people") {
    return (
      <CrmView {...peopleProps} activeTab={tab} onTabChange={setTab} />
    );
  }
  return (
    <OrganizationsView {...orgsProps} activeTab={tab} onTabChange={setTab} />
  );
}
