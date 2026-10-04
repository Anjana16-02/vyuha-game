import { create } from "zustand";
import {
  COMMANDERS,
  COSMETICS,
  DEFAULT_COMPOSITION_RATIOS,
  ENVIRONMENTS,
  KINGDOM_AREAS,
} from "../../../shared/constants";
import { SeededRng, hashSeed } from "../../../shared/rng";
import type {
  BattleRecord,
  BattleSnapshot,
  Composition,
  DailyChallenge,
  EnvironmentId,
  GraphicsQuality,
  Loadout,
  PlayerProfile,
  ScreenId,
  SettingsState,
  StrategyId,
  VyuhaId,
} from "../../../shared/types";
import { generateOpposition } from "../game/ai/commanderAI";
import { BattleSimulation } from "../game/simulation/engine";
import { analyzeBattle } from "../game/simulation/analysis";
import { applyXp, battleXp, defaultAchievements, evaluateAchievements } from "../progression/achievements";
import { fetchOrCreateProfile, loadLocal, postBattle, saveLocal, syncProfile } from "../services/persistence";
import { audio } from "../game/audio/AudioManager";

function uid() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function compose(size: number, ratios = DEFAULT_COMPOSITION_RATIOS): Composition {
  const infantry = Math.round(size * ratios.infantry);
  const archers = Math.round(size * ratios.archers);
  const cavalry = Math.round(size * ratios.cavalry);
  const elephants = Math.round(size * ratios.elephants);
  const chariots = Math.round(size * ratios.chariots);
  const elite = size - infantry - archers - cavalry - elephants - chariots;
  return { infantry, archers, cavalry, elephants, chariots, elite };
}

function normalize(size: number, c: Composition): Composition {
  const keys = ["infantry", "archers", "cavalry", "elephants", "chariots", "elite"] as const;
  let t = keys.reduce((s, k) => s + c[k], 0);
  if (t === size) return { ...c };
  const diff = size - t;
  const next = { ...c };
  next.infantry = Math.max(0, next.infantry + diff);
  t = keys.reduce((s, k) => s + next[k], 0);
  if (t !== size) next.elite = Math.max(0, next.elite + (size - t));
  return next;
}

const defaultSettings: SettingsState = {
  master: 0.8,
  music: 0.45,
  sfx: 0.7,
  ambience: 0.5,
  muted: false,
  graphics: "high",
  cameraSensitivity: 1,
  reducedMotion: false,
  showDamage: true,
  showEvents: true,
  showTutorial: true,
};

function freshProfile(): PlayerProfile {
  const now = Date.now();
  return {
    playerId: uid(),
    username: "",
    kingdomName: "",
    banner: "banner_lion",
    level: 1,
    xp: 0,
    wins: 0,
    losses: 0,
    totalBattles: 0,
    favoriteVyuha: null,
    favoriteStrategy: null,
    highestArmy: 0,
    bestVictory: 0,
    longestBattle: 0,
    createdAt: now,
    updatedAt: now,
    unlockedCommanders: ["war_general", "blade_master", "falcon_commander", "iron_guardian"],
    unlockedWarriors: ["line_spear", "reed_archers", "dust_riders", "tusk_battery", "spoke_chariots", "sun_guard"],
    unlockedCosmetics: COSMETICS.filter((c) => c.unlockLevel <= 1).map((c) => c.id),
    unlockedEnvironments: ["sunlit_plains"],
    equipped: {
      helmet: "helm_plain",
      armor: "armor_leather",
      cloak: "cloak_dust",
      weapon: "sword_ash",
      shield: "shield_round",
      banner: "banner_lion",
      emblem: "emblem_wheel",
    },
    kingdomLevel: 1,
    medals: 0,
    tutorialComplete: false,
    colorAccent: "#c9a227",
  };
}

function challengesFor(date: string): DailyChallenge[] {
  const rng = new SeededRng(hashSeed(date, "daily"));
  const pool: DailyChallenge[] = [
    { id: "win_kurma", title: "Shell of Kurma", description: "Win a battle using Kurma.", condition: "win_kurma", xp: 80, completed: false },
    { id: "win_flank", title: "Horn and Dust", description: "Win using Flanking Attack.", condition: "win_flank", xp: 80, completed: false },
    { id: "break_garuda", title: "Clip the Wings", description: "Defeat an army in Garuda.", condition: "break_garuda", xp: 90, completed: false },
    { id: "low_loss", title: "Measured Blood", description: "Win with under 30% losses.", condition: "low_loss", xp: 100, completed: false },
    { id: "protect", title: "Keep the Banner", description: "Win with commander HP above 60%.", condition: "protect", xp: 80, completed: false },
    { id: "low_morale", title: "Iron Nerves", description: "Win after morale has fallen below 40.", condition: "low_morale", xp: 110, completed: false },
  ];
  const pick = [...pool].sort(() => rng.next() - 0.5).slice(0, 3);
  return pick;
}

