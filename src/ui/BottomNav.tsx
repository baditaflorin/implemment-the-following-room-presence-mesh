import { Home, Layers, QrCode, Sparkles, Wifi, type LucideIcon } from "lucide-preact";

export type Route = "home" | "scan" | "rooms" | "suggest" | "mesh" | "settings";

interface Props {
  route: Route;
  onChange: (r: Route) => void;
}

interface NavItem {
  id: Route;
  label: string;
  Icon: LucideIcon;
}

// Cryptic single-glyph labels (●, ▦, ◎, ✦, ⇄) made it impossible to guess
// what each tab did. Use named Lucide icons + readable labels at 12px+.
const items: NavItem[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "rooms", label: "Rooms", Icon: Layers },
  { id: "scan", label: "Scan", Icon: QrCode },
  { id: "suggest", label: "Suggest", Icon: Sparkles },
  { id: "mesh", label: "Mesh", Icon: Wifi },
];

export function BottomNav({ route, onChange }: Props) {
  return (
    <nav
      class="fixed bottom-0 inset-x-0 backdrop-blur bg-ink-900/85 border-t border-white/5 pb-[env(safe-area-inset-bottom)]"
      aria-label="primary"
    >
      <div class="max-w-xl mx-auto grid grid-cols-5">
        {items.map((it) => {
          const active = route === it.id;
          const Icon = it.Icon;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              // min-h-12 = 48px, comfortably above the 44px WCAG target
              // even after subtracting the safe-area inset on iOS.
              class={`min-h-12 py-2 flex flex-col items-center justify-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-inset ${
                active ? "text-accent-400" : "text-ink-400 hover:text-ink-50"
              }`}
              aria-current={active ? "page" : undefined}
              aria-label={it.label}
            >
              <Icon size={20} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
