import { useEffect, useState } from "preact/hooks";
import {
  computeMyAffinity,
  overlapWith,
  toAffinityVector,
  type PeerOverlap,
  type RoomAffinity,
} from "@/lib/affinity/engine";
import { db } from "@/lib/storage/db";
import { suggest, type Suggestion, type SuggestionBackend } from "@/lib/llm/suggest";

export function SuggestionsView() {
  const [overlaps, setOverlaps] = useState<PeerOverlap[]>([]);
  const [my, setMy] = useState<RoomAffinity[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [backend, setBackend] = useState<SuggestionBackend>("template");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedRaw = await db.getMeta<string>("suggestion-backend");
      // Migrate the deprecated "local-llm" choice (which was never wired to a
      // real model) to the new narrative backend so existing users see real
      // output instead of silently falling back to the template generator.
      const stored: SuggestionBackend | null =
        storedRaw === "narrative" || storedRaw === "template"
          ? storedRaw
          : storedRaw === "local-llm"
            ? "narrative"
            : null;
      if (stored) {
        setBackend(stored);
        if (storedRaw === "local-llm") await db.setMeta("suggestion-backend", "narrative");
      }
      const mine = await computeMyAffinity();
      setMy(mine);
      const myVec = toAffinityVector(mine);
      const peers = await db.listPeers();
      const results: PeerOverlap[] = [];
      for (const p of peers) {
        if (!p.affinity) continue;
        results.push(await overlapWith(p.id, p.label, p.affinity, myVec));
      }
      results.sort((a, b) => b.score - a.score);
      setOverlaps(results);
      const top = mine[0]?.name;
      setSuggestion(await suggest(stored ?? "template", results, top, mine));
      setLoading(false);
    })();
  }, []);

  async function regenerate(b: SuggestionBackend) {
    setBackend(b);
    await db.setMeta("suggestion-backend", b);
    setSuggestion(await suggest(b, overlaps, my[0]?.name, my));
  }

  if (loading) {
    return <div class="text-ink-400 text-sm py-8">computing…</div>;
  }

  return (
    <div class="flex flex-col gap-4 pt-1">
      <h2 class="text-lg font-semibold">Suggestions</h2>

      {suggestion && (
        <div class="card border border-accent-500/30">
          <div class="text-xs uppercase tracking-wider text-accent-400">
            Nudge ({suggestion.backend})
          </div>
          <p class="mt-2 leading-relaxed">{suggestion.text}</p>
          <div class="mt-3 flex gap-2 text-sm">
            <button
              class={backend === "template" ? "btn" : "btn-ghost"}
              onClick={() => regenerate("template")}
            >
              Template
            </button>
            <button
              class={backend === "narrative" ? "btn" : "btn-ghost"}
              onClick={() => regenerate("narrative")}
            >
              Narrative
            </button>
          </div>
          <p class="mt-2 text-xs text-ink-400">
            Narrative is a longer, multi-sentence framing — it names several peers, references the
            rooms they share with you, and proposes a concrete next step. Still generated locally
            from your own data; no model download, no network call.
          </p>
        </div>
      )}

      <section>
        <h3 class="text-sm uppercase tracking-wider text-ink-400 mb-2">Peer overlap</h3>
        {overlaps.length === 0 ? (
          <div class="card text-ink-400 text-sm">
            No peers known yet. Visit the Mesh tab to compare with a friend.
          </div>
        ) : (
          <ul class="space-y-2">
            {overlaps.map((o) => (
              <li key={o.peerId} class="card">
                <div class="flex items-center justify-between">
                  <div class="font-medium">{o.peerLabel}</div>
                  <div class="text-accent-400 font-mono text-sm">{(o.score * 100).toFixed(0)}%</div>
                </div>
                {o.sharedTags.length > 0 ? (
                  <ul class="mt-2 flex flex-wrap gap-1.5">
                    {o.sharedTags.slice(0, 5).map((t) => (
                      <li key={t.tag} class="pill">
                        {t.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div class="text-xs text-ink-400 mt-1">No shared rooms yet.</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
