import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldContent,
  FieldSet,
  FieldLegend,
  FieldSeparator,
  FieldTitle,
  Input,
} from "web";

export function Default() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 400 }}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="field-email">E-mailadres</FieldLabel>
          <Input id="field-email" type="email" defaultValue="anna@advocatenkvd.nl" />
          <FieldDescription>Hier sturen we je licentiecode naartoe.</FieldDescription>
        </Field>

        <Field data-invalid="true">
          <FieldLabel htmlFor="field-code">Licentiecode</FieldLabel>
          <Input id="field-code" aria-invalid="true" defaultValue="DIC-0000" />
          <FieldError>Deze code herkennen we niet. Controleer de mail van info@dicteren.ai.</FieldError>
        </Field>
      </FieldGroup>

      <FieldSeparator>of</FieldSeparator>

      <FieldSet>
        <FieldLegend>Bedrijfsgegevens</FieldLegend>
        <FieldDescription>We gebruiken dit voor je factuur.</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="field-org">Bedrijfsnaam</FieldLabel>
            <Input id="field-org" defaultValue="Advocaten KvD" />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Verwerkersovereenkomst</FieldTitle>
              <FieldDescription>We sturen de DPA mee bij je eerste factuur.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
