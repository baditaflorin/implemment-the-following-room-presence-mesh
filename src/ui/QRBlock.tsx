import { useEffect, useRef } from "preact/hooks";
import QRCode from "qrcode";

interface Props {
  payload: string;
  caption?: string;
  /** Hard ceiling in CSS pixels. Phones get auto-shrunk to fit. */
  maxSize?: number;
  /** Foreground colour for the QR; default reads well on the app's dark UI. */
  fg?: string;
  /** Background colour. Use a light value for camera scannability. */
  bg?: string;
}

/**
 * Returns the largest QR pixel size that comfortably fits the viewport,
 * never exceeding `maxSize`. Accounts for the app's `px-4` (32px) outer
 * padding plus a small breathing margin so the code never touches the
 * card edge on a 320–360px phone.
 */
export function fitQrSize(viewportWidth: number, maxSize: number): number {
  const horizontalPadding = 48; // px-4 × 2 + a small inner card margin
  const widthBudget = Math.max(160, viewportWidth - horizontalPadding);
  return Math.min(maxSize, widthBudget);
}

export function QRBlock({
  payload,
  caption,
  maxSize = 256,
  fg = "#0e1116",
  bg = "#7dd3fc",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const size = fitQrSize(window.innerWidth, maxSize);
      QRCode.toCanvas(canvas, payload, {
        width: size,
        margin: 1,
        color: { dark: fg, light: bg },
      }).catch(() => {
        // QR may be too large for a single code (handshake payloads can
        // exceed v40 capacity); the textarea fallback below still works.
      });
    };

    draw();
    window.addEventListener("resize", draw);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", draw);
    };
  }, [payload, maxSize, fg, bg]);

  return (
    <div class="card flex flex-col items-center gap-2">
      <canvas ref={canvasRef} class="rounded-lg max-w-full h-auto" />
      {caption ? <div class="text-xs text-ink-400 text-center">{caption}</div> : null}
      <details class="w-full mt-1">
        <summary class="cursor-pointer text-xs text-ink-400">show payload as text</summary>
        <textarea
          readOnly
          class="w-full mt-2 h-32 rounded-lg bg-white/5 ring-1 ring-white/10 px-2 py-1 text-xs font-mono"
          value={payload}
        />
        <button
          class="btn-ghost text-xs mt-2 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          onClick={() => {
            void navigator.clipboard?.writeText(payload);
          }}
        >
          Copy payload
        </button>
      </details>
    </div>
  );
}
