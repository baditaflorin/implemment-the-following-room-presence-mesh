# Data model

## IndexedDB (database `rpm`)

| store    | key            | shape                                                                                   |
|----------|----------------|-----------------------------------------------------------------------------------------|
| rooms    | `tag`          | `{ tag, name, color?, createdAt }`                                                      |
| visits   | auto id        | `{ id, tag, ts, dwellSec?, note? }`  · indexes `by-tag`, `by-ts`                        |
| peers    | `id`           | `{ id, label, publicHandle?, affinity?, lastSeen }`                                     |
| matches  | auto id        | `{ id, peerId, sharedTags[], score, suggestedAt }` · index `by-peer`                    |
| meta     | string         | arbitrary value, for settings & flags                                                   |

## Peer-exchange payload (`AffinityVector`)

```ts
interface AffinityVector {
  rooms: Record<string /* room tag */, number /* 0..1 normalised */>;
  generatedAt: number /* unix ms */;
}
```

Reasoning: a peer learns *which rooms you weight highly*, in normalised
form. They do **not** learn visit counts, dwell times, or timestamps —
those stay on the device.

## Signal envelope

```ts
interface SignalPayload {
  v: 1;                 // protocol version
  type: "offer" | "answer";
  label: string;        // optional human-friendly label
  sdp: string;          // raw WebRTC SDP
}
```

Base64-encoded with `btoa(unescape(encodeURIComponent(JSON)))`. QR codes
encode this string; copy-paste uses the same string.
