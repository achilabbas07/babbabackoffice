import { toast } from "sonner";
import { printDocument } from "./print";

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

describe("printDocument", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    toast.error.mockClear();
  });

  it("opens the browser print dialog", () => {
    const print = jest.spyOn(window, "print").mockImplementation(() => {});

    expect(printDocument("bill")).toBe(true);
    expect(print).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("reports printer dialog failures and allows the user to retry", () => {
    jest.spyOn(window, "print").mockImplementation(() => {
      throw new Error("print unavailable");
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    expect(printDocument("bill")).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("tekan Cetak lagi atau gunakan Ctrl+P"),
    );
  });
});
