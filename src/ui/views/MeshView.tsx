import { useEffect, useRef, useState } from "preact/hooks";
import QRCode from "qrcode";
import {
  acceptAnswer,
  acceptOffer,
  close as closePeer,
  createOffer,
  sendAffinity,
  type PeerSession,
} from "@/lib/mesh/peer";
import { fetchIceServers } from "@/lib/mesh/turnConfig";
import {
  computeMyAffinity,
  overlapWith,
  toAffinityVector,
  type PeerOverlap,
} from "@/lib/affinity/engine";
import { db } from "@/lib/storage/db";

type Mode = "idle" | "host" | "join";

interface HostState {
  session: PeerSession;
  offer: string;
  answer: string;
  status: "waiting-answer" | "connected" | "closed";
  overlap: PeerOverlap | null;
}

interface JoinState {
  session: PeerSession;
  answer: string;
  peerLabel: string;
  status: "ready-to-show" | "connected" | "closed";
  overlap: PeerOverlap | null;
}

export function MeshView() {
  const [mode, setMode] = useState<Mode>("idle");
  const [label, setLabel] = useState("");

  const [host, setHost] = useState<HostState | null>(null);
  const [join, setJoin] = useState<JoinState | null>(null);
  const [hostAnswerInput, setHostAnswerInput] = useState("");
  const [joinOfferInput, setJoinOfferInput] = useState("");

  useEffect(() => {
    (async () => {
      const stored = (await db.getMeta<string>("peer-label")) ?? "";
      setLabel(stored);
    })();
  }, []);

  async function saveLabel(v: string) {
    setLabel(v);
    await db.setMeta("peer-label", v);
  }

  async function startHost() {
    // Fetch HMAC TURN credentials so relay candidates land in the QR payload
    // before we encode it. Without this, two peers behind symmetric NAT cannot
    // connect even after exchanging QRs. Falls back to STUN-only on failure.
    const iceServers = await fetchIceServers();
    const { session, payload } = await createOffer({ label: label || "anonymous", iceServers });
    const next: HostState = {
      session,
      offer: payload,
      answer: "",
      status: "waiting-answer",
      overlap: null,
    };
    session.onOpen = async () => {
      const mine = toAffinityVector(await computeMyAffinity());
      sendAffinity(session, mine, label || "anonymous");
    };
    session.onAffinity = async (vec, peerLabel) => {
      await db.upsertPeer({
        id: `p-${Date.now()}`,
        label: peerLabel,
        affinity: vec,
        lastSeen: Date.now(),
      });
      const ovl = await overlapWith(`p-${Date.now()}`, peerLabel, vec);
      setHost((h) => (h ? { ...h, status: "connected", overlap: ovl } : h));
    };
    session.onClose = () => setHost((h) => (h ? { ...h, status: "closed" } : h));
    setHost(next);
    setMode("host");
  }

  async function hostAcceptAnswer() {
    if (!host) return;
    await acceptAnswer(host.session, hostAnswerInput);
    setHost({ ...host, answer: hostAnswerInput });
  }

  async function startJoin() {
    if (!joinOfferInput) return;
    const iceServers = await fetchIceServers();
    const { session, answer, peerLabel } = await acceptOffer(joinOfferInput, {
      label: label || "anonymous",
      iceServers,
    });
    const next: JoinState = {
      session,
      answer,
      peerLabel,
      status: "ready-to-show",
      overlap: null,
    };
    session.onOpen = async () => {
      const mine = toAffinityVector(await computeMyAffinity());
      sendAffinity(session, mine, label || "anonymous");
    };
    session.onAffinity = async (vec, lbl) => {
      await db.upsertPeer({
        id: `p-${Date.now()}`,
        label: lbl,
        affinity: vec,
        lastSeen: Date.now(),
      });
      const ovl = await overlapWith(`p-${Date.now()}`, lbl, vec);
      setJoin((j) => (j ? { ...j, status: "connected", overlap: ovl } : j));
    };
    session.onClose = () => setJoin((j) => (j ? { ...j, status: "closed" } : j));
    setJoin(next);
    setMode("join");
  }

  function reset() {
    if (host) closePeer(host.session);
    if (join) closePeer(join.session);
    setHost(null);
    setJoin(null);
    setHostAnswerInput("");
    setJoinOfferInput("");
    setMode("idle");
  }

  return (
    <div class="flex flex-col gap-4 pt-1">
      <h2 class="text-lg font-semibold">Mesh</h2>
      <p class="text-sm text-ink-400">
        Compare room affinities with one other device. No signaling server — you exchange the WebRTC
        handshake by QR or paste. Only the normalised affinity vector is shared.
      </p>

      <div class="card">
        <label class="block text-sm">
          <span class="text-ink-400">Your display label (not stored anywhere else)</span>
          <input
            class="w-full mt-1 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2"
            value={label}
            onInput={(e) => saveLabel((e.target as HTMLInputElement).value)}
            placeholder="e.g. M."
          />
        </label>
      </div>

      {mode === "idle" && (
        <div class="grid grid-cols-2 gap-3">
          <button class="card text-left" onClick={startHost}>
            <div class="font-medium">Host</div>
            <div class="text-xs text-ink-400 mt-1">
              Show a QR with your offer; accept the other device's answer.
            </div>
          </button>
          <button class="card text-left" onClick={() => setMode("join")}>
            <div class="font-medium">Join</div>
            <div class="text-xs text-ink-400 mt-1">
              Scan or paste a host's offer; send back your answer.
            </div>
          </button>
        </div>
      )}

      {mode === "host" && host && (
        <HostPanel
          state={host}
          answerInput={hostAnswerInput}
          onAnswerInput={setHostAnswerInput}
          onAccept={hostAcceptAnswer}
          onReset={reset}
        />
      )}

      {mode === "join" && (
        <JoinPanel
          state={join}
          offerInput={joinOfferInput}
          onOfferInput={setJoinOfferInput}
          onStart={startJoin}
          onReset={reset}
        />
      )}
    </div>
  );
}

