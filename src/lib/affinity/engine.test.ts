import { describe, expect, it } from "vitest";
import { timeBucket, toAffinityVector, type RoomAffinity } from "./engine";

const row = (over: Partial<RoomAffinity> & Pick<RoomAffinity, "tag" | "score">): RoomAffinity => ({
  tag: over.tag,
  name: over.name ?? over.tag.toUpperCase(),
  visits: over.visits ?? 1,
  recencyDays: over.recencyDays ?? 0,
  score: over.score,
  byTime: over.byTime ?? { morning: 0, afternoon: 0, evening: 0, night: 0 },
  dominantTime: over.dominantTime ?? null,
});

describe("toAffinityVector", () => {
  it("normalises scores to 0..1 with the top room at 1", () => {
    const v = toAffinityVector([
      row({ tag: "a", score: 10 }),
      row({ tag: "b", score: 5 }),
      row({ tag: "c", score: 1 }),
    ]);
    expect(v.rooms.a).toBeCloseTo(1.0);
    expect(v.rooms.b).toBeCloseTo(0.5);
    expect(v.rooms.c).toBeCloseTo(0.1);
  });

  it("returns an empty vector when there are no rows", () => {
    const v = toAffinityVector([]);
    expect(v.rooms).toEqual({});
    expect(typeof v.generatedAt).toBe("number");
    expect(v.byTime).toBeUndefined();
  });

  it("omits the byTime field when no row has a dominant bucket", () => {
    const v = toAffinityVector([row({ tag: "x", score: 7 })]);
    expect(v.byTime).toBeUndefined();
    expect(Object.keys(v.rooms)).toEqual(["x"]);
  });

  it("includes per-tag dominant bucket only when at least one row has one", () => {
    const v = toAffinityVector([
      row({ tag: "x", score: 7, dominantTime: "morning" }),
      row({ tag: "y", score: 3 }),
    ]);
    expect(v.byTime).toEqual({ x: "morning" });
  });

  it("never exposes raw visits or per-bucket counts on the wire", () => {
    const v = toAffinityVector([
      row({
        tag: "z",
        score: 4,
        visits: 99,
        byTime: { morning: 50, afternoon: 30, evening: 19, night: 0 },
        dominantTime: "morning",
      }),
    ]);
    // Only `rooms`, optional `byTime`, and `generatedAt` are allowed.
    const allowed = new Set(["rooms", "byTime", "generatedAt"]);
    for (const k of Object.keys(v)) expect(allowed.has(k)).toBe(true);
    // Each per-tag entry is normalised score (0..1) or a bucket *name*, not
    // raw counts. Checking for raw digits in JSON would be too brittle —
    // generatedAt is a unix-ms number that frequently shares digit runs with
    // unrelated counts.
    for (const score of Object.values(v.rooms)) {
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
    for (const bucket of Object.values(v.byTime ?? {})) {
      expect(["morning", "afternoon", "evening", "night"]).toContain(bucket);
    }
  });
});

describe("timeBucket", () => {
  // Use UTC-stable timestamps so the test passes in any TZ — pin to a wall
  // clock by constructing a Date and reading its hours.
  it("maps the four bucket boundaries", () => {
    const at = (h: number) => new Date(2026, 0, 1, h, 0, 0).getTime();
    expect(timeBucket(at(8))).toBe("morning");
    expect(timeBucket(at(13))).toBe("afternoon");
    expect(timeBucket(at(19))).toBe("evening");
    expect(timeBucket(at(23))).toBe("night");
    expect(timeBucket(at(3))).toBe("night");
  });
});
