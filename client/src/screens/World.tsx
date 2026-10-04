import { COMMANDERS, titleForLevel, WARRIORS, COSMETICS, ENVIRONMENTS, VYUHA_DEFS, STRATEGIES, ACHIEVEMENTS, ARMY_SIZES, KINGDOM_AREAS } from "../../../shared/constants";
import { Bronze, Frame, Glyph, NavBar } from "../components/ui";
import { FormationPreview, KingdomCanvas, PreviewCanvas, WarRoomCanvas } from "../game/environments/WorldScenes";
import { useGame } from "../state/gameStore";
import type { StrategyId, UnitCategory, VyuhaId } from "../../../shared/types";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function WarRoomScreen() {
  const profile = useGame((s) => s.profile);
  const go = useGame((s) => s.go);
  const comm = COMMANDERS.find((c) => c.id === useGame((s) => s.loadout.commanderId));
  return (
    <div className="stage">
      <div className="stage-world">
        <WarRoomCanvas />
      </div>
      <header className="hud-top">
        <div>
          <p className="kicker">{profile.kingdomName}</p>
          <h1>{profile.username}</h1>
          <p>
            Lv {profile.level} {titleForLevel(profile.level)} · {profile.wins} victories
          </p>
        </div>
        <Bronze onClick={() => go("ready")}>TO BATTLE</Bronze>
      </header>
      <div className="war-picks">
        <Glyph onClick={() => go("commanders")}>
          <strong>{comm?.title}</strong>
          <span>Commander</span>
        </Glyph>
        <Glyph onClick={() => go("army")}>
          <strong>Host</strong>
          <span>Shape the numbers</span>
        </Glyph>
        <Glyph onClick={() => go("vyuha")}>
          <strong>Vyuha</strong>
          <span>Write the geometry</span>
        </Glyph>
        <Glyph onClick={() => go("kingdom")}>
          <strong>Kingdom</strong>
          <span>The hold grows</span>
        </Glyph>
      </div>
      <NavBar />
    </div>
  );
}

export function CommandersScreen() {
  const loadout = useGame((s) => s.loadout);
  const setLoadout = useGame((s) => s.setLoadout);
  const unlocked = useGame((s) => s.profile.unlockedCommanders);
  const go = useGame((s) => s.go);
  const c = COMMANDERS.find((x) => x.id === loadout.commanderId)!;
  return (
    <div className="split-stage">
      <div className="preview-pane">
        <PreviewCanvas commanderId={c.id} />
      </div>
      <div className="list-pane">
        <p className="kicker">Roster</p>
        <h2>Commanders</h2>
        {COMMANDERS.map((cm) => {
          const lock = !unlocked.includes(cm.id);
          return (
            <Glyph key={cm.id} dim={lock} onClick={() => !lock && setLoadout({ commanderId: cm.id })}>
              <strong>{cm.title}</strong>
              <span>
                {cm.name} · ATK {cm.attack} DEF {cm.defense} TAC {cm.tactics}
              </span>
              {lock && <em>Locked</em>}
            </Glyph>
          );
        })}
        <Frame>
          <h3>{c.specialAbility}</h3>
          <p>{c.specialDescription}</p>
          <p>{c.personality}</p>
        </Frame>
        <Bronze onClick={() => go("war_room")}>RETURN</Bronze>
        <NavBar />
      </div>
    </div>
  );
}

export function WarriorsScreen() {
  const profile = useGame((s) => s.profile);
  const loadout = useGame((s) => s.loadout);
  const setLoadout = useGame((s) => s.setLoadout);
  return (
    <div className="stage overlay-stage">
      <div className="stage-world dim-world">
        <WarRoomCanvas />
      </div>
      <div className="scroll-panel">
        <h2>Warriors</h2>
        {WARRIORS.map((w) => {
          const on = loadout.warriorIds.includes(w.id);
          const lock = !profile.unlockedWarriors.includes(w.id);
          return (
            <Glyph
              key={w.id}
              dim={lock}
              onClick={() => {
                if (lock) return;
                const ids = on ? loadout.warriorIds.filter((i) => i !== w.id) : [...loadout.warriorIds, w.id];
                setLoadout({ warriorIds: ids.length ? ids : [w.id] });
              }}
            >
              <strong>
                {w.name} · {w.rarity}
              </strong>
              <span>
                {w.category} · {w.combatStyle} · {w.specialAbility}
              </span>
            </Glyph>
          );
        })}
        <NavBar />
      </div>
    </div>
  );
}

