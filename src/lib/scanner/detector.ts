/**
 * Room-tag detector.
 *
 * v1 contract: a "room tag" is any string. It is the stable identifier for a
 * physical room. The user (or whoever printed the tag) chose it. Examples:
 *   - "rpm:library:42"  (an AprilTag id baked into a printed marker)
 *   - "rpm:cafe:olive"
 *   - any UTF-8 string is acceptable as long as it's unique per room
 *
 * Detection sources:
 *   - Manual entry (always available, no permissions required).
 *   - QR code via the BarcodeDetector browser API (Chromium, Safari iOS 17+).
 *   - AprilTag detection via WASM (lazy-loaded; see ADR-0006). Not bundled in
 *     v1 — the integration point is `detectAprilTag()` which throws a
 *     `NotImplementedError` until the WASM module is wired in.
 *
 * The Mode A constraint says the WASM detector must lazy-load behind a user
 * action. We honour that: nothing in this module pulls a detector eagerly.
 */

export interface TagDetection {
  tag: string;
  source: "manual" | "qr" | "apriltag";
  detectedAt: number;
}

export class NotImplementedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "NotImplementedError";
  }
}

/**
 * Try to read a QR-encoded room tag from a video element using the native
 * BarcodeDetector when available. Returns null if unsupported or no code
 * found in this frame.
 */
export async function detectQRFromVideo(video: HTMLVideoElement): Promise<string | null> {
  const Detector = (
    globalThis as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (s: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
      };
    }
  ).BarcodeDetector;
  if (!Detector) return null;
  if (video.readyState < 2) return null;
  try {
    const det = new Detector({ formats: ["qr_code"] });
    const results = await det.detect(video);
    return results[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

/**
 * AprilTag detection slot. The integration is intentionally deferred:
 *   - The contract is stable.
 *   - The implementation will pull `@april-tag/wasm` (or equivalent) via
 *     a dynamic import so the WASM bundle never lands in the initial JS.
 *   - Until that ships, callers can fall back to QR or manual entry.
 *
 * Returning null means "no tag in this frame"; throwing NotImplementedError
 * means "this build does not yet ship the WASM detector".
 */
export async function detectAprilTag(_video: HTMLVideoElement): Promise<string | null> {
  throw new NotImplementedError(
    "AprilTag-WASM detector is not bundled in this build — use QR or manual entry",
  );
}

export function canonicalTag(input: string): string {
  return input.trim().toLowerCase();
}
