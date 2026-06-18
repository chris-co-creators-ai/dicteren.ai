import { Progress, ProgressLabel, ProgressValue } from "web";

export function Quarter() {
  return (
    <div style={{ width: 280 }}>
      <Progress value={30}>
        <ProgressLabel>Model downloaden</ProgressLabel>
        <ProgressValue />
      </Progress>
    </div>
  );
}

export function Most() {
  return (
    <div style={{ width: 280 }}>
      <Progress value={70}>
        <ProgressLabel>Model downloaden</ProgressLabel>
        <ProgressValue />
      </Progress>
    </div>
  );
}

export function Complete() {
  return (
    <div style={{ width: 280 }}>
      <Progress value={100}>
        <ProgressLabel>Installatie</ProgressLabel>
        <ProgressValue />
      </Progress>
    </div>
  );
}

export function NoLabel() {
  return (
    <div style={{ width: 280 }}>
      <Progress value={45} />
    </div>
  );
}
