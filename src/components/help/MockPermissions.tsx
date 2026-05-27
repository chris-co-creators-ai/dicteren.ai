import { Accessibility, Check, Mic } from "lucide-react";
import { TauriWindow } from "./TauriWindow";

function Row({
  icon,
  title,
  desc,
  granted,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  granted: boolean;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl border p-4"
      style={{
        borderColor: "var(--border)",
        background: granted ? "#F4FBF6" : "white",
      }}
    >
      <span
        className="grid size-11 place-items-center rounded-xl"
        style={{
          background: granted ? "#E7F8EC" : "var(--aqua-50)",
        }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[color:var(--text)]">
          {title}
        </div>
        <div className="mt-0.5 text-xs text-[color:var(--text-muted)]">
          {desc}
        </div>
      </div>
      {granted ? (
        <span
          className="grid size-7 place-items-center rounded-full"
          style={{ background: "#2E8543" }}
        >
          <Check className="size-4 text-white" strokeWidth={2.5} />
        </span>
      ) : (
        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: "var(--orange-500)" }}
        >
          Toestaan
        </button>
      )}
    </div>
  );
}

export function MockPermissions() {
  return (
    <TauriWindow title="Toestemmingen" platform="mac" className="max-w-lg">
      <div className="px-6 py-6">
        <h3 className="text-base font-bold text-[color:var(--navy)]">
          Twee dingen toestaan
        </h3>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Dit hoef je maar één keer te doen.
        </p>

        <div className="mt-4 space-y-3">
          <Row
            icon={
              <Mic
                className="size-5"
                style={{ color: "#2E8543" }}
                strokeWidth={2}
              />
            }
            title="Microfoon"
            desc="Zodat het programma jouw stem hoort."
            granted={true}
          />
          <Row
            icon={
              <Accessibility
                className="size-5"
                style={{ color: "var(--orange-600)" }}
                strokeWidth={2}
              />
            }
            title="Toegankelijkheid"
            desc="Zodat je tekst in elk programma terechtkomt."
            granted={false}
          />
        </div>
      </div>
    </TauriWindow>
  );
}
