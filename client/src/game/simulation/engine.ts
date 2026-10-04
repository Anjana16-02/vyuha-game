import { COMMANDERS, MATCHUP, STRATEGIES, TICK_DT, TICK_HZ, VYUHA_DEFS } from "../../../../shared/constants";
import { SeededRng } from "../../../../shared/rng";
import type {
  ArmyRuntime,
  BattleEvent,
  BattleEventType,
  BattlePhase,
  BattleSnapshot,
  Loadout,
  Side,
  StrategyId,
  UnitCategory,
  UnitGroupState,
  Vec2,
  VyuhaId,
} from "../../../../shared/types";
import { commanderOffset, generateFormation } from "../formations/generator";
import { evaluateAi } from "../ai/commanderAI";

function dist(a: Vec2, b: Vec2) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function moveToward(p: Vec2, t: Vec2, step: number): Vec2 {
  const d = dist(p, t);
  if (d < 0.001) return { ...p };
  const k = Math.min(1, step / d);
  return { x: p.x + (t.x - p.x) * k, z: p.z + (t.z - p.z) * k };
}

function statsFor(cat: UnitCategory) {
  switch (cat) {
    case "infantry":
      return { hp: 90, atk: 12, def: 14, spd: 3.2, range: 2.4 };
    case "archer":
      return { hp: 55, atk: 11, def: 7, spd: 3.4, range: 14 };
    case "cavalry":
      return { hp: 70, atk: 15, def: 10, spd: 6.4, range: 2.6 };
    case "elephant":
      return { hp: 160, atk: 22, def: 18, spd: 2.4, range: 3.2 };
    case "chariot":
      return { hp: 75, atk: 14, def: 10, spd: 5.8, range: 9 };
    case "elite":
      return { hp: 110, atk: 18, def: 16, spd: 4.0, range: 2.8 };
  }
}

function soldiersPerGroup(size: number, cat: UnitCategory, countGroups: number) {
  const share =
    cat === "elephant" ? 0.06 : cat === "elite" ? 0.04 : cat === "chariot" ? 0.06 : cat === "cavalry" ? 0.14 : cat === "archer" ? 0.2 : 0.5;
  void share;
  return Math.max(20, Math.round(size / Math.max(8, countGroups)));
}

export class BattleSimulation {
  readonly seed: number;
  private rng: SeededRng;
  private t = 0;
  private phase: BattlePhase = "deployment";
  private groups: UnitGroupState[] = [];
  private events: BattleEvent[] = [];
  private finished = false;
  private winner: Side | "draw" | null = null;
  private playerLoadout: Loadout;
  private aiLoadout: Loadout;
  private lastAiThink = 0;
  private lastEventT: Partial<Record<BattleEventType, number>> = {};
  private moraleFloorTouched = { player: false, ai: false };
  public lowestMorale = { player: 100, ai: 100 };
  public maxStabilityHold = 0;
  public firstBreachAt: number | null = null;
  public comebackEligible = false;
  public environment;
  public timeOfDay;
  public weather;

  constructor(opts: {
    seed: number;
    player: Loadout;
    ai: Loadout;
    environment: BattleSnapshot["environment"];
    timeOfDay: BattleSnapshot["timeOfDay"];
    weather: BattleSnapshot["weather"];
  }) {
    this.seed = opts.seed;
    this.rng = new SeededRng(opts.seed);
    this.playerLoadout = opts.player;
    this.aiLoadout = opts.ai;
    this.environment = opts.environment;
    this.timeOfDay = opts.timeOfDay;
    this.weather = opts.weather;
    this.initializeBattle();
  }

  initializeBattle() {
    this.groups = [
      ...this.spawn("player", this.playerLoadout, -28),
      ...this.spawn("ai", this.aiLoadout, 28),
    ];
    this.emit("DEPLOYMENT", "both", "Armies take their ground.", { x: 0, z: 0 }, 0.4);
  }

