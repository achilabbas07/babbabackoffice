import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, itemName, rp } from "@/lib/api";

export const PrintTicketDialog = ({ bill, tableName, mode, onClose }) => {
  const kitchen = mode === "kitchen";
  return (
    <Dialog open={!!bill && !!mode} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid={`print-${mode}-dialog`} className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader><DialogTitle>{kitchen ? "Cetak Dapur" : "Cetak Bill"}</DialogTitle></DialogHeader>
        {bill && (
          <div className="print-area space-y-3 text-sm">
            <div className="text-center">
              <p className="font-bold">{kitchen ? "ORDER DAPUR" : "Kedai POS · BILL"}</p>
              <p className="text-lg font-bold">{tableName || bill.type}</p>
              <p className="font-mono text-xs text-muted-foreground">{bill.id} · {fmtDate(new Date().toISOString())}</p>
              <p className="text-xs text-muted-foreground">Waiter: {bill.waiterName || "-"}{bill.customerName ? ` · ${bill.customerName}` : ""}</p>
            </div>
            <div className="space-y-2 border-y border-dashed border-border py-3">
              {bill.items_json.map((i, idx) => (
                <div key={idx}>
                  {kitchen ? (
                    <p className="text-base font-semibold"><span className="font-mono">{i.qty}×</span> {itemName(i)}</p>
                  ) : (
                    <div className="flex justify-between"><span>{i.qty}× {itemName(i)}</span><span className="font-mono">{rp(i.subtotal)}</span></div>
                  )}
                  {i.notes && <p className="pl-6 text-xs italic text-muted-foreground">Catatan: {i.notes}</p>}
                </div>
              ))}
            </div>
            {!kitchen && (
              <div className="flex justify-between font-semibold"><span>Total</span><span data-testid="print-bill-total" className="font-mono">{rp(bill.total)}</span></div>
            )}
            {!kitchen && <p className="text-center text-xs text-muted-foreground">Belum lunas · bukan bukti pembayaran</p>}
            <button
              data-testid={`print-${mode}-button`}
              onClick={() => window.print()}
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
