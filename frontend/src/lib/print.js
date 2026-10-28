import { toast } from "sonner";

export function printDocument(label) {
  try {
    if (typeof window === "undefined" || typeof window.print !== "function") {
      throw new Error("Fitur cetak tidak tersedia di browser ini.");
    }
    window.print();
  } catch (error) {
    console.error(`Failed to print ${label}`, error);
    toast.error(
      `Dialog cetak ${label} gagal dibuka. Pastikan browser dan printer siap, lalu tekan Cetak lagi atau gunakan Ctrl+P.`,
    );
    return false;
  }
  return true;
}