  start() {
    this.phase = "advance";
    this.emit("ADVANCE", "both", "The lines begin to move.", { x: 0, z: 0 }, 0.5);
  }

  tick() {
    if (this.finished) return this.snapshot();
    this.t += TICK_DT;
    if (this.t > 6 && this.phase === "deployment") this.phase = "advance";
    this.evaluateAI();
    this.moveUnits();
    this.resolveCombat();
    this.updateMorale();
    this.updateFormation();
    this.generateBattleEvents();
    this.checkVictory();
    return this.snapshot();
  }

  private spawn(side: Side, loadout: Loadout, zBase: number): UnitGroupState[] {
    const facing = side === "player" ? 1 : -1;
    const slots = generateFormation(loadout.vyuha, loadout.composition, loadout.armySize, facing as 1 | -1);
    const comm = COMMANDERS.find((c) => c.id === loadout.commanderId) ?? COMMANDERS[0]!;
    const groups: UnitGroupState[] = [];
    const byCat: Record<string, number> = {};
    for (const s of slots) byCat[s.category] = (byCat[s.category] ?? 0) + 1;

    slots.forEach((slot, i) => {
      const st = statsFor(slot.category);
      const n = Math.max(
        12,
        Math.round((loadout.composition[slot.category === "archer" ? "archers" : slot.category === "elephant" ? "elephants" : slot.category === "chariot" ? "chariots" : slot.category] ?? 200) / (byCat[slot.category] || 1)),
      );
      const pos = { x: slot.pos.x, z: zBase + slot.pos.z };
      const warrior = loadout.warriorIds[i % loadout.warriorIds.length];
      groups.push({
        id: `${side}-g-${i}`,
        side,
        category: slot.category,
        count: n,
        maxCount: n,
        hp: st.hp * n,
        maxHp: st.hp * n,
        morale: 78 + comm.morale * 0.12,
        position: pos,
        target: pos,
        heading: facing === 1 ? 0 : Math.PI,
        home: pos,
        speed: st.spd * (0.85 + comm.mobility / 400),
        range: st.range,
        attack: st.atk * (0.9 + comm.attack / 400),
        defense: st.def * (0.9 + comm.defense / 400),
        stamina: 80,
        elite: slot.category === "elite",
        warriorId: warrior,
        isCommander: false,
      });
    });

    const offset = commanderOffset(loadout.vyuha);
    const cpos = { x: offset.x, z: zBase + offset.z * facing };
    groups.push({
      id: `${side}-commander`,
      side,
      category: "elite",
      count: 40,
      maxCount: 40,
      hp: 2200 + comm.defense * 18,
      maxHp: 2200 + comm.defense * 18,
      morale: 90,
      position: cpos,
      target: cpos,
      heading: facing === 1 ? 0 : Math.PI,
      home: cpos,
      speed: 3.4,
      range: 2.8,
      attack: 20 + comm.attack * 0.08,
      defense: 18 + comm.defense * 0.08,
      stamina: 100,
      elite: true,
      warriorName: comm.name,
      isCommander: true,
    });
    return groups;
  }

  private strategyTargets(side: Side, strategy: StrategyId, g: UnitGroupState): Vec2 {
    const enemy = this.groups.filter((x) => x.side !== side && x.count > 0);
    const foeCommander = enemy.find((x) => x.isCommander);
    const center = enemy.length
      ? {
          x: enemy.reduce((s, e) => s + e.position.x, 0) / enemy.length,
          z: enemy.reduce((s, e) => s + e.position.z, 0) / enemy.length,
        }
      : { x: 0, z: side === "player" ? 20 : -20 };

    const hold = this.t < 18 && strategy === "defensive_counterattack";
    if (hold) return { x: g.home.x, z: g.home.z + (side === "player" ? 4 : -4) };

    if (strategy === "targeted_strike" && foeCommander) {
      if (g.category === "cavalry" || g.category === "elite" || g.isCommander) return { ...foeCommander.position };
    }
    if (strategy === "flanking_attack" && (g.category === "cavalry" || g.category === "chariot")) {
      const sign = g.home.x >= 0 ? 1 : -1;
      return { x: center.x + sign * 18, z: center.z };
    }
    if (strategy === "encirclement") {
      const sign = g.home.x >= 0 ? 1 : -1;
      const wrap = g.category === "cavalry" || g.category === "chariot" || Math.abs(g.home.x) > 8;
      if (wrap) return { x: center.x + sign * 16, z: center.z + (side === "player" ? 6 : -6) };
    }
    if (strategy === "center_breakthrough" && (g.category === "elephant" || g.category === "elite" || g.category === "infantry")) {
      return { x: center.x * 0.2, z: center.z };
    }
    if (g.category === "archer") {
      return { x: g.home.x * 0.7 + center.x * 0.3, z: (g.position.z + center.z) * 0.5 };
    }
    return { x: g.home.x * 0.35 + center.x * 0.65, z: center.z };
  }

