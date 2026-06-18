import { Slider } from "web";

export function Default() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Microfoongevoeligheid</span>
      <div style={{ width: 280 }}>
        <Slider defaultValue={[60]} />
      </div>
    </div>
  );
}

export function Stepped() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Volume opnamesignaal</span>
      <div style={{ width: 280 }}>
        <Slider defaultValue={[40]} min={0} max={100} step={5} />
      </div>
    </div>
  );
}

export function Range() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Spraakdrempel (van/tot)</span>
      <div style={{ width: 280 }}>
        <Slider defaultValue={[25, 75]} />
      </div>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Uitgeschakeld</span>
      <div style={{ width: 280 }}>
        <Slider defaultValue={[50]} disabled />
      </div>
    </div>
  );
}