export function ArmoryScreen() {
  const profile = useGame((s) => s.profile);
  const equip = useGame((s) => s.equip);
  return (
    <div className="split-stage">
      <div className="preview-pane">
        <PreviewCanvas commanderId={useGame((s) => s.loadout.commanderId)} />
      </div>
      <div className="list-pane">
        <h2>Armory</h2>
        {COSMETICS.map((c) => {
          const lock = !profile.unlockedCosmetics.includes(c.id);
          const on = profile.equipped[c.slot] === c.id;
          return (
            <Glyph key={c.id} dim={lock} onClick={() => !lock && equip(c.slot, c.id)}>
              <strong style={{ color: c.color }}>
                {c.name} {on ? "· equipped" : ""}
              </strong>
              <span>
                {c.slot} · {c.rarity} · {c.description}
              </span>
            </Glyph>
          );
        })}
        <NavBar />
      </div>
    </div>
  );
}

export function KingdomScreen() {
  const profile = useGame((s) => s.profile);
  const title = profile.level >= 20 ? "Grand Capital" : profile.level >= 10 ? "Large Fortress" : profile.level >= 5 ? "Fortified Settlement" : "Small Fort";
  return (
    <div className="stage">
      <div className="stage-world">
        <KingdomCanvas level={profile.level} />
      </div>
      <header className="hud-top">
        <div>
          <p className="kicker">{profile.kingdomName}</p>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="war-picks">
        {KINGDOM_AREAS.map((a) => (
          <Glyph key={a}>
            <strong>{a.replace("_", " ")}</strong>
            <span>Rank {Math.min(5, Math.ceil(profile.level / 4))}</span>
          </Glyph>
        ))}
      </div>
      <NavBar />
    </div>
  );
}

export function ArmyScreen() {
  const loadout = useGame((s) => s.loadout);
  const setArmySize = useGame((s) => s.setArmySize);
  const setComposition = useGame((s) => s.setComposition);
  const go = useGame((s) => s.go);
  const data = [
    { name: "Inf", value: loadout.composition.infantry, color: "#6b5a3a" },
    { name: "Arch", value: loadout.composition.archers, color: "#3d6b4a" },
    { name: "Cav", value: loadout.composition.cavalry, color: "#8a3a2a" },
    { name: "El", value: loadout.composition.elephants, color: "#5a4a3a" },
    { name: "Ch", value: loadout.composition.chariots, color: "#8a6a2a" },
    { name: "Elite", value: loadout.composition.elite, color: "#c9a227" },
  ];
  const bump = (k: keyof typeof loadout.composition, d: number) => {
    const next = { ...loadout.composition, [k]: Math.max(0, loadout.composition[k] + d) };
    setComposition(next);
  };
  return (
    <div className="split-stage">
      <div className="preview-pane chart-pane">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={70} outerRadius={110}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <p className="center-label">{loadout.armySize.toLocaleString()} souls</p>
      </div>
      <div className="list-pane">
        <h2>Army</h2>
        <div className="row">
          {ARMY_SIZES.map((n) => (
            <Glyph key={n} onClick={() => setArmySize(n)} dim={loadout.armySize !== n}>
              {n.toLocaleString()}
            </Glyph>
          ))}
        </div>
        {(Object.keys(loadout.composition) as (keyof typeof loadout.composition)[]).map((k) => (
          <div key={k} className="slider-row">
            <span>{k}</span>
            <button onClick={() => bump(k, -100)}>-</button>
            <b>{loadout.composition[k]}</b>
            <button onClick={() => bump(k, 100)}>+</button>
          </div>
        ))}
        <Bronze onClick={() => go("vyuha")}>CHOOSE VYUHA</Bronze>
        <NavBar />
      </div>
    </div>
  );
}

