export type AudienceSlug =
  | "ondernemers"
  | "advocaten"
  | "zorgprofessionals"
  | "coaches-therapeuten"
  | "accountants-administratie"
  | "makelaars"
  | "recruiters-hr"
  | "studenten-onderzoekers"
  | "schrijvers-contentmakers"
  | "dyslexie";

export type UseCase = { time: string; title: string; desc: string };
export type Objection = { q: string; a: string };
export type RelatedPost = { title: string; meta: string };

export type Audience = {
  slug: AudienceSlug;
  chip: string;
  title: string;
  subtitle: string;
  intro: string;
  heroImageLabel: string;
  savingsLabel: string;
  savingsValue: string;
  useCasesHeading: string;
  useCases: [UseCase, UseCase, UseCase, UseCase];
  quote: { text: string; name: string; role: string };
  objections: [Objection, Objection, Objection];
  related: [RelatedPost, RelatedPost, RelatedPost];
};

export const AUDIENCES: Record<AudienceSlug, Audience> = {
  ondernemers: {
    slug: "ondernemers",
    chip: "Ondernemers & freelancers",
    title: "Je gedachten zijn sneller dan je toetsenbord.",
    subtitle: "Voor zelfstandigen die de hele dag schakelen tussen mail, offertes en gesprekken.",
    intro:
      "Als ondernemer schakel je 30 keer per dag tussen e-mail, offertes en gesprekken. Vertel het in plaats van typen, en houd ruimte over voor het echte werk.",
    heroImageLabel: "ondernemer · laptop · keukentafel",
    savingsLabel: "Vandaag bespaard",
    savingsValue: "1u 24m",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "07:45", title: "Inbox legen", desc: "Vier mailtjes in vier minuten beantwoorden." },
      { time: "10:20", title: "Offerte concept", desc: "Brief naar nieuwe klant in één take." },
      { time: "14:00", title: "AI-prompt", desc: "Marketingideeën met de juiste achtergrond." },
      { time: "18:15", title: "Avond-memo", desc: "Memo voor morgen inspreken in plaats van uitwerken." },
    ],
    quote: {
      text: "Ik dicteerde nooit eerder. Maar mijn ChatGPT-prompts zijn beter geworden. En ik sluit nu 's avonds gewoon op tijd m'n laptop.",
      name: "Wouter K.",
      role: "Eigenaar adviesbureau · Utrecht",
    },
    objections: [
      { q: "Mijn Nederlands is met accent", a: "Het model is gemaakt voor standaard-Nederlands (ABN). Een licht accent gaat meestal prima. Sterke dialecten zoals Brabants, Limburgs of Fries werken minder goed." },
      { q: "Ik werk met gevoelige info", a: "Lokale verwerking. Audio en tekst verlaten je computer niet." },
      { q: "Ik vind dicteren raar", a: "Begin met losse notities. De meeste mensen wennen binnen een paar dagen." },
    ],
    related: [
      { title: "Hoe ik mijn maandafsluiting halveerde met dicteren", meta: "Productiviteit · 6 min" },
      { title: "Privacy als ondernemer: wat blijft echt lokaal?", meta: "Privacy & AI · 8 min" },
      { title: "Standaard-Nederlands en accenten: wat herkent het model wel?", meta: "Nederlandse taal · 5 min" },
    ],
  },
  advocaten: {
    slug: "advocaten",
    chip: "Advocaten & juristen",
    title: "Dossiermemo direct na het gesprek. Geen achterstand na afloop.",
    subtitle: "Voor zaken waar elk detail telt en je tijd schaars is.",
    intro:
      "Een uur cliëntoverleg betekent vaak twee uur uitwerken. Spreek je waarnemingen direct na de zitting in, zolang alles vers is. Gestructureerd op papier, lokaal op je apparaat.",
    heroImageLabel: "advocaat · dossier · pen",
    savingsLabel: "Dossier-tijd bespaard",
    savingsValue: "2u 18m",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "09:10", title: "Post-intake", desc: "Feitencomplex inspreken zolang de intake nog vers is." },
      { time: "11:30", title: "Pleitnotitie", desc: "Argumentatielijn dicteren tussen zittingen door." },
      { time: "15:00", title: "Dossiermemo", desc: "Bevindingen vastleggen voor het team." },
      { time: "17:45", title: "Brief naar klant", desc: "Toelichting in begrijpelijke taal." },
    ],
    quote: {
      text: "Ik kan tussen twee zittingen door in tien minuten een pleitnotitie op papier krijgen die anders een uur kostte. Mijn cliënten betalen voor inhoud, niet voor typewerk.",
      name: "Lisa V.",
      role: "Senior associate · Amsterdam",
    },
    objections: [
      { q: "Mag dit met beroepsgeheim?", a: "Lokale verwerking. Audio en transcript blijven op je computer. Geen doorgifte naar de cloud." },
      { q: "Juridische taal en eigennamen?", a: "Het model herkent juridisch jargon. Eigennamen kun je toevoegen aan de woordenlijst." },
      { q: "Concentreren tijdens dicteren?", a: "Korte stukken werken het beste. Spreek per onderdeel, niet per dossier." },
    ],
    related: [
      { title: "Beroepsgeheim en lokale spraakherkenning: een korte juridische check", meta: "Privacy & AI · 9 min" },
      { title: "Snel een pleitnotitie dicteren: een werkwijze", meta: "Productiviteit · 7 min" },
      { title: "Dossiermemo's na zittingen: een werkwijze", meta: "Productiviteit · 5 min" },
    ],
  },
  zorgprofessionals: {
    slug: "zorgprofessionals",
    chip: "Zorgprofessionals",
    title: "Rapporteren tussen consulten door, niet erna.",
    subtitle: "Voor huisartsen, fysiotherapeuten, psychologen en specialisten.",
    intro:
      "Administratie kost meer tijd dan ooit. Spreek je SOEP-rapportage in direct na het consult. Direct in je EPD. Lokaal verwerkt. Geen audio-upload.",
    heroImageLabel: "zorgprofessional · praktijk",
    savingsLabel: "Administratie per dag",
    savingsValue: "55 min",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "08:30", title: "Consult rapporteren", desc: "SOEP direct in het EPD na het consult." },
      { time: "11:00", title: "Verwijsbrief", desc: "Brief aan specialist in eigen woorden." },
      { time: "14:15", title: "MDO-conclusie", desc: "Eigen samenvatting direct na het overleg." },
      { time: "17:00", title: "Patiëntbrief", desc: "Heldere uitleg voor de patiënt thuis." },
    ],
    quote: {
      text: "Mijn administratie loopt niet meer twee weken achter. Ik dicteer tussen patiënten door en sluit de praktijk op tijd af.",
      name: "Dr. Marielle B.",
      role: "Huisarts · Groningen",
    },
    objections: [
      { q: "Mag dit met patiëntgegevens?", a: "Lokale verwerking is verenigbaar met AVG voor medische gegevens. Geen cloud-doorgifte." },
      { q: "Medische termen?", a: "Het V3-model is getraind op brede Nederlandse data, inclusief medische terminologie." },
      { q: "Past dit in mijn EPD?", a: "Dicteren.ai werkt overal waar je kunt typen. Dus ook in je EPD-velden." },
    ],
    related: [
      { title: "AVG en lokale spraakherkenning in de zorg", meta: "Privacy & AI · 10 min" },
      { title: "SOEP-rapportage dicteren: zo doe je het sneller", meta: "Productiviteit · 6 min" },
      { title: "Medische termen toevoegen aan je woordenlijst", meta: "Nederlandse taal · 4 min" },
    ],
  },
  "coaches-therapeuten": {
    slug: "coaches-therapeuten",
    chip: "Coaches & therapeuten",
    title: "Sessieverslagen op jouw manier, niet die van een sjabloon.",
    subtitle: "Voor coaches, therapeuten en counselors met eigen werkwijze.",
    intro:
      "Een sessie ademt nuance. Die past niet in een vinkjeslijst. Spreek je waarnemingen, hypotheses en vervolgstappen in zoals jij ze ziet.",
    heroImageLabel: "coach · gespreksstoel · notitieboek",
    savingsLabel: "Verslagen per sessie",
    savingsValue: "12 min",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "10:00", title: "Tussen sessies", desc: "Verslag van vorige sessie direct vastleggen." },
      { time: "12:30", title: "Hypothese", desc: "Theoretisch denkraam uitwerken voor jezelf." },
      { time: "15:45", title: "Cliënt-feedback", desc: "Reactie op huiswerk samenvatten." },
      { time: "20:00", title: "Avond-notitie", desc: "Inzicht van de dag vastleggen." },
    ],
    quote: {
      text: "Ik kan eindelijk weer écht luisteren tijdens de sessie. Het verslag praat ik er na afloop in vijf minuten in.",
      name: "Sanne D.",
      role: "Systeemtherapeut · Den Haag",
    },
    objections: [
      { q: "Kwetsbare cliëntinformatie?", a: "Lokale verwerking. Audio en transcript blijven op jouw computer." },
      { q: "Eigen werkwijze behouden?", a: "Geen sjabloon. Je spreekt zoals je denkt. De tekst volgt." },
      { q: "Tijd om te dicteren?", a: "Vijf minuten tussen sessies volstaat voor een degelijk verslag." },
    ],
    related: [
      { title: "Wat dicteren doet met de aandacht in een sessie", meta: "Productiviteit · 6 min" },
      { title: "Privacy bij systeemtherapie: lokale verwerking uitgelegd", meta: "Privacy & AI · 8 min" },
      { title: "Verslag schrijven zonder sjabloon: een werkbare structuur", meta: "Productiviteit · 5 min" },
    ],
  },
  "accountants-administratie": {
    slug: "accountants-administratie",
    chip: "Accountants & administratie",
    title: "Memo's, mails en kwartaalrapporten. Spreek ze in plaats van typen.",
    subtitle: "Voor accountants, administratief medewerkers en bookkeepers.",
    intro:
      "Een goede toelichting bij een kwartaalrapport vraagt om denken, niet om typen. Spreek de redenering in. Houd je toetsenbord vrij voor de cijfers zelf.",
    heroImageLabel: "accountant · spreadsheet · koffie",
    savingsLabel: "Memo-tijd per week",
    savingsValue: "3u 40m",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "09:00", title: "Klantmemo", desc: "Toelichting bij kwartaalcijfers." },
      { time: "11:30", title: "Inkoop-e-mail", desc: "Vraag aan leverancier in eigen toon." },
      { time: "14:00", title: "Adviesnotitie", desc: "Belangrijkste afwegingen op papier." },
      { time: "16:30", title: "Beleidsstuk", desc: "Intern proces beschrijven." },
    ],
    quote: {
      text: "Mijn kwartaaltoelichtingen zijn beter geworden. Niet korter, maar beter. Klanten lezen ze nu echt.",
      name: "Joris H.",
      role: "Senior accountant · Eindhoven",
    },
    objections: [
      { q: "Vertrouwelijke cijfers?", a: "Lokale verwerking. Geen cloud-doorgifte van audio of tekst." },
      { q: "Cijfers en formules?", a: "Voor formules blijf je typen. Voor toelichting en e-mails is dicteren sneller." },
      { q: "Werkt het in mijn boekhoudpakket?", a: "Dicteren.ai werkt in elk tekstveld. Dus ook in Exact, Twinfield, AFAS en Excel." },
    ],
    related: [
      { title: "Kwartaalmemo's die klanten daadwerkelijk lezen", meta: "Productiviteit · 7 min" },
      { title: "Privacy in een accountancy-praktijk", meta: "Privacy & AI · 9 min" },
      { title: "Excel-toelichtingen dicteren: tips uit de praktijk", meta: "Productiviteit · 5 min" },
    ],
  },
  makelaars: {
    slug: "makelaars",
    chip: "Makelaars",
    title: "Bezichtigingsverslag dat nog ruikt naar de woning.",
    subtitle: "Voor woning- en bedrijfsmakelaars die 's avonds niet meer aan typen toekomen.",
    intro:
      "Acht bezichtigingen op een dag betekent 's avonds vier uur uitwerken. Open je laptop tussen twee afspraken in en spreek je observaties in zolang de woning vers in je hoofd zit. Geen avond meer kwijt aan rapportage.",
    heroImageLabel: "makelaar · laptop · auto",
    savingsLabel: "Per bezichtiging",
    savingsValue: "9 min",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "10:45", title: "Direct na de bezichtiging", desc: "Eerste indruk inspreken op je laptop in de auto." },
      { time: "12:30", title: "Tussen twee woningen", desc: "Observaties van de vorige afspraak afwerken." },
      { time: "14:15", title: "Klantmail", desc: "Persoonlijke indruk verzenden tussen twee afspraken." },
      { time: "18:30", title: "Vraagprijs-onderbouwing", desc: "Argumentatie van de dag op kantoor." },
    ],
    quote: {
      text: "Mijn bezichtigingsverslagen zijn rijker dan ooit. Klanten krijgen 's avonds een mail met de echte sfeer, niet alleen een checklist.",
      name: "Bram T.",
      role: "Woningmakelaar · Haarlem",
    },
    objections: [
      { q: "Tijdens een bezichtiging dicteren?", a: "Niet binnen tussen klanten — wel achter je laptop in de auto direct na afloop. Daar gaat de kracht in zitten." },
      { q: "Werkt het zonder internet?", a: "Het taalmodel staat lokaal op je laptop. Geen internet nodig, dus ook in de auto bij slecht bereik." },
      { q: "Vertrouwelijke klantinfo?", a: "Audio en transcript verlaten je apparaat niet. Veilig voor portefeuille-informatie." },
    ],
    related: [
      { title: "Bezichtigingsroutes en dicteer-pauzes", meta: "Productiviteit · 5 min" },
      { title: "Offline dicteren: hoe en wanneer", meta: "Privacy & AI · 4 min" },
      { title: "Vraagprijsonderbouwing in vijf minuten", meta: "Productiviteit · 6 min" },
    ],
  },
  "recruiters-hr": {
    slug: "recruiters-hr",
    chip: "Recruiters & HR",
    title: "Intakeverslagen schrijven zonder mee te typen tijdens het gesprek.",
    subtitle: "Voor recruiters, hiring managers en HR-business partners.",
    intro:
      "Een intake waarin je zit te notuleren is een gemiste intake. Spreek je observaties, beoordeling en vervolgstappen in zodra het gesprek klaar is. Terwijl alles nog vers is.",
    heroImageLabel: "recruiter · interviewruimte",
    savingsLabel: "Per intake",
    savingsValue: "18 min",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "09:30", title: "Post-intake", desc: "Observaties direct vastleggen." },
      { time: "12:00", title: "Kandidaat-mail", desc: "Persoonlijke afwijzing of doorgang." },
      { time: "14:30", title: "Beoordelingsmemo", desc: "Argumentatie naar hiring team." },
      { time: "16:45", title: "1-op-1 verslag", desc: "Gesprek met medewerker samenvatten." },
    ],
    quote: {
      text: "Onze intakes zijn echte gesprekken geworden. Ik notuleer niet meer. Ik luister, en ik spreek mijn indruk er na afloop in.",
      name: "Hanne L.",
      role: "Senior recruiter · Rotterdam",
    },
    objections: [
      { q: "Privacy-gevoelig?", a: "Geen cloud-doorgifte. Audio en transcripties blijven op je computer." },
      { q: "Eerlijke beoordeling?", a: "Dicteren bevordert juist nuance. Korter dwingt niet, langer wel." },
      { q: "ATS-koppeling?", a: "Dicteren.ai werkt in elk tekstveld, ook in je ATS." },
    ],
    related: [
      { title: "Intakes voeren zonder notuleerlast", meta: "Productiviteit · 6 min" },
      { title: "Wat AVG en spraakherkenning betekent voor HR", meta: "Privacy & AI · 8 min" },
      { title: "Beoordelingsmemo's die hiring managers daadwerkelijk lezen", meta: "Productiviteit · 5 min" },
    ],
  },
  "studenten-onderzoekers": {
    slug: "studenten-onderzoekers",
    chip: "Studenten & onderzoekers",
    title: "Van gedachte naar leesbare tekst in één stap.",
    subtitle: "Voor universitair en wetenschappelijk werk.",
    intro:
      "Een reflectie tijdens het lezen. Een veldnotitie direct na het interview. Een samenvatting na een werkgroep. Spreek het in, krijg leesbare tekst, werk later uit.",
    heroImageLabel: "student · boeken · laptop",
    savingsLabel: "Per veldnotitie",
    savingsValue: "8 min",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "10:00", title: "Lees-reflectie", desc: "Gedachte bij een artikel direct vasthouden." },
      { time: "13:00", title: "Veldnotitie", desc: "Verslag direct na het interview, zolang het vers is." },
      { time: "15:30", title: "Werkgroep-samenvatting", desc: "Belangrijkste argumenten inspreken." },
      { time: "21:00", title: "Reflectie-dagboek", desc: "Inzicht van de dag vastleggen." },
    ],
    quote: {
      text: "Ik lees nu vier artikelen op een dag in plaats van twee. De reflectie spreek ik in, niet meer in steno op papier.",
      name: "Tom K.",
      role: "PhD-kandidaat · Wageningen",
    },
    objections: [
      { q: "Wetenschappelijke termen?", a: "Voeg je vakgebied-terminologie toe aan de woordenlijst. Werkt vanaf dag 1." },
      { q: "Engels schrijven?", a: "Dicteren v3 werkt alleen voor Nederlands. Voor Engelse tekst blijf je voor nu typen. Andere talen onderzoeken we voor een volgende versie." },
      { q: "Anonimiseren?", a: "Lokale verwerking. Audio en transcript verlaten je apparaat niet." },
    ],
    related: [
      { title: "Veldnotities maken zonder mee te schrijven", meta: "Productiviteit · 6 min" },
      { title: "Wetenschappelijke termen toevoegen aan je woordenlijst", meta: "Nederlandse taal · 4 min" },
      { title: "Privacy in kwalitatief onderzoek", meta: "Privacy & AI · 8 min" },
    ],
  },
  "schrijvers-contentmakers": {
    slug: "schrijvers-contentmakers",
    chip: "Schrijvers & contentmakers",
    title: "Eerste versies dicteren. Tweede versies typen.",
    subtitle: "Voor copywriters, journalisten en bloggers.",
    intro:
      "De eerste versie is de moeilijkste. Spreek hem in. Onaf, ruw, levend. Daarna heb je iets om mee te werken in plaats van een leeg scherm.",
    heroImageLabel: "schrijver · raam · koffie",
    savingsLabel: "Eerste versie per stuk",
    savingsValue: "32 min",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "08:30", title: "Eerste opzet", desc: "Stroom van gedachten op papier." },
      { time: "11:00", title: "Interview-vragen", desc: "Brainstorm voorbereiden." },
      { time: "14:30", title: "Social copy", desc: "Tien variaties dicteren." },
      { time: "20:00", title: "Avondidee", desc: "Open haard, idee, weg ermee." },
    ],
    quote: {
      text: "Mijn eerste versies zijn nu binnen een half uur klaar. Daarna komt het echte werk, maar het lege scherm is verleden tijd.",
      name: "Iris M.",
      role: "Freelance copywriter · Utrecht",
    },
    objections: [
      { q: "Stijl verliezen?", a: "Een eerste versie heeft nog geen stijl. Die kneed je erna." },
      { q: "Dicteren voelt anders schrijven?", a: "Ja, en dat is het punt. Andere ritme, andere zinslengte, vaak betere ideeën." },
      { q: "Tekstpassages opslaan?", a: "Tekst landt direct in je document. Geen cloud-tussenstap." },
    ],
    related: [
      { title: "Eerste versies dicteren: een werkwijze", meta: "Productiviteit · 7 min" },
      { title: "Wat dicteren met je stijl doet", meta: "Nederlandse taal · 6 min" },
      { title: "Schrijfblokkade en stem-eerst werken", meta: "Productiviteit · 5 min" },
    ],
  },
  dyslexie: {
    slug: "dyslexie",
    chip: "Dyslexie & typstrain",
    title: "Een toetsenbord is niet de enige weg naar tekst.",
    subtitle: "Voor wie typen lastig, traag of pijnlijk is.",
    intro:
      "Dyslexie, RSI, reuma, artrose of een motorische beperking. Wat de reden ook is, typen hoeft niet de norm te zijn. Spreek je gedachte uit, krijg leesbare tekst en blijf zelfstandig schrijven in elke app.",
    heroImageLabel: "handen · ergonomisch werkplek",
    savingsLabel: "Toetsaanslagen bespaard",
    savingsValue: "vandaag 12.400",
    useCasesHeading: "Vier momenten waarop het écht helpt.",
    useCases: [
      { time: "08:00", title: "Mail beantwoorden", desc: "Zonder zoeken naar de juiste spelling." },
      { time: "10:30", title: "Document schrijven", desc: "In je eigen woorden, zonder typedruk." },
      { time: "13:30", title: "Formulier invullen", desc: "Velden in apps en op websites." },
      { time: "17:00", title: "WhatsApp en chat", desc: "Persoonlijke berichten zonder gedoe." },
    ],
    quote: {
      text: "Voor het eerst sinds tien jaar lees ik mijn eigen mails terug zonder schaamte. Dicteren.ai schrijft wat ik bedoel, niet wat mijn vingers raakten.",
      name: "Sandra J.",
      role: "Met dyslexie, ondernemer · Tilburg",
    },
    objections: [
      { q: "Spelling klopt vanzelf?", a: "Het V3-model spelt en interpunkt correct. Dat haalt een grote zorg weg." },
      { q: "Werkt het bij Nederlands met accent?", a: "Het model is gemaakt voor standaard-Nederlands (ABN). Een licht accent gaat meestal goed. Spreek je een sterk dialect, dan herkent het de woorden minder goed." },
      { q: "Wat als ik niet vloeiend spreek?", a: "Pauzes, herhaling, opnieuw beginnen. Het model haalt het er allemaal uit. Spreek zoals jij spreekt." },
    ],
    related: [
      { title: "Dyslexie en spraak-naar-tekst: een dagelijkse werkwijze", meta: "Toegankelijkheid · 8 min" },
      { title: "RSI voorkomen door dicteren: wanneer werkt het?", meta: "Toegankelijkheid · 6 min" },
      { title: "Reuma en motorische beperking: spreken in plaats van typen", meta: "Toegankelijkheid · 7 min" },
    ],
  },
};

export const AUDIENCE_LIST: Audience[] = Object.values(AUDIENCES);
