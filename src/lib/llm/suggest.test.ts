import { describe, expect, it } from "vitest";
import { templateSuggestion } from "./suggest";
import type { PeerOverlap, TimeOfDay } from "@/lib/affinity/engine";

const ovl = (
  peerLabel: string,
  score: number,
  tagName?: string,
  sharedTime: TimeOfDay | null = null,
): PeerOverlap => ({
  peerId: peerLabel,
  peerLabel,
  sharedTags: tagName ? [{ tag: tagName, name: tagName, mine: 1, theirs: 1, sharedTime }] : [],
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

  it("mentions the shared time-of-day when weak overlap agrees on it", () => {
    const s = templateSuggestion([ovl("M", 0.05, "Library", "morning")], "Library");
    expect(s.text.toLowerCase()).toContain("morning");
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

  it("threads the consensus bucket into the strong-overlap nudge", () => {
    const peers = [
      ovl("Mira", 0.6, "Library", "morning"),
      ovl("Jon", 0.5, "Library", "morning"),
      ovl("Sam", 0.45, "Library", "evening"),
    ];
    const s = templateSuggestion(peers, "Library");
    expect(s.text.toLowerCase()).toContain("morning");
  });

  it("does not fabricate a time when peers don't agree", () => {
    const peers = [ovl("Mira", 0.6, "Library", "morning"), ovl("Jon", 0.5, "Library", "evening")];
    const s = templateSuggestion(peers, "Library");
    // Neither morning nor evening should land in the sentence — consensus
    // requires >= half to agree.
    expect(s.text.toLowerCase()).not.toContain("morning");
    expect(s.text.toLowerCase()).not.toContain("evening");
  });
});
