import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "web";

export function Licenties() {
  return (
    <Table>
      <TableCaption>Licenties van team Acme, bijgewerkt op 18 juni 2026.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Toegewezen aan</TableHead>
          <TableHead>Periode</TableHead>
          <TableHead>Status</TableHead>
          <TableHead style={{ textAlign: "right" }}>Verloopt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell style={{ fontFamily: "monospace" }}>DICT-2026-AB12</TableCell>
          <TableCell>Sanne van den Berg</TableCell>
          <TableCell>Jaar</TableCell>
          <TableCell>Actief</TableCell>
          <TableCell style={{ textAlign: "right" }}>14 juni 2027</TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ fontFamily: "monospace" }}>DICT-2026-CD34</TableCell>
          <TableCell>Mark de Vries</TableCell>
          <TableCell>Kwartaal</TableCell>
          <TableCell>Proefperiode</TableCell>
          <TableCell style={{ textAlign: "right" }}>2 juli 2026</TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ fontFamily: "monospace" }}>DICT-2026-EF56</TableCell>
          <TableCell>Lisa Janssen</TableCell>
          <TableCell>Maand</TableCell>
          <TableCell>Betaling achter</TableCell>
          <TableCell style={{ textAlign: "right" }}>21 juni 2026</TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ fontFamily: "monospace" }}>DICT-2026-GH78</TableCell>
          <TableCell>Tom Bakker</TableCell>
          <TableCell>Jaar</TableCell>
          <TableCell>Verlopen</TableCell>
          <TableCell style={{ textAlign: "right" }}>1 mei 2026</TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ fontFamily: "monospace" }}>DICT-2026-IJ90</TableCell>
          <TableCell>Niet toegewezen</TableCell>
          <TableCell>Jaar</TableCell>
          <TableCell>Geannuleerd</TableCell>
          <TableCell style={{ textAlign: "right" }}>—</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4}>Plekken in gebruik</TableCell>
          <TableCell style={{ textAlign: "right" }}>3 van 5</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
