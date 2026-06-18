import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "web";

const apps = [
  "Microsoft Word",
  "Outlook",
  "WhatsApp Web",
  "ChatGPT",
  "Apple Notities",
];

export function Default() {
  return (
    <div style={{ padding: 16, minHeight: 320 }}>
      <Combobox items={apps} defaultValue="Outlook" defaultOpen>
        <ComboboxInput placeholder="Zoek een app" style={{ width: 240 }} />
        <ComboboxContent>
          <ComboboxEmpty>Geen app gevonden.</ComboboxEmpty>
          <ComboboxList>
            {apps.map((app) => (
              <ComboboxItem key={app} value={app}>
                {app}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
