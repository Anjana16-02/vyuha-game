import { ACHIEVEMENTS, xpToNext } from "../../../shared/constants";
import type { AchievementProgress, BattleRecord, PlayerProfile } from "../../../shared/types";

export function applyXp(profile: PlayerProfile, amount: number): { profile: PlayerProfile; levelsGained: number } {
  let xp = profile.xp + amount;
  let level = profile.level;
  let gained = 0;
  while (xp >= xpToNext(level) && level < 40) {
    xp -= xpToNext(level);
    level++;
    gained++;
  }
  return { profile: { ...profile, xp, level, updatedAt: Date.now() }, levelsGained: gained };
}

export function battleXp(record: BattleRecord): number {
  const base = 90;
  const result = record.result === "victory" ? 110 : record.result === "draw" ? 40 : 35;
  const strat = Math.round(record.analysis.strategicScore * 0.8);
  const preserve = Math.round((record.survivorsPlayer / Math.max(1, record.player.armySize)) * 50);
  return base + result + strat + preserve;
}

export function evaluateAchievements(
  profile: PlayerProfile,
  progress: AchievementProgress[],
  record: BattleRecord,
  extras: {
    vyuhasWon: string[];
    moraleDipped: boolean;
    earlyStability: number;
    centerBreach: boolean;
  },
): AchievementProgress[] {
  const map = new Map(progress.map((p) => [p.id, p]));
  const unlock = (id: string, ok: boolean, prog = ok ? 1 : 0) => {
    const prev = map.get(id) ?? { id, unlocked: false, progress: 0 };
    if (prev.unlocked) return;
    const next = { ...prev, progress: Math.max(prev.progress, prog) };
    if (ok) {
      next.unlocked = true;
      next.unlockedAt = Date.now();
    }
    map.set(id, next);
  };

  unlock("first_battle", true, 1);
  unlock("first_victory", record.result === "victory", record.result === "victory" ? 1 : 0);
  const vyuSet = new Set(extras.vyuhasWon);
  unlock("formation_master", vyuSet.size >= 4, vyuSet.size / 4);
  unlock("center_breaker", extras.centerBreach);
  unlock("flanking_expert", record.result === "victory" && record.player.strategy === "flanking_attack");
  const remainRatio = record.survivorsPlayer / Math.max(1, record.player.armySize);
  unlock("last_stand", record.result === "victory" && remainRatio < 0.2);
  unlock("comeback", record.result === "victory" && extras.moraleDipped);
  unlock("unbreakable", record.result === "victory" && record.analysis.strategicScore >= 0 && (record as BattleRecord & { finalStability?: number }).finalStability !== undefined
    ? false
    : record.result === "victory" && remainRatio > 0.55);
  unlock("commander_savior", record.result === "victory" && record.analysis.strategicScore >= 50);
  unlock("tactical_genius", record.analysis.strategicScore >= 85);
  unlock("perfect_formation", extras.earlyStability >= 90);
  unlock("legendary_commander", profile.level >= 10, profile.level / 10);

  for (const def of ACHIEVEMENTS) {
    if (!map.has(def.id)) map.set(def.id, { id: def.id, unlocked: false, progress: 0 });
  }
  return ACHIEVEMENTS.map((d) => map.get(d.id)!);
}

export function defaultAchievements(): AchievementProgress[] {
  return ACHIEVEMENTS.map((a) => ({ id: a.id, unlocked: false, progress: 0 }));
}
