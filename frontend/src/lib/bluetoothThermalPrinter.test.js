import {
  buildBluetoothReceiptLines,
  buildEscPosReceipt,
  printBluetoothReceipt,
  RECEIPT_FOOTER,
  RPP02_CHARACTERISTIC_UUID,
  RPP02_SERVICE_UUID,
} from "./bluetoothThermalPrinter";

describe("Bluetooth ESC/POS receipts", () => {
  it("builds a kitchen ticket without a business header and includes item notes", () => {
    const lines = buildBluetoothReceiptLines("kitchen", {
      tableName: "A-02",
      time: "29/10/2026 10:00",
      items: [{ qty: 2, name: "Mie Goreng", note: "Tidak pedas" }],
    });

    expect(lines[0]).toMatchObject({ text: "ORDER DAPUR", align: "center" });
    expect(lines.map(({ text }) => text)).toEqual([
      "ORDER DAPUR",
      "No. Meja: A-02",
      "Waktu: 29/10/2026 10:00",
      "2x Mie Goreng",
      "Catatan: Tidak pedas",
    ]);
  });

  it("builds a paid receipt with the required header, total status, and exact footer", () => {
    const lines = buildBluetoothReceiptLines("payment", {
      transactionNo: "TRX-001",
      cashier: "Siti",
      items: [{ qty: 2, name: "Kopi Susu" }],
      total: 25000,
    });
    const text = lines.map(({ text }) => text);

    expect(text[0]).toBe("WARKOP BABBA");
    expect(text).toContain("No. Transaksi: TRX-001");
    expect(text).toContain("Kasir: Siti");
    expect(text).toContain("Total: Rp 25.000 (LUNAS)");
    expect(text[text.length - 1]).toBe(RECEIPT_FOOTER);
  });

  it("includes alignment, initialization, and auto-cut ESC/POS commands", () => {
    const bytes = buildEscPosReceipt("kitchen", { items: [] });

    expect(Array.from(bytes.slice(0, 5))).toEqual([0x1b, 0x40, 0x1b, 0x61, 0x01]);
    expect(Array.from(bytes.slice(-6))).toEqual([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x00]);
  });

  it("rejects unsupported receipt types", () => {
    expect(() => buildBluetoothReceiptLines("other", {})).toThrow("Jenis cetak tidak dikenal");
  });

  it("requests a Bluetooth printer, writes bounded chunks, and disconnects after printing", async () => {
    const writes = [];
    const characteristic = {
      properties: { writeWithoutResponse: true },
      writeValueWithoutResponse: jest.fn(async (chunk) => writes.push(chunk)),
    };
    const device = {
      gatt: {
        connected: true,
        connect: jest.fn(async () => ({
          getPrimaryService: jest.fn(async () => ({
            getCharacteristic: jest.fn(async (uuid) => {
              expect(uuid).toBe(RPP02_CHARACTERISTIC_UUID);
              return characteristic;
            }),
          })),
        })),
        disconnect: jest.fn(),
      },
    };
    const bluetooth = { requestDevice: jest.fn(async () => device) };
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: bluetooth,
    });

    await printBluetoothReceipt("kitchen", {
      tableName: "A-02",
      time: "29/10/2026",
      items: [{ qty: 1, name: "Nasi Goreng" }],
    });

    expect(bluetooth.requestDevice).toHaveBeenCalledWith({
      acceptAllDevices: true,
      optionalServices: [RPP02_SERVICE_UUID],
    });
    const server = await device.gatt.connect.mock.results[0].value;
    expect(server.getPrimaryService).toHaveBeenCalledWith(RPP02_SERVICE_UUID);
    expect(writes.length).toBeGreaterThan(1);
    expect(writes.every((chunk) => chunk.byteLength <= 20)).toBe(true);
    expect(device.gatt.disconnect).toHaveBeenCalledTimes(1);
    delete navigator.bluetooth;
  });
});
