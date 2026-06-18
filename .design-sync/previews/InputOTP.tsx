import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "web";

export function Filled() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Verificatiecode</span>
      <InputOTP maxLength={6} value="482915">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

export function WithSeparator() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Met scheidingsteken</span>
      <InputOTP maxLength={6} value="305">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

export function Empty() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Leeg</span>
      <InputOTP maxLength={6} value="">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
