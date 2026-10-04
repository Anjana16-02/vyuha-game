import { useEffect, useMemo, useState, useRef } from "react";
import { COMMANDERS, STRATEGIES, VYUHA_DEFS, ACHIEVEMENTS, titleForLevel } from "../../../shared/constants";
import { BattlefieldCanvas } from "../game/battlefield/BattlefieldScene";
import { audio } from "../game/audio/AudioManager";
import { Bronze, Frame, Glyph, NavBar } from "../components/ui";
import { useGame } from "../state/gameStore";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { BattleSnapshot, BattleRecord } from "../../../shared/types";

const GEN_STEPS = [
  "GENERATING OPPOSITION...",
  "AI COMMANDER SELECTED",
  "ARMY COMPOSITION CALCULATED",
  "VYUHA SELECTED",
  "ATTACK PATTERN SELECTED",
  "BATTLEFIELD INITIALIZED",
  "STRATEGY ENGINE READY",
  "BATTLE COMMENCING",
];

export function GeneratingScreen() {
  const [step, setStep] = useState(0);
  const begin = useGame((s) => s.beginBattle);
  const ai = useGame((s) => s.aiLoadout);
  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= GEN_STEPS.length - 1) {
          clearInterval(id);
          setTimeout(() => begin(), 500);
          return s;
        }
        audio.drums();
        return s + 1;
      });
    }, 420);
    return () => clearInterval(id);
  }, [begin]);
  const c = COMMANDERS.find((x) => x.id === ai?.commanderId);
  return (
    <div className="intro-root generating">
      <div className="intro-copy">
        {GEN_STEPS.slice(0, step + 1).map((t) => (
          <p key={t} className="gen-line">
            {t}
          </p>
        ))}
        {c && step >= 1 && (
          <p className="tagline">
            {c.title} · {ai && VYUHA_DEFS[ai.vyuha].name} · {ai && STRATEGIES[ai.strategy].name}
          </p>
        )}
      </div>
    </div>
  );
}

export function BattleScreen() {
  const snap = useGame((s) => s.snap);
  const sim = useGame((s) => s.sim);
  const tick = useGame((s) => s.tickBattle);
  const paused = useGame((s) => s.paused);
  const setPaused = useGame((s) => s.setPaused);
  const cameraMode = useGame((s) => s.cameraMode);
  const setCameraMode = useGame((s) => s.setCameraMode);
  const showEvents = useGame((s) => s.settings.showEvents);
  const profile = useGame((s) => s.profile);
  const lastEventCount = useRef(0);

  useEffect(() => {
    const id = setInterval(() => tick(), 1000 / 16);
    return () => clearInterval(id);
  }, [tick]);

  useEffect(() => {
    if (snap && snap.events.length > lastEventCount.current) {
      const newEvents = snap.events.slice(lastEventCount.current);
      lastEventCount.current = snap.events.length;
      newEvents.forEach((e) => {
        if (e.type === "ELEPHANT_CHARGE") audio.elephantCharge();
        else if (e.type === "CAVALRY_CHARGE") audio.cavalryCharge();
        else if (e.type === "FORMATION_COLLAPSE") audio.formationCollapse();
        else if (e.type === "MORALE_BREAK") audio.moraleBreak();
        else if (e.type === "ARCHER_VOLLEY") audio.arrows();
        else if (e.type === "MAJOR_DUEL") audio.impact();
      });
    }
  }, [snap]);

  if (!snap) {
    return (
      <div className="intro-root">
        <p>Unable to load battle.</p>
        <Bronze onClick={() => useGame.getState().go("ready")}>Retry</Bronze>
      </div>
    );
  }
  const p = snap.player;
  const a = snap.ai;
  const showGuide = profile.tutorialComplete === false;
  return (
    <div className="battle-root">
      <BattlefieldCanvas />
      <div className="battle-hud top">
        <ArmyHud side="YOU" army={p} />
        <div className="timer">
          {fmt(snap.t)} · {snap.phase.replace("_", " ")}
        </div>
        <ArmyHud side="ENEMY" army={a} flip />
      </div>
      <Minimap />
      <div className="objective-banner">
        OBJECTIVE: break the enemy army's morale or defeat their commander before yours falls. The battle ends at victory, defeat, or the 90s time limit.
      </div>
      {showGuide && <BattleGuide snap={snap} />}
      {showEvents && (
        <div className="event-feed">
          {snap.events.slice(-6).reverse().map((e) => (
            <div key={`${e.t}-${e.message}`}>
              {fmt(e.t)} {e.message}
            </div>
          ))}
        </div>
      )}
      <div className="battle-hud bottom">
        {(["strategic", "formation", "battlefield", "combat", "player"] as const).map((m) => (
          <button key={m} className={cameraMode === m ? "on" : ""} onClick={() => setCameraMode(m)}>
            {m}
          </button>
        ))}
        <button onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</button>
      </div>
    </div>
  );
}

