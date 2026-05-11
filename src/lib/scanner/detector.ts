/**
 * Room-tag detector.
 *
 * v1 contract: a "room tag" is any string. It is the stable identifier for a
 * physical room. The user (or whoever printed the tag) chose it. Examples:
 *   - "rpm:library:42"  (encoded inside a printed marker)
 *   - "rpm:cafe:olive"
 *   - any UTF-8 string is acceptable as long as it's unique per room
 *
 * Detection sources:
 *   - Manual entry (always available, no permissions required).
 *   - QR code via the BarcodeDetector browser API (Chromium, Safari iOS 17+).
 *   - AprilTag detection via the vendored apriltag-js-standalone WASM bundle
 *     (lazy-loaded; see ADR-0006). The detector runs in a Web Worker so the
 *     main thread stays responsive at scan-loop tick rate.
 *
 * The Mode A constraint says the WASM detector must lazy-load behind a user
 * action. We honour that: nothing in this module pulls the detector eagerly
 * — `detectAprilTag` spins up the worker on first call and caches it.
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

// AprilTag worker plumbing -------------------------------------------------

type WorkerMessage =
  | { type: "ready"; id: number }
  | { type: "result"; id: number; detections: Array<{ id: number }> }
  | { type: "error"; id: number; error: string };

let workerPromise: Promise<Worker> | null = null;
let nextRequestId = 1;

function getWorker(): Promise<Worker> {
  if (workerPromise) return workerPromise;
  workerPromise = new Promise<Worker>((resolve, reject) => {
    let w: Worker;
    try {
      const url = new URL("vendor/apriltag/apriltag-worker.js", document.baseURI).toString();
      w = new Worker(url);
    } catch (err) {
      workerPromise = null;
      reject(err);
      return;
    }
    const timeout = setTimeout(() => {
      workerPromise = null;
      try {
        w.terminate();
      } catch {
        /* best-effort */
      }
      reject(new Error("apriltag worker init timed out"));
    }, 8000);
    const onError = (ev: ErrorEvent) => {
      clearTimeout(timeout);
      workerPromise = null;
      reject(ev.error ?? new Error("apriltag worker errored"));
    };
    w.addEventListener("error", onError, { once: true });
    const onMsg = (ev: MessageEvent<WorkerMessage>) => {
      if (ev.data?.type !== "ready") return;
      clearTimeout(timeout);
      w.removeEventListener("message", onMsg);
      w.removeEventListener("error", onError);
      resolve(w);
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "init", id: 0 });
  });
  return workerPromise;
}

/** Downsample a video frame to a small grayscale buffer for the detector. */
function frameToGrayscale(video: HTMLVideoElement): {
  buffer: ArrayBuffer;
  width: number;
  height: number;
} | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const targetW = 320;
  const targetH = Math.round((video.videoHeight / video.videoWidth) * targetW) || 240;
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, targetW, targetH);
  const img = ctx.getImageData(0, 0, targetW, targetH);
  const gray = new Uint8Array(targetW * targetH);
  for (let i = 0, j = 0; i < img.data.length; i += 4, j++) {
    // Integer luma approximation: 0.299*R + 0.587*G + 0.114*B
    const r = img.data[i] as number;
    const g = img.data[i + 1] as number;
    const b = img.data[i + 2] as number;
    gray[j] = (r * 38 + g * 75 + b * 15) >> 7;
  }
  return { buffer: gray.buffer, width: targetW, height: targetH };
}

/**
 * Detect an AprilTag in the current video frame and return a canonical
 * room-tag string ("rpm:apriltag:<id>"). Returns null if no tag is in the
 * frame. Throws `NotImplementedError` only if the vendored worker bundle
 * isn't reachable (missing files, blocked by CSP, etc.) so callers can
 * disable AprilTag attempts for the rest of the session.
 */
export async function detectAprilTag(video: HTMLVideoElement): Promise<string | null> {
  let w: Worker;
  try {
    w = await getWorker();
  } catch (err) {
    throw new NotImplementedError(
      `AprilTag worker unavailable: ${err instanceof Error ? err.message : err}`,
    );
  }
  const frame = frameToGrayscale(video);
  if (!frame) return null;
  const id = nextRequestId++;
  return new Promise<string | null>((resolve) => {
    const onMsg = (ev: MessageEvent<WorkerMessage>) => {
      const msg = ev.data;
      if (!msg || msg.id !== id) return;
      w.removeEventListener("message", onMsg);
      if (msg.type === "error") {
        console.warn("apriltag detect error", msg.error);
        resolve(null);
        return;
      }
      if (msg.type !== "result") return;
      const first = msg.detections[0];
      resolve(first ? `rpm:apriltag:${first.id}` : null);
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "detect", id, payload: frame }, [frame.buffer]);
  });
}

/**
 * Cheap reachability probe — returns true if the vendored AprilTag bundle
 * is present at the expected path. Used by the scanner UI to decide whether
 * to attempt AprilTag detection at all.
 */
export async function aprilTagBundlePresent(): Promise<boolean> {
  try {
    const url = new URL("vendor/apriltag/apriltag-worker.js", document.baseURI).toString();
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export function canonicalTag(input: string): string {
  return input.trim().toLowerCase();
}
