import { AspectRatio } from "web";

export function Breedbeeld() {
  return (
    <div style={{ width: 320 }}>
      <AspectRatio ratio={16 / 9}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-deep)",
            color: "white",
            borderRadius: 12,
            fontSize: 14,
          }}
        >
          Product-demo Dicteren.ai
        </div>
      </AspectRatio>
    </div>
  );
}

export function Vierkant() {
  return (
    <div style={{ width: 200 }}>
      <AspectRatio ratio={1}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "color-mix(in srgb, var(--secondary) 30%, transparent)",
            borderRadius: 12,
            fontSize: 14,
          }}
        >
          Spreken in plaats van typen
        </div>
      </AspectRatio>
    </div>
  );
}
