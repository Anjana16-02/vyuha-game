import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import type { AchievementProgress, BattleRecord, InventoryState, KingdomState, PlayerProfile } from "../../../shared/types";

const dataDir = path.resolve(process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : "./data");
const jsonPath = path.join(dataDir, "vyuha.json");

export interface DbShape {
  profiles: Record<string, PlayerProfile>;
  battles: BattleRecord[];
  achievements: Record<string, AchievementProgress[]>;
  kingdom: Record<string, KingdomState>;
  inventory: Record<string, InventoryState>;
}

function empty(): DbShape {
  return { profiles: {}, battles: [], achievements: {}, kingdom: {}, inventory: {} };
}

function ensure() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(jsonPath)) fs.writeFileSync(jsonPath, JSON.stringify(empty(), null, 2));
}

function read(): DbShape {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(jsonPath, "utf8")) as DbShape;
  } catch {
    return empty();
  }
}

function write(db: DbShape) {
  ensure();
  fs.writeFileSync(jsonPath, JSON.stringify(db, null, 2));
}

let sqlite: {
  getProfile: (id: string) => PlayerProfile | null;
  putProfile: (p: PlayerProfile) => PlayerProfile;
  listBattles: () => BattleRecord[];
  addBattle: (b: BattleRecord) => BattleRecord;
  getInventory: (id: string) => InventoryState;
  unlock: (id: string, item: string) => InventoryState;
  getAchievements: (id: string) => AchievementProgress[];
  progressAchievements: (id: string, list: AchievementProgress[]) => AchievementProgress[];
  getKingdom: (id: string) => KingdomState;
  putKingdom: (id: string, k: KingdomState) => KingdomState;
} | null = null;

try {
  const require = createRequire(import.meta.url);
  const Database = require("better-sqlite3") as new (p: string) => {
    exec: (s: string) => void;
    prepare: (s: string) => { get: (...a: unknown[]) => unknown; run: (...a: unknown[]) => void; all: (...a: unknown[]) => unknown[] };
  };
  const dbFile = process.env.DATABASE_PATH ?? path.join(dataDir, "vyuha.db");
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const db = new Database(dbFile);
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, json TEXT);
    CREATE TABLE IF NOT EXISTS battles (id TEXT PRIMARY KEY, json TEXT, created INTEGER);
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, json TEXT);
  `);
  sqlite = {
    getProfile(id) {
      const row = db.prepare("SELECT json FROM profiles WHERE id=?").get(id) as { json: string } | undefined;
      return row ? (JSON.parse(row.json) as PlayerProfile) : null;
    },
    putProfile(p) {
      db.prepare("INSERT INTO profiles(id,json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json").run(p.playerId, JSON.stringify(p));
      return p;
    },
    listBattles() {
      return (db.prepare("SELECT json FROM battles ORDER BY created DESC LIMIT 80").all() as { json: string }[]).map((r) => JSON.parse(r.json) as BattleRecord);
    },
    addBattle(b) {
      db.prepare("INSERT INTO battles(id,json,created) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json").run(b.id, JSON.stringify(b), b.startedAt);
      return b;
    },
    getInventory(id) {
      const row = db.prepare("SELECT json FROM kv WHERE k=?").get(`inv:${id}`) as { json: string } | undefined;
      return row ? (JSON.parse(row.json) as InventoryState) : { cosmetics: [], banners: [], medals: 0 };
    },
    unlock(id, item) {
      const inv = this.getInventory(id);
      if (!inv.cosmetics.includes(item)) inv.cosmetics.push(item);
      db.prepare("INSERT INTO kv(k,json) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET json=excluded.json").run(`inv:${id}`, JSON.stringify(inv));
      return inv;
    },
    getAchievements(id) {
      const row = db.prepare("SELECT json FROM kv WHERE k=?").get(`ach:${id}`) as { json: string } | undefined;
      return row ? (JSON.parse(row.json) as AchievementProgress[]) : [];
    },
    progressAchievements(id, list) {
      db.prepare("INSERT INTO kv(k,json) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET json=excluded.json").run(`ach:${id}`, JSON.stringify(list));
      return list;
    },
    getKingdom(id) {
      const row = db.prepare("SELECT json FROM kv WHERE k=?").get(`kg:${id}`) as { json: string } | undefined;
      return row ? (JSON.parse(row.json) as KingdomState) : { level: 1, treasury: 0, areas: {} };
    },
    putKingdom(id, k) {
      db.prepare("INSERT INTO kv(k,json) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET json=excluded.json").run(`kg:${id}`, JSON.stringify(k));
      return k;
    },
  };
} catch {
  sqlite = null;
}

export const store = {
  fallback: !sqlite,
  getProfile(id: string) {
    if (sqlite) return sqlite.getProfile(id);
    return read().profiles[id] ?? null;
  },
  putProfile(p: PlayerProfile) {
    if (sqlite) return sqlite.putProfile(p);
    const db = read();
    db.profiles[p.playerId] = p;
    write(db);
    return p;
  },
  listBattles() {
    if (sqlite) return sqlite.listBattles();
    return read().battles.slice().sort((a, b) => b.startedAt - a.startedAt).slice(0, 80);
  },
  addBattle(b: BattleRecord) {
    if (sqlite) return sqlite.addBattle(b);
    const db = read();
    const i = db.battles.findIndex((x) => x.id === b.id);
    if (i >= 0) db.battles[i] = b;
    else db.battles.unshift(b);
    write(db);
    return b;
  },
  getBattle(id: string) {
    return this.listBattles().find((b) => b.id === id) ?? null;
  },
  getInventory(id: string) {
    if (sqlite) return sqlite.getInventory(id);
    return read().inventory[id] ?? { cosmetics: [], banners: [], medals: 0 };
  },
  unlock(id: string, item: string) {
    if (sqlite) return sqlite.unlock(id, item);
    const db = read();
    const inv = db.inventory[id] ?? { cosmetics: [], banners: [], medals: 0 };
    if (!inv.cosmetics.includes(item)) inv.cosmetics.push(item);
    db.inventory[id] = inv;
    write(db);
    return inv;
  },
  getAchievements(id: string) {
    if (sqlite) return sqlite.getAchievements(id);
    return read().achievements[id] ?? [];
  },
  progressAchievements(id: string, list: AchievementProgress[]) {
    if (sqlite) return sqlite.progressAchievements(id, list);
    const db = read();
    db.achievements[id] = list;
    write(db);
    return list;
  },
  getKingdom(id: string) {
    if (sqlite) return sqlite.getKingdom(id);
    return read().kingdom[id] ?? { level: 1, treasury: 0, areas: {} };
  },
  putKingdom(id: string, k: KingdomState) {
    if (sqlite) return sqlite.putKingdom(id, k);
    const db = read();
    db.kingdom[id] = k;
    write(db);
    return k;
  },
};