  moveUnits() {
    const load = (s: Side) => (s === "player" ? this.playerLoadout : this.aiLoadout);
    for (const g of this.groups) {
      if (g.count <= 0) continue;
      const strat = load(g.side).strategy;
      const desired = this.strategyTargets(g.side, strat, g);
      const moraleSlow = g.morale < 35 ? 0.55 : g.morale < 55 ? 0.8 : 1;
      const broken = this.army(g.side).formationStability < 20 ? 1.4 : 1;
      const scatter = this.army(g.side).formationStability < 25 ? (this.rng.range(-3, 3) * (1.2 - this.army(g.side).formationStability / 100)) : 0;
      g.target = { x: desired.x + scatter, z: desired.z };
      const step = g.speed * TICK_DT * moraleSlow * (g.category === "elephant" ? 0.9 : 1) * (this.phase === "deployment" ? 0.4 : 1);
      const next = moveToward(g.position, g.target, step * broken * 0.85);
      const dx = next.x - g.position.x;
      const dz = next.z - g.position.z;
      if (Math.hypot(dx, dz) > 0.01) g.heading = Math.atan2(dx, dz);
      g.position = next;
      g.stamina = Math.max(10, g.stamina - TICK_DT * 0.4);
    }
  }

  resolveCombat() {
    const alive = this.groups.filter((g) => g.count > 0);
    for (const a of alive) {
      let best: UnitGroupState | null = null;
      let bestD = 1e9;
      for (const b of alive) {
        if (b.side === a.side) continue;
        const d = dist(a.position, b.position);
        if (d < bestD && d <= a.range + 6) {
          bestD = d;
          best = b;
        }
      }
      if (!best) continue;
      if (bestD > a.range + (a.category === "archer" ? 4 : 1.8)) continue;
      if (this.phase === "advance" && this.t > 12) this.phase = "engagement";
      const vy = VYUHA_DEFS[this.loadout(a.side).vyuha];
      const form = this.army(a.side).formationStability / 100;
      const morale = Math.max(0.45, a.morale / 100);
      const match = MATCHUP[`${a.category}-${best.category}`] ?? 1;
      const comm = COMMANDERS.find((c) => c.id === this.loadout(a.side).commanderId);
      const commMod = 0.85 + (comm?.attack ?? 50) / 350;
      const rand = 0.85 + this.rng.next() * 0.3;
      const weatherMod = this.weather === "storm" && a.category === "archer" ? 0.82 : 1;
      const def = 1 + best.defense * 0.012;
      const dmg =
        ((a.attack * a.count * 0.045 * match * morale * (0.7 + form * 0.5) * commMod * rand * weatherMod) / def) *
        (vy.defense / 80) *
        TICK_DT *
        18;
      best.hp -= dmg;
      const ratio = Math.max(0, best.hp / best.maxHp);
      best.count = Math.max(0, Math.round(best.maxCount * ratio));
      if (best.count === 0) best.hp = 0;
      if (best.isCommander && dmg > 8) {
        this.maybeEvent("COMMANDER_THREATENED", a.side === "player" ? "ai" : "player", "A commander is under blade-light.", best.position, 0.9, 8);
      }
    }
  }

