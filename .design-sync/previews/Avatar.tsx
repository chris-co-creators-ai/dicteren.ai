import {
  Avatar,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "web";

export function Initialen() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <Avatar size="sm">
        <AvatarFallback>CB</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>SV</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function MetStatusBadge() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <Avatar size="lg">
        <AvatarFallback>SV</AvatarFallback>
        <AvatarBadge />
      </Avatar>
    </div>
  );
}

export function Groep() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>SV</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>MK</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+5</AvatarGroupCount>
      </AvatarGroup>
    </div>
  );
}