function ArmyHud({ side, army, flip }: { side: string; army: { remaining: number; starting: number; morale: number; formationStability: number; vyuha: string; strategy: string; commanderHp: number; commanderMaxHp: number }; flip?: boolean }) {
  return (
    <div className={`army-hud ${flip ? "flip" : ""}`}>
      <strong>{side}</strong>
      <span>
        {VYUHA_DEFS[army.vyuha as keyof typeof VYUHA_DEFS].name} · {STRATEGIES[army.strategy as keyof typeof STRATEGIES].name}
      </span>
      <meter max={army.starting} value={army.remaining} />
      <small>
        {army.remaining.toLocaleString()} / {army.starting.toLocaleString()} · morale {army.morale.toFixed(0)} · form {army.formationStability.toFixed(0)}
      </small>
      <meter max={army.commanderMaxHp} value={army.commanderHp} />
    </div>
  );
}

function Minimap() {
  const groups = useGame((s) => s.snap?.groups ?? []);
  return (
    <svg className="minimap" viewBox="-40 -40 80 80">
      <rect x="-40" y="-40" width="80" height="80" fill="#0d0c08" stroke="#c9a227" />
      {groups.map((g) => (
        <circle key={g.id} cx={g.position.x} cy={g.position.z} r={g.isCommander ? 1.6 : 0.7} fill={g.side === "player" ? "#e8d48a" : "#c45a4a"} opacity={g.count > 0 ? 1 : 0.15} />
      ))}
    </svg>
  );
}

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function BattleGuide({ snap }: { snap: BattleSnapshot }) {
  const messages: string[] = [];
  const p = snap.player;
  const a = snap.ai;

  if (snap.phase === "deployment") {
    messages.push("Your army is taking position.");
  } else if (snap.phase === "advance") {
    messages.push("Your army is advancing toward the enemy.");
  } else if (snap.phase === "engagement") {
    messages.push("First contact! Your armies are engaging.");
  } else if (snap.phase === "intense") {
    messages.push("The battle intensifies. Watch your formation stability.");
  } else if (snap.phase === "critical") {
    messages.push("Critical moment! The battle could go either way.");
  } else if (snap.phase === "final_push") {
    messages.push("Final push! One army will break soon.");
  }

  if (p.morale < 40) messages.push("⚠️ Your morale is falling!");
  if (p.formationStability < 40) messages.push("⚠️ Your formation is weakening!");
  if (p.commanderHp / p.commanderMaxHp < 0.5) messages.push("⚠️ Your commander is under pressure!");
  if (a.morale < 40) messages.push("✓ Enemy morale is collapsing!");
  if (a.formationStability < 40) messages.push("✓ Enemy formation is breaking!");
  if (a.commanderHp / a.commanderMaxHp < 0.5) messages.push("✓ Enemy commander is threatened!");

  const recentEvent = snap.events[snap.events.length - 1];
  if (recentEvent) {
    if (recentEvent.type === "FLANK_ATTACK" && recentEvent.side === "player") {
      messages.push("Your cavalry is attacking the enemy flank!");
    } else if (recentEvent.type === "FLANK_ATTACK" && recentEvent.side === "ai") {
      messages.push("⚠️ Enemy cavalry is attacking your flank!");
    } else if (recentEvent.type === "ELEPHANT_CHARGE" && recentEvent.side === "player") {
      messages.push("Your elephants are charging!");
    } else if (recentEvent.type === "ELEPHANT_CHARGE" && recentEvent.side === "ai") {
      messages.push("⚠️ Enemy elephants are charging!");
    } else if (recentEvent.type === "FORMATION_BREACH" && recentEvent.side === "ai") {
      messages.push("✓ Enemy formation is breached!");
    } else if (recentEvent.type === "FORMATION_BREACH" && recentEvent.side === "player") {
      messages.push("⚠️ Your formation is breached!");
    } else if (recentEvent.type === "MAJOR_DUEL") {
      messages.push("Champions are clashing!");
    }
  }

  if (messages.length === 0) messages.push("Watch your strategy unfold.");

  return (
    <div className="battle-guide">
      {messages.slice(-3).map((msg, i) => (
        <div key={i} className="guide-message">{msg}</div>
      ))}
    </div>
  );
}

