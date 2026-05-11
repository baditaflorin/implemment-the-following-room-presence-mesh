import { describe, expect, it } from "vitest";
import { toAffinityVector, type RoomAffinity } from "./engine";

describe("toAffinityVector", () => {
  it("normalises scores to 0..1 with the top room at 1", () => {
    const rows: RoomAffinity[] = [
      { tag: "a", name: "A", visits: 10, recencyDays: 0, score: 10 },
      { tag: "b", name: "B", visits: 5, recencyDays: 0, score: 5 },
      { tag: "c", name: "C", visits: 1, recencyDays: 0, score: 1 },
    ];
    const v = toAffinityVector(rows);
    expect(v.rooms.a).toBeCloseTo(1.0);
    expect(v.rooms.b).toBeCloseTo(0.5);
    expect(v.rooms.c).toBeCloseTo(0.1);
  });

  it("returns an empty vector when there are no rows", () => {
    const v = toAffinityVector([]);
    expect(v.rooms).toEqual({});
    expect(typeof v.generatedAt).toBe("number");
  });

  it("omits visit counts and timestamps from the wire payload", () => {
    const rows: RoomAffinity[] = [{ tag: "x", name: "X", visits: 99, recencyDays: 0, score: 7 }];
    const v = toAffinityVector(rows);
    expect(Object.keys(v)).toEqual(["rooms", "generatedAt"]);
    expect(Object.keys(v.rooms)).toEqual(["x"]);
  });
});
