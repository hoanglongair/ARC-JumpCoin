import { describe, expect, it } from "vitest";
import { erc20Abi, paymentContractAbi } from "@/lib/contracts";

describe("contract ABIs", () => {
  it("exposes the ERC20 methods required by the payment gate", () => {
    const functionNames = erc20Abi
      .filter((item) => item.type === "function")
      .map((item) => item.name);

    expect(functionNames).toEqual(expect.arrayContaining(["balanceOf", "allowance", "approve", "decimals", "symbol"]));
  });

  it("exposes the payment function and verification event", () => {
    const functionNames = paymentContractAbi
      .filter((item) => item.type === "function")
      .map((item) => item.name);
    const eventNames = paymentContractAbi
      .filter((item) => item.type === "event")
      .map((item) => item.name);

    expect(functionNames).toContain("pay");
    expect(eventNames).toContain("PaymentReceived");
  });
});
