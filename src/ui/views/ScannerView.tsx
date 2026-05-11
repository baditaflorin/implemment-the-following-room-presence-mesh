import { useEffect, useRef, useState } from "preact/hooks";
import { canonicalTag, detectQRFromVideo, NotImplementedError } from "@/lib/scanner/detector";
import { db } from "@/lib/storage/db";

interface Props {
  onDone: () => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "denied"; reason: string }
  | { kind: "captured"; tag: string };

export function ScannerView({ onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Drives the recursive scan loop. Refs change synchronously, unlike state,
  // so the loop's cancellation check stays correct after start/stop.
  const scanningRef = useRef(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [manual, setManual] = useState("");
  const [name, setName] = useState("");
  const [aprilTagAvailable] = useState<boolean | null>(false);

  useEffect(() => {
    return () => {
      scanningRef.current = false;
      stopStream();
    };
  }, []);

  function stopStream() {
    scanningRef.current = false;
    const s = streamRef.current;
    if (s) for (const t of s.getTracks()) t.stop();
    streamRef.current = null;
  }

  async function startScanning() {
    setStatus({ kind: "scanning" });
    scanningRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
        scanLoop();
      }
    } catch (err) {
      scanningRef.current = false;
      setStatus({
        kind: "denied",
        reason: err instanceof Error ? err.message : "camera unavailable",
      });
    }
  }

  async function scanLoop() {
    if (!scanningRef.current) return;
    const v = videoRef.current;
    if (!v) return;
    let tag: string | null = null;
    if (aprilTagAvailable) {
      // AprilTag detector slot — wired by Pass D. Until then we fall through
      // to QR detection. Errors bubble unless they're the documented
      // NotImplementedError sentinel from detector.ts.
      try {
        // intentionally empty until detectAprilTag is bundled
      } catch (e) {
        if (!(e instanceof NotImplementedError)) console.warn(e);
      }
    }
    if (!tag) tag = await detectQRFromVideo(v);
    if (!scanningRef.current) return;
    if (tag) {
      stopStream();
      setStatus({ kind: "captured", tag: canonicalTag(tag) });
      return;
    }
    setTimeout(scanLoop, 400);
  }

  async function commit(tag: string) {
    const t = canonicalTag(tag);
    if (!t) return;
    const existing = await db.getRoom(t);
    const roomName = (name.trim() || existing?.name || t).slice(0, 80);
    await db.upsertRoom({
      tag: t,
      name: roomName,
      createdAt: existing?.createdAt ?? Date.now(),
    });
    await db.recordVisit({ tag: t, ts: Date.now() });
    onDone();
  }

  return (
    <div class="flex flex-col gap-4 pt-1">
      <h2 class="text-lg font-semibold">Record a visit</h2>
      <p class="text-sm text-ink-400">
        Point your camera at the room's tag, or type its ID. Tags can be AprilTags or QR codes —
        anything that resolves to a stable string.
      </p>

      <div class="card">
        <div class="text-xs uppercase tracking-wider text-ink-400 mb-2">Camera</div>
        {status.kind === "idle" && (
          <button class="btn" onClick={startScanning}>
            Open camera
          </button>
        )}
        {status.kind === "scanning" && (
          <div>
            <div class="aspect-video rounded-xl overflow-hidden bg-black/40">
              <video ref={videoRef} playsInline muted class="w-full h-full object-cover" />
            </div>
            <div class="mt-2 text-xs text-ink-400">
              {aprilTagAvailable
                ? "Looking for AprilTags and QR codes…"
                : "Looking for QR codes. (AprilTag-WASM not bundled in this build.)"}
            </div>
          </div>
        )}
        {status.kind === "denied" && (
          <div class="text-sm text-amber-300">
            Camera unavailable: {status.reason}. Use manual entry below.
          </div>
        )}
        {status.kind === "captured" && (
          <div class="space-y-3">
            <div>
              <div class="text-xs text-ink-400">Detected tag</div>
              <div class="font-mono">{status.tag}</div>
            </div>
            <label class="block">
              <div class="text-xs text-ink-400">Name this room (optional)</div>
              <input
                class="w-full mt-1 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2"
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
                placeholder="e.g. Main Library"
              />
            </label>
            <button class="btn" onClick={() => commit(status.tag)}>
              Save visit
            </button>
          </div>
        )}
      </div>

      <div class="card">
        <div class="text-xs uppercase tracking-wider text-ink-400 mb-2">Manual</div>
        <label class="block text-sm">
          <span class="text-ink-400">Tag</span>
          <input
            class="w-full mt-1 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2 font-mono"
            value={manual}
            onInput={(e) => setManual((e.target as HTMLInputElement).value)}
            placeholder="rpm:library:42"
          />
        </label>
        <label class="block text-sm mt-2">
          <span class="text-ink-400">Name (optional)</span>
          <input
            class="w-full mt-1 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="e.g. Main Library"
          />
        </label>
        <div class="mt-3 flex gap-2">
          <button class="btn" disabled={!manual.trim()} onClick={() => commit(manual)}>
            Save visit
          </button>
          <button class="btn-ghost" onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
