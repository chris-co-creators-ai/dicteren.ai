"use client";

import { Printer } from "lucide-react";

/** Download/print de factuur via de browser (Bewaar als PDF). Verbergt zichzelf
 *  in de print-output via de `print:hidden` utility. */
export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn btn-primary inline-flex items-center gap-2 print:hidden"
    >
      <Printer className="size-4" strokeWidth={2.2} />
      Download als PDF
    </button>
  );
}
