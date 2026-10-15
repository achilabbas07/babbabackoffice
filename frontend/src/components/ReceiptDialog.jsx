import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, rp } from "@/lib/api";

const Row = ({ label, value, bold, testid }) => (
  <div className={`flex justify-between gap-4 ${bold ? "font-semibold" : ""}`}>
    <span className="text-muted-foreground">{label}</span>
    <span data-testid={testid} className="text-right font-mono">{value}</span>
  </div>
);

export const ReceiptDialog = ({ trx, onClose }) => (
  <Dialog open={!!trx} onOpenChange={(o) => !o && onClose()}>
    <DialogContent data-testid="receipt-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
      <DialogHeader><DialogTitle>Struk Pembayaran</DialogTitle></DialogHeader>
      {trx && (
        <div className="print-area space-y-4 text-sm">
          <div className="text-center">
            <p className="font-bold">Kedai POS</p>
            <p data-testid="receipt-id" className="font-mono text-xs text-muted-foreground">{trx.id}</p>
            <p className="text-xs text-muted-foreground">{fmtDate(trx.date)}</p>
          </div>
          <div className="space-y-1 border-y border-dashed border-border py-3 text-xs">
            <Row label="Tipe" value={trx.type} />
            {trx.tableName && <Row label="Meja" value={trx.tableName} />}
            {trx.customerName && <Row label="Pelanggan" value={trx.customerName} />}
            <Row label="Kasir" value={trx.userName || trx.userId} />
            {trx.waiterName && <Row label="Waiter" value={trx.waiterName} />}
          </div>
          <div className="space-y-2">
            {trx.items_json.map((i, idx) => (
              <div key={idx}>
                <div className="flex justify-between"><span>{i.productName}</span><span className="font-mono">{rp(i.price * i.qty)}</span></div>
                <p className="text-xs text-muted-foreground">{i.qty} × {rp(i.price)}{i.notes ? ` · ${i.notes}` : ""}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1 border-t border-dashed border-border pt-3">
            <Row label="Total" value={rp(trx.total)} bold testid="receipt-total" />
            <Row label={`Bayar (${trx.method})`} value={rp(trx.cashGiven)} />
            <Row label="Kembalian" value={rp(trx.change)} testid="receipt-change" />
          </div>
          <button
            data-testid="receipt-print-button"
            onClick={() => window.print()}
            className="no-print flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border font-medium hover:border-primary"
          >
            <Printer className="h-4 w-4" /> Cetak Struk
          </button>
        </div>
      )}
    </DialogContent>
  </Dialog>
);
