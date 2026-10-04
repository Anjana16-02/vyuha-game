export type UnitCategory =
  | "infantry"
  | "archer"
  | "cavalry"
  | "elephant"
  | "chariot"
  | "elite";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type VyuhaId =
  | "padma"
  | "garuda"
  | "krauncha"
  | "makara"
  | "shakata"
  | "kurma"
  | "ardhachandra"
  | "chakravyuha";

export type StrategyId =
  | "frontal_assault"
  | "flanking_attack"
  | "center_breakthrough"
  | "encirclement"
  | "defensive_counterattack"
  | "targeted_strike";

export type EnvironmentId =
  | "sunlit_plains"
  | "dustfall_warland"
  | "moonlit_ruins"
  | "crimson_dusk"
  | "royal_valley"
  | "stormfront";

export type TimeOfDay = "morning" | "afternoon" | "sunset" | "night";
export type WeatherId = "clear" | "dust" | "fog" | "rain" | "storm";
export type GraphicsQuality = "low" | "medium" | "high" | "ultra";
export type ScreenId =
  | "intro"
  | "identity"
  | "war_room"
  | "commanders"
  | "warriors"
  | "armory"
  | "kingdom"
  | "army"
  | "vyuha"
  | "strategy"
  | "ready"
  | "generating"
  | "battle"
  | "results"
  | "analysis"
  | "history"
  | "replay"
  | "achievements"
  | "collection"
  | "settings"
  | "tutorial"
  | "challenges";

export type BattleEventType =
  | "ARCHER_VOLLEY"
  | "CAVALRY_CHARGE"
  | "ELEPHANT_CHARGE"
  | "FLANK_ATTACK"
  | "FORMATION_BREACH"
  | "COMMANDER_THREATENED"
  | "MAJOR_DUEL"
  | "FORMATION_COLLAPSE"
  | "MORALE_BREAK"
  | "COMMANDER_RETREAT"
  | "FINAL_PUSH"
  | "DEPLOYMENT"
  | "ADVANCE"
  | "FIRST_ENGAGEMENT"
  | "REGROUP";

export type Side = "player" | "ai";

export interface Vec2 {
  x: number;
  z: number;
}

export interface CommanderDef {
  id: string;
  name: string;
  title: string;
  archetype: string;
  leadership: number;
  attack: number;
  defense: number;
  tactics: number;
  mobility: number;
  morale: number;
  specialAbility: string;
  specialDescription: string;
  colors: [string, string, string];
  personality: string;
}

export interface WarriorDef {
  id: string;
  name: string;
  category: UnitCategory;
  rarity: Rarity;
  combatStyle: string;
  specialAbility: string;
  portraitHue: number;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  range: number;
  stamina: number;
  morale: number;
  formationRole: string;
}

export interface CosmeticItem {
  id: string;
  name: string;
  slot:
    | "helmet"
    | "armor"
    | "cloak"
    | "weapon"
    | "shield"
    | "bow"
    | "spear"
    | "sword"
    | "chariot"
    | "banner"
    | "accessory"
    | "emblem";
  rarity: Rarity;
  color: string;
  description: string;
  unlockLevel: number;
}

export interface Composition {
  infantry: number;
  archers: number;
  cavalry: number;
  elephants: number;
  chariots: number;
  elite: number;
}

export interface Loadout {
  commanderId: string;
  warriorIds: string[];
  armySize: number;
  composition: Composition;
  vyuha: VyuhaId;
  strategy: StrategyId;
  cosmetics: Record<string, string>;
}

export interface PlayerProfile {
  playerId: string;
  username: string;
  kingdomName: string;
  banner: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  totalBattles: number;
  favoriteVyuha: VyuhaId | null;
  favoriteStrategy: StrategyId | null;
  highestArmy: number;
  bestVictory: number;
  longestBattle: number;
  createdAt: number;
  updatedAt: number;
  unlockedCommanders: string[];
  unlockedWarriors: string[];
  unlockedCosmetics: string[];
  unlockedEnvironments: string[];
  equipped: Record<string, string>;
  kingdomLevel: number;
  medals: number;
  tutorialComplete: boolean;
  colorAccent: string;
}

export interface SettingsState {
  master: number;
  music: number;
  sfx: number;
  ambience: number;
  muted: boolean;
  graphics: GraphicsQuality;
  cameraSensitivity: number;
  reducedMotion: boolean;
  showDamage: boolean;
  showEvents: boolean;
  showTutorial: boolean;
}

export interface BattleEvent {
  t: number;
  type: BattleEventType;
  side: Side | "both";
  message: string;
  position: Vec2;
  intensity: number;
  actors?: string[];
}

export interface UnitGroupState {
  id: string;
  side: Side;
  category: UnitCategory;
  count: number;
  maxCount: number;
  hp: number;
  maxHp: number;
  morale: number;
  position: Vec2;
  target: Vec2;
  heading: number;
  home: Vec2;
  speed: number;
  range: number;
  attack: number;
  defense: number;
  stamina: number;
  elite: boolean;
  warriorId?: string;
  warriorName?: string;
  isCommander: boolean;
}

export interface ArmyRuntime {
  remaining: number;
  starting: number;
  morale: number;
  formationStability: number;
  commanderHp: number;
  commanderMaxHp: number;
  vyuha: VyuhaId;
  strategy: StrategyId;
  commanderId: string;
  pressure: { left: number; center: number; right: number };
}

export interface BattleSnapshot {
  t: number;
  phase: BattlePhase;
  player: ArmyRuntime;
  ai: ArmyRuntime;
  groups: UnitGroupState[];
  events: BattleEvent[];
  seed: number;
  environment: EnvironmentId;
  timeOfDay: TimeOfDay;
  weather: WeatherId;
  finished: boolean;
  winner: Side | "draw" | null;
}

export type BattlePhase =
  | "deployment"
  | "advance"
  | "engagement"
  | "intense"
  | "critical"
  | "final_push"
  | "ended";

export interface BattleRecord {
  id: string;
  seed: number;
  startedAt: number;
  duration: number;
  result: "victory" | "defeat" | "draw";
  player: Loadout;
  ai: Loadout;
  environment: EnvironmentId;
  timeOfDay: TimeOfDay;
  weather: WeatherId;
  score: number;
  survivorsPlayer: number;
  survivorsAi: number;
  analysis: BattleAnalysis;
  events: BattleEvent[];
  timeline: { t: number; label: string }[];
}

export interface BattleAnalysis {
  whatHappened: string;
  turningPoint: string;
  whatWorked: string;
  whatFailed: string;
  decisiveMoment: string;
  why: string;
  next: string;
  strategicScore: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export interface AchievementProgress {
  id: string;
  unlocked: boolean;
  progress: number;
  unlockedAt?: number;
}

export interface KingdomState {
  level: number;
  treasury: number;
  areas: Record<string, number>;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  condition: string;
  xp: number;
  completed: boolean;
}

export interface InventoryState {
  cosmetics: string[];
  banners: string[];
  medals: number;
}
