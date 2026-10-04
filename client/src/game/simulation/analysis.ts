import { COMMANDERS, STRATEGIES, VYUHA_DEFS } from "../../../../shared/constants";
import type { BattleAnalysis, BattleEvent, BattleSnapshot, Loadout } from "../../../../shared/types";

export function analyzeBattle(opts: {
  snap: BattleSnapshot;
  player: Loadout;
  ai: Loadout;
  events: BattleEvent[];
  duration: number;
}): BattleAnalysis {
  const { snap, player, ai, events, duration } = opts;
  const win = snap.winner === "player";
  const p = snap.player;
  const a = snap.ai;
  const lossP = 1 - p.remaining / Math.max(1, p.starting);
  const lossA = 1 - a.remaining / Math.max(1, a.starting);
  const vyP = VYUHA_DEFS[player.vyuha];
  const vyA = VYUHA_DEFS[ai.vyuha];
  const stP = STRATEGIES[player.strategy];
  const stA = STRATEGIES[ai.strategy];
  const commP = COMMANDERS.find((c) => c.id === player.commanderId)?.name ?? "Your commander";
  const commA = COMMANDERS.find((c) => c.id === ai.commanderId)?.name ?? "The enemy commander";

  const breach = events.find((e) => e.type === "FORMATION_BREACH");
  const collapse = events.find((e) => e.type === "FORMATION_COLLAPSE");
  const duel = events.find((e) => e.type === "MAJOR_DUEL");
  const flank = events.find((e) => e.type === "FLANK_ATTACK");
  const threat = events.find((e) => e.type === "COMMANDER_THREATENED");
  const morale = events.find((e) => e.type === "MORALE_BREAK");
  const charge = events.find((e) => e.type === "ELEPHANT_CHARGE" || e.type === "CAVALRY_CHARGE");

  const turning =
    collapse?.message ??
    breach?.message ??
    morale?.message ??
    duel?.message ??
    flank?.message ??
    charge?.message ??
    "The meeting of the two centers decided the hour.";

  const whatHappened = win
    ? `${commP} held ${vyP.name} against ${commA}'s ${vyA.name}. ${stP.name} met ${stA.name}. After ${formatTime(duration)} the enemy line failed with ${(lossA * 100).toFixed(0)}% losses against your ${(lossP * 100).toFixed(0)}%.`
    : snap.winner === "draw"
      ? `Neither ${vyP.name} nor ${vyA.name} could claim the dust. Losses sat at ${(lossP * 100).toFixed(0)}% and ${(lossA * 100).toFixed(0)}% when the hour closed.`
      : `${commA} broke your ${vyP.name} using ${vyA.name} and ${stA.name}. You lost ${(lossP * 100).toFixed(0)}% of the host; they spent ${(lossA * 100).toFixed(0)}%.`;

  const workedBits: string[] = [];
  if (p.formationStability > a.formationStability) workedBits.push(`${vyP.name} kept more geometry (${p.formationStability.toFixed(0)} vs ${a.formationStability.toFixed(0)})`);
  if (flank && flank.side === "player") workedBits.push("your flanking groups arrived with weight");
  if (p.commanderHp / p.commanderMaxHp > 0.5) workedBits.push(`${commP} remained a visible spine`);
  if (player.composition.archers > player.armySize * 0.18 && events.some((e) => e.type === "ARCHER_VOLLEY" && e.side === "player"))
    workedBits.push("volley fire punished approaching ranks");
  if (!workedBits.length) workedBits.push("individual groups fought with discipline even as the plan frayed");

  const failedBits: string[] = [];
  if (p.formationStability < 40) failedBits.push(`${vyP.name} lost its intended shape`);
  if (p.morale < 40) failedBits.push("morale slid below a fighting heart");
  if (threat && threat.side === "player") failedBits.push("the commander was forced to the blade");
  if (player.strategy === "flanking_attack" && !flank) failedBits.push("the horns never closed");
  if (vyA.counters.includes(player.vyuha)) failedBits.push(`${vyA.name} is a known answer to ${vyP.name}`);
  if (!failedBits.length) failedBits.push("small delays in commitment let the enemy choose the clash");

  const decisive =
    events.filter((e) => e.intensity >= 0.85).sort((x, y) => y.intensity - x.intensity)[0]?.message ?? turning;

  const why = win
    ? `You won because ${workedBits[0]}, while the enemy ${failedBits[0]?.replace("your", "their") ?? "could not finish the geometry"}. ${stP.name} stayed coherent longer than ${stA.name}.`
    : snap.winner === "draw"
      ? `The field refused a master. ${vyP.name}'s ${vyP.strength.toLowerCase()} cancelled ${vyA.name}'s ${vyA.strength.toLowerCase()}.`
      : `You lost because ${failedBits[0]}, and ${commA} used ${stA.name} against ${vyP.weakness.toLowerCase()}.`;

  const next = win
    ? p.formationStability < 50
      ? "Protect your geometry earlier — try Kurma or Padma if you insist on aggressive strategies."
      : "Press a different Vyuha to learn its counters; the AI will not repeat this exact answer."
    : player.strategy === "frontal_assault"
      ? "A frontal meeting into a stronger shell rarely pays. Flank or break a single lane."
      : `Study ${vyA.name}: ${vyA.weakness}. Bring a Vyuha that stresses that seam.`;

  const strategicScore = Math.round(
    Math.max(
      8,
      Math.min(
        99,
        (win ? 58 : snap.winner === "draw" ? 44 : 28) +
          (1 - lossP) * 22 +
          p.formationStability * 0.12 +
          p.morale * 0.1 +
          (p.commanderHp / p.commanderMaxHp) * 10 -
          (vyA.counters.includes(player.vyuha) ? 6 : 0),
      ),
    ),
  );

  return {
    whatHappened,
    turningPoint: `${formatTime(breach?.t ?? collapse?.t ?? duration / 2)} — ${turning}`,
    whatWorked: workedBits.join("; ") + ".",
    whatFailed: failedBits.join("; ") + ".",
    decisiveMoment: decisive,
    why,
    next,
    strategicScore,
  };
}

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
