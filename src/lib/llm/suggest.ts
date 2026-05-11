/**
 * Suggestion generator.
 *
 * Two backends, both run entirely in the browser and never call out:
 *
 *   1. `template` (default) — short, single-sentence nudge. Deterministic,
 *      ~0 ms. Honest and good enough when the user just wants a one-liner.
 *
 *   2. `narrative` — longer, multi-sentence framing that names several
 *      peers, references the user's own top rooms, characterises overlap
 *      strength in plain English, and proposes a concrete next step. Still
 *      template-driven (we explicitly do *not* claim an LLM is involved),
 *      but the output structure is meaningfully different from `template`.
 *
 * An earlier version exposed a third "local-llm" backend that promised to
 * lazily download an instruction-tuned model. That code path was a stub
 * that fell straight back to `template`, so the UI was misleading. The
 * `narrative` backend is what the user gets now when they pick the
 * second option — labelled honestly so nobody thinks weights are being
 * fetched in the background.
 */

import {
  timeLabel,
  type PeerOverlap,
  type RoomAffinity,
  type TimeOfDay,
} from "@/lib/affinity/engine";

export type SuggestionBackend = "template" | "narrative";

export interface Suggestion {
  text: string;
  backend: SuggestionBackend;
  generatedAt: number;
}

function consensusTime(strong: PeerOverlap[]): TimeOfDay | null {
  // Tally the sharedTime field on each strong overlap's top tag. Return
  // the most-agreed-on bucket only if a strict majority of strong overlaps
  // agree; otherwise null (don't fabricate a time).
  const counts: Record<string, number> = {};
  let total = 0;
  for (const o of strong) {
    const t = o.sharedTags[0]?.sharedTime;
    if (!t) continue;
    counts[t] = (counts[t] ?? 0) + 1;
    total += 1;
  }
  if (total === 0) return null;
  let best: TimeOfDay | null = null;
  let bestN = 0;
  for (const [k, n] of Object.entries(counts)) {
    if (n > bestN) {
      bestN = n;
      best = k as TimeOfDay;
    }
  }
  return bestN * 2 > total ? best : null;
}

export function templateSuggestion(overlaps: PeerOverlap[], myTopRoom?: string): Suggestion {
  const now = Date.now();
  if (overlaps.length === 0) {
    return {
      text: myTopRoom
        ? `You spend a lot of time at the ${myTopRoom}. Try scanning a friend in next time.`
        : "Scan a few room tags this week — patterns show up after 5–10 visits.",
      backend: "template",
      generatedAt: now,
    };
  }
  const strong = overlaps.filter((o) => o.score >= 0.35);
  if (strong.length === 0) {
    const top = overlaps[0]!;
    const sharedName = top.sharedTags[0]?.name;
    const sharedTime = top.sharedTags[0]?.sharedTime;
    if (sharedName && sharedTime) {
      return {
        text: `You and ${top.peerLabel} both turn up at the ${sharedName} around ${timeLabel(
          sharedTime,
        )}. Worth a quick hello.`,
        backend: "template",
        generatedAt: now,
      };
    }
    return {
      text: sharedName
        ? `You and ${top.peerLabel} both stop by the ${sharedName}. Worth a quick hello next time.`
        : `${top.peerLabel} and you don't overlap much yet — scan a few more rooms.`,
      backend: "template",
      generatedAt: now,
    };
  }
  const groupRoom = strong[0]?.sharedTags[0]?.name ?? myTopRoom ?? "your favourite spot";
  const names = strong
    .slice(0, 3)
    .map((s) => s.peerLabel)
    .join(", ");
  const time = consensusTime(strong);
  const where = time ? `to the ${groupRoom} in ${timeLabel(time)}` : `to the ${groupRoom}`;
  return {
    text: `${strong.length} other ${
      strong.length === 1 ? "person" : "people"
    } also gravitate ${where} (${names}). Coffee tomorrow?`,
    backend: "template",
    generatedAt: now,
  };
}

function overlapStrengthPhrase(score: number): string {
  if (score >= 0.7) return "your routines are nearly braided together";
  if (score >= 0.5) return "your weeks rhyme more often than not";
  if (score >= 0.35) return "you cross paths often enough to plan around it";
  if (score >= 0.15) return "you brush past each other now and then";
  return "you barely overlap yet";
}

function listAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function narrativeSuggestion(
  overlaps: PeerOverlap[],
  myAffinity: RoomAffinity[] = [],
): Suggestion {
  const now = Date.now();

  if (overlaps.length === 0) {
    if (myAffinity.length === 0) {
      return {
        text: "Nothing to weave from yet. Scan a handful of rooms across a normal week, then invite one person to compare — patterns sharpen fast once a second vector lands.",
        backend: "narrative",
        generatedAt: now,
      };
    }
    const top = myAffinity.slice(0, 3).map((r) => r.name);
    const dom = myAffinity[0]?.dominantTime;
    const when = dom ? ` (mostly ${timeLabel(dom)})` : "";
    return {
      text: `Your week leans on ${listAnd(top)}${when}. There are no peer vectors to compare against yet — the next person who scans in will start filling out the overlap picture.`,
      backend: "narrative",
      generatedAt: now,
    };
  }

  const top = overlaps[0]!;
  const strong = overlaps.filter((o) => o.score >= 0.35);
  const strength = overlapStrengthPhrase(top.score);

  if (strong.length === 0) {
    const sharedNames = top.sharedTags.slice(0, 3).map((t) => t.name);
    const sharedTime = top.sharedTags[0]?.sharedTime;
    const placePart =
      sharedNames.length > 0
        ? `Where you do meet — ${listAnd(sharedNames)}${sharedTime ? `, usually ${timeLabel(sharedTime)}` : ""}`
        : "There's no shared room yet";
    const opener = `${top.peerLabel} is your closest match right now, but ${strength}.`;
    const next =
      sharedNames.length > 0
        ? `${placePart} — is the obvious place to say hello.`
        : `${placePart}, so a single scheduled overlap (lunch, a class, a shared errand) would do more than waiting for serendipity.`;
    return { text: `${opener} ${next}`, backend: "narrative", generatedAt: now };
  }

  const peerNames = strong.slice(0, 4).map((s) => s.peerLabel);
  const sharedRooms = uniqueRoomNames(strong, 3);
  const consensus = consensusTime(strong);
  const myDominant = myAffinity[0]?.dominantTime ?? null;

  const opening = `${peerNames.length === 1 ? peerNames[0] : `${peerNames.length} people in your mesh`} (${listAnd(peerNames)}) shape up as a pocket of routine — ${strength}.`;
  const middle =
    sharedRooms.length > 0
      ? `The ${sharedRooms.length === 1 ? "anchor is" : "anchors are"} ${listAnd(sharedRooms)}${consensus ? `, with ${timeLabel(consensus)} the time everyone seems to drift in` : ""}.`
      : "There's no single anchor room — the overlap is spread across whatever you each happen to scan.";
  const closing = consensus
    ? `Pick a ${shortBucket(consensus)} this week, post it in the room you all share, and let the schedule converge.`
    : myDominant
      ? `Your own week leans ${timeLabel(myDominant)} — proposing that window first will probably stick.`
      : "A single concrete invite (a time, a place, a 30-minute hold) usually beats waiting for the buckets to align on their own.";

  return {
    text: `${opening} ${middle} ${closing}`,
    backend: "narrative",
    generatedAt: now,
  };
}

function uniqueRoomNames(overlaps: PeerOverlap[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of overlaps) {
    for (const t of o.sharedTags) {
      if (seen.has(t.tag)) continue;
      seen.add(t.tag);
      out.push(t.name);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function shortBucket(b: TimeOfDay): string {
  switch (b) {
    case "morning":
      return "morning";
    case "afternoon":
      return "afternoon";
    case "evening":
      return "evening slot";
    case "night":
      return "late slot";
  }
}

export async function suggest(
  backend: SuggestionBackend,
  overlaps: PeerOverlap[],
  myTopRoom?: string,
  myAffinity?: RoomAffinity[],
): Promise<Suggestion> {
  if (backend === "narrative") return narrativeSuggestion(overlaps, myAffinity ?? []);
  return templateSuggestion(overlaps, myTopRoom);
}