interface GameState {
  screen: ScreenId;
  overlay: string | null;
  fallbackNotice: string | null;
  webgl: boolean;
  profile: PlayerProfile;
  settings: SettingsState;
  loadout: Loadout;
  aiLoadout: Loadout | null;
  environment: EnvironmentId;
  sim: BattleSimulation | null;
  snap: BattleSnapshot | null;
  lastRecord: BattleRecord | null;
  history: BattleRecord[];
  achievements: ReturnType<typeof defaultAchievements>;
  replay: { record: BattleRecord | null; playing: boolean; speed: number };
  cameraMode: "strategic" | "formation" | "battlefield" | "combat" | "player";
  generatingStep: number;
  rewards: { xp: number; medals: number; items: string[]; levels: number } | null;
  vyuhasWon: string[];
  daily: DailyChallenge[];
  paused: boolean;
  qualityAuto: GraphicsQuality;
  go: (s: ScreenId) => void;
  boot: () => Promise<void>;
  setIdentity: (username: string, kingdomName: string) => void;
  updateSettings: (p: Partial<SettingsState>) => void;
  setLoadout: (p: Partial<Loadout>) => void;
  setComposition: (c: Composition) => void;
  setArmySize: (n: number) => void;
  equip: (slot: string, id: string) => void;
  setEnvironment: (e: EnvironmentId) => void;
  generateAi: () => void;
  beginBattle: (tutorial?: boolean) => void;
  tickBattle: () => void;
  finishAndReward: () => void;
  playReplay: (record: BattleRecord) => void;
  resetProgress: () => void;
  setCameraMode: (m: GameState["cameraMode"]) => void;
  setPaused: (p: boolean) => void;
  persist: () => void;
}

