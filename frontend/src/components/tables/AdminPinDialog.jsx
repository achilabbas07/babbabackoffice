import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errMsg } from "@/lib/api";

export const AdminPinDialog = ({ open, onClose, title, description, needPin, withReason, onSubmit, testid = "admin-pin" }) => {
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setReason("");
      setError("");
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (needPin && pin.length < 4) return setError("PIN admin minimal 4 digit");
    setBusy(true);
    try {
      await onSubmit({ pin, reason });
    } catch (err) {
      setError(errMsg(err));
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid={`${testid}-dialog`} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {withReason && (
            <div className="grid gap-1.5">
              <Label>Alasan</Label>
              <Textarea data-testid={`${testid}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. salah input, pelanggan batal" />
            </div>
          )}
          {needPin && (
            <div className="grid gap-1.5">
              <Label>PIN Admin</Label>
              <input
                data-testid={`${testid}-input`}
                type="password"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="h-12 rounded-xl border border-border bg-transparent text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-primary"
              />
            </div>
          )}
          {error && <p data-testid={`${testid}-error`} className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button data-testid={`${testid}-submit`} type="submit" disabled={busy}>{busy ? "Memeriksa..." : "Konfirmasi"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
