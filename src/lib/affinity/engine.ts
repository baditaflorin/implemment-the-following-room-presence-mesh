import { db, type AffinityVector, type Room, type Visit } from "@/lib/storage/db";

export interface RoomAffinity {
  tag: string;
  name: string;
  visits: number;
  recencyDays: number;
  score: number;
}

export interface PeerOverlap {
  peerId: string;
  peerLabel: string;
  sharedTags: Array<{ tag: string; name: string; mine: number; theirs: number }>;
  score: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Compute the user's top rooms by a recency-weighted visit score.
 *
 * Score = visits * (0.5 + 0.5 * exp(-daysSinceLast/14))
 * — frequency matters, but rooms you've drifted away from decay smoothly.
 */
export async function computeMyAffinity(now = Date.now()): Promise<RoomAffinity[]> {
  const visits = await db.listVisits(5000);
  const rooms = await db.listRooms();
  const byTag = new Map<string, Room>();
  for (const r of rooms) byTag.set(r.tag, r);

  const grouped = new Map<string, Visit[]>();
  for (const v of visits) {
    const list = grouped.get(v.tag) ?? [];
    list.push(v);
    grouped.set(v.tag, list);
  }

  const result: RoomAffinity[] = [];
  for (const [tag, vs] of grouped) {
    const last = Math.max(...vs.map((v) => v.ts));
    const daysSince = Math.max(0, (now - last) / MS_PER_DAY);
    const recencyFactor = 0.5 + 0.5 * Math.exp(-daysSince / 14);
    const score = vs.length * recencyFactor;
    result.push({
      tag,
      name: byTag.get(tag)?.name ?? tag,
      visits: vs.length,
      recencyDays: daysSince,
      score,
    });
  }
  result.sort((a, b) => b.score - a.score);
  return result;
}

/**
 * Convert RoomAffinity[] into a normalised vector suitable for peer exchange.
 * The vector intentionally omits raw visit counts and timestamps — only the
 * normalised affinity per tag is shared, so it cannot be reversed to a
 * detailed history.
 */
export function toAffinityVector(rows: RoomAffinity[], now = Date.now()): AffinityVector {
  if (rows.length === 0) return { rooms: {}, generatedAt: now };
  const max = Math.max(...rows.map((r) => r.score));
  const out: Record<string, number> = {};
  for (const r of rows) out[r.tag] = max > 0 ? r.score / max : 0;
  return { rooms: out, generatedAt: now };
}

/**
 * Compute overlap with one peer's affinity vector. Cosine-style score on the
 * intersection of room tags, surfaced as 0..1.
 */
export async function overlapWith(
  peerId: string,
  peerLabel: string,
  theirs: AffinityVector,
  mine?: AffinityVector,
): Promise<PeerOverlap> {
  const myVec = mine ?? toAffinityVector(await computeMyAffinity());
  const rooms = await db.listRooms();
  const nameByTag = new Map(rooms.map((r) => [r.tag, r.name]));

  const sharedTags: PeerOverlap["sharedTags"] = [];
  let dot = 0;
  let myMag = 0;
  let theirMag = 0;
  const allTags = new Set([...Object.keys(myVec.rooms), ...Object.keys(theirs.rooms)]);
  for (const tag of allTags) {
    const m = myVec.rooms[tag] ?? 0;
    const t = theirs.rooms[tag] ?? 0;
    myMag += m * m;
    theirMag += t * t;
    dot += m * t;
    if (m > 0 && t > 0) {
      sharedTags.push({ tag, name: nameByTag.get(tag) ?? tag, mine: m, theirs: t });
    }
  }
  const score = myMag > 0 && theirMag > 0 ? dot / Math.sqrt(myMag * theirMag) : 0;
  sharedTags.sort((a, b) => b.mine * b.theirs - a.mine * a.theirs);

  return { peerId, peerLabel, sharedTags, score };
}
