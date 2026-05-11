import { describe, expect, it } from "vitest";
import { narrativeSuggestion, suggest, templateSuggestion } from "./suggest";
import type { PeerOverlap, RoomAffinity, TimeOfDay } from "@/lib/affinity/engine";

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

const room = (name: string, dominantTime: TimeOfDay | null = null): RoomAffinity => ({
  tag: name.toLowerCase(),
  name,
  visits: 10,
  recencyDays: 1,
  score: 10,
  byTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
  dominantTime,
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

describe("narrativeSuggestion", () => {
  it("describes the user's own week when no peers exist yet", () => {
    const s = narrativeSuggestion([], [room("Library", "morning"), room("Café"), room("Gym")]);
    expect(s.backend).toBe("narrative");
    expect(s.text).toMatch(/Library/);
    expect(s.text).toMatch(/Café/);
    expect(s.text).toMatch(/mornings/);
    expect(s.text).toMatch(/no peer vectors/i);
  });

  it("invites the user to start scanning when there's no data at all", () => {
    const s = narrativeSuggestion([], []);
    expect(s.text.toLowerCase()).toMatch(/scan/);
    expect(s.text.toLowerCase()).toMatch(/handful of rooms/);
  });

  it("characterises a weak top match honestly rather than overclaiming", () => {
    const s = narrativeSuggestion([ovl("Mira", 0.18, "Library", "morning")], [room("Library")]);
    expect(s.text).toMatch(/Mira/);
    // 0.18 should land in the brushing-past band, not the strong-overlap band.
    expect(s.text.toLowerCase()).toMatch(/brush past/);
    expect(s.text.toLowerCase()).not.toMatch(/braided/);
  });

  it("anchors a strong cluster to a shared room and a consensus time", () => {
    const peers = [
      ovl("Mira", 0.6, "Library", "morning"),
      ovl("Jon", 0.55, "Library", "morning"),
      ovl("Sam", 0.5, "Library", "morning"),
    ];
    const s = narrativeSuggestion(peers, [room("Library", "morning")]);
    expect(s.text).toMatch(/Mira/);
    expect(s.text).toMatch(/Jon/);
    expect(s.text).toMatch(/Library/);
    // Strong overlap (top score 0.6) should reach the "rhyme" band.
    expect(s.text.toLowerCase()).toMatch(/rhyme/);
    expect(s.text.toLowerCase()).toMatch(/morning/);
  });

  it("falls back to the user's own dominant time when peers don't agree", () => {
    const peers = [ovl("Mira", 0.6, "Library", "morning"), ovl("Jon", 0.55, "Library", "evening")];
    const s = narrativeSuggestion(peers, [room("Library", "afternoon")]);
    expect(s.text.toLowerCase()).toMatch(/afternoon/);
  });

  it("produces materially longer output than the template backend", () => {
    const peers = [
      ovl("Mira", 0.6, "Library", "morning"),
      ovl("Jon", 0.55, "Library", "morning"),
      ovl("Sam", 0.5, "Library", "morning"),
    ];
    const t = templateSuggestion(peers, "Library");
    const n = narrativeSuggestion(peers, [room("Library", "morning")]);
    expect(n.text.length).toBeGreaterThan(t.text.length * 1.5);
    expect(n.backend).toBe("narrative");
  });
});

describe("suggest dispatcher", () => {
  it("routes to the template backend by default", async () => {
    const s = await suggest("template", [], "Library");
    expect(s.backend).toBe("template");
  });

  it("routes to the narrative backend on request", async () => {
    const s = await suggest("narrative", [], undefined, [room("Library", "morning")]);
    expect(s.backend).toBe("narrative");
  });
});