export function ResultsScreen() {
  const rec = useGame((s) => s.lastRecord);
  const rewards = useGame((s) => s.rewards);
  const go = useGame((s) => s.go);
  if (!rec) return null;
  const isVictory = rec.result === "victory";
  return (
    <div className="intro-root results">
      <h1 className="title-xl">{isVictory ? "VICTORY" : rec.result === "draw" ? "STALEMATE" : "DEFEAT"}</h1>
      <Frame className="report">
        <section className="result-summary">
          <p>
            Your army: {rec.player.armySize.toLocaleString()} → {rec.survivorsPlayer.toLocaleString()} remaining
          </p>
          <p>
            Enemy army: {rec.ai.armySize.toLocaleString()} → {rec.survivorsAi.toLocaleString()}
          </p>
          <p>Score: {rec.score} · Duration: {fmt(rec.duration)}</p>
        </section>
        <section className="result-reasons">
          <h3>{isVictory ? "WHY YOU WON" : "WHY YOU LOST"}</h3>
          {getResultReasons(rec, isVictory).map((reason, i) => (
            <p key={i}>{reason}</p>
          ))}
        </section>
        {rewards && (
          <section className="result-rewards">
            <h3>REWARDS</h3>
            <p>
              +{rewards.xp} XP · +{rewards.medals} medals
              {rewards.levels ? ` · LEVEL +${rewards.levels}` : ""}
            </p>
          </section>
        )}
      </Frame>
      <Bronze onClick={() => go("analysis")}>STRATEGIC ANALYSIS</Bronze>
    </div>
  );
}

function getResultReasons(rec: BattleRecord, isVictory: boolean): string[] {
  const reasons: string[] = [];
  const playerLoss = 1 - rec.survivorsPlayer / rec.player.armySize;
  const enemyLoss = 1 - rec.survivorsAi / rec.ai.armySize;

  if (isVictory) {
    if (enemyLoss > 0.6) reasons.push("✓ You destroyed most of the enemy army.");
    if (rec.analysis.strategicScore > 70) reasons.push("✓ Your strategy was well-executed.");
    if (rec.player.strategy === "flanking_attack") reasons.push("✓ Your flanking attack overwhelmed the enemy.");
    if (rec.player.strategy === "center_breakthrough") reasons.push("✓ Your center breakthrough succeeded.");
    if (rec.player.vyuha === "garuda") reasons.push("✓ Garuda's wings encircled the enemy.");
    if (rec.player.vyuha === "padma") reasons.push("✓ Padma maintained cohesion under pressure.");
    if (playerLoss < 0.3) reasons.push("✓ You preserved most of your army.");
    if (reasons.length === 0) reasons.push("✓ Your army prevailed in the engagement.");
  } else {
    if (playerLoss > 0.6) reasons.push("✗ Your army was largely destroyed.");
    if (rec.analysis.strategicScore < 40) reasons.push("✗ Your strategy was ineffective.");
    if (rec.ai.strategy === "flanking_attack") reasons.push("✗ Enemy cavalry overwhelmed your flanks.");
    if (rec.ai.strategy === "center_breakthrough") reasons.push("✗ Enemy broke through your center.");
    if (rec.ai.vyuha === "garuda") reasons.push("✗ Enemy's wings encircled your army.");
    if (rec.ai.vyuha === "makara") reasons.push("✗ Enemy's frontal mass crushed your formation.");
    if (enemyLoss < 0.3) reasons.push("✗ Enemy preserved most of their army.");
    if (reasons.length === 0) reasons.push("✗ The enemy army prevailed in the engagement.");
  }

  return reasons.slice(0, 4);
}

