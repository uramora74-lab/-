import {
  ALLIANCE_HELP_SECONDS,
  BARBARIAN_AP_COST,
  BUILDING_META,
  BUILDING_ORDER,
  CHAPTER_QUESTS,
  CIV_ORDER,
  CIVILIZATIONS,
  createInitialCommanders,
  FOG_COLS,
  FOG_ROWS,
  RALLY_ALLIED_TROOPS,
  SPEEDUP_SECONDS,
  TECH_META,
  TROOP_META,
  VICTORY_HALL_GOAL,
  VICTORY_POWER_GOAL,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './civilizations';
import type {
  ArmyMarch,
  BuildingId,
  BuildingState,
  CivId,
  CommanderProfile,
  Difficulty,
  FloatingEffect,
  Resources,
  RokGameState,
  RunSnapshot,
  TechId,
  Troops,
  TroopType,
  WorldEntity,
  WorldEventLog,
} from './types';

export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function totalTroops(t: Troops): number {
  return t.infantry + t.archers + t.cavalry;
}

export function canAfford(res: Resources, cost: Resources): boolean {
  return (
    res.food >= cost.food &&
    res.wood >= cost.wood &&
    res.stone >= cost.stone &&
    res.gold >= cost.gold
  );
}

export function subtractResources(res: Resources, cost: Resources): Resources {
  return {
    food: Math.max(0, res.food - cost.food),
    wood: Math.max(0, res.wood - cost.wood),
    stone: Math.max(0, res.stone - cost.stone),
    gold: Math.max(0, res.gold - cost.gold),
  };
}

export function addResources(res: Resources, gain: Partial<Resources>): Resources {
  return {
    food: res.food + (gain.food ?? 0),
    wood: res.wood + (gain.wood ?? 0),
    stone: res.stone + (gain.stone ?? 0),
    gold: res.gold + (gain.gold ?? 0),
  };
}

export function revealFogAround(
  fog: boolean[],
  worldX: number,
  worldY: number,
  radiusWorld = 240
): boolean[] {
  const cellW = WORLD_WIDTH / FOG_COLS;
  const cellH = WORLD_HEIGHT / FOG_ROWS;
  let changed = false;
  const next = fog.slice();

  for (let r = 0; r < FOG_ROWS; r++) {
    for (let c = 0; c < FOG_COLS; c++) {
      const idx = r * FOG_COLS + c;
      if (next[idx]) continue;
      const cx = (c + 0.5) * cellW;
      const cy = (r + 0.5) * cellH;
      if (Math.hypot(cx - worldX, cy - worldY) <= radiusWorld) {
        next[idx] = true;
        changed = true;
      }
    }
  }
  return changed ? next : fog;
}

export function isPointRevealed(state: RokGameState, x: number, y: number): boolean {
  const col = Math.max(0, Math.min(state.fogCols - 1, Math.floor((x / WORLD_WIDTH) * state.fogCols)));
  const row = Math.max(0, Math.min(state.fogRows - 1, Math.floor((y / WORLD_HEIGHT) * state.fogRows)));
  return state.fogRevealed[row * state.fogCols + col] === true;
}

export function getFogExploredPct(state: RokGameState): number {
  let count = 0;
  for (const r of state.fogRevealed) if (r) count++;
  return Math.round((count / Math.max(1, state.fogRevealed.length)) * 100);
}

export function getUpgradeCost(buildingId: BuildingId, currentLevel: number): Resources {
  const base = BUILDING_META[buildingId].baseCost;
  const mult = Math.pow(1.48, currentLevel - 1);
  return {
    food: Math.round(base.food * mult),
    wood: Math.round(base.wood * mult),
    stone: Math.round(base.stone * mult),
    gold: Math.round(base.gold * mult),
  };
}

export function getUpgradeDurationSec(state: RokGameState, buildingId: BuildingId): number {
  const b = state.buildings[buildingId];
  const base = BUILDING_META[buildingId].baseTimeSec;
  const civMult = CIVILIZATIONS[state.civId].buildSpeedMult;
  return Math.max(2, Number(((base * (1 + (b.level - 1) * 0.45)) / civMult).toFixed(1)));
}

export function getTechCost(techId: TechId, currentLevel: number): Resources {
  const base = TECH_META[techId].baseCost;
  const mult = Math.pow(1.65, currentLevel);
  return {
    food: Math.round(base.food * mult),
    wood: Math.round(base.wood * mult),
    stone: Math.round(base.stone * mult),
    gold: Math.round(base.gold * mult),
  };
}

export function getMaxMarches(state: RokGameState): number {
  const hallLv = state.buildings.cityHall.level;
  if (hallLv >= 4) return 3;
  if (hallLv >= 2) return 2;
  return 1;
}

export function getPrimaryCommander(state: RokGameState): CommanderProfile {
  return state.commanders[0];
}

export function getCommanderById(state: RokGameState, id?: string): CommanderProfile {
  return state.commanders.find((c) => c.id === id && c.unlocked) ?? state.commanders[0];
}

export function getMarchCapacity(state: RokGameState, commanderId?: string): number {
  const hallLv = state.buildings.cityHall.level;
  const cmd = getCommanderById(state, commanderId);
  return 75 + hallLv * 35 + (cmd.level - 1) * 20;
}

export function getProductionRatesPerSec(state: RokGameState): Resources {
  const agroBonus = 1 + state.techLevels.agronomy * 0.22;
  const civGather = CIVILIZATIONS[state.civId].gatherSpeedMult;
  return {
    food: Number(((2.8 + state.buildings.farm.level * 2.2) * agroBonus * civGather).toFixed(2)),
    wood: Number(((2.8 + state.buildings.lumber.level * 2.2) * agroBonus * civGather).toFixed(2)),
    stone: Number(((1.7 + state.buildings.quarry.level * 1.5) * agroBonus * civGather).toFixed(2)),
    gold: Number(((0.7 + state.buildings.cityHall.level * 0.55) * agroBonus).toFixed(2)),
  };
}

export function calculatePower(state: RokGameState): number {
  let power = 0;
  for (const id of BUILDING_ORDER) {
    const lv = state.buildings[id].level;
    power += id === 'cityHall' ? lv * 650 : lv * 230;
  }
  const allTroops: Troops = { ...state.garrison };
  for (const m of state.marches) {
    if (m.owner === 'player' && !m.isScout) {
      allTroops.infantry += m.troops.infantry;
      allTroops.archers += m.troops.archers;
      allTroops.cavalry += m.troops.cavalry;
    }
  }
  power += allTroops.infantry * 14 + allTroops.archers * 15 + allTroops.cavalry * 16;
  for (const cmd of state.commanders) {
    if (cmd.unlocked) power += 250 + (cmd.level - 1) * 400;
  }
  power +=
    (state.techLevels.metallurgy +
      state.techLevels.fortification +
      state.techLevels.logistics +
      state.techLevels.agronomy) *
    380;
  power += state.shrinesCaptured * 750;
  return Math.round(power);
}

export function isCurrentQuestComplete(state: RokGameState): boolean {
  const q = CHAPTER_QUESTS[state.questIndex];
  if (!q) return false;
  switch (q.id) {
    case 'q-hall-2':
      return state.buildings.cityHall.level >= 2;
    case 'q-barb-1':
      return state.barbariansDefeated >= 1;
    case 'q-scout':
      return getFogExploredPct(state) >= 35 || state.villagesVisited >= 1;
    case 'q-tech':
      return (
        state.techLevels.metallurgy +
          state.techLevels.fortification +
          state.techLevels.logistics +
          state.techLevels.agronomy >=
        1
      );
    case 'q-shrine':
      return state.shrinesCaptured >= 1;
    case 'q-temple':
      return state.entities['lost-temple']?.owner === 'player';
    default:
      return false;
  }
}

function appendLog(
  logs: WorldEventLog[],
  elapsedSec: number,
  kind: WorldEventLog['kind'],
  message: string
): WorldEventLog[] {
  const entry: WorldEventLog = {
    id: `log-${Math.round(elapsedSec * 100)}-${logs.length + 1}`,
    timeSec: Math.floor(elapsedSec),
    kind,
    message,
  };
  return [entry, ...logs].slice(0, 24);
}

export function createInitialRokState(
  civId: CivId,
  difficulty: Difficulty = 'strategist',
  seed = 7731
): RokGameState {
  const rng = createRng(seed);
  const civ = CIVILIZATIONS[civId];

  const buildings = {} as Record<BuildingId, BuildingState>;
  for (const id of BUILDING_ORDER) {
    buildings[id] = {
      id,
      level: 1,
      maxLevel: 5,
      upgrading: false,
      upgradeTimeLeft: 0,
      upgradeTotalTime: 0,
      helpRequested: false,
    };
  }

  const entities: Record<string, WorldEntity> = {};
  const entityOrder: string[] = [];

  const registerEntity = (e: WorldEntity) => {
    entities[e.id] = e;
    entityOrder.push(e.id);
  };

  // Player city in safe western kingdom valley
  const playerX = 360;
  const playerY = 520;
  registerEntity({
    id: 'player-city',
    kind: 'playerCity',
    name: `Місто ${civ.shortName}`,
    x: playerX,
    y: playerY,
    level: 1,
    owner: 'player',
    civId,
    hp: 1000,
    maxHp: 1000,
    attack: 18,
    defense: 20,
  });

  // Central Lost Temple — grand Rise of Kingdoms objective!
  const diffMult = difficulty === 'emperor' ? 1.25 : difficulty === 'novice' ? 0.78 : 1.0;
  registerEntity({
    id: 'lost-temple',
    kind: 'lostTemple',
    name: 'Загублений Храм',
    x: 980,
    y: 495,
    level: 5,
    owner: 'neutral',
    hp: Math.round(2500 * diffMult),
    maxHp: Math.round(2500 * diffMult),
    attack: Math.round(54 * diffMult),
    defense: Math.round(36 * diffMult),
  });

  // 2 Capturable Shrines
  registerEntity({
    id: 'shrine-war',
    kind: 'shrine',
    name: 'Святиня Війни',
    x: 700,
    y: 250,
    level: 3,
    owner: 'neutral',
    hp: Math.round(920 * diffMult),
    maxHp: Math.round(920 * diffMult),
    attack: Math.round(24 * diffMult),
    defense: Math.round(18 * diffMult),
    shrineBuff: 'attack',
  });
  registerEntity({
    id: 'shrine-harvest',
    kind: 'shrine',
    name: 'Святиня Врожаю',
    x: 710,
    y: 775,
    level: 3,
    owner: 'neutral',
    hp: Math.round(860 * diffMult),
    maxHp: Math.round(860 * diffMult),
    attack: Math.round(22 * diffMult),
    defense: Math.round(16 * diffMult),
    shrineBuff: 'gather',
  });

  // All 6 other Civilizations represented as Rival Fortresses across the 7-nation kingdom!
  const otherCivs = CIV_ORDER.filter((id) => id !== civId);
  const rivalSpots = [
    { x: 520, y: 145, lv: 2 },
    { x: 1040, y: 155, lv: 2 },
    { x: 1380, y: 235, lv: 3 },
    { x: 1410, y: 540, lv: 3 },
    { x: 1350, y: 820, lv: 3 },
    { x: 515, y: 865, lv: 2 },
  ];
  otherCivs.forEach((otherId, idx) => {
    const rCiv = CIVILIZATIONS[otherId];
    const spot = rivalSpots[idx];
    registerEntity({
      id: `rival-${otherId}`,
      kind: 'rivalCity',
      name: `Фортеця ${rCiv.shortName}`,
      x: spot.x,
      y: spot.y,
      level: spot.lv,
      owner: 'rival',
      civId: otherId,
      hp: Math.round((850 + spot.lv * 310) * diffMult),
      maxHp: Math.round((850 + spot.lv * 310) * diffMult),
      attack: Math.round((20 + spot.lv * 7) * diffMult),
      defense: Math.round((16 + spot.lv * 5) * diffMult),
    });
  });

  // 4 Tribal Villages (RoK Fog-of-War exploration gifts!)
  const villageSpots = [
    { name: 'Село Світанку', x: 585, y: 315 },
    { name: 'Село Старійшин', x: 245, y: 815 },
    { name: 'Село Купців', x: 960, y: 300 },
    { name: 'Село Мудреців', x: 1185, y: 765 },
  ];
  villageSpots.forEach((v, idx) => {
    registerEntity({
      id: `village-${idx + 1}`,
      kind: 'village',
      name: v.name,
      x: v.x,
      y: v.y,
      level: 1,
      owner: 'neutral',
      hp: 100,
      maxHp: 100,
      attack: 0,
      defense: 0,
      visited: false,
    });
  });

  // Resource Nodes
  const nodeConfigs: Array<{ res: keyof Resources; name: string; x: number; y: number; lv: number }> = [
    { res: 'food', name: 'Пшеничне поле', x: 210, y: 410, lv: 1 },
    { res: 'wood', name: 'Сосновий бір', x: 230, y: 655, lv: 1 },
    { res: 'stone', name: 'Кам’яний кар’єр', x: 525, y: 635, lv: 2 },
    { res: 'gold', name: 'Золота жила', x: 555, y: 410, lv: 2 },
    { res: 'food', name: 'Родючі луки', x: 840, y: 640, lv: 3 },
    { res: 'wood', name: 'Древня діброва', x: 855, y: 365, lv: 3 },
    { res: 'stone', name: 'Мармурові скелі', x: 1140, y: 315, lv: 3 },
    { res: 'gold', name: 'Королівська копальня', x: 1165, y: 650, lv: 4 },
  ];
  nodeConfigs.forEach((n, idx) => {
    const amount = 180 + n.lv * 115;
    registerEntity({
      id: `node-${idx + 1}`,
      kind: 'resourceNode',
      name: `${n.name} Рів.${n.lv}`,
      x: n.x,
      y: n.y,
      level: n.lv,
      owner: 'neutral',
      resourceType: n.res,
      resourceRemaining: amount,
      resourceMax: amount,
      hp: 100,
      maxHp: 100,
      attack: 0,
      defense: 0,
    });
  });

  // Barbarian Camps
  const barbSpots = [
    { x: 475, y: 445, lv: 1 },
    { x: 385, y: 715, lv: 1 },
    { x: 340, y: 285, lv: 2 },
    { x: 645, y: 515, lv: 2 },
    { x: 865, y: 185, lv: 3 },
    { x: 1045, y: 805, lv: 3 },
    { x: 1215, y: 495, lv: 4 },
  ];
  barbSpots.forEach((b, idx) => {
    const jitterX = Math.round((rng() - 0.5) * 16);
    const jitterY = Math.round((rng() - 0.5) * 16);
    const hp = Math.round((240 + b.lv * 210) * diffMult);
    registerEntity({
      id: `barb-${idx + 1}`,
      kind: 'barbarian',
      name: `Табір варварів Рів.${b.lv}`,
      x: Math.max(100, Math.min(WORLD_WIDTH - 100, b.x + jitterX)),
      y: Math.max(100, Math.min(WORLD_HEIGHT - 100, b.y + jitterY)),
      level: b.lv,
      owner: 'barbarian',
      hp,
      maxHp: hp,
      attack: Math.round((8 + b.lv * 6) * diffMult),
      defense: Math.round((5 + b.lv * 4) * diffMult),
    });
  });

  // Initialize Fog of War (reveal generous home province around player city!)
  let fogRevealed = new Array<boolean>(FOG_COLS * FOG_ROWS).fill(false);
  fogRevealed = revealFogAround(fogRevealed, playerX, playerY, 330);

  const initialWallHp = 1000;
  const firstRaidSec = difficulty === 'emperor' ? 70 : difficulty === 'novice' ? 125 : 95;

  return {
    seed,
    elapsedSec: 0,
    difficulty,
    civId,
    resources: { food: 380, wood: 380, stone: 230, gold: 140 },
    actionPoints: 500,
    maxActionPoints: 500,
    speedups: 3,
    goldenKeys: 1,
    buildings,
    garrison: { infantry: 45, archers: 30, cavalry: 25 },
    wounded: { infantry: 0, archers: 0, cavalry: 0 },
    trainingQueue: null,
    techLevels: { metallurgy: 0, fortification: 0, logistics: 0, agronomy: 0 },
    researchQueue: null,
    commanders: createInitialCommanders(civId),
    wallHp: initialWallHp,
    wallMaxHp: initialWallHp,
    fogCols: FOG_COLS,
    fogRows: FOG_ROWS,
    fogRevealed,
    entities,
    entityOrder,
    marches: [],
    effects: [],
    logs: [
      {
        id: 'init-1',
        timeSec: 0,
        kind: 'city',
        message: `Вітаємо, правителю ${civ.name}! Виконуйте Завдання глави, розвідуйте туман та готуйте армію до Загубленого Храму.`,
      },
    ],
    barbariansDefeated: 0,
    villagesVisited: 0,
    shrinesCaptured: 0,
    resourcesGatheredCount: 0,
    questIndex: 0,
    nextRaidTimer: firstRaidSec,
    raidCount: 0,
    outcome: 'ongoing',
    outcomeReason: '',
  };
}

export function startBuildingUpgrade(state: RokGameState, buildingId: BuildingId): RokGameState {
  if (state.outcome !== 'ongoing') return state;
  const b = state.buildings[buildingId];
  if (!b || b.upgrading || b.level >= b.maxLevel) return state;
  if (buildingId !== 'cityHall' && b.level >= state.buildings.cityHall.level) return state;
  if (BUILDING_ORDER.some((id) => state.buildings[id].upgrading)) return state;

  const cost = getUpgradeCost(buildingId, b.level);
  if (!canAfford(state.resources, cost)) return state;

  const duration = getUpgradeDurationSec(state, buildingId);
  return {
    ...state,
    resources: subtractResources(state.resources, cost),
    buildings: {
      ...state.buildings,
      [buildingId]: {
        ...b,
        upgrading: true,
        upgradeTimeLeft: duration,
        upgradeTotalTime: duration,
        helpRequested: false,
      },
    },
    logs: appendLog(
      state.logs,
      state.elapsedSec,
      'city',
      `Почато покращення: ${BUILDING_META[buildingId].name} → Рів.${b.level + 1} (${duration}с).`
    ),
  };
}

export function startTrainTroops(
  state: RokGameState,
  troopType: TroopType,
  batchMultiplier = 1
): RokGameState {
  if (state.outcome !== 'ongoing' || state.trainingQueue !== null) return state;
  const count = 10 * Math.max(1, batchMultiplier);
  const meta = TROOP_META[troopType];
  const cost: Resources = {
    food: meta.costPer10.food * batchMultiplier,
    wood: meta.costPer10.wood * batchMultiplier,
    stone: meta.costPer10.stone * batchMultiplier,
    gold: meta.costPer10.gold * batchMultiplier,
  };
  if (!canAfford(state.resources, cost)) return state;

  const barracksSpeed = 1 + (state.buildings.barracks.level - 1) * 0.16;
  const civSpeed = CIVILIZATIONS[state.civId].trainSpeedMult;
  const duration = Math.max(
    2,
    Number(((meta.trainTimePer10Sec * batchMultiplier) / (barracksSpeed * civSpeed)).toFixed(1))
  );

  return {
    ...state,
    resources: subtractResources(state.resources, cost),
    trainingQueue: {
      troopType,
      count,
      timeLeft: duration,
      totalTime: duration,
      helpRequested: false,
    },
    logs: appendLog(
      state.logs,
      state.elapsedSec,
      'city',
      `Казарми тренують +${count} ${meta.name.toLowerCase()} (${duration}с).`
    ),
  };
}

export function startResearchTech(state: RokGameState, techId: TechId): RokGameState {
  if (state.outcome !== 'ongoing' || state.researchQueue !== null) return state;
  const currentLv = state.techLevels[techId];
  const meta = TECH_META[techId];
  if (currentLv >= meta.maxLevel || currentLv >= state.buildings.academy.level) return state;

  const cost = getTechCost(techId, currentLv);
  if (!canAfford(state.resources, cost)) return state;

  const academySpeed = 1 + (state.buildings.academy.level - 1) * 0.15;
  const duration = Math.max(
    2.5,
    Number(((meta.baseTimeSec * (1 + currentLv * 0.5)) / academySpeed).toFixed(1))
  );

  return {
    ...state,
    resources: subtractResources(state.resources, cost),
    researchQueue: {
      techId,
      timeLeft: duration,
      totalTime: duration,
      helpRequested: false,
    },
    logs: appendLog(
      state.logs,
      state.elapsedSec,
      'city',
      `Академія досліджує «${meta.name}» Рів.${currentLv + 1} (${duration}с).`
    ),
  };
}

export function useSpeedup(
  state: RokGameState,
  target: 'building' | 'training' | 'research'
): RokGameState {
  if (state.outcome !== 'ongoing' || state.speedups <= 0) return state;

  if (target === 'building') {
    const activeId = BUILDING_ORDER.find((id) => state.buildings[id].upgrading);
    if (!activeId) return state;
    const b = state.buildings[activeId];
    return {
      ...state,
      speedups: state.speedups - 1,
      buildings: {
        ...state.buildings,
        [activeId]: { ...b, upgradeTimeLeft: Math.max(0.05, b.upgradeTimeLeft - SPEEDUP_SECONDS) },
      },
    };
  }
  if (target === 'training' && state.trainingQueue) {
    return {
      ...state,
      speedups: state.speedups - 1,
      trainingQueue: {
        ...state.trainingQueue,
        timeLeft: Math.max(0.05, state.trainingQueue.timeLeft - SPEEDUP_SECONDS),
      },
    };
  }
  if (target === 'research' && state.researchQueue) {
    return {
      ...state,
      speedups: state.speedups - 1,
      researchQueue: {
        ...state.researchQueue,
        timeLeft: Math.max(0.05, state.researchQueue.timeLeft - SPEEDUP_SECONDS),
      },
    };
  }
  return state;
}

export function requestAllianceHelp(
  state: RokGameState,
  target: 'building' | 'training' | 'research'
): RokGameState {
  if (state.outcome !== 'ongoing') return state;

  if (target === 'building') {
    const activeId = BUILDING_ORDER.find((id) => state.buildings[id].upgrading);
    if (!activeId) return state;
    const b = state.buildings[activeId];
    if (b.helpRequested) return state;
    return {
      ...state,
      buildings: {
        ...state.buildings,
        [activeId]: {
          ...b,
          helpRequested: true,
          upgradeTimeLeft: Math.max(0.1, b.upgradeTimeLeft - ALLIANCE_HELP_SECONDS),
        },
      },
      logs: appendLog(
        state.logs,
        state.elapsedSec,
        'city',
        `Союзники альянсу допомогли з будівництвом (-${ALLIANCE_HELP_SECONDS}с)!`
      ),
    };
  }

  if (target === 'training' && state.trainingQueue && !state.trainingQueue.helpRequested) {
    return {
      ...state,
      trainingQueue: {
        ...state.trainingQueue,
        helpRequested: true,
        timeLeft: Math.max(0.1, state.trainingQueue.timeLeft - ALLIANCE_HELP_SECONDS),
      },
      logs: appendLog(
        state.logs,
        state.elapsedSec,
        'city',
        `Союзники альянсу прискорили тренування (-${ALLIANCE_HELP_SECONDS}с)!`
      ),
    };
  }

  if (target === 'research' && state.researchQueue && !state.researchQueue.helpRequested) {
    return {
      ...state,
      researchQueue: {
        ...state.researchQueue,
        helpRequested: true,
        timeLeft: Math.max(0.1, state.researchQueue.timeLeft - ALLIANCE_HELP_SECONDS),
      },
      logs: appendLog(
        state.logs,
        state.elapsedSec,
        'city',
        `Союзники альянсу допомогли в Академії (-${ALLIANCE_HELP_SECONDS}с)!`
      ),
    };
  }
  return state;
}

export function healWounded(state: RokGameState): RokGameState {
  if (state.outcome !== 'ongoing') return state;
  const count = totalTroops(state.wounded);
  if (count <= 0) return state;

  const foodCost = Math.max(10, Math.round(count * 1.4));
  const woodCost = Math.max(10, Math.round(count * 1.0));
  const cost: Resources = { food: foodCost, wood: woodCost, stone: 0, gold: 0 };
  if (!canAfford(state.resources, cost)) return state;

  return {
    ...state,
    resources: subtractResources(state.resources, cost),
    garrison: {
      infantry: state.garrison.infantry + state.wounded.infantry,
      archers: state.garrison.archers + state.wounded.archers,
      cavalry: state.garrison.cavalry + state.wounded.cavalry,
    },
    wounded: { infantry: 0, archers: 0, cavalry: 0 },
    logs: appendLog(
      state.logs,
      state.elapsedSec,
      'city',
      `Шпиталь вилікував ${count} поранених воїнів — вони повернулися до строю!`
    ),
  };
}

export function openGoldenChest(state: RokGameState): RokGameState {
  if (state.outcome !== 'ongoing' || state.goldenKeys <= 0) return state;

  const locked = state.commanders.find((c) => !c.unlocked);
  if (locked) {
    const nextCmds = state.commanders.map((c) =>
      c.id === locked.id ? { ...c, unlocked: true } : c
    );
    return {
      ...state,
      goldenKeys: state.goldenKeys - 1,
      commanders: nextCmds,
      logs: appendLog(
        state.logs,
        state.elapsedSec,
        'skill',
        `Таверна! Легендарний командир ${locked.name} (${locked.title}) приєднався до вашої імперії!`
      ),
    };
  }

  // All commanders unlocked -> grant +140 XP to primary commander + 2 speedups!
  const nextCmds = state.commanders.map((c, idx) => {
    if (idx !== 0) return c;
    let xp = c.xp + 140;
    let level = c.level;
    let xpToNext = c.xpToNext;
    while (xp >= xpToNext && level < 10) {
      xp -= xpToNext;
      level += 1;
      xpToNext = Math.round(xpToNext * 1.45);
    }
    return { ...c, xp, level, xpToNext };
  });

  return {
    ...state,
    goldenKeys: state.goldenKeys - 1,
    speedups: state.speedups + 2,
    commanders: nextCmds,
    logs: appendLog(
      state.logs,
      state.elapsedSec,
      'skill',
      `Золота скриня Таверни: +140 досвіду командиру та +2 Прискорення!`
    ),
  };
}

export function claimQuestReward(state: RokGameState): RokGameState {
  if (state.outcome !== 'ongoing' || !isCurrentQuestComplete(state)) return state;
  const q = CHAPTER_QUESTS[state.questIndex];
  if (!q) return state;

  return {
    ...state,
    resources: addResources(state.resources, q.rewardResources),
    speedups: state.speedups + (q.rewardSpeedups ?? 0),
    goldenKeys: state.goldenKeys + (q.rewardKeys ?? 0),
    questIndex: state.questIndex + 1,
    logs: appendLog(
      state.logs,
      state.elapsedSec,
      'skill',
      `Главу ${q.chapter} завершено! Отримано: ${q.rewardDesc}.`
    ),
  };
}

export function claimTribalVillage(state: RokGameState, villageId: string): RokGameState {
  if (state.outcome !== 'ongoing') return state;
  const v = state.entities[villageId];
  if (!v || v.kind !== 'village' || v.visited) return state;
  if (!isPointRevealed(state, v.x, v.y)) return state;

  const bonusRes: Partial<Resources> = { food: 130, wood: 130, stone: 85, gold: 65 };
  return {
    ...state,
    resources: addResources(state.resources, bonusRes),
    speedups: state.speedups + 1,
    goldenKeys: state.goldenKeys + (state.villagesVisited % 2 === 0 ? 1 : 0),
    villagesVisited: state.villagesVisited + 1,
    entities: {
      ...state.entities,
      [villageId]: { ...v, visited: true, owner: 'player' },
    },
    logs: appendLog(
      state.logs,
      state.elapsedSec,
      'gather',
      `Жителі «${v.name}» передали дари: +130 їжі/дерева, +65 золота та +1 Прискорення!`
    ),
  };
}

export function dispatchScout(state: RokGameState, targetX: number, targetY: number): RokGameState {
  if (state.outcome !== 'ongoing') return state;
  // Allow up to 1 active scout at a time
  if (state.marches.some((m) => m.owner === 'player' && m.isScout)) return state;

  const city = state.entities['player-city'];
  const civ = CIVILIZATIONS[state.civId];
  const clampedX = Math.max(60, Math.min(WORLD_WIDTH - 60, targetX));
  const clampedY = Math.max(60, Math.min(WORLD_HEIGHT - 60, targetY));

  const scoutMarch: ArmyMarch = {
    id: `scout-${Math.round(state.elapsedSec * 100)}`,
    owner: 'player',
    isScout: true,
    commanderId: 'scout',
    commanderName: 'Розвідник',
    civId: state.civId,
    x: city.x,
    y: city.y,
    startX: city.x,
    startY: city.y,
    targetId: 'fog-sector',
    targetX: clampedX,
    targetY: clampedY,
    targetName: 'Розвідка туману',
    status: 'scouting',
    troops: { infantry: 0, archers: 0, cavalry: 0 },
    alliedBonusTroops: 0,
    hp: 100,
    maxHp: 100,
    rage: 0,
    skillFlashTimer: 0,
    hitFlashTimer: 0,
    cargo: { food: 0, wood: 0, stone: 0, gold: 0 },
    gatherAccum: 0,
    speed: 175 * civ.scoutSpeedMult,
    attackTimer: 0,
  };

  return {
    ...state,
    marches: [...state.marches, scoutMarch],
    logs: appendLog(state.logs, state.elapsedSec, 'city', `Розвідник вирушив відкривати туман війни.`),
  };
}

export function repairCityWall(state: RokGameState): RokGameState {
  if (state.outcome !== 'ongoing' || state.wallHp >= state.wallMaxHp) return state;
  const cost: Resources = { food: 0, wood: 45, stone: 55, gold: 0 };
  if (!canAfford(state.resources, cost)) return state;
  return {
    ...state,
    resources: subtractResources(state.resources, cost),
    wallHp: Math.min(state.wallMaxHp, state.wallHp + 350),
    logs: appendLog(state.logs, state.elapsedSec, 'city', `Міську стіну укріплено (+350 HP).`),
  };
}

export function computeArmyStats(
  troops: Troops,
  alliedBonusTroops: number,
  civId: CivId,
  commander: CommanderProfile,
  techLevels: Record<TechId, number>,
  shrinesAttackBonus: boolean
) {
  const civ = CIVILIZATIONS[civId];
  const atkMult =
    civ.attackMult *
    (1 +
      commander.attackBonus +
      techLevels.metallurgy * 0.12 +
      (commander.level - 1) * 0.06 +
      (shrinesAttackBonus ? 0.12 : 0));
  const defMult = civ.defenseMult * (1 + techLevels.fortification * 0.12);

  const effInf = troops.infantry + Math.round(alliedBonusTroops * 0.5);
  const effArch = troops.archers + Math.round(alliedBonusTroops * 0.25);
  const effCav = troops.cavalry + Math.round(alliedBonusTroops * 0.25);

  const hp = Math.round(
    (effInf * TROOP_META.infantry.hp +
      effArch * TROOP_META.archers.hp +
      effCav * TROOP_META.cavalry.hp) *
      (1 + (commander.level - 1) * 0.04)
  );
  const attack =
    (effInf * TROOP_META.infantry.attack +
      effArch * TROOP_META.archers.attack +
      effCav * TROOP_META.cavalry.attack * civ.cavalryAtkMult) *
    0.16 *
    atkMult;
  const defense =
    (effInf * TROOP_META.infantry.defense +
      effArch * TROOP_META.archers.defense +
      effCav * TROOP_META.cavalry.defense) *
    0.12 *
    defMult;

  const count = Math.max(1, effInf + effArch + effCav);
  const weightedSpeed =
    (effInf * TROOP_META.infantry.speedBonus +
      effArch * TROOP_META.archers.speedBonus +
      effCav * TROOP_META.cavalry.speedBonus) /
    count;

  const speed =
    78 *
    weightedSpeed *
    civ.marchSpeedMult *
    (1 + commander.speedBonus + techLevels.logistics * 0.15);

  return { hp: Math.max(10, hp), attack: Math.max(4, attack), defense, speed };
}

export function dispatchMarch(
  state: RokGameState,
  targetId: string,
  requestedTroops?: Troops,
  commanderId?: string,
  isRally = false
): RokGameState {
  if (state.outcome !== 'ongoing') return state;
  const target = state.entities[targetId];
  if (!target || target.kind === 'playerCity' || target.kind === 'village' || target.defeated) {
    return state;
  }

  // Barbarian battles cost Action Points (RoK staple!)
  const apCost = target.kind === 'barbarian' ? BARBARIAN_AP_COST : 0;
  if (state.actionPoints < apCost) return state;

  const playerMarches = state.marches.filter((m) => m.owner === 'player' && !m.isScout);
  if (playerMarches.length >= getMaxMarches(state)) return state;

  const available = totalTroops(state.garrison);
  if (available <= 0) return state;

  const cmd = getCommanderById(state, commanderId);
  const cap = getMarchCapacity(state, cmd.id);
  let chosen: Troops;

  if (requestedTroops) {
    chosen = {
      infantry: Math.min(state.garrison.infantry, Math.max(0, Math.floor(requestedTroops.infantry))),
      archers: Math.min(state.garrison.archers, Math.max(0, Math.floor(requestedTroops.archers))),
      cavalry: Math.min(state.garrison.cavalry, Math.max(0, Math.floor(requestedTroops.cavalry))),
    };
  } else {
    const ratio = Math.min(1, cap / available);
    chosen = {
      infantry: Math.floor(state.garrison.infantry * ratio),
      archers: Math.floor(state.garrison.archers * ratio),
      cavalry: Math.floor(state.garrison.cavalry * ratio),
    };
    if (totalTroops(chosen) === 0 && available > 0) {
      if (state.garrison.infantry > 0) chosen.infantry = 1;
      else if (state.garrison.archers > 0) chosen.archers = 1;
      else chosen.cavalry = 1;
    }
  }

  if (totalTroops(chosen) <= 0) return state;

  const canRally =
    isRally &&
    (target.kind === 'shrine' || target.kind === 'rivalCity' || target.kind === 'lostTemple');
  const alliedBonusTroops = canRally ? RALLY_ALLIED_TROOPS : 0;

  const city = state.entities['player-city'];
  const hasWarShrine = Object.values(state.entities).some(
    (e) => e.kind === 'shrine' && e.owner === 'player' && e.shrineBuff === 'attack'
  );
  const stats = computeArmyStats(
    chosen,
    alliedBonusTroops,
    state.civId,
    cmd,
    state.techLevels,
    hasWarShrine
  );

  const march: ArmyMarch = {
    id: `march-${Math.round(state.elapsedSec * 100)}-${state.marches.length + 1}`,
    owner: 'player',
    isRally: canRally,
    commanderId: cmd.id,
    commanderName: cmd.name,
    civId: state.civId,
    x: city.x,
    y: city.y,
    startX: city.x,
    startY: city.y,
    targetId: target.id,
    targetX: target.x,
    targetY: target.y,
    targetName: target.name,
    status: 'marching',
    troops: chosen,
    alliedBonusTroops,
    hp: stats.hp,
    maxHp: stats.hp,
    rage: 25,
    skillFlashTimer: 0,
    hitFlashTimer: 0,
    cargo: { food: 0, wood: 0, stone: 0, gold: 0 },
    gatherAccum: 0,
    speed: stats.speed,
    attackTimer: 0,
  };

  return {
    ...state,
    actionPoints: Math.max(0, state.actionPoints - apCost),
    garrison: {
      infantry: state.garrison.infantry - chosen.infantry,
      archers: state.garrison.archers - chosen.archers,
      cavalry: state.garrison.cavalry - chosen.cavalry,
    },
    marches: [...state.marches, march],
    logs: appendLog(
      state.logs,
      state.elapsedSec,
      'combat',
      canRally
        ? `Збір альянсу! ${cmd.name} веде ${totalTroops(chosen)} + ${alliedBonusTroops} союзників → ${target.name}.`
        : `${cmd.name} вирушив у похід (${totalTroops(chosen)} воїнів) → ${target.name}.`
    ),
  };
}

export function recallMarch(state: RokGameState, marchId: string): RokGameState {
  const city = state.entities['player-city'];
  if (!city) return state;
  let changed = false;
  const marches = state.marches.map((m) => {
    if (m.id === marchId && m.owner === 'player' && m.status !== 'returning') {
      changed = true;
      return {
        ...m,
        status: 'returning' as const,
        targetId: 'player-city',
        targetX: city.x,
        targetY: city.y,
        targetName: city.name,
      };
    }
    return m;
  });
  return changed ? { ...state, marches } : state;
}

export function tickSimulation(state: RokGameState, rawDt: number): RokGameState {
  if (state.outcome !== 'ongoing') return state;
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  if (dt <= 0) return state;

  const elapsedSec = state.elapsedSec + dt;
  const civ = CIVILIZATIONS[state.civId];

  // 1. Passive Production & Action Points (AP) Regeneration
  const rates = getProductionRatesPerSec(state);
  let resources: Resources = {
    food: state.resources.food + rates.food * dt,
    wood: state.resources.wood + rates.wood * dt,
    stone: state.resources.stone + rates.stone * dt,
    gold: state.resources.gold + rates.gold * dt,
  };
  const actionPoints = Math.min(
    state.maxActionPoints,
    state.actionPoints + 4.5 * civ.apRegenMult * dt
  );
  let speedups = state.speedups;
  let goldenKeys = state.goldenKeys;
  let logs = state.logs;
  let fogRevealed = state.fogRevealed;

  let effects: FloatingEffect[] = state.effects
    .map((ef) => ({ ...ef, y: ef.y - 16 * dt, ttl: ef.ttl - dt }))
    .filter((ef) => ef.ttl > 0);

  const pushEffect = (x: number, y: number, text: string, color: string) => {
    if (effects.length < 18) {
      const nearbyCount = effects.filter((e) => Math.abs(e.x - x) < 75 && Math.abs(e.y - y) < 28).length;
      effects.push({
        id: `fx-${Math.round(elapsedSec * 1000)}-${effects.length}`,
        x,
        y: y - nearbyCount * 20,
        text,
        color,
        ttl: 1.25,
        maxTtl: 1.25,
      });
    }
  };

  // 2. Building Upgrades
  let wallHp = state.wallHp;
  let wallMaxHp = state.wallMaxHp;
  const buildings = { ...state.buildings };
  for (const id of BUILDING_ORDER) {
    const b = buildings[id];
    if (b.upgrading) {
      const nextLeft = b.upgradeTimeLeft - dt;
      if (nextLeft <= 0) {
        const nextLv = b.level + 1;
        buildings[id] = {
          ...b,
          level: nextLv,
          upgrading: false,
          upgradeTimeLeft: 0,
          upgradeTotalTime: 0,
          helpRequested: false,
        };
        if (id === 'wall') {
          wallMaxHp += 400;
          wallHp = Math.min(wallMaxHp, wallHp + 400);
        }
        logs = appendLog(
          logs,
          elapsedSec,
          'city',
          `Готово! ${BUILDING_META[id].name} покращено до рівня ${nextLv}.`
        );
      } else {
        buildings[id] = { ...b, upgradeTimeLeft: nextLeft };
      }
    }
  }

  // 3. Troop Training Queue
  let garrison = { ...state.garrison };
  let wounded = { ...state.wounded };
  let trainingQueue = state.trainingQueue ? { ...state.trainingQueue } : null;
  if (trainingQueue) {
    trainingQueue.timeLeft -= dt;
    if (trainingQueue.timeLeft <= 0) {
      garrison[trainingQueue.troopType] += trainingQueue.count;
      logs = appendLog(
        logs,
        elapsedSec,
        'city',
        `Казарми: +${trainingQueue.count} ${TROOP_META[trainingQueue.troopType].name.toLowerCase()} готові до походу.`
      );
      trainingQueue = null;
    }
  }

  // 4. Academy Research Queue
  const techLevels = { ...state.techLevels };
  let researchQueue = state.researchQueue ? { ...state.researchQueue } : null;
  if (researchQueue) {
    researchQueue.timeLeft -= dt;
    if (researchQueue.timeLeft <= 0) {
      const tid = researchQueue.techId;
      techLevels[tid] += 1;
      if (tid === 'fortification') {
        wallMaxHp += 250;
        wallHp = Math.min(wallMaxHp, wallHp + 250);
      }
      logs = appendLog(
        logs,
        elapsedSec,
        'city',
        `Технологію «${TECH_META[tid].name}» Рів.${techLevels[tid]} досліджено!`
      );
      researchQueue = null;
    }
  }

  // 5. Entities & Respawns
  const entities: Record<string, WorldEntity> = {};
  for (const id of state.entityOrder) {
    const e = state.entities[id];
    if (e.defeated && e.respawnTimer !== undefined && e.respawnTimer > 0) {
      const nextTimer = e.respawnTimer - dt;
      if (nextTimer <= 0) {
        entities[id] = {
          ...e,
          defeated: false,
          respawnTimer: 0,
          hp: e.maxHp,
          resourceRemaining: e.resourceMax,
        };
      } else {
        entities[id] = { ...e, respawnTimer: nextTimer };
      }
    } else if (id === 'player-city') {
      entities[id] = { ...e, level: buildings.cityHall.level, hp: wallHp, maxHp: wallMaxHp };
    } else {
      entities[id] = { ...e };
    }
  }

  const city = entities['player-city'];
  const hasWarShrine = Object.values(entities).some(
    (e) => e.kind === 'shrine' && e.owner === 'player' && e.shrineBuff === 'attack'
  );
  const hasHarvestShrine = Object.values(entities).some(
    (e) => e.kind === 'shrine' && e.owner === 'player' && e.shrineBuff === 'gather'
  );

  // 6. Periodic Barbarian Raid
  let nextRaidTimer = state.nextRaidTimer - dt;
  let raidCount = state.raidCount;
  const incomingMarches: ArmyMarch[] = [];

  if (nextRaidTimer <= 0) {
    raidCount += 1;
    const activeBarbs = state.entityOrder
      .map((id) => entities[id])
      .filter((e) => e.kind === 'barbarian' && !e.defeated);
    const origin = activeBarbs[raidCount % Math.max(1, activeBarbs.length)];
    if (origin) {
      const diffScale =
        state.difficulty === 'emperor' ? 1.25 : state.difficulty === 'novice' ? 0.72 : 1.0;
      const raidHp = Math.round((220 + raidCount * 110) * diffScale);
      incomingMarches.push({
        id: `raid-${raidCount}-${Math.round(elapsedSec)}`,
        owner: 'barbarian',
        commanderId: 'barb-chief',
        commanderName: `Загін варварів #${raidCount}`,
        x: origin.x,
        y: origin.y,
        startX: origin.x,
        startY: origin.y,
        targetId: 'player-city',
        targetX: city.x,
        targetY: city.y,
        targetName: city.name,
        status: 'marching',
        troops: { infantry: 18 + raidCount * 8, archers: 10 + raidCount * 4, cavalry: 8 + raidCount * 4 },
        alliedBonusTroops: 0,
        hp: raidHp,
        maxHp: raidHp,
        rage: 0,
        skillFlashTimer: 0,
        hitFlashTimer: 0,
        cargo: { food: 0, wood: 0, stone: 0, gold: 0 },
        gatherAccum: 0,
        speed: 44,
        attackTimer: 0,
      });
      logs = appendLog(
        logs,
        elapsedSec,
        'alert',
        `Тривога! Варвари вийшли у набіг на ваше місто. Стіна готова до оборони!`
      );
    }
    nextRaidTimer = state.difficulty === 'emperor' ? 60 : state.difficulty === 'novice' ? 110 : 82;
  }

  // 7. Update Marches & Scouts
  const commanders = state.commanders.map((c) => ({ ...c }));
  let barbariansDefeated = state.barbariansDefeated;
  let shrinesCaptured = state.shrinesCaptured;
  let resourcesGatheredCount = state.resourcesGatheredCount;
  let outcome: RokGameState['outcome'] = state.outcome;
  let outcomeReason = state.outcomeReason;

  const gainCommanderXp = (cmdId: string, xpGain: number) => {
    const c = commanders.find((item) => item.id === cmdId) ?? commanders[0];
    c.xp += xpGain;
    while (c.xp >= c.xpToNext && c.level < 10) {
      c.xp -= c.xpToNext;
      c.level += 1;
      c.xpToNext = Math.round(c.xpToNext * 1.45);
      logs = appendLog(
        logs,
        elapsedSec,
        'skill',
        `${c.name} досяг Рівня ${c.level}! Зросли атака та ліміт армії.`
      );
    }
  };

  const survivingMarches: ArmyMarch[] = [];
  const allMarches = [...state.marches, ...incomingMarches];

  for (const rawM of allMarches) {
    const m: ArmyMarch = {
      ...rawM,
      troops: { ...rawM.troops },
      cargo: { ...rawM.cargo },
      skillFlashTimer: Math.max(0, rawM.skillFlashTimer - dt),
      hitFlashTimer: Math.max(0, rawM.hitFlashTimer - dt),
    };

    // Scout riding across map clearing Fog of War
    if (m.status === 'scouting') {
      const dx = m.targetX - m.x;
      const dy = m.targetY - m.y;
      const dist = Math.hypot(dx, dy);
      const step = m.speed * dt;
      fogRevealed = revealFogAround(fogRevealed, m.x, m.y, 175);

      if (dist <= step + 14) {
        fogRevealed = revealFogAround(fogRevealed, m.targetX, m.targetY, 275);
        pushEffect(m.targetX, m.targetY - 18, 'Туман розвіяно!', '#93d8ff');
        logs = appendLog(
          logs,
          elapsedSec,
          'city',
          `Розвідник дослідив новий сектор королівства (${Math.round(
            (fogRevealed.filter(Boolean).length / fogRevealed.length) * 100
          )}% карти).`
        );
        m.status = 'returning';
        m.targetId = 'player-city';
        m.targetX = city.x;
        m.targetY = city.y;
        m.targetName = city.name;
      } else {
        m.x += (dx / dist) * step;
        m.y += (dy / dist) * step;
      }
      survivingMarches.push(m);
      continue;
    }

    // Standard marching or returning
    if (m.status === 'marching' || m.status === 'returning') {
      const dx = m.targetX - m.x;
      const dy = m.targetY - m.y;
      const dist = Math.hypot(dx, dy);
      const step = m.speed * dt;

      if (m.owner === 'player') {
        fogRevealed = revealFogAround(fogRevealed, m.x, m.y, 150);
      }

      if (dist <= step + 18) {
        m.x = m.targetX;
        m.y = m.targetY;

        if (m.status === 'returning') {
          if (!m.isScout) {
            garrison.infantry += m.troops.infantry;
            garrison.archers += m.troops.archers;
            garrison.cavalry += m.troops.cavalry;
            resources = addResources(resources, m.cargo);
            const totalLoot =
              Math.round(m.cargo.food) +
              Math.round(m.cargo.wood) +
              Math.round(m.cargo.stone) +
              Math.round(m.cargo.gold);
            if (totalLoot > 0) {
              resourcesGatheredCount += 1;
              pushEffect(city.x, city.y - 26, `+${totalLoot} рес.`, '#6ee7a8');
              logs = appendLog(
                logs,
                elapsedSec,
                'gather',
                `${m.commanderName} повернувся до міста (+${totalLoot} ресурсів).`
              );
            }
          }
          continue;
        }

        const target = entities[m.targetId];
        if (!target || target.defeated) {
          if (m.owner === 'player') {
            m.status = 'returning';
            m.targetId = 'player-city';
            m.targetX = city.x;
            m.targetY = city.y;
            m.targetName = city.name;
          } else {
            continue;
          }
        } else if (m.owner === 'player' && target.kind === 'resourceNode') {
          m.status = 'gathering';
        } else {
          m.status = 'fighting';
          m.attackTimer = 0.25;
        }
      } else {
        m.x += (dx / dist) * step;
        m.y += (dy / dist) * step;
      }

      survivingMarches.push(m);
      continue;
    }

    // Gathering
    if (m.status === 'gathering' && m.owner === 'player') {
      const node = entities[m.targetId];
      if (!node || node.defeated || !node.resourceType || (node.resourceRemaining ?? 0) <= 0) {
        m.status = 'returning';
        m.targetId = 'player-city';
        m.targetX = city.x;
        m.targetY = city.y;
        m.targetName = city.name;
        survivingMarches.push(m);
        continue;
      }

      const cmd = commanders.find((c) => c.id === m.commanderId) ?? commanders[0];
      const carryMax = (totalTroops(m.troops) * 4.5 + 85) * (1 + techLevels.logistics * 0.2);
      const currentCargo = m.cargo.food + m.cargo.wood + m.cargo.stone + m.cargo.gold;
      const gatherRate =
        (17 + totalTroops(m.troops) * 0.35) *
        civ.gatherSpeedMult *
        (1 + cmd.gatherBonus + techLevels.agronomy * 0.22 + (hasHarvestShrine ? 0.2 : 0));

      const taken = Math.min(
        gatherRate * dt,
        node.resourceRemaining ?? 0,
        Math.max(0, carryMax - currentCargo)
      );

      m.cargo[node.resourceType] += taken;
      node.resourceRemaining = Math.max(0, (node.resourceRemaining ?? 0) - taken);
      m.gatherAccum += taken;

      if (m.gatherAccum >= 48) {
        pushEffect(node.x, node.y - 20, `+${Math.round(m.gatherAccum)}`, '#f4cf6d');
        m.gatherAccum = 0;
      }

      if (node.resourceRemaining <= 0) {
        node.defeated = true;
        node.respawnTimer = 28;
      }

      if (node.resourceRemaining <= 0 || currentCargo + taken >= carryMax - 0.5) {
        m.status = 'returning';
        m.targetId = 'player-city';
        m.targetX = city.x;
        m.targetY = city.y;
        m.targetName = city.name;
      }

      survivingMarches.push(m);
      continue;
    }

    // Fighting!
    if (m.status === 'fighting') {
      if (m.owner === 'barbarian') {
        m.attackTimer -= dt;
        if (m.attackTimer <= 0) {
          m.attackTimer = 0.85;
          const raidDmg = Math.max(12, Math.round(totalTroops(m.troops) * 0.9));
          const wallCounterDmg =
            26 +
            buildings.wall.level * 18 +
            Math.round(totalTroops(garrison) * 0.45 * civ.defenseMult);
          wallHp = Math.max(0, wallHp - raidDmg);
          m.hp = Math.max(0, m.hp - wallCounterDmg);
          m.hitFlashTimer = 0.14;
          pushEffect(city.x, city.y - 24, `-${raidDmg} Стіна`, '#f06860');

          if (wallHp <= 0) {
            outcome = 'defeat';
            outcomeReason =
              'Міська стіна впала під натиском варварів. Укріплюйте Стіну та тримайте гарнізон у місті.';
          } else if (m.hp <= 0) {
            const rewardGold = 45 + raidCount * 20;
            resources.gold += rewardGold;
            barbariansDefeated += 1;
            gainCommanderXp(commanders[0].id, 45);
            pushEffect(city.x, city.y - 34, `Відбито! +${rewardGold}з`, '#6ce0ad');
            logs = appendLog(
              logs,
              elapsedSec,
              'combat',
              `Набіг варварів відбито! Отримано +${rewardGold} золота.`
            );
            continue;
          }
        }
        survivingMarches.push(m);
        continue;
      }

      // Player march vs world target
      const target = entities[m.targetId];
      if (!target || target.defeated) {
        m.status = 'returning';
        m.targetId = 'player-city';
        m.targetX = city.x;
        m.targetY = city.y;
        m.targetName = city.name;
        survivingMarches.push(m);
        continue;
      }

      m.attackTimer -= dt;
      if (m.attackTimer <= 0) {
        m.attackTimer = 0.72;
        const cmd = commanders.find((c) => c.id === m.commanderId) ?? commanders[0];
        const stats = computeArmyStats(
          m.troops,
          m.alliedBonusTroops,
          state.civId,
          cmd,
          techLevels,
          hasWarShrine
        );

        m.rage = Math.min(100, m.rage + 28 * civ.rageGainMult);
        let dmgToTarget = Math.max(10, Math.round(stats.attack * 2.2 - target.defense * 0.35));
        if (target.kind === 'barbarian' && cmd.id === 'caocao') {
          dmgToTarget = Math.round(dmgToTarget * 1.22);
        }

        if (m.rage >= 100) {
          const skillMult = state.civId === 'vikings' ? 2.4 : state.civId === 'ottoman' ? 2.35 : 2.25;
          dmgToTarget = Math.round(dmgToTarget * skillMult);
          m.rage = state.civId === 'china' ? 25 : 0;
          m.skillFlashTimer = 0.65;
          if (cmd.healOnSkill) {
            const healPct = cmd.id === 'richard' ? 0.18 : 0.12;
            m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * healPct));
          }
          pushEffect(target.x, target.y - 34, `${cmd.skillName}! -${dmgToTarget}`, '#f6cf65');
        } else {
          pushEffect(target.x, target.y - 24, `-${dmgToTarget}`, '#ff9482');
        }

        target.hp = Math.max(0, target.hp - dmgToTarget);

        if (target.hp > 0) {
          const dmgToMarch = Math.max(6, Math.round(target.attack * 1.45 - stats.defense * 0.38));
          m.hp = Math.max(0, m.hp - dmgToMarch);
          m.hitFlashTimer = 0.14;
          if (m.hp <= 0) {
            // Send 75% of defeated march troops into Hospital as Wounded (authentic RoK Hospital loop!)
            const saveRatio = Math.min(0.92, 0.72 + buildings.hospital.level * 0.04);
            wounded.infantry += Math.floor(m.troops.infantry * saveRatio);
            wounded.archers += Math.floor(m.troops.archers * saveRatio);
            wounded.cavalry += Math.floor(m.troops.cavalry * saveRatio);
            logs = appendLog(
              logs,
              elapsedSec,
              'combat',
              `${m.commanderName} відступив від «${target.name}». Поранені воїни доставлені у Шпиталь.`
            );
            continue;
          }
        } else {
          // Victory over target!
          if (target.kind === 'barbarian') {
            target.defeated = true;
            target.respawnTimer = 26;
            barbariansDefeated += 1;
            const lootMult = civ.barbarianLootMult;
            const goldLoot = Math.round((35 + target.level * 28) * lootMult);
            const foodLoot = Math.round((55 + target.level * 35) * lootMult);
            const woodLoot = Math.round((55 + target.level * 35) * lootMult);
            m.cargo = addResources(m.cargo, { gold: goldLoot, food: foodLoot, wood: woodLoot });
            speedups += 1;
            if (target.level >= 2 || barbariansDefeated % 2 === 0) goldenKeys += 1;
            gainCommanderXp(m.commanderId, 38 + target.level * 22);
            pushEffect(target.x, target.y - 30, `Перемога! +${goldLoot}з`, '#6ce0ad');
            logs = appendLog(
              logs,
              elapsedSec,
              'combat',
              `Розгромлено ${target.name}! +${goldLoot} золота та +1 Прискорення.`
            );
          } else if (target.kind === 'shrine') {
            target.owner = 'player';
            target.hp = target.maxHp;
            shrinesCaptured += 1;
            speedups += 2;
            goldenKeys += 1;
            gainCommanderXp(m.commanderId, 95);
            pushEffect(target.x, target.y - 32, `Святиню захоплено!`, '#f6cf65');
            logs = appendLog(
              logs,
              elapsedSec,
              'skill',
              `Захоплено «${target.name}»! Королівство отримало бонус, +2 Прискорення та +1 Золотий ключ.`
            );
          } else if (target.kind === 'rivalCity') {
            target.defeated = true;
            target.respawnTimer = 60;
            const plunder = 180 + target.level * 90;
            m.cargo = addResources(m.cargo, {
              food: plunder,
              wood: plunder,
              stone: Math.round(plunder * 0.7),
              gold: Math.round(plunder * 0.8),
            });
            speedups += 2;
            goldenKeys += 1;
            gainCommanderXp(m.commanderId, 120);
            pushEffect(target.x, target.y - 32, `Фортецю взято!`, '#f6cf65');
            logs = appendLog(
              logs,
              elapsedSec,
              'combat',
              `Фортецю «${target.name}» взято! Захоплено багаті трофеї та Золотий ключ.`
            );
          } else if (target.kind === 'lostTemple') {
            target.owner = 'player';
            target.hp = target.maxHp;
            outcome = 'victory';
            outcomeReason = `${civ.name} під проводом ${m.commanderName} захопили Загублений Храм і об'єднали королівство 7 цивілізацій!`;
          }

          // Split surviving vs lightly wounded back to Hospital
          const survRatio = Math.max(0.55, m.hp / Math.max(1, m.maxHp));
          const survInf = Math.max(m.troops.infantry > 0 ? 1 : 0, Math.round(m.troops.infantry * survRatio));
          const survArch = Math.max(m.troops.archers > 0 ? 1 : 0, Math.round(m.troops.archers * survRatio));
          const survCav = Math.max(m.troops.cavalry > 0 ? 1 : 0, Math.round(m.troops.cavalry * survRatio));

          wounded.infantry += Math.max(0, m.troops.infantry - survInf);
          wounded.archers += Math.max(0, m.troops.archers - survArch);
          wounded.cavalry += Math.max(0, m.troops.cavalry - survCav);

          m.troops = { infantry: survInf, archers: survArch, cavalry: survCav };
          m.status = 'returning';
          m.targetId = 'player-city';
          m.targetX = city.x;
          m.targetY = city.y;
          m.targetName = city.name;
        }
      }

      survivingMarches.push(m);
    }
  }

  const nextState: RokGameState = {
    ...state,
    elapsedSec,
    resources,
    actionPoints,
    speedups,
    goldenKeys,
    buildings,
    garrison,
    wounded,
    trainingQueue,
    techLevels,
    researchQueue,
    commanders,
    wallHp,
    wallMaxHp,
    fogRevealed,
    entities,
    marches: survivingMarches,
    effects,
    logs,
    barbariansDefeated,
    shrinesCaptured,
    resourcesGatheredCount,
    nextRaidTimer,
    raidCount,
    outcome,
    outcomeReason,
  };

  if (
    nextState.outcome === 'ongoing' &&
    nextState.buildings.cityHall.level >= VICTORY_HALL_GOAL &&
    calculatePower(nextState) >= VICTORY_POWER_GOAL
  ) {
    return {
      ...nextState,
      outcome: 'victory',
      outcomeReason: `${civ.name} досягли величі: Ратуша Рів.5 та ${calculatePower(nextState).toLocaleString('uk-UA')} Моці!`,
    };
  }

  return nextState;
}

export function buildRunSnapshot(state: RokGameState): RunSnapshot {
  return {
    outcome: state.outcome === 'victory' ? 'victory' : 'defeat',
    reason: state.outcomeReason,
    civId: state.civId,
    power: calculatePower(state),
    cityHallLevel: state.buildings.cityHall.level,
    commanderLevel: state.commanders[0].level,
    barbariansDefeated: state.barbariansDefeated,
    fogExploredPct: getFogExploredPct(state),
    elapsedSec: Math.floor(state.elapsedSec),
    difficulty: state.difficulty,
  };
}
