import { Plus, X } from "lucide-react";
import { TauriWindow } from "./TauriWindow";

const WORDS = ["Bleeker", "Kranenburg", "Keyholders", "Dicteren.ai", "Cialdini"];

export function MockCustomWords() {
  return (
    <TauriWindow
      title="Dicteren.ai — Eigen woorden"
      platform="mac"
      className="max-w-lg"
    >
      <div className="px-6 py-6">
        <h3 className="text-sm font-bold text-[color:var(--navy)]">
          Eigen woorden
        </h3>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Namen of woorden die het programma vaak verkeerd hoort.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)" }}
            placeholder="Nieuw woord, bijvoorbeeld een achternaam"
            defaultValue=""
            readOnly
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white"
            style={{ background: "var(--orange-500)" }}
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            Toevoegen
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {WORDS.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
              style={{
                background: "var(--aqua-50)",
                borderColor: "var(--aqua-200)",
                color: "var(--navy)",
              }}
            >
              {w}
              <X className="size-3 cursor-pointer opacity-50" strokeWidth={2.5} />
            </span>
          ))}
        </div>

        <p className="mt-4 text-xs text-[color:var(--text-muted)]">
          Hoe vaker een woord hier staat, hoe beter het straks de klank herkent.
        </p>
      </div>
    </TauriWindow>
  );
}
