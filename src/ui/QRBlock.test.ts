import { describe, expect, it } from "vitest";
import { fitQrSize } from "./QRBlock";

describe("fitQrSize", () => {
  it("caps at maxSize on a roomy viewport", () => {
    expect(fitQrSize(1024, 256)).toBe(256);
    expect(fitQrSize(640, 256)).toBe(256);
  });

  it("shrinks to fit a small phone with a generous maxSize", () => {
    // 320px viewport - 48px padding = 272px → cap that's well above the
    // floor and below a 400px maxSize.
    expect(fitQrSize(320, 400)).toBe(272);
  });

  it("clamps to maxSize when the viewport would otherwise allow a bigger code", () => {
    expect(fitQrSize(360, 256)).toBe(256);
  });

  it("never goes below the 160px floor on tiny viewports", () => {
    expect(fitQrSize(100, 256)).toBeGreaterThanOrEqual(160);
    expect(fitQrSize(0, 256)).toBeGreaterThanOrEqual(160);
  });

  it("respects a lower maxSize for embedded contexts", () => {
    expect(fitQrSize(1024, 180)).toBe(180);
    expect(fitQrSize(360, 180)).toBe(180);
  });
});
