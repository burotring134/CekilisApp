import { Redis } from "@upstash/redis";

export type DrawState = "idle" | "drawing" | "finished";

export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
}

export interface StoreSnapshot {
  state: DrawState;
  participants: Participant[];
  winner: Participant | null;
  spinSeed: number | null;
}

const KEY = {
  participants: "raffle:participants",
  fingerprints: "raffle:fingerprints",
  ips: "raffle:ips",
  state: "raffle:state",
  winner: "raffle:winner",
  spinSeed: "raffle:spin",
};

const hasUpstash = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

type MemoryStore = {
  participants: Map<string, Participant>;
  fingerprints: Set<string>;
  ips: Set<string>;
  state: DrawState;
  winner: Participant | null;
  spinSeed: number | null;
};

const globalForMem = globalThis as unknown as { __raffleMem?: MemoryStore };

function mem(): MemoryStore {
  if (!globalForMem.__raffleMem) {
    globalForMem.__raffleMem = {
      participants: new Map(),
      fingerprints: new Set(),
      ips: new Set(),
      state: "idle",
      winner: null,
      spinSeed: null,
    };
  }
  return globalForMem.__raffleMem;
}

export async function addParticipant(
  participant: Participant,
  fingerprint: string,
  _ip: string
): Promise<{ ok: boolean; reason?: string }> {
  if (redis) {
    const fpExists = await redis.sismember(KEY.fingerprints, fingerprint);
    if (fpExists) return { ok: false, reason: "duplicate-device" };
    const state = (await redis.get<DrawState>(KEY.state)) ?? "idle";
    if (state !== "idle") return { ok: false, reason: "draw-locked" };

    await redis.hset(KEY.participants, { [participant.id]: JSON.stringify(participant) });
    await redis.sadd(KEY.fingerprints, fingerprint);
    return { ok: true };
  }

  const store = mem();
  if (store.fingerprints.has(fingerprint)) return { ok: false, reason: "duplicate-device" };
  if (store.state !== "idle") return { ok: false, reason: "draw-locked" };
  store.participants.set(participant.id, participant);
  store.fingerprints.add(fingerprint);
  return { ok: true };
}

export async function listParticipants(): Promise<Participant[]> {
  if (redis) {
    const raw = await redis.hgetall<Record<string, string | Participant>>(KEY.participants);
    if (!raw) return [];
    const parsed: Participant[] = Object.values(raw).map((v) =>
      typeof v === "string" ? (JSON.parse(v) as Participant) : (v as Participant)
    );
    return parsed.sort((a, b) => a.joinedAt - b.joinedAt);
  }
  return [...mem().participants.values()].sort((a, b) => a.joinedAt - b.joinedAt);
}

export async function deleteParticipant(id: string): Promise<void> {
  if (redis) {
    await redis.hdel(KEY.participants, id);
    return;
  }
  mem().participants.delete(id);
}

export async function getState(): Promise<DrawState> {
  if (redis) {
    return ((await redis.get<DrawState>(KEY.state)) ?? "idle") as DrawState;
  }
  return mem().state;
}

export async function setState(state: DrawState): Promise<void> {
  if (redis) {
    await redis.set(KEY.state, state);
    return;
  }
  mem().state = state;
}

export async function getWinner(): Promise<Participant | null> {
  if (redis) {
    const raw = await redis.get<string | Participant | null>(KEY.winner);
    if (!raw) return null;
    return typeof raw === "string" ? (JSON.parse(raw) as Participant) : (raw as Participant);
  }
  return mem().winner;
}

export async function setWinner(winner: Participant | null): Promise<void> {
  if (redis) {
    if (winner) await redis.set(KEY.winner, JSON.stringify(winner));
    else await redis.del(KEY.winner);
    return;
  }
  mem().winner = winner;
}

export async function getSpinSeed(): Promise<number | null> {
  if (redis) {
    const v = await redis.get<number | null>(KEY.spinSeed);
    return v ?? null;
  }
  return mem().spinSeed;
}

export async function setSpinSeed(seed: number | null): Promise<void> {
  if (redis) {
    if (seed === null) await redis.del(KEY.spinSeed);
    else await redis.set(KEY.spinSeed, seed);
    return;
  }
  mem().spinSeed = seed;
}

export async function reset(): Promise<void> {
  if (redis) {
    await redis.del(
      KEY.participants,
      KEY.fingerprints,
      KEY.ips,
      KEY.state,
      KEY.winner,
      KEY.spinSeed
    );
    return;
  }
  const store = mem();
  store.participants.clear();
  store.fingerprints.clear();
  store.ips.clear();
  store.state = "idle";
  store.winner = null;
  store.spinSeed = null;
}

export async function snapshot(): Promise<StoreSnapshot> {
  const [state, participants, winner, spinSeed] = await Promise.all([
    getState(),
    listParticipants(),
    getWinner(),
    getSpinSeed(),
  ]);
  return { state, participants, winner, spinSeed };
}
