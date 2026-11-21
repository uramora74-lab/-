export type CivId = 'rome' | 'rus' | 'vikings' | 'china' | 'ottoman' | 'germany' | 'japan';

export type Difficulty = 'novice' | 'strategist' | 'emperor';

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type ViewMode = 'city' | 'world';

export type ResourceKey = 'food' | 'wood' | 'stone' | 'gold';

export interface Resources {
  food: number;
  wood: number;
  stone: number;
  gold: number;
}

export type BuildingId =
  | 'cityHall'
  | 'farm'
  | 'lumber'
  | 'quarry'
  | 'barracks'
  | 'academy'
  | 'hospital'
  | 'wall';

export type TroopType = 'infantry' | 'archers' | 'cavalry';

export interface Troops {
  infantry: number;
  archers: number;
  cavalry: number;
}

export type TechId = 'metallurgy' | 'fortification' | 'logistics' | 'agronomy';

export interface CivConfig {
  id: CivId;
  name: string;
  shortName: string;
  uniqueUnit: string;
  commanderId: string;
  commanderName: string;
  commanderTitle: string;
  skillName: string;
  skillDesc: string;
  bonusTitle: string;
  bonusDesc: string;
  color: string;
  roofColor: string;
  bannerBg: string;
  accentStroke: string;
  buildSpeedMult: number;
  gatherSpeedMult: number;
  trainSpeedMult: number;
  marchSpeedMult: number;
  scoutSpeedMult: number;
  apRegenMult: number;
  attackMult: number;
  defenseMult: number;
  cavalryAtkMult: number;
  barbarianLootMult: number;
  rageGainMult: number;
}

export interface CommanderProfile {
  id: string;
  name: string;
  title: string;
  specialty: 'combat' | 'gather' | 'cavalry' | 'defense';
  skillName: string;
  skillDesc: string;
  attackBonus: number;
  gatherBonus: number;
  speedBonus: number;
  healOnSkill: boolean;
  level: number;
  xp: number;
  xpToNext: number;
  unlocked: boolean;
  accentColor: string;
}

export interface BuildingState {
  id: BuildingId;
  level: number;
  maxLevel: number;
  upgrading: boolean;
  upgradeTimeLeft: number;
  upgradeTotalTime: number;
  helpRequested: boolean;
}

export interface TrainingJob {
  troopType: TroopType;
  count: number;
  timeLeft: number;
  totalTime: number;
  helpRequested: boolean;
}

export interface ResearchJob {
  techId: TechId;
  timeLeft: number;
  totalTime: number;
  helpRequested: boolean;
}

export type WorldEntityKind =
  | 'playerCity'
  | 'resourceNode'
  | 'barbarian'
  | 'village'
  | 'shrine'
  | 'rivalCity'
  | 'lostTemple';

export interface WorldEntity {
  id: string;
  kind: WorldEntityKind;
  name: string;
  x: number;
  y: number;
  level: number;
  owner: 'player' | 'neutral' | 'barbarian' | 'rival';
  civId?: CivId;
  resourceType?: ResourceKey;
  resourceRemaining?: number;
  resourceMax?: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  shrineBuff?: 'attack' | 'gather' | 'speed';
  defeated?: boolean;
  visited?: boolean;
  respawnTimer?: number;
}

export type MarchStatus = 'marching' | 'gathering' | 'fighting' | 'returning' | 'scouting';

export interface ArmyMarch {
  id: string;
  owner: 'player' | 'barbarian' | 'rival';
  isScout?: boolean;
  isRally?: boolean;
  commanderId: string;
  commanderName: string;
  civId?: CivId;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetId: string;
  targetX: number;
  targetY: number;
  targetName: string;
  status: MarchStatus;
  troops: Troops;
  alliedBonusTroops: number;
  hp: number;
  maxHp: number;
  rage: number;
  skillFlashTimer: number;
  hitFlashTimer: number;
  cargo: Resources;
  gatherAccum: number;
  speed: number;
  attackTimer: number;
}

export interface FloatingEffect {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  ttl: number;
  maxTtl: number;
}

export interface WorldEventLog {
  id: string;
  timeSec: number;
  message: string;
  kind: 'combat' | 'gather' | 'city' | 'skill' | 'alert';
}

export interface ChapterQuest {
  id: string;
  chapter: number;
  title: string;
  rewardDesc: string;
  rewardResources: Partial<Resources>;
  rewardSpeedups?: number;
  rewardKeys?: number;
}

export interface RunSnapshot {
  outcome: 'victory' | 'defeat';
  reason: string;
  civId: CivId;
  power: number;
  cityHallLevel: number;
  commanderLevel: number;
  barbariansDefeated: number;
  fogExploredPct: number;
  elapsedSec: number;
  difficulty: Difficulty;
}

export interface RokGameState {
  seed: number;
  elapsedSec: number;
  difficulty: Difficulty;
  civId: CivId;
  resources: Resources;
  actionPoints: number;
  maxActionPoints: number;
  speedups: number;
  goldenKeys: number;
  buildings: Record<BuildingId, BuildingState>;
  garrison: Troops;
  wounded: Troops;
  trainingQueue: TrainingJob | null;
  techLevels: Record<TechId, number>;
  researchQueue: ResearchJob | null;
  commanders: CommanderProfile[];
  wallHp: number;
  wallMaxHp: number;
  fogCols: number;
  fogRows: number;
  fogRevealed: boolean[];
  entities: Record<string, WorldEntity>;
  entityOrder: string[];
  marches: ArmyMarch[];
  effects: FloatingEffect[];
  logs: WorldEventLog[];
  barbariansDefeated: number;
  villagesVisited: number;
  shrinesCaptured: number;
  resourcesGatheredCount: number;
  questIndex: number;
  nextRaidTimer: number;
  raidCount: number;
  outcome: 'ongoing' | 'victory' | 'defeat';
  outcomeReason: string;
}