export function AnalysisScreen() {
  const rec = useGame((s) => s.lastRecord);
  const go = useGame((s) => s.go);
  if (!rec) return null;
  const a = rec.analysis;
  const data = [
    { name: "You", remain: rec.survivorsPlayer, enemy: rec.survivorsAi },
  ];
  return (
    <div className="analysis">
      <h2>What the dust recorded</h2>
      <section>
        <h3>What happened</h3>
        <p>{a.whatHappened}</p>
      </section>
      <section>
        <h3>Turning point</h3>
        <p>{a.turningPoint}</p>
      </section>
      <section>
        <h3>What worked</h3>
        <p>{a.whatWorked}</p>
      </section>
      <section>
        <h3>What failed</h3>
        <p>{a.whatFailed}</p>
      </section>
      <section>
        <h3>Decisive moment</h3>
        <p>{a.decisiveMoment}</p>
      </section>
      <section>
        <h3>Why you {rec.result === "victory" ? "won" : rec.result === "draw" ? "drew" : "lost"}</h3>
        <p>{a.why}</p>
      </section>
      <section>
        <h3>What to try next</h3>
        <p>{a.next}</p>
      </section>
      <div className="chart-h">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#c9a227" />
            <YAxis stroke="#c9a227" />
            <Bar dataKey="remain" fill="#c9a227" />
            <Bar dataKey="enemy" fill="#8a3a2a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="row">
        <Bronze onClick={() => go("war_room")}>WAR ROOM</Bronze>
        <Bronze onClick={() => go("ready")}>NEXT BATTLE</Bronze>
        <Bronze onClick={() => go("history")}>HISTORY</Bronze>
      </div>
    </div>
  );
}

export function HistoryScreen() {
  const history = useGame((s) => s.history);
  const go = useGame((s) => s.go);
  const play = useGame((s) => s.playReplay);
  return (
    <div className="stage overlay-stage">
      <div className="scroll-panel">
        <h2>Battle History</h2>
        {history.length === 0 && <p>No dust yet. Fight.</p>}
        {history.map((h, i) => (
          <Glyph key={h.id} onClick={() => play(h)}>
            <strong>
              #{history.length - i} {h.result} · {VYUHA_DEFS[h.player.vyuha].name} vs {VYUHA_DEFS[h.ai.vyuha].name}
            </strong>
            <span>
              {new Date(h.startedAt).toLocaleString()} · {h.player.armySize.toLocaleString()} · {STRATEGIES[h.player.strategy].name} · {fmt(h.duration)} · score {h.score}
            </span>
          </Glyph>
        ))}
        <button className="text-btn" onClick={() => go("war_room")}>
          Back
        </button>
        <NavBar />
      </div>
    </div>
  );
}

export function ReplayScreen() {
  const rec = useGame((s) => s.replay.record);
  return (
    <div className="battle-root">
      <BattleScreen />
      {rec && (
        <div className="replay-bar">
          Replay · seed {rec.seed} · {rec.result}
          <button onClick={() => useGame.setState({ replay: { ...useGame.getState().replay, speed: 2 } })}>2x</button>
          <button onClick={() => useGame.setState({ replay: { ...useGame.getState().replay, speed: 4 } })}>4x</button>
        </div>
      )}
    </div>
  );
}

