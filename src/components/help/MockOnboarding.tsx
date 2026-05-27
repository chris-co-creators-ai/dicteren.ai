import { CheckCircle2, Download } from "lucide-react";
import { TauriWindow } from "./TauriWindow";

export function MockOnboardingDownload() {
  return (
    <TauriWindow title="Dicteren.ai — Welkom" platform="mac" className="max-w-md">
      <div className="px-8 py-10 text-center">
        <div
          className="mx-auto grid size-16 place-items-center rounded-2xl"
          style={{ background: "var(--orange-50)" }}
        >
          <Download
            className="size-8"
            style={{ color: "var(--orange-600)" }}
            strokeWidth={1.8}
          />
        </div>
        <h3 className="mt-5 text-lg font-bold text-[color:var(--navy)]">
          Welkom bij Dicteren.ai
        </h3>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          We zetten het Nederlandse taalmodel klaar.
          <br />
          Dat doen we één keer.
        </p>

        <div className="mt-6">
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: "var(--aqua-100)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: "62%",
                background:
                  "linear-gradient(90deg, var(--aqua-400), var(--orange-500))",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Model downloaden... 62%
          </p>
        </div>

        <p className="mt-6 text-xs text-[color:var(--text-muted)]">
          Duurt ongeveer 2 tot 5 minuten.
        </p>
      </div>
    </TauriWindow>
  );
}

export function MockOnboardingDone() {
  return (
    <TauriWindow title="Dicteren.ai — Klaar" platform="mac" className="max-w-md">
      <div className="px-8 py-10 text-center">
        <div
          className="mx-auto grid size-16 place-items-center rounded-2xl"
          style={{ background: "#E7F8EC" }}
        >
          <CheckCircle2
            className="size-9"
            style={{ color: "#2E8543" }}
            strokeWidth={2}
          />
        </div>
        <h3 className="mt-5 text-lg font-bold text-[color:var(--navy)]">
          Klaar voor gebruik
        </h3>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Druk straks ergens in een tekstveld op{" "}
          <kbd className="rounded border bg-white px-1.5 py-0.5 text-xs font-mono shadow-sm">
            option
          </kbd>{" "}
          +{" "}
          <kbd className="rounded border bg-white px-1.5 py-0.5 text-xs font-mono shadow-sm">
            spatie
          </kbd>
          .
        </p>
      </div>
    </TauriWindow>
  );
}
