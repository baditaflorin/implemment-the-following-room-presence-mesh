import { describe, expect, it } from "vitest";
import { markOnboarded, resetOnboarding, shouldShowOnboarding } from "./onboardingStorage";

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    snapshot: () => Object.fromEntries(map),
  };
}

describe("onboardingStorage", () => {
  it("shows the intro on the first cold visit", () => {
    expect(shouldShowOnboarding(makeStorage())).toBe(true);
  });

  it("hides the intro after markOnboarded", () => {
    const s = makeStorage();
    markOnboarded(s);
    expect(shouldShowOnboarding(s)).toBe(false);
  });

  it("re-shows the intro after resetOnboarding", () => {
    const s = makeStorage();
    markOnboarded(s);
    resetOnboarding(s);
    expect(shouldShowOnboarding(s)).toBe(true);
  });

  it("biases toward showing when storage is unavailable", () => {
    expect(shouldShowOnboarding(null)).toBe(true);
  });

  it("does not throw when storage methods throw", () => {
    const angryGet: Pick<Storage, "getItem"> = {
      getItem() {
        throw new Error("SecurityError");
      },
    };
    const angrySet: Pick<Storage, "setItem"> = {
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    const angryRemove: Pick<Storage, "removeItem"> = {
      removeItem() {
        throw new Error("SecurityError");
      },
    };
    expect(shouldShowOnboarding(angryGet)).toBe(true);
    expect(() => markOnboarded(angrySet)).not.toThrow();
    expect(() => resetOnboarding(angryRemove)).not.toThrow();
  });

  it("uses a :v1-suffixed key so a copy refresh can re-onboard everyone", () => {
    const s = makeStorage();
    markOnboarded(s);
    expect(Object.keys(s.snapshot()).some((k) => k.endsWith(":v1"))).toBe(true);
  });
});