export function AchievementsScreen() {
  const ach = useGame((s) => s.achievements);
  const profile = useGame((s) => s.profile);
  return (
    <div className="stage overlay-stage">
      <div className="scroll-panel">
        <h2>Achievements</h2>
        <p>
          {profile.username} · Lv {profile.level} {titleForLevel(profile.level)}
        </p>
        {ACHIEVEMENTS.map((d) => {
          const p = ach.find((a) => a.id === d.id);
          return (
            <Glyph key={d.id} dim={!p?.unlocked}>
              <strong>
                {d.name} {p?.unlocked ? "· unlocked" : ""}
              </strong>
              <span>
                {d.description} · {Math.round((p?.progress ?? 0) * 100)}%
              </span>
            </Glyph>
          );
        })}
        <NavBar />
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const settings = useGame((s) => s.settings);
  const update = useGame((s) => s.updateSettings);
  const reset = useGame((s) => s.resetProgress);
  const go = useGame((s) => s.go);
  return (
    <div className="stage overlay-stage">
      <div className="scroll-panel">
        <h2>Settings</h2>
        {(
          [
            ["master", "Master Volume"],
            ["music", "Music"],
            ["sfx", "SFX"],
            ["ambience", "Ambience"],
            ["cameraSensitivity", "Camera Sensitivity"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="slider-row">
            {label}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings[k]}
              onChange={(e) => update({ [k]: Number(e.target.value) })}
            />
          </label>
        ))}
        <label className="slider-row">
          Graphics
          <select value={settings.graphics} onChange={(e) => update({ graphics: e.target.value as typeof settings.graphics })}>
            <option value="low">LOW</option>
            <option value="medium">MEDIUM</option>
            <option value="high">HIGH</option>
            <option value="ultra">ULTRA</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={settings.muted} onChange={(e) => update({ muted: e.target.checked })} /> Mute
        </label>
        <label>
          <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.checked })} /> Reduced motion
        </label>
        <label>
          <input type="checkbox" checked={settings.showDamage} onChange={(e) => update({ showDamage: e.target.checked })} /> Show damage
        </label>
        <label>
          <input type="checkbox" checked={settings.showEvents} onChange={(e) => update({ showEvents: e.target.checked })} /> Show battle events
        </label>
        <label>
          <input type="checkbox" checked={settings.showTutorial} onChange={(e) => update({ showTutorial: e.target.checked })} /> Show tutorial
        </label>
        <Bronze onClick={reset}>RESET PROGRESS</Bronze>
        <Bronze onClick={() => go("war_room")}>RETURN</Bronze>
        <NavBar />
      </div>
    </div>
  );
}

export function TutorialScreen() {
  const begin = useGame((s) => s.beginBattle);
  const go = useGame((s) => s.go);
  return (
    <div className="intro-root">
      <div className="intro-copy">
        <p className="kicker">Teaching field</p>
        <h2>A small war, fully real.</h2>
        <p>You shape the host. You choose a Vyuha. The enemy answers. You do not puppet every spear — you watch the geometry fight.</p>
        <p>Watch formation stability. Watch morale. A pretty formation that breaks is just a rumor.</p>
        <Bronze onClick={() => begin(true)}>BEGIN TUTORIAL BATTLE</Bronze>
        <button className="text-btn" onClick={() => go("war_room")}>
          Skip
        </button>
      </div>
    </div>
  );
}

export function WebglFallback() {
  return (
    <div className="intro-root">
      <div className="intro-copy">
        <h2>WebGL unavailable</h2>
        <p>Reduced graphics mode cannot start without a GPU canvas. Enable hardware acceleration and reload.</p>
      </div>
    </div>
  );
}

void useMemo;
void useState;
