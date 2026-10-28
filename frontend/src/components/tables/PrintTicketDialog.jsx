import { Printer } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, itemName, rp } from "@/lib/api";
import { printDocument } from "@/lib/print";
import { BrandLogo } from "@/components/BrandLogo";
import { useProfile } from "@/context/ProfileContext";
import {
  buildKitchenTicketLines,
  buildOpenBillLines,
  incrementPrintCount,
  printCountKey,
  readPrintCount,
  wrapPrintText,
} from "@/lib/thermalPrint";

export const PrintTicketDialog = ({ bill, tableName, mode, onClose }) => {
  const kitchen = mode === "kitchen";
  const { profile } = useProfile();
  const [, setPrintRevision] = useState(0);
  const printKey = printCountKey(kitchen ? "kitchen" : "bill", bill?.id);
  const printCount = readPrintCount(printKey);
  const dateText = fmtDate(bill?.timestamp || new Date().toISOString());
  const lines = bill ? (kitchen
    ? buildKitchenTicketLines({ bill, tableName, printCount, dateText, itemName })
    : buildOpenBillLines({ bill, tableName, printCount, dateText, currency: rp, itemName })) : [];
  const profileLines = [
    ...wrapPrintText(profile.app_name || "Kedai POS"),
    ...(profile.address ? wrapPrintText(profile.address) : []),
    ...(profile.phone ? wrapPrintText(`Telp. ${profile.phone}`) : []),
  ];

  const handlePrint = () => {
    const count = incrementPrintCount(printKey);
    flushSync(() => setPrintRevision(count));
    printDocument(kitchen ? "order dapur" : "bill");
  };

  return (
    <Dialog open={!!bill && !!mode} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid={`print-${mode}-dialog`} className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader><DialogTitle>{kitchen ? "Cetak Dapur" : "Cetak Bill"}</DialogTitle></DialogHeader>
        {bill && (
          <div className="print-area thermal-print-area space-y-3 text-sm">
            {!kitchen && (
              <div className="flex flex-col items-center text-center">
                <BrandLogo url={profile.logo_url} className="h-12 w-12" iconClass="h-6 w-6" testid="print-bill-header-logo" />
                <pre data-testid="print-bill-header" className="thermal-lines mt-1 font-bold">{profileLines.join("\n")}</pre>
              </div>
            )}
            {!kitchen && (
              <p data-testid="print-bill-total" className="sr-only">{rp(bill.total)}</p>
            )}
            <pre
              data-testid={kitchen ? "print-kitchen-title" : "print-bill-template"}
              className={`thermal-lines ${kitchen ? "text-center font-bold" : ""}`}
            >{lines.join("\n")}</pre>
            <button
              data-testid={`print-${mode}-button`}
              onClick={handlePrint}
              className="no-print flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground"
            >
              <Printer className="h-4 w-4" /> Cetak
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
