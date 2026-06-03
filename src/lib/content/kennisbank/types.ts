import type { ReactNode } from "react";

// De kennisbank is onze plek van waarheid voor alle gebruikersdocumentatie.
// Eén bron, drie afnemers: /kennisbank (publiek), /veelgestelde-vragen (FAQ-subset)
// en /account (ingelogd, dezelfde artikelen verrijkt met server-side eigen data).

// Voor wie het artikel bedoeld is. Bepaalt waar het opduikt.
//  - visitor:  publieke bezoeker (pre-purchase)
//  - customer: ingelogde klant (post-purchase, kan een interactief blok krijgen)
//  - both:     overal relevant
export type KbAudience = "visitor" | "customer" | "both";

// Een interactief blok wordt in het account-dashboard gevuld met de eigen data
// van de ingelogde gebruiker. Publiek toont het artikel alleen de uitleg.
export type KbInteractive = "devices" | "invoices" | "subscription";

export type KbArticle = {
  slug: string; // uniek binnen de categorie, url-veilig
  title: string; // de vraag, zoals de gebruiker hem zou stellen
  summary: string; // één regel, voor zoeken + kaarten
  audience: KbAudience;
  faq?: boolean; // tonen op /veelgestelde-vragen
  interactive?: KbInteractive; // live data in het dashboard
  body: ReactNode; // rijke uitleg, mag schermplaatjes (Mock*) bevatten
};

export type KbCategory = {
  slug: string; // url-veilig, tevens anker-id
  number: string; // volgnummer in de index
  title: string;
  intro?: string;
  articles: KbArticle[];
};

// Lichtgewicht item voor client-side zoeken (geen JSX, veilig naar de browser).
export type KbSearchItem = {
  title: string;
  summary: string;
  category: string;
  href: string;
};
