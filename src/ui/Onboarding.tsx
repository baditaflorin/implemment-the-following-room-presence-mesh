import { useState } from "preact/hooks";
import { ChevronLeft, ChevronRight, QrCode, Users, X } from "lucide-preact";

interface Slide {
  title: string;
  body: string;
  // Iconography is intentionally redundant — strangers reported reading
  // the icons before the words on a phone, so each slide pairs one.
  icon: "scan" | "compare";
}

const SLIDES: Slide[] = [
  {
    title: "Tag rooms you actually use",
    body: "Scan a room's QR code (or paste its short id) every time you arrive. After 5–10 scans you'll see your weekly rhythm: which rooms you live in, when you tend to drop by, which ones you've drifted from.",
    icon: "scan",
  },
  {
    title: "Compare with a friend, peer-to-peer",
    body: "On the Mesh tab you can share a QR with one friend and see your overlap: the rooms you both gravitate toward, the time of day you both show up. Nothing leaves your phone unless you accept their handshake.",
    icon: "compare",
  },
  {
    title: "Your data stays here",
    body: "Visits live in this browser's IndexedDB. There is no server, no account, no upload. Clear browser data and the app forgets everything — including this introduction, which will reappear on the next visit.",
    icon: "compare",
  },
];

export function Onboarding({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step]!;
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      class="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-ink-950/70 backdrop-blur-sm p-3"
    >
      <div class="w-full max-w-md rounded-2xl bg-ink-900 ring-1 ring-white/10 p-5 shadow-2xl relative">
        <button
          type="button"
          class="absolute top-3 right-3 p-2 rounded-full text-ink-400 hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          onClick={onDismiss}
          aria-label="Skip introduction"
        >
          <X size={18} />
        </button>

        <div class="flex justify-center mb-4 text-accent-400">
          {slide.icon === "scan" ? <QrCode size={48} /> : <Users size={48} />}
        </div>

        <h2 id="onboarding-title" class="text-xl font-semibold text-center">
          {slide.title}
        </h2>
        <p class="mt-3 text-sm leading-6 text-ink-300 text-center">{slide.body}</p>

        <ol class="mt-5 flex justify-center gap-2" aria-label="Onboarding progress">
          {SLIDES.map((_, i) => (
            <li
              key={i}
              class={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-accent-400" : "w-2 bg-white/20"
              }`}
              aria-current={i === step ? "step" : undefined}
            />
          ))}
        </ol>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="btn-ghost min-h-11 flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            onClick={() => (step === 0 ? onDismiss() : setStep(step - 1))}
          >
            {step === 0 ? (
              "Skip"
            ) : (
              <>
                <ChevronLeft size={16} />
                Back
              </>
            )}
          </button>
          <button
            type="button"
            class="btn min-h-11 flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            onClick={() => (isLast ? onDismiss() : setStep(step + 1))}
          >
            {isLast ? "Got it" : "Next"}
            {!isLast ? <ChevronRight size={16} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
