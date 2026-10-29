import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { printBluetoothReceipt } from "@/lib/bluetoothThermalPrinter";

export function BluetoothReceiptButton({ type, data, serviceUuid, characteristicUuid }) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await printBluetoothReceipt(type, data, { serviceUuid, characteristicUuid });
      toast.success("Struk berhasil dikirim ke printer.");
    } catch (error) {
      toast.error(
        error?.name === "NotFoundError"
          ? "Pemilihan printer dibatalkan."
          : error?.message || "Struk gagal dicetak.",
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Button type="button" onClick={handlePrint} disabled={printing}>
      <Printer className="h-4 w-4" />
      {printing ? "Mencetak..." : "Cetak langsung"}
    </Button>
  );
}
