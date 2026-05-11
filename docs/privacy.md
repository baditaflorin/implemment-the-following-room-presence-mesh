# Privacy

## What stays on your device

- Every visit you record (room tag, timestamp, optional dwell, optional
  note).
- Every room you've named.
- Every peer you've handshaken with (label they chose to share, the
  affinity vector they sent at exchange time, last-seen timestamp).
- Suggestion text the app has generated.

All of the above lives in IndexedDB, in your browser's profile, on this
device. Clearing the site's storage in your browser wipes it.

## What we send over the network at runtime

Nothing, except:

- The initial app-shell fetch from GitHub Pages — same as any visit to a
  static website. GitHub's server access log records your IP. We don't
  see it.
- (Optional, off by default) WebRTC ICE traffic to Google's public STUN
  server when you enable it in Settings to handshake across NATs. STUN
  sees IP:port pairs; no application data is sent over STUN.
- Peer-to-peer WebRTC traffic to the device you explicitly handshake
  with. The payload is your `AffinityVector` (normalised scores per room
  tag, plus a `generatedAt` timestamp) and the display label you typed.

## What we never collect

- No analytics, no telemetry, no Sentry, no Plausible, nothing.
- No accounts, no email, no auth.
- No central database. There is no server we could exfiltrate to.

## What "private" doesn't cover

- A peer you handshake with receives your affinity vector. They could
  keep it, share it, post it. Treat a peer exchange like sharing a
  contact card: you're trusting that person.
- If you sync your browser profile across devices via your browser
  vendor (Chrome Sync, iCloud Tabs, Firefox Sync), some indexed-DB
  contents may sync. That's your browser's behavior, not ours.

## Reporting

Mail `baditaflorin@gmail.com` for privacy or security concerns.
