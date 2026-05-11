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

import type { PeerOverlap } from "@/lib/affinity/engine";

export type SuggestionBackend = "template" | "local-llm";

export interface Suggestion {
  text: string;
  backend: SuggestionBackend;
  generatedAt: number;
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
  return {
    text: `${strong.length} other ${
      strong.length === 1 ? "person" : "people"
    } also gravitate to the ${groupRoom} (${names}). Want a coffee tomorrow morning?`,
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
