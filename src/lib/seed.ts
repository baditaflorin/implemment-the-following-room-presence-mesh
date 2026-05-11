import { db } from "@/lib/storage/db";

/**
 * Seed a plausible-looking visit history so the suggestions screen has
 * something to talk about on a first-run demo. Idempotent — only seeds if
 * the visits store is empty.
 */
export async function seedIfEmpty(): Promise<{ seeded: boolean }> {
  const existing = await db.listVisits(1);
  if (existing.length > 0) return { seeded: false };
  const now = Date.now();
  const rooms = [
    { tag: "rpm:library:42", name: "Main Library", color: "#7dd3fc" },
    { tag: "rpm:cafe:olive", name: "Olive Café", color: "#a78bfa" },
    { tag: "rpm:gym:north", name: "North Gym", color: "#f472b6" },
    { tag: "rpm:lab:b210", name: "Lab B-210", color: "#fbbf24" },
  ];
  for (const r of rooms) {
    await db.upsertRoom({ ...r, createdAt: now });
  }
  const samples: Array<[string, number, number]> = [
    // [tag, daysAgo, dwellMin]
    ["rpm:library:42", 0, 95],
    ["rpm:library:42", 1, 70],
    ["rpm:library:42", 2, 120],
    ["rpm:library:42", 4, 50],
    ["rpm:library:42", 7, 80],
    ["rpm:cafe:olive", 0, 35],
    ["rpm:cafe:olive", 3, 25],
    ["rpm:cafe:olive", 6, 40],
    ["rpm:gym:north", 1, 60],
    ["rpm:gym:north", 5, 60],
    ["rpm:lab:b210", 2, 180],
  ];
  for (const [tag, daysAgo, dwellMin] of samples) {
    await db.recordVisit({
      tag,
      ts: now - daysAgo * 86_400_000 - Math.floor(Math.random() * 7_200_000),
      dwellSec: dwellMin * 60,
    });
  }
  // Seed one mock peer so the Mesh tab shows something on first run.
  await db.upsertPeer({
    id: "mock-mira",
    label: "Mira",
    affinity: {
      rooms: {
        "rpm:library:42": 1.0,
        "rpm:cafe:olive": 0.7,
        "rpm:lab:b210": 0.4,
      },
      generatedAt: now,
    },
    lastSeen: now,
  });
  await db.upsertPeer({
    id: "mock-jon",
    label: "Jon",
    affinity: {
      rooms: {
        "rpm:library:42": 0.6,
        "rpm:gym:north": 0.9,
      },
      generatedAt: now,
    },
    lastSeen: now,
  });
  return { seeded: true };
}
