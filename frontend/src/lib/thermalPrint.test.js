import {
  buildKitchenTicketLines,
  buildOpenBillLines,
  buildPaidReceiptLines,
  incrementPrintCount,
  PRINT_LINE_WIDTH,
  printCountKey,
  readPrintCount,
  wrapPrintText,
} from "./thermalPrint";

const currency = (value) => `Rp${value}`;
const itemName = (item) => item.name || item.productName || "";

describe("thermal print templates", () => {
  const bill = {
    id: "BILL-001",
    type: "Dine In",
    waiterName: "Siti Pelayan",
    userName: "Siti Pelayan",
    total: 25000,
    items_json: [{ qty: 2, name: "Nasi Goreng Spesial", price: 12500, subtotal: 25000 }],
  };

  it("wraps every text line to 32 characters, including long words", () => {
    expect(wrapPrintText("NamaMenuSangatPanjangTanpaSpasi123456")).toEqual([
      "NamaMenuSangatPanjangTanpaSpasi1",
      "23456",
    ]);
  });

  it("adds a clear duplicate marker to subsequent paid receipts", () => {
    const lines = buildPaidReceiptLines({
      trx: { ...bill, date: "2026-10-29", method: "Cash", cashGiven: 25000, change: 0 },
      printCount: 2,
      dateText: "29/10/2026",
      currency,
      itemName,
    });
    expect(lines[0]).toBe("DUPLIKAT");
    expect(lines[0]).toContain("DUPLIKAT");
    expect(lines[lines.length - 1]).toBe("Terima Kasih Atas Kunjungan Anda");
    expect(lines.every((line) => line.length <= PRINT_LINE_WIDTH)).toBe(true);
    expect(lines).toContain("Pelayan: Siti Pelayan");
    expect(lines).toContain("Status: LUNAS");
  });

  it("includes open-bill details and duplicate marking", () => {
    const lines = buildOpenBillLines({
      bill,
      tableName: "A-02",
      printCount: 2,
      dateText: "29/10/2026 10:00",
      currency,
      itemName,
    });
    expect(lines[0]).toBe("DUPLIKAT");
    expect(lines).toContain("OPEN BILL");
    expect(lines).toContain("Pelayan: Siti Pelayan");
    expect(lines.every((line) => line.length <= PRINT_LINE_WIDTH)).toBe(true);
  });

  it("prints kitchen-only details without prices or business profile text", () => {
    const lines = buildKitchenTicketLines({
      bill,
      tableName: "A-02",
      printCount: 0,
      dateText: "29/10/2026 10:00",
      itemName,
    });
    expect(lines[0]).toBe("ORDER DAPUR");
    expect(lines).toContain("Pelayan: Siti Pelayan");
    expect(lines.some((line) => line.includes("Rp"))).toBe(false);
    expect(lines.every((line) => line.length <= PRINT_LINE_WIDTH)).toBe(true);
  });
});

describe("print count storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("tracks counts independently by document type and ID", () => {
    const receiptKey = printCountKey("receipt", "TRX-001");
    const billKey = printCountKey("bill", "BILL-001");
    expect(readPrintCount(receiptKey)).toBe(0);
    expect(incrementPrintCount(receiptKey)).toBe(1);
    expect(incrementPrintCount(receiptKey)).toBe(2);
    expect(readPrintCount(receiptKey)).toBe(2);
    expect(readPrintCount(billKey)).toBe(0);
  });
});