export const useGame = create<GameState>((set, get) => ({
  screen: "intro",
  overlay: null,
  fallbackNotice: null,
  webgl: true,
  profile: freshProfile(),
  settings: defaultSettings,
  loadout: {
    commanderId: "war_general",
    warriorIds: ["line_spear", "reed_archers", "dust_riders", "sun_guard"],
    armySize: 5000,
    composition: compose(5000),
    vyuha: "padma",
    strategy: "frontal_assault",
    cosmetics: {},
  },
  aiLoadout: null,
  environment: "sunlit_plains",
  sim: null,
  snap: null,
  lastRecord: null,
  history: [],
  achievements: defaultAchievements(),
  replay: { record: null, playing: false, speed: 1 },
  cameraMode: "strategic",
  generatingStep: 0,
  rewards: null,
  vyuhasWon: [],
  daily: challengesFor(new Date().toISOString().slice(0, 10)),
  paused: false,
  qualityAuto: "high",

  go: (s) => {
    audio.select();
    set({ screen: s });
    if (s === "war_room" || s === "kingdom") audio.setScene("camp", 0);
    if (s === "intro") audio.setScene("intro", 0);
  },

  boot: async () => {
    const local = loadLocal();
    if (local) {
      set({
        profile: local.profile,
        history: local.battles,
        achievements: local.achievements,
        settings: local.settings,
        vyuhasWon: local.vyuhasWon,
        daily: challengesFor(new Date().toISOString().slice(0, 10)).map((c) => ({
          ...c,
          completed: local.daily.date === new Date().toISOString().slice(0, 10) && local.daily.completed.includes(c.id),
        })),
      });
      audio.setVolumes(local.settings);
    }
    const profile = get().profile;
    const remote = await fetchOrCreateProfile(profile);
    if (remote && remote.playerId) {
      set({ profile: remote, fallbackNotice: null });
    } else if (local) {
      set({ fallbackNotice: "Fallback mode activated. Fighting from local memory." });
    }
  },

  persist: () => {
    const s = get();
    const data = {
      profile: s.profile,
      battles: s.history,
      achievements: s.achievements,
      kingdom: {
        level: s.profile.kingdomLevel,
        treasury: s.profile.medals,
        areas: Object.fromEntries(KINGDOM_AREAS.map((a) => [a, Math.min(5, Math.ceil(s.profile.level / 4))])),
      },
      inventory: { cosmetics: s.profile.unlockedCosmetics, banners: [s.profile.banner], medals: s.profile.medals },
      settings: s.settings,
      daily: {
        date: new Date().toISOString().slice(0, 10),
        ids: s.daily.map((d) => d.id),
        completed: s.daily.filter((d) => d.completed).map((d) => d.id),
      },
      vyuhasWon: s.vyuhasWon,
    };
    saveLocal(data);
    void syncProfile(s.profile);
  },

  setIdentity: (username, kingdomName) => {
    const profile = { ...get().profile, username, kingdomName, updatedAt: Date.now() };
    set({ profile, screen: "war_room" });
    audio.confirm();
    audio.setScene("camp");
    get().persist();
    void fetchOrCreateProfile(profile);
  },

  updateSettings: (p) => {
    const settings = { ...get().settings, ...p };
    set({ settings });
    audio.setVolumes(settings);
    get().persist();
  },

  setLoadout: (p) => set({ loadout: { ...get().loadout, ...p, cosmetics: { ...get().loadout.cosmetics, ...(p.cosmetics ?? {}) } } }),
  setComposition: (c) => set({ loadout: { ...get().loadout, composition: normalize(get().loadout.armySize, c) } }),
  setArmySize: (n) => {
    const composition = compose(n);
    set({ loadout: { ...get().loadout, armySize: n, composition } });
  },
  equip: (slot, id) => {
    const profile = { ...get().profile, equipped: { ...get().profile.equipped, [slot]: id } };
    set({ profile });
    audio.unlockItem();
    get().persist();
  },
  setEnvironment: (e) => set({ environment: e }),

  generateAi: () => {
    const { loadout, profile } = get();
    const seed = hashSeed(profile.playerId, Date.now(), loadout.vyuha, loadout.strategy);
    const rng = new SeededRng(seed);
    const aiLoadout = generateOpposition(loadout, rng);
    set({ aiLoadout, generatingStep: 0, screen: "generating" });
    audio.drums();
  },

  beginBattle: (tutorial) => {
    const { loadout, aiLoadout, profile, environment } = get();
    const ai = aiLoadout ?? generateOpposition(loadout, new SeededRng(hashSeed("fallback", Date.now())));
    const env = tutorial ? "sunlit_plains" : environment;
    const seed = hashSeed(profile.playerId, Date.now(), loadout.vyuha, ai.vyuha, loadout.armySize);
    const sim = new BattleSimulation({
      seed,
      player: tutorial ? { ...loadout, armySize: 2000, composition: compose(2000), vyuha: "shakata", strategy: "frontal_assault" } : loadout,
      ai,
      environment: env,
      timeOfDay: ENVIRONMENTS[env].weather === "storm" ? "afternoon" : env === "moonlit_ruins" ? "night" : env === "crimson_dusk" ? "sunset" : "afternoon",
      weather: ENVIRONMENTS[env].weather,
    });
    sim.start();
    set({ sim, snap: sim.snapshot(), screen: "battle", aiLoadout: ai, paused: false, cameraMode: "strategic" });
    audio.battleStart();
    audio.setScene("battle", 0.2);
  },

  tickBattle: () => {
    const { sim, paused, replay } = get();
    if (!sim || paused) return;
    const steps = replay.playing ? Math.max(1, Math.round(replay.speed)) : 1;
    let snap = sim.snapshot();
    for (let i = 0; i < steps; i++) snap = sim.tick();
    const intensity = snap.phase === "final_push" ? 1 : snap.phase === "critical" ? 0.85 : snap.phase === "intense" ? 0.7 : snap.phase === "engagement" ? 0.45 : 0.2;
    audio.setScene("battle", intensity);
    set({ snap });
    if (snap.finished) get().finishAndReward();
  },

  finishAndReward: () => {
    const { sim, snap, profile, history, achievements, vyuhasWon, daily } = get();
    if (!sim || !snap || !snap.winner) return;
    const events = snap.events;
    const record: BattleRecord = {
      id: uid(),
      seed: sim.seed,
      startedAt: Date.now(),
      duration: snap.t,
      result: snap.winner === "player" ? "victory" : snap.winner === "ai" ? "defeat" : "draw",
      player: sim.player,
      ai: sim.ai,
      environment: snap.environment,
      timeOfDay: snap.timeOfDay,
      weather: snap.weather,
      score: 0,
      survivorsPlayer: snap.player.remaining,
      survivorsAi: snap.ai.remaining,
      analysis: analyzeBattle({ snap, player: sim.player, ai: sim.ai, events, duration: snap.t }),
      events: [...events],
      timeline: events
        .filter((e) => e.intensity >= 0.5)
        .map((e) => ({ t: e.t, label: e.message })),
    };
    record.score = record.analysis.strategicScore;
    const xp = battleXp(record);
    let next: PlayerProfile = {
      ...profile,
      totalBattles: profile.totalBattles + 1,
      wins: profile.wins + (record.result === "victory" ? 1 : 0),
      losses: profile.losses + (record.result === "defeat" ? 1 : 0),
      highestArmy: Math.max(profile.highestArmy, record.player.armySize),
      longestBattle: Math.max(profile.longestBattle, record.duration),
      bestVictory: record.result === "victory" ? Math.max(profile.bestVictory, record.score) : profile.bestVictory,
      favoriteVyuha: record.player.vyuha,
      favoriteStrategy: record.player.strategy,
      medals: profile.medals + (record.result === "victory" ? 12 : 4),
      kingdomLevel: Math.max(profile.kingdomLevel, profile.level >= 20 ? 4 : profile.level >= 10 ? 3 : profile.level >= 5 ? 2 : 1),
      tutorialComplete: true,
    };
    const leveled = applyXp(next, xp);
    next = leveled.profile;
    if (next.level >= 2 && !next.unlockedEnvironments.includes("dustfall_warland")) next.unlockedEnvironments = [...next.unlockedEnvironments, "dustfall_warland"];
    if (next.level >= 3 && !next.unlockedEnvironments.includes("moonlit_ruins")) next.unlockedEnvironments = [...next.unlockedEnvironments, "moonlit_ruins"];
    if (next.level >= 4 && !next.unlockedEnvironments.includes("crimson_dusk")) next.unlockedEnvironments = [...next.unlockedEnvironments, "crimson_dusk"];
    if (next.level >= 5 && !next.unlockedEnvironments.includes("royal_valley")) next.unlockedEnvironments = [...next.unlockedEnvironments, "royal_valley"];
    if (next.level >= 6 && !next.unlockedEnvironments.includes("stormfront")) next.unlockedEnvironments = [...next.unlockedEnvironments, "stormfront"];
    const items = COSMETICS.filter((c) => c.unlockLevel <= next.level && !next.unlockedCosmetics.includes(c.id)).map((c) => c.id);
    next.unlockedCosmetics = [...next.unlockedCosmetics, ...items];
    const won = record.result === "victory" ? [...new Set([...vyuhasWon, record.player.vyuha])] : vyuhasWon;
    const ach = evaluateAchievements(next, achievements, record, {
      vyuhasWon: won,
      moraleDipped: sim.lowestMorale.player < 30,
      earlyStability: sim.maxStabilityHold,
      centerBreach: !!sim.firstBreachAt,
    });
    const dailyNext = daily.map((d) => {
      if (d.completed) return d;
      const ok =
        (d.condition === "win_kurma" && record.result === "victory" && record.player.vyuha === "kurma") ||
        (d.condition === "win_flank" && record.result === "victory" && record.player.strategy === "flanking_attack") ||
        (d.condition === "break_garuda" && record.result === "victory" && record.ai.vyuha === "garuda") ||
        (d.condition === "low_loss" && record.result === "victory" && record.survivorsPlayer / record.player.armySize > 0.7) ||
        (d.condition === "protect" && record.result === "victory" && snap.player.commanderHp / snap.player.commanderMaxHp > 0.6) ||
        (d.condition === "low_morale" && record.result === "victory" && sim.lowestMorale.player < 40);
      return ok ? { ...d, completed: true } : d;
    });
    if (record.result === "victory") audio.victory();
    else audio.defeat();
    const rewards = { xp, medals: record.result === "victory" ? 12 : 4, items, levels: leveled.levelsGained };
    set({
      lastRecord: record,
      history: [record, ...history].slice(0, 80),
      profile: next,
      achievements: ach,
      vyuhasWon: won,
      daily: dailyNext,
      rewards,
      screen: "results",
      sim: null,
    });
    void postBattle(record);
    get().persist();
  },

  playReplay: (record) => {
    const sim = new BattleSimulation({
      seed: record.seed,
      player: record.player,
      ai: record.ai,
      environment: record.environment,
      timeOfDay: record.timeOfDay,
      weather: record.weather,
    });
    sim.start();
    set({
      sim,
      snap: sim.snapshot(),
      replay: { record, playing: true, speed: 1 },
      screen: "replay",
      paused: false,
    });
  },

  resetProgress: () => {
    localStorage.removeItem("vyuha.persist.v1");
    set({
      profile: freshProfile(),
      history: [],
      achievements: defaultAchievements(),
      screen: "intro",
      sim: null,
      lastRecord: null,
    });
  },

  setCameraMode: (m) => set({ cameraMode: m }),
  setPaused: (p) => set({ paused: p }),
}));
