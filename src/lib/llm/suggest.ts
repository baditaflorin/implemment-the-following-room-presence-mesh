/**
 * Suggestion generator.
 *
 * Two backends:
 *
 *   1. `template` (default, ships in v1) — deterministic, ~0 ms, no model
 *      download. Honest and good enough for the kind of nudge this app
 *      produces.
 *
 *   2. `local-llm` (opt-in, lazy-loaded) — pulls a small instruction-tuned
 *      model via `@xenova/transformers` on first use, caches it in IndexedDB
 *      via the browser. Adds ~30–80MB on first run. Not bundled in v1, but
 *      the slot is here so we don't have to refactor when we wire it up.
 *
 * The user picks the backend in Settings. Neither backend makes a network
 * call to a third party at suggestion time — `local-llm` only downloads
 * weights once from a public CDN, with the user's explicit consent.
 */

import { timeLabel, type PeerOverlap, type TimeOfDay } from "@/lib/affinity/engine";

export type SuggestionBackend = "template" | "local-llm";

export interface Suggestion {
  text: string;
  backend: SuggestionBackend;
  generatedAt: number;
}

function consensusTime(strong: PeerOverlap[]): TimeOfDay | null {
  // Tally the sharedTime field on each strong overlap's top tag. Return
  // the most-agreed-on bucket only if at least half the strong overlaps
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
  // Strict majority. A 1-1 split is not consensus — we'd rather drop the
  // bucket from the sentence than invent one.
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

let llmCached: ((overlaps: PeerOverlap[]) => Promise<Suggestion>) | null = null;

/**
 * Placeholder for the lazy LLM backend. Until a real model is wired in,
 * falls back to the template generator so callers get a useful answer.
 */
export async function llmSuggestion(overlaps: PeerOverlap[]): Promise<Suggestion> {
  if (!llmCached) {
    // Dynamic import would happen here. Kept as a stub so the initial JS
    // bundle stays small and the build doesn't pull tens of MB of weights.
    llmCached = async (o) => templateSuggestion(o);
  }
  return llmCached(overlaps);
}

export async function suggest(
  backend: SuggestionBackend,
  overlaps: PeerOverlap[],
  myTopRoom?: string,
): Promise<Suggestion> {
  if (backend === "local-llm") return llmSuggestion(overlaps);
  return templateSuggestion(overlaps, myTopRoom);
}
