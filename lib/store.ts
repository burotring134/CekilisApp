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
  finishedAt: number | null;
}

const KEY = {
  participants: "raffle:participants",
  state: "raffle:state",
  winner: "raffle:winner",
  spinSeed: "raffle:spin",
  finishedAt: "raffle:finished-at",
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
  state: DrawState;
  winner: Participant | null;
  spinSeed: number | null;
  finishedAt: number | null;
};

const globalForMem = globalThis as unknown as { __raffleMem?: MemoryStore };

function mem(): MemoryStore {
  if (!globalForMem.__raffleMem) {
    globalForMem.__raffleMem = {
      participants: new Map(),
      state: "idle",
      winner: null,
      spinSeed: null,
      finishedAt: null,
    };
  }
  return globalForMem.__raffleMem!;
}

export async function addParticipant(
  participant: Participant
): Promise<{ ok: boolean; reason?: string }> {
  if (redis) {
    const state = (await redis.get<DrawState>(KEY.state)) ?? "idle";
    if (state !== "idle") return { ok: false, reason: "draw-locked" };
    await redis.hset(KEY.participants, { [participant.id]: JSON.stringify(participant) });
    return { ok: true };
  }

  const store = mem();
  if (store.state !== "idle") return { ok: false, reason: "draw-locked" };
  store.participants.set(participant.id, participant);
  return { ok: true };
}

export async function addParticipantsBulk(
  participants: Participant[]
): Promise<{ ok: boolean; added: number; reason?: string }> {
  if (participants.length === 0) return { ok: true, added: 0 };
  if (redis) {
    const state = (await redis.get<DrawState>(KEY.state)) ?? "idle";
    if (state !== "idle") return { ok: false, added: 0, reason: "draw-locked" };
    const obj: Record<string, string> = {};
    for (const p of participants) obj[p.id] = JSON.stringify(p);
    await redis.hset(KEY.participants, obj);
    return { ok: true, added: participants.length };
  }
  const store = mem();
  if (store.state !== "idle") return { ok: false, added: 0, reason: "draw-locked" };
  for (const p of participants) store.participants.set(p.id, p);
  return { ok: true, added: participants.length };
}

export async function getParticipantCount(): Promise<number> {
  if (redis) {
    return Number((await redis.hlen(KEY.participants)) ?? 0);
  }
  return mem().participants.size;
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
      KEY.state,
      KEY.winner,
      KEY.spinSeed,
      KEY.finishedAt
    );
    return;
  }
  const store = mem();
  store.participants.clear();
  store.state = "idle";
  store.winner = null;
  store.spinSeed = null;
  store.finishedAt = null;
}

export async function getFinishedAt(): Promise<number | null> {
  if (redis) {
    const v = await redis.get<number | null>(KEY.finishedAt);
    return v ?? null;
  }
  return mem().finishedAt;
}

export async function setFinishedAt(timestamp: number | null): Promise<void> {
  if (redis) {
    if (timestamp === null) await redis.del(KEY.finishedAt);
    else await redis.set(KEY.finishedAt, timestamp);
    return;
  }
  mem().finishedAt = timestamp;
}

export async function snapshot(): Promise<StoreSnapshot> {
  const [state, participants, winner, spinSeed, finishedAt] = await Promise.all([
    getState(),
    listParticipants(),
    getWinner(),
    getSpinSeed(),
    getFinishedAt(),
  ]);
  return { state, participants, winner, spinSeed, finishedAt };
}
