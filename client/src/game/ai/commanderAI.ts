import { STRATEGIES, VYUHA_DEFS } from "../../../../shared/constants";
import type { SeededRng } from "../../../../shared/rng";
import type { ArmyRuntime, Loadout, StrategyId } from "../../../../shared/types";

export function evaluateAi(input: {
  t: number;
  player: ArmyRuntime;
  ai: ArmyRuntime;
  playerLoadout: Loadout;
  aiLoadout: Loadout;
  rng: SeededRng;
}): { strategy?: StrategyId; note?: string } {
  const { player, ai, playerLoadout, rng } = input;
  if (rng.chance(0.18)) {
    return {};
  }

  const scores: Record<StrategyId, number> = {
    frontal_assault: 1,
    flanking_attack: 1,
    center_breakthrough: 1,
    encirclement: 1,
    defensive_counterattack: 1,
    targeted_strike: 1,
  };

  if (player.pressure.center > 0.48) scores.defensive_counterattack += 2.2;
  if (player.pressure.left > 0.42 || player.pressure.right > 0.42) scores.flanking_attack += 1.4;
  if (playerLoadout.composition.cavalry > playerLoadout.armySize * 0.18) scores.flanking_attack += 0.8;
  if (playerLoadout.composition.cavalry > playerLoadout.armySize * 0.2) scores.center_breakthrough += 0.6;
  if (player.commanderHp / player.commanderMaxHp < 0.55) scores.targeted_strike += 2.4;
  if (ai.formationStability < 40) scores.defensive_counterattack += 2.5;
  if (player.formationStability < 35) scores.frontal_assault += 1.8;
  if (player.formationStability < 28) scores.encirclement += 1.6;
  if (VYUHA_DEFS[playerLoadout.vyuha].flanking > 80) scores.defensive_counterattack += 1.1;
  if (VYUHA_DEFS[playerLoadout.vyuha].weakness.toLowerCase().includes("center")) scores.center_breakthrough += 1.5;
  if (VYUHA_DEFS[playerLoadout.vyuha].weakness.toLowerCase().includes("flank")) scores.flanking_attack += 1.5;
  if (ai.morale < 40) scores.defensive_counterattack += 1.2;
  if (player.morale < 40) scores.frontal_assault += 1.3;

  scores[input.aiLoadout.strategy] += 0.4;

  let best: StrategyId = input.aiLoadout.strategy;
  let bestScore = -1;
  (Object.keys(scores) as StrategyId[]).forEach((k) => {
    const v = scores[k] + rng.range(0, 0.8);
    if (v > bestScore) {
      bestScore = v;
      best = k;
    }
  });

  if (best === input.aiLoadout.strategy) return {};
  return { strategy: best, note: STRATEGIES[best].name };
}

export function generateOpposition(player: Loadout, rng: SeededRng): Loadout {
  const vyuhas = Object.keys(VYUHA_DEFS) as Loadout["vyuha"][];
  const counters = VYUHA_DEFS[player.vyuha].counteredBy;
  const vyuha = rng.chance(0.62) ? rng.pick(counters.length ? counters : vyuhas) : rng.pick(vyuhas.filter((v) => v !== player.vyuha));
  const strategies = Object.keys(STRATEGIES) as StrategyId[];
  let strategy: StrategyId = rng.pick(strategies);
  if (VYUHA_DEFS[player.vyuha].flanking > 80) strategy = rng.chance(0.5) ? "defensive_counterattack" : "center_breakthrough";
  if (player.strategy === "targeted_strike") strategy = rng.chance(0.45) ? "defensive_counterattack" : strategy;
  if (player.strategy === "flanking_attack") strategy = rng.chance(0.4) ? "encirclement" : "frontal_assault";

  const sizeOff = rng.pick([-1000, 0, 0, 1000, 2000]);
  const armySize = Math.max(2000, Math.min(10000, player.armySize + sizeOff));

  const infantry = Math.round(armySize * rng.range(0.38, 0.58));
  const archers = Math.round(armySize * rng.range(0.12, 0.24));
  const cavalry = Math.round(armySize * rng.range(0.08, 0.22));
  const elephants = Math.round(armySize * rng.range(0.04, 0.1));
  const chariots = Math.round(armySize * rng.range(0.04, 0.1));
  let elite = armySize - (infantry + archers + cavalry + elephants + chariots);
  if (elite < 40) {
    elite = 80;
  }
  const raw = { infantry, archers, cavalry, elephants, chariots, elite };
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  const scale = armySize / sum;
  const composition = {
    infantry: Math.round(raw.infantry * scale),
    archers: Math.round(raw.archers * scale),
    cavalry: Math.round(raw.cavalry * scale),
    elephants: Math.round(raw.elephants * scale),
    chariots: Math.round(raw.chariots * scale),
    elite: 0,
  };
  composition.elite = armySize - (composition.infantry + composition.archers + composition.cavalry + composition.elephants + composition.chariots);

  const commanders = ["war_general", "blade_master", "falcon_commander", "iron_guardian", "chariot_master", "elephant_lord", "strategist", "shadow_commander"];
  const commanderId = rng.pick(commanders.filter((c) => c !== player.commanderId));
  const warriorIds = ["line_spear", "reed_archers", "dust_riders", "tusk_battery", "spoke_chariots", "sun_guard", "moon_blades", "hill_pikes", "storm_bows", "iron_hooves"].filter(
    () => true,
  );
  rng.pick(warriorIds);

  return {
    commanderId,
    warriorIds: warriorIds.slice(0, 4),
    armySize,
    composition,
    vyuha,
    strategy,
    cosmetics: {},
  };
}
