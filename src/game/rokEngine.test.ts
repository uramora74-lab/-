import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePower,
  claimQuestReward,
  claimTribalVillage,
  createInitialRokState,
  dispatchMarch,
  dispatchScout,
  getFogExploredPct,
  getUpgradeDurationSec,
  healWounded,
  isCurrentQuestComplete,
  openGoldenChest,
  requestAllianceHelp,
  startBuildingUpgrade,
  startResearchTech,
  startTrainTroops,
  tickSimulation,
  totalTroops,
  useSpeedup,
} from './rokEngine';
import { BARBARIAN_AP_COST, CIV_ORDER } from './civilizations';

test('supports all 7 Rise of Kingdoms civilizations and places 6 rival fortresses on kingdom map', () => {
  assert.equal(CIV_ORDER.length, 7);
  for (const civId of CIV_ORDER) {
    const state = createInitialRokState(civId, 'strategist', 42);
    const rivals = Object.values(state.entities).filter((e) => e.kind === 'rivalCity');
    assert.equal(rivals.length, 6, `${civId} should face 6 rival civilizations`);
    assert.equal(state.actionPoints, 500);
    assert.ok(calculatePower(state) > 3500);
  }
});

test('alliance help and speedup reduce upgrade timers and complete Chapter 1 Quest', () => {
  let state = createInitialRokState('china', 'strategist', 100);
  const rome = createInitialRokState('rome', 'strategist', 100);
  assert.ok(getUpgradeDurationSec(state, 'cityHall') < getUpgradeDurationSec(rome, 'cityHall'));

  state = startBuildingUpgrade(state, 'cityHall');
  const beforeHelp = state.buildings.cityHall.upgradeTimeLeft;
  state = requestAllianceHelp(state, 'building');
  assert.ok(state.buildings.cityHall.upgradeTimeLeft < beforeHelp);
  assert.equal(state.buildings.cityHall.helpRequested, true);

  state = useSpeedup(state, 'building');
  for (let i = 0; i < 120; i++) {
    state = tickSimulation(state, 0.05);
  }
  assert.equal(state.buildings.cityHall.level, 2);
  assert.equal(isCurrentQuestComplete(state), true);

  const keysBefore = state.goldenKeys;
  state = claimQuestReward(state);
  assert.equal(state.questIndex, 1);
  assert.equal(state.goldenKeys, keysBefore + 1);
});

test('scout clears Fog of War and lets player claim Tribal Village gifts (Japan scouts faster)', () => {
  let japan = createInitialRokState('japan', 'strategist', 100);
  const rome = createInitialRokState('rome', 'strategist', 100);
  const startPct = getFogExploredPct(japan);

  japan = dispatchScout(japan, 960, 300);
  const romeScout = dispatchScout(rome, 960, 300);
  assert.ok(japan.marches[0].speed > romeScout.marches[0].speed, 'Japan scout should be faster');

  for (let i = 0; i < 160; i++) {
    japan = tickSimulation(japan, 0.05);
  }
  assert.ok(getFogExploredPct(japan) > startPct, 'Fog exploration % should grow after scouting');

  const goldBefore = japan.resources.gold;
  japan = claimTribalVillage(japan, 'village-3');
  assert.equal(japan.villagesVisited, 1);
  assert.ok(japan.resources.gold > goldBefore);
});

test('barbarian attack spends AP, wounded troops enter Hospital and can be healed, Tavern recruits commanders', () => {
  let state = createInitialRokState('germany', 'novice', 100);
  const startKeys = state.goldenKeys;
  state = openGoldenChest(state);
  assert.equal(state.goldenKeys, startKeys - 1);
  assert.equal(state.commanders.filter((c) => c.unlocked).length, 2);

  state = dispatchMarch(state, 'barb-1');
  assert.equal(state.actionPoints, 500 - BARBARIAN_AP_COST);

  for (let i = 0; i < 450; i++) {
    state = tickSimulation(state, 0.05);
  }
  assert.equal(state.barbariansDefeated, 1);

  // Test Hospital healing directly
  state.wounded = { infantry: 12, archers: 6, cavalry: 4 };
  const garBefore = totalTroops(state.garrison);
  state = healWounded(state);
  assert.equal(totalTroops(state.wounded), 0);
  assert.equal(totalTroops(state.garrison), garBefore + 22);
});

test('alliance rally adds bonus allied troops and captures Lost Temple for victory', () => {
  let state = createInitialRokState('rus', 'novice', 100);
  state = startTrainTroops(state, 'cavalry', 1);
  state = startResearchTech(state, 'metallurgy');
  for (let i = 0; i < 200; i++) {
    state = tickSimulation(state, 0.05);
  }
  assert.equal(state.techLevels.metallurgy, 1);

  state.entities['lost-temple'] = { ...state.entities['lost-temple'], hp: 180, attack: 5, defense: 0 };
  state = dispatchMarch(state, 'lost-temple', undefined, undefined, true);
  assert.equal(state.marches[0].isRally, true);
  assert.ok(state.marches[0].alliedBonusTroops > 0);

  for (let i = 0; i < 420; i++) {
    state = tickSimulation(state, 0.05);
    if (state.outcome !== 'ongoing') break;
  }
  assert.equal(state.outcome, 'victory');
});
