/**
 * WebRTC mesh — manual / QR-mediated signaling.
 *
 * v1 explicitly avoids a signaling server. Two devices exchange SDP via QR
 * codes or copy-paste:
 *
 *   Device A: createOffer() -> base64 string -> shown as QR
 *   Device B: scans / pastes offer -> acceptOffer() -> answer string -> shown as QR
 *   Device A: scans / pastes answer -> acceptAnswer()
 *   DataChannel "rpm-affinity" opens; vectors are exchanged; channel closes.
 *
 * That's it. No STUN/TURN by default — works on same Wi-Fi. The user can opt
 * into a public STUN server in Settings if they need it across NATs (still no
 * authentication or central account; the STUN server only learns IP:port).
 */

import type { AffinityVector } from "@/lib/storage/db";

export interface PeerOptions {
  iceServers?: RTCIceServer[];
  label?: string;
}

export interface PeerSession {
  pc: RTCPeerConnection;
  channel: RTCDataChannel | null;
  role: "offerer" | "answerer";
  onAffinity?: (v: AffinityVector, peerLabel: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface SignalPayload {
  v: 1;
  type: "offer" | "answer";
  label: string;
  sdp: string;
}

const CHANNEL_LABEL = "rpm-affinity";

export async function createOffer(opts: PeerOptions = {}): Promise<{
  session: PeerSession;
  payload: string;
}> {
  const pc = new RTCPeerConnection({ iceServers: opts.iceServers ?? [] });
  const channel = pc.createDataChannel(CHANNEL_LABEL);
  const session: PeerSession = { pc, channel, role: "offerer" };
  wireChannel(session, channel);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIce(pc);
  const payload = encodePayload({
    v: 1,
    type: "offer",
    label: opts.label ?? "anonymous",
    sdp: pc.localDescription?.sdp ?? "",
  });
  return { session, payload };
}

export async function acceptOffer(
  payload: string,
  opts: PeerOptions = {},
): Promise<{ session: PeerSession; answer: string; peerLabel: string }> {
  const parsed = decodePayload(payload);
  if (parsed.type !== "offer") throw new Error("expected offer payload");
  const pc = new RTCPeerConnection({ iceServers: opts.iceServers ?? [] });
  const session: PeerSession = { pc, channel: null, role: "answerer" };
  pc.ondatachannel = (ev) => {
    session.channel = ev.channel;
    wireChannel(session, ev.channel);
  };
  await pc.setRemoteDescription({ type: "offer", sdp: parsed.sdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIce(pc);
  const out = encodePayload({
    v: 1,
    type: "answer",
    label: opts.label ?? "anonymous",
    sdp: pc.localDescription?.sdp ?? "",
  });
  return { session, answer: out, peerLabel: parsed.label };
}

export async function acceptAnswer(session: PeerSession, payload: string): Promise<string> {
  const parsed = decodePayload(payload);
  if (parsed.type !== "answer") throw new Error("expected answer payload");
  await session.pc.setRemoteDescription({ type: "answer", sdp: parsed.sdp });
  return parsed.label;
}

export function sendAffinity(session: PeerSession, vec: AffinityVector, label: string): void {
  const ch = session.channel;
  if (!ch || ch.readyState !== "open") throw new Error("channel not open");
  ch.send(JSON.stringify({ type: "affinity", label, vec }));
}

export function close(session: PeerSession): void {
  try {
    session.channel?.close();
  } catch {
    // best effort
  }
  try {
    session.pc.close();
  } catch {
    // best effort
  }
}

// Internals ----------------------------------------------------------------

function wireChannel(session: PeerSession, ch: RTCDataChannel): void {
  ch.onopen = () => session.onOpen?.();
  ch.onclose = () => session.onClose?.();
  ch.onmessage = (ev) => {
    try {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : "") as {
        type: string;
        label?: string;
        vec?: AffinityVector;
      };
      if (msg.type === "affinity" && msg.vec) {
        session.onAffinity?.(msg.vec, msg.label ?? "anonymous");
      }
    } catch (err) {
      console.warn("peer message parse failed", err);
    }
  };
}

function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    // Hard cap so we don't hang on a phantom interface.
    setTimeout(() => resolve(), 4000);
  });
}

function encodePayload(p: SignalPayload): string {
  const json = JSON.stringify(p);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodePayload(s: string): SignalPayload {
  const json = decodeURIComponent(escape(atob(s.trim())));
  const parsed = JSON.parse(json) as SignalPayload;
  if (parsed.v !== 1) throw new Error(`unsupported signal payload version: ${parsed.v}`);
  return parsed;
}
