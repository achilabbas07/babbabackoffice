export const RPP02_SERVICE_UUID = "18f0";
export const RPP02_CHARACTERISTIC_UUID = "2af1";
export const RECEIPT_FOOTER = "Terima Kasih Atas Kunjungan Anda";
const LINE_WIDTH = 32;
const BLE_WRITE_CHUNK_SIZE = 20;

function encodeText(value) {
  const encoded = encodeURIComponent(value);
  const bytes = [];
  for (let index = 0; index < encoded.length; index += 1) {
    if (encoded[index] === "%") {
      bytes.push(Number.parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(encoded.charCodeAt(index));
    }
  }
  return bytes;
}

function wrapText(value, width = LINE_WIDTH) {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let line = "";
  for (const word of words) {
    if (Array.from(word).length > width) {
      if (line) lines.push(line);
      line = "";
      const characters = Array.from(word);
      for (let index = 0; index < characters.length; index += width) {
        lines.push(characters.slice(index, index + width).join(""));
      }
    } else if (!line) {
      line = word;
    } else if (Array.from(`${line} ${word}`).length <= width) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function itemName(item) {
  return item.name || item.menuName || item.productName || "Menu";
}

function formatCurrency(value) {
  if (typeof value === "string" && value.trim()) return value;
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error("Total pembayaran tidak valid.");
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildBluetoothReceiptLines(type, data) {
  if (!data || typeof data !== "object") {
    throw new Error("Data struk tidak valid.");
  }

  const items = data.items || data.items_json || [];
  if (!Array.isArray(items)) throw new Error("Daftar item struk tidak valid.");

  if (type === "kitchen") {
    return [
      { text: "ORDER DAPUR", align: "center", bold: true },
      { text: `No. Meja: ${data.tableName || data.table || "-"}` },
      { text: `Waktu: ${data.time || data.dateTime || data.date || "-"}` },
      ...items.flatMap((item) => [
        { text: `${item.qty ?? 1}x ${itemName(item)}` },
        ...(item.note || item.notes ? [{ text: `Catatan: ${item.note || item.notes}` }] : []),
      ]),
    ];
  }

  if (type === "payment") {
    return [
      { text: "WARKOP BABBA", align: "center", bold: true },
      { text: `No. Transaksi: ${data.transactionNo || data.transactionId || data.id || "-"}` },
      { text: `Kasir: ${data.cashier || data.cashierName || data.userName || "-"}` },
      ...items.map((item) => ({ text: `${item.qty ?? 1}x ${itemName(item)}` })),
      { text: `Total: ${formatCurrency(data.total)} (LUNAS)`, bold: true },
      { text: RECEIPT_FOOTER, align: "center", condensed: true },
    ];
  }

  throw new Error("Jenis cetak tidak dikenal. Gunakan 'kitchen' atau 'payment'.");
}

function appendBytes(target, bytes) {
  target.push(...bytes);
}

export function buildEscPosReceipt(type, data) {
  const lines = buildBluetoothReceiptLines(type, data);
  const bytes = [];
  const command = (...values) => appendBytes(bytes, values);
  const writeText = (text) => appendBytes(bytes, encodeText(text));

  command(0x1b, 0x40); // Initialize printer.
  for (const line of lines) {
    command(0x1b, 0x61, line.align === "center" ? 0x01 : 0x00);
    if (line.condensed) command(0x1b, 0x21, 0x01);
    else if (line.bold) command(0x1b, 0x45, 0x01);

    const textLines = line.condensed ? [line.text] : wrapText(line.text);
    for (const textLine of textLines) {
      writeText(textLine);
      command(0x0a);
    }

    if (line.condensed) command(0x1b, 0x21, 0x00);
    else if (line.bold) command(0x1b, 0x45, 0x00);
  }
  command(0x1b, 0x61, 0x00);
  command(0x0a, 0x0a, 0x0a);
  command(0x1d, 0x56, 0x00); // Full cut.
  return Uint8Array.from(bytes);
}

async function findWritableCharacteristic(service, characteristicUuid) {
  if (characteristicUuid) {
    const characteristic = await service.getCharacteristic(characteristicUuid);
    if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
      return characteristic;
    }
    throw new Error("Karakteristik printer tidak mendukung penulisan data.");
  }

  const characteristics = await service.getCharacteristics();
  const characteristic = characteristics.find(
    (candidate) => candidate.properties.writeWithoutResponse || candidate.properties.write,
  );
  if (!characteristic) throw new Error("Karakteristik tulis printer tidak ditemukan.");
  return characteristic;
}

async function writeReceipt(characteristic, bytes) {
  for (let offset = 0; offset < bytes.length; offset += BLE_WRITE_CHUNK_SIZE) {
    const chunk = bytes.slice(offset, offset + BLE_WRITE_CHUNK_SIZE);
    if (characteristic.properties.writeWithoutResponse) {
      if (!characteristic.writeValueWithoutResponse) {
        throw new Error("Browser tidak mendukung pengiriman tanpa respons ke printer ini.");
      }
      await characteristic.writeValueWithoutResponse(chunk);
    } else if (characteristic.properties.write && characteristic.writeValueWithResponse) {
      await characteristic.writeValueWithResponse(chunk);
    } else if (characteristic.properties.write && characteristic.writeValue) {
      await characteristic.writeValue(chunk);
    } else {
      throw new Error("Browser tidak mendukung pengiriman data ke printer ini.");
    }
  }
}

export async function printBluetoothReceipt(
  type,
  data,
  { device: selectedDevice, serviceUuid = RPP02_SERVICE_UUID, characteristicUuid } = {},
) {
  const bluetooth = globalThis.navigator?.bluetooth;
  if (!bluetooth?.requestDevice) {
    throw new Error("Web Bluetooth tidak tersedia. Gunakan Chrome atau Edge melalui HTTPS.");
  }

  const device = selectedDevice || await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [serviceUuid],
  });
  if (!device?.gatt) throw new Error("Perangkat yang dipilih tidak menyediakan koneksi GATT.");

  const bytes = buildEscPosReceipt(type, data);
  let connected = false;
  try {
    const server = await device.gatt.connect();
    connected = true;
    const service = await server.getPrimaryService(serviceUuid);
    const characteristic = await findWritableCharacteristic(service, characteristicUuid);
    await writeReceipt(characteristic, bytes);
  } finally {
    if (connected && device.gatt.connected) device.gatt.disconnect();
  }
}
