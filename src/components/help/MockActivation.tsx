import { Key } from "lucide-react";
import { TauriWindow } from "./TauriWindow";

export function MockActivation() {
  return (
    <TauriWindow
      title="Dicteren.ai — Licentie"
      platform="mac"
      className="max-w-md"
    >
      <div className="px-7 py-7">
        <div
          className="mx-auto grid size-12 place-items-center rounded-xl"
          style={{ background: "var(--orange-50)" }}
        >
          <Key
            className="size-5"
            style={{ color: "var(--orange-600)" }}
            strokeWidth={2}
          />
        </div>
        <h3 className="mt-4 text-center text-base font-bold text-[color:var(--navy)]">
          Licentie activeren
        </h3>
        <p className="mt-1 text-center text-xs text-[color:var(--text-muted)]">
          Vul de code in uit je e-mail.
        </p>

        <div className="mt-5">
          <label className="text-xs font-semibold text-[color:var(--text)]">
            Licentiecode
          </label>
          <div
            className="mt-2 rounded-xl border bg-white px-3 py-3 font-mono text-sm tracking-wider"
            style={{ borderColor: "var(--orange-300)" }}
          >
            DICT-2026-XXXX-YYYY
          </div>
          <p className="mt-1.5 text-xs text-[color:var(--text-muted)]">
            Code staat in de mail van info@dicteren.ai.
          </p>
        </div>

        <button
          type="button"
          className="mt-5 w-full rounded-full px-4 py-2.5 text-sm font-bold text-white"
          style={{ background: "var(--orange-500)" }}
        >
          Activeer mijn licentie
        </button>
      </div>
    </TauriWindow>
  );
}