  updateMorale() {
    for (const side of ["player", "ai"] as Side[]) {
      const army = this.army(side);
      const groups = this.groups.filter((g) => g.side === side);
      const loss = 1 - army.remaining / Math.max(1, army.starting);
      let morale = 82 - loss * 55;
      if (army.commanderHp / army.commanderMaxHp < 0.35) morale -= 18;
      if (army.formationStability < 30) morale -= 12;
      const enemy = this.army(side === "player" ? "ai" : "player");
      if (enemy.formationStability < 25) morale += 10;
      if (enemy.commanderHp / enemy.commanderMaxHp < 0.4) morale += 8;
      morale = Math.max(4, Math.min(100, morale));
      army.morale = morale;
      this.lowestMorale[side] = Math.min(this.lowestMorale[side], morale);
      if (morale < 30) this.moraleFloorTouched[side] = true;
      for (const g of groups) g.morale = morale * (0.85 + this.rng.range(0, 0.15));
    }
    if (this.moraleFloorTouched.player && this.winner === "player") this.comebackEligible = true;
  }

  updateFormation() {
    for (const side of ["player", "ai"] as Side[]) {
      const army = this.army(side);
      const groups = this.groups.filter((g) => g.side === side && g.count > 0 && !g.isCommander);
      if (!groups.length) {
        army.formationStability = 0;
        continue;
      }
      const vy = VYUHA_DEFS[this.loadout(side).vyuha];
      const loss = 1 - army.remaining / army.starting;
      const cx = groups.reduce((s, g) => s + g.position.x, 0) / groups.length;
      const cz = groups.reduce((s, g) => s + g.position.z, 0) / groups.length;
      const spread = groups.reduce((s, g) => s + dist(g.position, { x: cx, z: cz }), 0) / groups.length;
      const expected = 7 + (1 - vy.stability / 100) * 6;
      const spreadPen = Math.max(0, (spread - expected) * 4);
      const flank = this.flankPressure(side);
      let stab = vy.stability - loss * 70 - spreadPen - flank * 18;
      if (army.morale < 40) stab -= 12;
      if (army.commanderHp / army.commanderMaxHp < 0.4) stab -= 10;
      army.formationStability = Math.max(0, Math.min(100, stab));
      army.pressure = this.lanePressure(side);
      if (side === "player" && this.phase === "engagement") {
        this.maxStabilityHold = Math.max(this.maxStabilityHold, army.formationStability);
      }
    }
  }

  private flankPressure(side: Side) {
    const mine = this.groups.filter((g) => g.side === side && g.count > 0);
    const foe = this.groups.filter((g) => g.side !== side && g.count > 0);
    let p = 0;
    for (const f of foe) {
      if (Math.abs(f.position.x) > 12) p += f.count * 0.0004;
    }
    void mine;
    return Math.min(1, p);
  }

  private lanePressure(side: Side) {
    const foe = this.groups.filter((g) => g.side !== side && g.count > 0);
    const lane = (pred: (x: number) => boolean) =>
      foe.filter((g) => pred(g.position.x)).reduce((s, g) => s + g.count, 0);
    const n = Math.max(1, foe.reduce((s, g) => s + g.count, 0));
    return {
      left: lane((x) => x < -7) / n,
      center: lane((x) => x >= -7 && x <= 7) / n,
      right: lane((x) => x > 7) / n,
    };
  }

  evaluateAI() {
    if (this.t - this.lastAiThink < 4) return;
    this.lastAiThink = this.t;
    const decision = evaluateAi({
      t: this.t,
      player: this.army("player"),
      ai: this.army("ai"),
      playerLoadout: this.playerLoadout,
      aiLoadout: this.aiLoadout,
      rng: this.rng,
    });
    if (decision.strategy && decision.strategy !== this.aiLoadout.strategy) {
      this.aiLoadout = { ...this.aiLoadout, strategy: decision.strategy };
      this.emit("REGROUP", "ai", `Enemy shifts to ${STRATEGIES[decision.strategy].name}.`, { x: 0, z: 16 }, 0.55);
    }
  }

