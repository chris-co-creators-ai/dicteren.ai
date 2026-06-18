import { Calendar } from "web";

export function Enkel() {
  return (
    <Calendar
      mode="single"
      selected={new Date(2026, 5, 18)}
      defaultMonth={new Date(2026, 5, 18)}
      style={{ borderRadius: 8, border: "1px solid var(--border)" }}
    />
  );
}
