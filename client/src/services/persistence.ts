import type {
  AchievementProgress,
  BattleRecord,
  InventoryState,
  KingdomState,
  PlayerProfile,
  SettingsState,
} from "../../../shared/types";

export interface PersistedGame {
  profile: PlayerProfile;
  battles: BattleRecord[];
  achievements: AchievementProgress[];
  kingdom: KingdomState;
  inventory: InventoryState;
  settings: SettingsState;
  daily: { date: string; ids: string[]; completed: string[] };
  vyuhasWon: string[];
}

const KEY = "vyuha.persist.v1";
const API_BASE = ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE ?? "").replace(/\/$/, "");

export function loadLocal(): PersistedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedGame;
  } catch {
    return null;
  }
}

export function saveLocal(data: PersistedGame) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1800);
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    clearTimeout(t);
    return null;
  }
}

export async function syncProfile(profile: PlayerProfile) {
  const remote = await api<PlayerProfile>(`/profile/${profile.playerId}`, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
  return remote ?? profile;
}

export async function fetchOrCreateProfile(partial: PlayerProfile) {
  const existing = await api<PlayerProfile>(`/profile/${partial.playerId}`);
  if (existing) return existing;
  const created = await api<PlayerProfile>("/profile", { method: "POST", body: JSON.stringify(partial) });
  return created ?? partial;
}

export async function postBattle(record: BattleRecord) {
  await api("/battles", { method: "POST", body: JSON.stringify(record) });
}
