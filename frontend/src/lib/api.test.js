import { errMsg } from "./api";

describe("errMsg", () => {
  it("uses backend error messages from 500 responses", () => {
    expect(errMsg({ response: { data: { error: "column quantity does not exist", stage: "inserting open bill" } } }))
      .toBe("column quantity does not exist (inserting open bill)");
  });

  it("continues to use FastAPI detail messages", () => {
    expect(errMsg({ response: { data: { detail: "Meja tidak ditemukan" } } }))
      .toBe("Meja tidak ditemukan");
  });
});
