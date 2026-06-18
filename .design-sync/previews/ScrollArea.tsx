import { ScrollArea } from "web";

const codes = [
  "DICT-2026-AB12",
  "DICT-2026-CD34",
  "DICT-2026-EF56",
  "DICT-2026-GH78",
  "DICT-2026-IJ90",
  "DICT-2026-KL12",
  "DICT-2026-MN34",
  "DICT-2026-OP56",
  "DICT-2026-QR78",
  "DICT-2026-ST90",
  "DICT-2026-UV12",
  "DICT-2026-WX34",
  "DICT-2026-YZ56",
  "DICT-2026-AC78",
  "DICT-2026-BD90",
];

export function Licentielijst() {
  return (
    <ScrollArea
      style={{
        height: 180,
        width: 280,
        border: "1px solid var(--border)",
        borderRadius: 8,
      }}
    >
      <div style={{ padding: 12 }}>
        <p style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
          Uitgegeven codes
        </p>
        {codes.map((code) => (
          <div
            key={code}
            style={{
              padding: "6px 0",
              fontFamily: "monospace",
              fontSize: 13,
              borderBottom: "1px solid var(--border)",
            }}
          >
            {code}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