export function VyuhaScreen() {
  const loadout = useGame((s) => s.loadout);
  const setLoadout = useGame((s) => s.setLoadout);
  const go = useGame((s) => s.go);
  const v = VYUHA_DEFS[loadout.vyuha];
  return (
    <div className="split-stage">
      <div className="preview-pane">
        <FormationPreview vyuha={loadout.vyuha} />
        <div className="formation-info">
          <h3>{v.name}</h3>
          <p className="formation-desc">{v.description}</p>
          <div className="formation-stats">
            <div><strong>Mobility:</strong> {v.mobility}/100</div>
            <div><strong>Defense:</strong> {v.defense}/100</div>
            <div><strong>Flanking:</strong> {v.flanking}/100</div>
            <div><strong>Stability:</strong> {v.stability}/100</div>
          </div>
        </div>
      </div>
      <div className="list-pane">
        <p className="kicker">The geometry of war</p>
        <h2>{v.name}</h2>
        <p>{v.description}</p>
        <div className="vyuha-details">
          <p><strong>Strength:</strong> {v.strength}</p>
          <p><strong>Weakness:</strong> {v.weakness}</p>
        </div>
        <div className="row wrap">
          {(Object.keys(VYUHA_DEFS) as VyuhaId[]).map((id) => (
            <Glyph key={id} dim={loadout.vyuha !== id} onClick={() => setLoadout({ vyuha: id })}>
              <strong>{VYUHA_DEFS[id].name}</strong>
              <span>{getVyuhaShape(id)}</span>
            </Glyph>
          ))}
        </div>
        <Bronze onClick={() => go("strategy")}>ATTACK STRATEGY</Bronze>
        <NavBar />
      </div>
    </div>
  );
}

function getVyuhaShape(id: string): string {
  const shapes: Record<string, string> = {
    padma: "Circular petal formation",
    garuda: "Winged formation",
    krauncha: "Piercing beak formation",
    makara: "Crocodile mass formation",
    shakata: "Cart/wedge formation",
    kurma: "Defensive shell formation",
    ardhachandra: "Half-moon formation",
    chakravyuha: "Layered spiral formation",
  };
  return shapes[id] || "";
}

export function StrategyScreen() {
  const loadout = useGame((s) => s.loadout);
  const setLoadout = useGame((s) => s.setLoadout);
  const go = useGame((s) => s.go);
  const setEnvironment = useGame((s) => s.setEnvironment);
  const env = useGame((s) => s.environment);
  const unlocked = useGame((s) => s.profile.unlockedEnvironments);
  return (
    <div className="stage overlay-stage">
      <div className="stage-world dim-world">
        <FormationPreview vyuha={loadout.vyuha} />
      </div>
      <div className="scroll-panel">
        <h2>Attack Strategy</h2>
        {(Object.keys(STRATEGIES) as StrategyId[]).map((id) => (
          <Glyph key={id} dim={loadout.strategy !== id} onClick={() => setLoadout({ strategy: id })}>
            <strong>{STRATEGIES[id].name}</strong>
            <span>{STRATEGIES[id].description}</span>
            <em className="strategy-visual">{getStrategyVisual(id)}</em>
          </Glyph>
        ))}
        <h3>Battlefield</h3>
        {(Object.keys(ENVIRONMENTS) as (keyof typeof ENVIRONMENTS)[]).map((id) => (
          <Glyph key={id} dim={!unlocked.includes(id)} onClick={() => unlocked.includes(id) && setEnvironment(id)}>
            <strong>
              {ENVIRONMENTS[id].name}
              {env === id ? " · selected" : ""}
            </strong>
            <span>{ENVIRONMENTS[id].description}</span>
          </Glyph>
        ))}
        <Bronze onClick={() => go("ready")}>READY THE HOST</Bronze>
        <NavBar />
      </div>
    </div>
  );
}

function getStrategyVisual(id: string): string {
  const visuals: Record<string, string> = {
    frontal_assault: "→→→ Direct forward pressure",
    flanking_attack: "↗ ↘ Attack from sides",
    center_breakthrough: "⬆ Concentrate on center",
    encirclement: "↺ Surround enemy",
    defensive_counterattack: "⊝ Hold then counter",
    targeted_strike: "⚡ Focus on commander",
  };
  return visuals[id] || "";
}

