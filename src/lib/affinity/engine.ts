import { db, type AffinityVector, type Room, type TimeOfDay, type Visit } from "@/lib/storage/db";

export type { TimeOfDay };

export interface RoomAffinity {
  tag: string;
  name: string;
  visits: number;
  recencyDays: number;
  score: number;
  // Per-bucket visit counts; sums to `visits`. Useful locally; not sent over
  // the wire (see toAffinityVector).
  byTime: Record<TimeOfDay, number>;
  // The bucket the user most often shows up in for this room. null if there
  // are zero visits (defensive — shouldn't happen since the room is only
  // in the result if there is at least one visit).
  dominantTime: TimeOfDay | null;
}

export interface PeerOverlap {
  peerId: string;
  peerLabel: string;
  sharedTags: Array<{
    tag: string;
    name: string;
    mine: number;
    theirs: number;
    sharedTime: TimeOfDay | null;
  }>;
  score: number;
}

const MS_PER_DAY = 86_400_000;

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: "the mornings",
  afternoon: "the afternoons",
  evening: "the evenings",
  night: "late at night",
};

/** Map a unix-ms timestamp to one of the four time-of-day buckets. */
export function timeBucket(ts: number): TimeOfDay {
  const h = new Date(ts).getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

/** Human label for a bucket, suitable for use inside a sentence. */
export function timeLabel(b: TimeOfDay): string {
  return TIME_LABELS[b];
}

function emptyBuckets(): Record<TimeOfDay, number> {
  return { morning: 0, afternoon: 0, evening: 0, night: 0 };
}

function dominantBucket(b: Record<TimeOfDay, number>): TimeOfDay | null {
  let best: TimeOfDay | null = null;
  let bestN = 0;
  for (const k of Object.keys(b) as TimeOfDay[]) {
    if (b[k] > bestN) {
      bestN = b[k];
      best = k;
    }
  }
  return best;
}

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
    const buckets = emptyBuckets();
    for (const v of vs) buckets[timeBucket(v.ts)] += 1;
    result.push({
      tag,
      name: byTag.get(tag)?.name ?? tag,
      visits: vs.length,
      recencyDays: daysSince,
      score,
      byTime: buckets,
      dominantTime: dominantBucket(buckets),
    });
  }
  result.sort((a, b) => b.score - a.score);
  return result;
}

/**
 * Convert RoomAffinity[] into a normalised vector suitable for peer exchange.
 * The vector intentionally omits raw visit counts and timestamps — only the
 * normalised affinity per tag, and (optionally) the dominant time-of-day
 * bucket per tag, are shared.
 */
export function toAffinityVector(rows: RoomAffinity[], now = Date.now()): AffinityVector {
  if (rows.length === 0) return { rooms: {}, generatedAt: now };
  const max = Math.max(...rows.map((r) => r.score));
  const out: Record<string, number> = {};
  const times: Record<string, TimeOfDay> = {};
  for (const r of rows) {
    out[r.tag] = max > 0 ? r.score / max : 0;
    if (r.dominantTime) times[r.tag] = r.dominantTime;
  }
  const v: AffinityVector = { rooms: out, generatedAt: now };
  if (Object.keys(times).length > 0) v.byTime = times;
  return v;
}

/**
 * Compute overlap with one peer's affinity vector. Cosine-style score on the
 * intersection of room tags, surfaced as 0..1. Each shared tag carries the
 * time-of-day bucket where both peers agree (when both vectors advertise
 * one and they match).
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
      const myT = myVec.byTime?.[tag];
      const theirT = theirs.byTime?.[tag];
      const sharedTime = myT && theirT && myT === theirT ? myT : null;
      sharedTags.push({
        tag,
        name: nameByTag.get(tag) ?? tag,
        mine: m,
        theirs: t,
        sharedTime,
      });
    }
  }
  const score = myMag > 0 && theirMag > 0 ? dot / Math.sqrt(myMag * theirMag) : 0;
  sharedTags.sort((a, b) => b.mine * b.theirs - a.mine * a.theirs);

  return { peerId, peerLabel, sharedTags, score };
}
