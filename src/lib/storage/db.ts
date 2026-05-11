import { openDB, type IDBPDatabase } from "idb";

export interface Room {
  tag: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface Visit {
  id?: number;
  tag: string;
  ts: number;
  dwellSec?: number;
  note?: string;
}

export interface Peer {
  id: string;
  label: string;
  publicHandle?: string;
  affinity?: AffinityVector;
  lastSeen: number;
}

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface AffinityVector {
  // Map of room-tag -> normalised affinity score (0..1).
  rooms: Record<string, number>;
  // Optional per-tag dominant time-of-day bucket. Sharing the *dominant
  // bucket* (one of four options) discloses far less than a full hour
  // distribution while still letting two peers detect shared rhythms.
  byTime?: Record<string, TimeOfDay>;
  generatedAt: number;
}

export interface MatchRecord {
  id?: number;
  peerId: string;
  sharedTags: string[];
  score: number;
  suggestedAt: number;
}

export interface Checkin {
  tag: string;
  visitId: number;
  since: number;
}

interface Schema {
  rooms: { key: string; value: Room };
  visits: { key: number; value: Visit; indexes: { "by-tag": string; "by-ts": number } };
  peers: { key: string; value: Peer };
  matches: { key: number; value: MatchRecord; indexes: { "by-peer": string } };
  meta: { key: string; value: unknown };
}

const DB_NAME = "rpm";
const DB_VERSION = 1;

class Db {
  private handle: IDBPDatabase<Schema> | null = null;

  async open(): Promise<void> {
    if (this.handle) return;
    this.handle = await openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("rooms")) {
          db.createObjectStore("rooms", { keyPath: "tag" });
        }
        if (!db.objectStoreNames.contains("visits")) {
          const visits = db.createObjectStore("visits", {
            keyPath: "id",
            autoIncrement: true,
          });
          visits.createIndex("by-tag", "tag");
          visits.createIndex("by-ts", "ts");
        }
        if (!db.objectStoreNames.contains("peers")) {
          db.createObjectStore("peers", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("matches")) {
          const matches = db.createObjectStore("matches", {
            keyPath: "id",
            autoIncrement: true,
          });
          matches.createIndex("by-peer", "peerId");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }

  private require(): IDBPDatabase<Schema> {
    if (!this.handle) throw new Error("db not open — call db.open() first");
    return this.handle;
  }

  // Rooms ------------------------------------------------------------------

  async upsertRoom(room: Room): Promise<void> {
    await this.require().put("rooms", room);
  }

  async getRoom(tag: string): Promise<Room | undefined> {
    return this.require().get("rooms", tag);
  }

  async listRooms(): Promise<Room[]> {
    return this.require().getAll("rooms");
  }

  // Visits -----------------------------------------------------------------

  async recordVisit(v: Visit): Promise<number> {
    return this.require().add("visits", v) as Promise<number>;
  }

  async listVisits(limit = 200): Promise<Visit[]> {
    const all = await this.require().getAllFromIndex("visits", "by-ts");
    return all.slice(-limit).reverse();
  }

  async visitsByTag(tag: string): Promise<Visit[]> {
    return this.require().getAllFromIndex("visits", "by-tag", tag);
  }

  async setVisitDwell(id: number, dwellSec: number): Promise<void> {
    const h = this.require();
    const v = await h.get("visits", id);
    if (!v) return;
    v.dwellSec = dwellSec;
    await h.put("visits", v);
  }

  // Check-in -------------------------------------------------------------

  async startCheckin(tag: string, visitId: number, since: number): Promise<void> {
    await this.setMeta("current-checkin", { tag, visitId, since });
  }

  async getCurrentCheckin(): Promise<Checkin | null> {
    const c = await this.getMeta<Checkin>("current-checkin");
    return c ?? null;
  }

  async endCheckin(now = Date.now()): Promise<Checkin | null> {
    const c = await this.getCurrentCheckin();
    if (!c) return null;
    const dwell = Math.max(0, Math.floor((now - c.since) / 1000));
    await this.setVisitDwell(c.visitId, dwell);
    await this.require().delete("meta", "current-checkin");
    return { ...c };
  }

  // Peers ------------------------------------------------------------------

  async upsertPeer(p: Peer): Promise<void> {
    await this.require().put("peers", p);
  }

  async listPeers(): Promise<Peer[]> {
    return this.require().getAll("peers");
  }

  // Matches ----------------------------------------------------------------

  async recordMatch(m: MatchRecord): Promise<number> {
    return this.require().add("matches", m) as Promise<number>;
  }

  async listMatches(): Promise<MatchRecord[]> {
    return this.require().getAll("matches");
  }

  // Meta -------------------------------------------------------------------

  async getMeta<T = unknown>(key: string): Promise<T | undefined> {
    return this.require().get("meta", key) as Promise<T | undefined>;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    await this.require().put("meta", value as never, key);
  }

  async wipe(): Promise<void> {
    const h = this.require();
    for (const store of ["rooms", "visits", "peers", "matches", "meta"] as const) {
      await h.clear(store);
    }
  }
}

export const db = new Db();
