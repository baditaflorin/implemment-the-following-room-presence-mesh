export type Route = "home" | "scan" | "rooms" | "suggest" | "mesh" | "settings";

interface Props {
  route: Route;
  onChange: (r: Route) => void;
}

const items: Array<{ id: Route; label: string; glyph: string }> = [
  { id: "home", label: "Home", glyph: "●" },
  { id: "rooms", label: "Rooms", glyph: "▦" },
  { id: "scan", label: "Scan", glyph: "◎" },
  { id: "suggest", label: "Suggest", glyph: "✦" },
  { id: "mesh", label: "Mesh", glyph: "⇄" },
];

export function BottomNav({ route, onChange }: Props) {
  return (
    <nav
      class="fixed bottom-0 inset-x-0 backdrop-blur bg-ink-900/85 border-t border-white/5"
      aria-label="primary"
    >
      <div class="max-w-xl mx-auto grid grid-cols-5">
        {items.map((it) => {
          const active = route === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              class={`py-3 flex flex-col items-center gap-1 text-[11px] ${
                active ? "text-accent-400" : "text-ink-400 hover:text-ink-50"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span class="text-xl leading-none" aria-hidden>
                {it.glyph}
              </span>
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