export function ReadyScreen() {
  const loadout = useGame((s) => s.loadout);
  const env = useGame((s) => s.environment);
  const generateAi = useGame((s) => s.generateAi);
  const go = useGame((s) => s.go);
  const c = COMMANDERS.find((x) => x.id === loadout.commanderId)!;
  const v = VYUHA_DEFS[loadout.vyuha];
  const s = STRATEGIES[loadout.strategy];
  return (
    <div className="stage overlay-stage">
      <div className="stage-world">
        <FormationPreview vyuha={loadout.vyuha} />
      </div>
      <div className="ready-card">
        <p className="kicker">The hour is chosen</p>
        <h1>STAND TO</h1>
        <div className="battle-plan">
          <section>
            <h3>YOUR ARMY</h3>
            <p><strong>Commander:</strong> {c.title} — {c.name}</p>
            <p><strong>Vyuha:</strong> {v.name}</p>
            <p><strong>Attack:</strong> {s.name}</p>
            <p><strong>Size:</strong> {loadout.armySize.toLocaleString()} souls</p>
          </section>
          <section>
            <h3>COMPOSITION</h3>
            <p>Infantry: {loadout.composition.infantry.toLocaleString()}</p>
            <p>Archers: {loadout.composition.archers.toLocaleString()}</p>
            <p>Cavalry: {loadout.composition.cavalry.toLocaleString()}</p>
            <p>Elephants: {loadout.composition.elephants.toLocaleString()}</p>
            <p>Chariots: {loadout.composition.chariots.toLocaleString()}</p>
            <p>Elite: {loadout.composition.elite.toLocaleString()}</p>
          </section>
          <section>
            <h3>YOUR PLAN</h3>
            <p><strong>{v.name} + {s.name}</strong></p>
            <p className="plan-desc">{getPlanDescription(loadout.vyuha, loadout.strategy)}</p>
          </section>
          <section>
            <h3>STRENGTHS</h3>
            <p>{v.strength}</p>
          </section>
          <section>
            <h3>WEAKNESSES</h3>
            <p>{v.weakness}</p>
          </section>
          <section>
            <h3>HOW TO WIN</h3>
            <p>Destroy the enemy army, break their morale, or cause their formation to collapse. Protect your own commander and maintain formation stability.</p>
          </section>
        </div>
        <Bronze onClick={generateAi}>GENERATE OPPOSITION</Bronze>
        <button className="text-btn" onClick={() => go("tutorial")}>
          First teaching battle
        </button>
      </div>
      <NavBar />
    </div>
  );
}

function getPlanDescription(vyuha: string, strategy: string): string {
  const combos: Record<string, string> = {
    "padma-frontal_assault": "Your layered formation will advance steadily, absorbing pressure while maintaining cohesion.",
    "padma-flanking_attack": "Protect the center while mobile units attempt to attack enemy flanks.",
    "garuda-flanking_attack": "Your winged formation will extend to envelop the enemy from both sides.",
    "garuda-frontal_assault": "Press forward with both wings to overwhelm the enemy.",
    "krauncha-center_breakthrough": "Your piercing formation will concentrate force to break through the enemy center.",
    "makara-frontal_assault": "Your heavy frontal mass will crush through enemy resistance.",
    "kurma-defensive_counterattack": "Your defensive shell will absorb the attack, then counterstrike.",
    "ardhachandra-encirclement": "Your crescent formation will stretch wide to encircle the enemy.",
    "chakravyuha-targeted_strike": "Your layered spiral will trap and attrit enemy units.",
  };
  return combos[`${vyuha}-${strategy}`] || `${STRATEGIES[strategy as keyof typeof STRATEGIES].description} with ${VYUHA_DEFS[vyuha as keyof typeof VYUHA_DEFS].name}.`;
}

export function CollectionScreen() {
  return (
    <div className="stage overlay-stage">
      <div className="scroll-panel">
        <h2>Collection</h2>
        <h3>Vyuhas</h3>
        {Object.values(VYUHA_DEFS).map((v) => (
          <p key={v.name}>{v.name} — {v.description}</p>
        ))}
        <NavBar />
      </div>
    </div>
  );
}

export function ChallengesScreen() {
  const daily = useGame((s) => s.daily);
  return (
    <div className="stage overlay-stage">
      <div className="scroll-panel">
        <h2>Daily Challenges</h2>
        {daily.map((d) => (
          <Glyph key={d.id} dim={!d.completed}>
            <strong>
              {d.title} {d.completed ? "· done" : ""}
            </strong>
            <span>
              {d.description} · {d.xp} XP
            </span>
          </Glyph>
        ))}
        <NavBar />
      </div>
    </div>
  );
}