  generateBattleEvents() {
    const playerCav = this.groups.filter((g) => g.side === "player" && g.category === "cavalry" && g.count > 0);
    const aiLine = this.groups.filter((g) => g.side === "ai" && g.count > 0);
    if (playerCav.some((c) => aiLine.some((e) => dist(c.position, e.position) < 8 && Math.abs(c.position.x) > 10))) {
      this.maybeEvent("FLANK_ATTACK", "player", "Cavalry hammers a flank.", playerCav[0]!.position, 0.8, 10);
    }
    const archers = this.groups.filter((g) => g.category === "archer" && g.count > 0);
    if (this.phase !== "deployment" && this.t > 10) {
      const a = archers[Math.floor(this.t) % Math.max(1, archers.length)];
      if (a) this.maybeEvent("ARCHER_VOLLEY", a.side, "Arrows darken a lane.", a.position, 0.45, 7);
    }
    const ele = this.groups.find((g) => g.category === "elephant" && g.count > 0 && this.t > 16);
    if (ele) this.maybeEvent("ELEPHANT_CHARGE", ele.side, "Elephants commit their weight.", ele.position, 0.95, 16);
    const cav = this.groups.find((g) => g.category === "cavalry" && g.count > 0 && this.t > 14);
    if (cav) this.maybeEvent("CAVALRY_CHARGE", cav.side, "Horses lengthen their stride.", cav.position, 0.75, 14);
    for (const side of ["player", "ai"] as Side[]) {
      const a = this.army(side);
      if (a.formationStability < 48 && a.formationStability > 0) {
        this.maybeEvent("FORMATION_BREACH", side, `${side === "player" ? "Your" : "Enemy"} formation is breached.`, { x: 0, z: side === "player" ? -8 : 8 }, 0.85, 12);
        if (this.firstBreachAt == null && side === "ai") this.firstBreachAt = this.t;
      }
      if (a.formationStability < 12) {
        this.maybeEvent("FORMATION_COLLAPSE", side, `${side === "player" ? "Your" : "Enemy"} Vyuha collapses.`, { x: 0, z: 0 }, 1, 20);
      }
      if (a.morale < 22) {
        this.maybeEvent("MORALE_BREAK", side, `${side === "player" ? "Your" : "Enemy"} ranks lose their nerve.`, { x: 0, z: 0 }, 0.9, 18);
      }
    }
    const pElite = this.groups.find((g) => g.side === "player" && g.elite && !g.isCommander && g.count > 0);
    const aElite = this.groups.find((g) => g.side === "ai" && g.elite && !g.isCommander && g.count > 0);
    if (pElite && aElite && dist(pElite.position, aElite.position) < 6) {
      this.maybeEvent("MAJOR_DUEL", "both", `${pElite.warriorName ?? "Champion"} meets ${aElite.warriorName ?? "rival steel"}.`, {
        x: (pElite.position.x + aElite.position.x) / 2,
        z: (pElite.position.z + aElite.position.z) / 2,
      }, 1, 22);
    }
    if (this.t > 90 && !this.finished) {
      this.maybeEvent("FINAL_PUSH", "both", "The field tightens into a last push.", { x: 0, z: 0 }, 1, 30);
      if (this.phase === "intense" || this.phase === "engagement") this.phase = "final_push";
    } else if (this.army("player").formationStability < 40 || this.army("ai").formationStability < 40) {
      if (this.phase === "engagement") this.phase = "intense";
    }
    if (this.phase === "intense") this.phase = this.army("player").morale < 28 || this.army("ai").morale < 28 ? "critical" : this.phase;
  }