function QRBlock({ payload, caption }: { payload: string; caption: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 256,
      margin: 1,
      color: { dark: "#0e1116", light: "#7dd3fc" },
    }).catch(() => {
      // QR may be too large for a single code; we still allow copy-paste.
    });
  }, [payload]);
  return (
    <div class="card flex flex-col items-center gap-2">
      <canvas ref={canvasRef} class="bg-accent-400 rounded-lg" />
      <div class="text-xs text-ink-400 text-center">{caption}</div>
      <details class="w-full mt-1">
        <summary class="cursor-pointer text-xs text-ink-400">show payload as text</summary>
        <textarea
          readOnly
          class="w-full mt-2 h-32 rounded-lg bg-white/5 ring-1 ring-white/10 px-2 py-1 text-xs font-mono"
          value={payload}
        />
        <button
          class="btn-ghost text-xs mt-2"
          onClick={() => navigator.clipboard?.writeText(payload)}
        >
          Copy
        </button>
      </details>
    </div>
  );
}

function HostPanel(props: {
  state: HostState;
  answerInput: string;
  onAnswerInput: (s: string) => void;
  onAccept: () => Promise<void>;
  onReset: () => void;
}) {
  const { state } = props;
  return (
    <div class="space-y-3">
      <QRBlock payload={state.offer} caption="1. Show this to your friend (host offer)" />
      {state.status === "waiting-answer" && (
        <div class="card">
          <div class="text-xs uppercase tracking-wider text-ink-400 mb-2">
            2. Paste their answer
          </div>
          <textarea
            class="w-full h-32 rounded-lg bg-white/5 ring-1 ring-white/10 px-2 py-1 text-xs font-mono"
            value={props.answerInput}
            onInput={(e) => props.onAnswerInput((e.target as HTMLTextAreaElement).value)}
            placeholder="paste base64 answer here"
          />
          <div class="mt-2 flex gap-2">
            <button class="btn" disabled={!props.answerInput.trim()} onClick={props.onAccept}>
              Connect
            </button>
            <button class="btn-ghost" onClick={props.onReset}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {state.status === "connected" && (
        <OverlapBlock overlap={state.overlap} onReset={props.onReset} />
      )}
      {state.status === "closed" && (
        <div class="card text-sm">
          Connection closed.{" "}
          <button class="underline" onClick={props.onReset}>
            Start over
          </button>
        </div>
      )}
    </div>
  );
}

function JoinPanel(props: {
  state: JoinState | null;
  offerInput: string;
  onOfferInput: (s: string) => void;
  onStart: () => Promise<void>;
  onReset: () => void;
}) {
  const { state } = props;
  if (!state) {
    return (
      <div class="card space-y-2">
        <div class="text-xs uppercase tracking-wider text-ink-400">1. Paste host offer</div>
        <textarea
          class="w-full h-32 rounded-lg bg-white/5 ring-1 ring-white/10 px-2 py-1 text-xs font-mono"
          value={props.offerInput}
          onInput={(e) => props.onOfferInput((e.target as HTMLTextAreaElement).value)}
          placeholder="paste base64 offer here"
        />
        <div class="flex gap-2">
          <button class="btn" disabled={!props.offerInput.trim()} onClick={props.onStart}>
            Generate answer
          </button>
          <button class="btn-ghost" onClick={props.onReset}>
            Back
          </button>
        </div>
      </div>
    );
  }
  return (
    <div class="space-y-3">
      <QRBlock payload={state.answer} caption={`2. Show this back to ${state.peerLabel}`} />
      {state.status === "ready-to-show" && (
        <div class="card text-sm text-ink-400">Waiting for the host to accept your answer…</div>
      )}
      {state.status === "connected" && (
        <OverlapBlock overlap={state.overlap} onReset={props.onReset} />
      )}
      {state.status === "closed" && (
        <div class="card text-sm">
          Connection closed.{" "}
          <button class="underline" onClick={props.onReset}>
            Start over
          </button>
        </div>
      )}
    </div>
  );
}

function OverlapBlock({ overlap, onReset }: { overlap: PeerOverlap | null; onReset: () => void }) {
  if (!overlap) {
    return <div class="card text-sm text-ink-400">Connected — waiting for vectors…</div>;
  }
  return (
    <div class="card">
      <div class="text-xs uppercase tracking-wider text-accent-400">Overlap</div>
      <div class="mt-1 text-lg">
        {overlap.peerLabel} ·{" "}
        <span class="text-accent-400 font-mono">{(overlap.score * 100).toFixed(0)}%</span>
      </div>
      {overlap.sharedTags.length > 0 ? (
        <ul class="mt-2 flex flex-wrap gap-1.5">
          {overlap.sharedTags.map((t) => (
            <li key={t.tag} class="pill">
              {t.name}
            </li>
          ))}
        </ul>
      ) : (
        <div class="text-xs text-ink-400 mt-1">
          No shared rooms — that's OK, you found out fast.
        </div>
      )}
      <button class="btn-ghost mt-3" onClick={onReset}>
        Done
      </button>
    </div>
  );
}
