import { describe, expect, it } from "vitest";
import { templateSuggestion } from "./suggest";
import type { PeerOverlap } from "@/lib/affinity/engine";

const ovl = (peerLabel: string, score: number, tagName?: string): PeerOverlap => ({
  peerId: peerLabel,
  peerLabel,
  sharedTags: tagName ? [{ tag: tagName, name: tagName, mine: 1, theirs: 1 }] : [],
  score,
});

describe("templateSuggestion", () => {
  it("nudges to scan when there are no peers", () => {
    const s = templateSuggestion([], undefined);
    expect(s.text.toLowerCase()).toContain("scan");
    expect(s.backend).toBe("template");
  });

  it("uses the top room when overlap is weak", () => {
    const s = templateSuggestion([ovl("M", 0.05, "Library")], "Library");
    expect(s.text).toMatch(/Library/);
  });

  it("invites coffee when overlap is strong", () => {
    const peers = [
      ovl("Mira", 0.6, "Library"),
      ovl("Jon", 0.5, "Library"),
      ovl("Sam", 0.45, "Library"),
    ];
    const s = templateSuggestion(peers, "Library");
    expect(s.text.toLowerCase()).toContain("coffee");
    expect(s.text).toMatch(/Library/);
  });
});