  getLastEventSound(): string | null {
    const last = this.events[this.events.length - 1];
    if (!last) return null;
    switch (last.type) {
      case "ELEPHANT_CHARGE":
        return "elephantCharge";
      case "CAVALRY_CHARGE":
        return "cavalryCharge";
      case "FORMATION_COLLAPSE":
        return "formationCollapse";
      case "MORALE_BREAK":
        return "moraleBreak";
      case "ARCHER_VOLLEY":
        return "arrows";
      default:
        return null;
    }
  }

  checkVictory() {
    const p = this.army("player");
    const a = this.army("ai");
    const pDead = p.remaining < p.starting * 0.05 || p.commanderHp <= 0 || (p.morale < 10 && p.formationStability <= 0);
    const aDead = a.remaining < a.starting * 0.05 || a.commanderHp <= 0 || (a.morale < 10 && a.formationStability <= 0);
    if (pDead && aDead) this.finish("draw");
    else if (aDead) this.finish("player");
    else if (pDead) this.finish("ai");
    else if (this.t >= 240) {
      const ps = p.remaining * 0.6 + p.morale * 8 + p.formationStability * 6 + p.commanderHp * 0.02;
      const as = a.remaining * 0.6 + a.morale * 8 + a.formationStability * 6 + a.commanderHp * 0.02;
      this.finish(ps === as ? "draw" : ps > as ? "player" : "ai");
    }
  }

  finishBattle() {
    this.finish(this.winner ?? "draw");
  }

  private finish(w: Side | "draw") {
    if (this.finished) return;
    this.finished = true;
    this.winner = w;
    this.phase = "ended";
    if (this.moraleFloorTouched.player && w === "player") this.comebackEligible = true;
  }

  private loadout(side: Side) {
    return side === "player" ? this.playerLoadout : this.aiLoadout;
  }

  army(side: Side): ArmyRuntime {
    const groups = this.groups.filter((g) => g.side === side);
    const remaining = groups.reduce((s, g) => s + g.count, 0);
    const starting = groups.reduce((s, g) => s + g.maxCount, 0);
    const comm = groups.find((g) => g.isCommander);
    const load = this.loadout(side);
    const cached = this._armyCache[side];
    const runtime: ArmyRuntime = {
      remaining,
      starting,
      morale: cached?.morale ?? 80,
      formationStability: cached?.formationStability ?? 100,
      commanderHp: comm?.hp ?? 0,
      commanderMaxHp: comm?.maxHp ?? 1,
      vyuha: load.vyuha,
      strategy: load.strategy,
      commanderId: load.commanderId,
      pressure: cached?.pressure ?? { left: 0.33, center: 0.34, right: 0.33 },
    };
    this._armyCache[side] = runtime;
    return runtime;
  }

  private _armyCache: Record<Side, ArmyRuntime | undefined> = { player: undefined, ai: undefined };

  private emit(type: BattleEventType, side: BattleEvent["side"], message: string, position: Vec2, intensity: number, actors?: string[]) {
    this.events.push({ t: this.t, type, side, message, position, intensity, actors });
    if (this.events.length > 80) this.events.shift();
    this.lastEventT[type] = this.t;
  }

  private maybeEvent(type: BattleEventType, side: BattleEvent["side"], message: string, position: Vec2, intensity: number, cooldown: number) {
    const last = this.lastEventT[type] ?? -999;
    if (this.t - last < cooldown) return;
    this.emit(type, side, message, position, intensity);
  }

  snapshot(): BattleSnapshot {
    return {
      t: this.t,
      phase: this.phase,
      player: { ...this.army("player") },
      ai: { ...this.army("ai") },
      groups: this.groups.map((g) => ({ ...g, position: { ...g.position }, target: { ...g.target } })),
      events: this.events.slice(-24),
      seed: this.seed,
      environment: this.environment,
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      finished: this.finished,
      winner: this.winner,
    };
  }

  get player() {
    return this.playerLoadout;
  }
  get ai() {
    return this.aiLoadout;
  }
  get ticksPerSecond() {
    return TICK_HZ;
  }
}
