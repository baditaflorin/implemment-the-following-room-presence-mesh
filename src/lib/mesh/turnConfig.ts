/**
 * TURN credential fetcher.
 *
 * room-presence-mesh exchanges SDP manually (QR codes / copy-paste) — there
 * is no online signaling. The v1 README explicitly trades cross-NAT support
 * for the no-server property: "works on same Wi-Fi" only.
 *
 * This module makes cross-NAT connections work via a public-ish TURN relay
 * WITHOUT compromising the no-signaling property. The browser fetches
 * time-limited HMAC credentials from a token server before generating the
 * SDP, so the relay candidates land in the QR payload. Both parties scan,
 * the connection works.
 *
 * Default token endpoint: https://turn.0docker.com/credentials
 * Default relay:          turn:turn.0docker.com:3479
 *
 *  • https://github.com/baditaflorin/turn-token-server  (HMAC, 1h TTL)
 *  • https://github.com/baditaflorin/coturn-hetzner     (the relay)
 *
 * Override with VITE_TURN_TOKEN_URL at build time or
 * localStorage["rpm:turnTokenUrl"] at runtime. Set empty to disable TURN
 * (LAN-only, the previous default).
 */

const DEFAULT_TURN_TOKEN_URL = "https://turn.0docker.com/credentials";

export const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

type TurnCredentialResponse = {
  username: string;
  password: string;
  ttl: number;
  uris: string[];
};

function loadTurnTokenUrl(): string {
  if (typeof localStorage === "undefined") return DEFAULT_TURN_TOKEN_URL;
  const stored = localStorage.getItem("rpm:turnTokenUrl");
  if (stored !== null) return stored;
  const env = (import.meta as ImportMeta).env?.VITE_TURN_TOKEN_URL as string | undefined;
  return env ?? DEFAULT_TURN_TOKEN_URL;
}

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  const tokenUrl = loadTurnTokenUrl();
  if (!tokenUrl) return STUN_SERVERS;
  try {
    const res = await fetch(tokenUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cred = (await res.json()) as TurnCredentialResponse;
    if (!Array.isArray(cred.uris) || cred.uris.length === 0) {
      throw new Error("token server returned no TURN URIs");
    }
    return [
      ...STUN_SERVERS,
      ...cred.uris.map((u) => ({
        urls: u,
        username: cred.username,
        credential: cred.password,
      })),
    ];
  } catch (err) {
    console.warn("[turn] credential fetch failed, falling back to STUN-only:", err);
    return STUN_SERVERS;
  }
}
