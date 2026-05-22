import {
  AtSign,
  Calendar,
  Code2,
  FileText,
  Hash,
  Mail,
  MessageSquare,
  Search,
  ShoppingCart,
  Sparkles,
  StickyNote,
} from "lucide-react";

const APPS: { icon: typeof Mail; name: string; tag: string }[] = [
  { icon: Mail, name: "Mail", tag: "Concept-mails" },
  { icon: AtSign, name: "Gmail", tag: "Browser-mail" },
  { icon: FileText, name: "Word", tag: "Documenten" },
  { icon: FileText, name: "Pages", tag: "Documenten" },
  { icon: StickyNote, name: "Notion", tag: "Notities" },
  { icon: StickyNote, name: "Apple Notes", tag: "Snelle notities" },
  { icon: MessageSquare, name: "Slack", tag: "Berichten" },
  { icon: MessageSquare, name: "Teams", tag: "Chats" },
  { icon: Sparkles, name: "ChatGPT", tag: "Lange prompts" },
  { icon: Sparkles, name: "Claude", tag: "Lange prompts" },
  { icon: Sparkles, name: "Copilot & Gemini", tag: "AI-tools" },
  { icon: Search, name: "Google", tag: "Zoekbalk" },
  { icon: Hash, name: "Discord", tag: "Chats" },
  { icon: Code2, name: "VS Code", tag: "Commentaar typen" },
  { icon: ShoppingCart, name: "Webwinkel", tag: "Reviews" },
  { icon: Calendar, name: "Agenda", tag: "Afspraaknotities" },
];

export function WorksAnywhereSection() {
  return (
    <section
      className="relative px-4 py-16 sm:px-6 sm:py-20 lg:px-14"
      style={{ background: "var(--bg-deep)" }}
      id="werkt-overal"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <span className="chip">Werkt overal</span>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            In elke app waar je{" "}
            <span style={{ color: "var(--orange)" }}>kunt typen</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[color:var(--text-muted)] sm:text-lg">
            Mail, notities, documenten, chats, AI-tools, formulieren op
            websites — als er een tekstcursor in zit, kun je het inspreken.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={`${app.name}-${app.tag}`}
                className="group flex items-center gap-3 rounded-2xl bg-white p-4 transition-all"
                style={{
                  border: "1px solid var(--border-soft)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <span
                  className="grid size-10 flex-shrink-0 place-items-center rounded-xl"
                  style={{
                    background: "var(--aqua-50)",
                    color: "var(--navy-500)",
                  }}
                >
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <div
                    className="truncate text-sm font-semibold"
                    style={{ color: "var(--navy)" }}
                  >
                    {app.name}
                  </div>
                  <div
                    className="truncate text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {app.tag}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p
          className="mx-auto mt-8 max-w-xl text-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          + elke andere app waar je in een tekstveld kunt typen. Werkt op
          systeem-niveau via je sneltoets — geen plugins, geen extensies.
        </p>
      </div>
    </section>
  );
}
