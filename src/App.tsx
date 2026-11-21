import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './game/audio';
import {
  buildRunSnapshot,
  claimQuestReward,
  claimTribalVillage,
  createInitialRokState,
  dispatchMarch,
  dispatchScout,
  healWounded,
  openGoldenChest,
  recallMarch,
  repairCityWall,
  requestAllianceHelp,
  startBuildingUpgrade,
  startResearchTech,
  startTrainTroops,
  tickSimulation,
  useSpeedup,
} from './game/rokEngine';
import type {
  BuildingId,
  CivId,
  Difficulty,
  GamePhase,
  RokGameState,
  RunSnapshot,
  TechId,
  Troops,
  TroopType,
  ViewMode,
} from './game/types';
import { CityView } from './components/CityView';
import { GameOverModal, PauseModal } from './components/Modals';
import { RokHud } from './components/RokHud';
import { TavernModal } from './components/TavernModal';
import { TitleScreen } from './components/TitleScreen';
import { WorldMapView } from './components/WorldMapView';

function shouldAutostart(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export default function App() {
  const [selectedCiv, setSelectedCiv] = useState<CivId>('rome');
  const [difficulty, setDifficulty] = useState<Difficulty>('strategist');
  const [ecoMode, setEcoMode] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  const [phase, setPhase] = useState<GamePhase>(() => (shouldAutostart() ? 'playing' : 'title'));
  const [viewMode, setViewMode] = useState<ViewMode>('city');
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingId | null>(null);
  const [tavernOpen, setTavernOpen] = useState<boolean>(false);
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null);

  const initial = createInitialRokState('rome', 'strategist', 7731);
  const stateRef = useRef<RokGameState>(initial);
  const [uiState, setUiState] = useState<RokGameState>(initial);

  useEffect(() => {
    document.body.dataset.state = phase;
  }, [phase]);

  useEffect(() => {
    document.documentElement.classList.toggle('eco-mode', ecoMode);
  }, [ecoMode]);

  useEffect(() => {
    soundEngine.setMuted(muted);
  }, [muted]);

  const commitState = useCallback((next: RokGameState) => {
    stateRef.current = next;
    setUiState(next);
    if (next.outcome !== 'ongoing') {
      setTavernOpen(false);
      setRunSnapshot(buildRunSnapshot(next));
      setPhase('gameover');
      if (next.outcome === 'victory') soundEngine.playVictory();
      else soundEngine.playDefeat();
    }
  }, []);

  // Decoupled real-time simulation loop (ticks in ref, throttles React UI sync to 4Hz-6Hz for weak PCs!)
  useEffect(() => {
    if (phase !== 'playing') return;

    let rafId = 0;
    let lastTs = performance.now();
    let uiSyncAccum = 0;
    const uiSyncInterval = ecoMode ? 0.25 : 0.16;

    const step = (ts: number) => {
      rafId = requestAnimationFrame(step);
      const rawDt = (ts - lastTs) / 1000;
      lastTs = ts;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      const prevOutcome = stateRef.current.outcome;
      const next = tickSimulation(stateRef.current, dt);
      stateRef.current = next;

      if (prevOutcome === 'ongoing' && next.outcome !== 'ongoing') {
        setTavernOpen(false);
        setUiState(next);
        setRunSnapshot(buildRunSnapshot(next));
        setPhase('gameover');
        if (next.outcome === 'victory') soundEngine.playVictory();
        else soundEngine.playDefeat();
        return;
      }

      uiSyncAccum += dt;
      if (uiSyncAccum >= uiSyncInterval) {
        uiSyncAccum = 0;
        setUiState(next);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [phase, ecoMode]);

  const startKingdom = useCallback(
    (civ: CivId = selectedCiv, diff: Difficulty = difficulty) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const fresh = createInitialRokState(civ, diff, 7731 + Math.floor(Math.random() * 5000));
      stateRef.current = fresh;
      setUiState(fresh);
      setViewMode('city');
      setSelectedBuilding(null);
      setTavernOpen(false);
      setRunSnapshot(null);
      setPhase('playing');
      soundEngine.playSelect();
    },
    [selectedCiv, difficulty]
  );

  // Global hotkeys (Tab switches City <-> World Map, C Tavern, Esc/P Pause, M Mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'title') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (tavernOpen) {
          setTavernOpen(false);
          return;
        }
        setPhase((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        return;
      }

      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setTavernOpen(false);
        setPhase((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
        return;
      }

      if (e.key.toLowerCase() === 'm') {
        setMuted((prev) => !prev);
        return;
      }

      if (phase === 'playing' && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setTavernOpen((prev) => !prev);
        soundEngine.playSelect();
        return;
      }

      if (phase === 'playing' && e.key === 'Tab') {
        e.preventDefault();
        setTavernOpen(false);
        setViewMode((prev) => (prev === 'city' ? 'world' : 'city'));
        soundEngine.playSelect();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, tavernOpen]);

  const handleUseSpeedup = (target: 'building' | 'training' | 'research') => {
    const next = useSpeedup(stateRef.current, target);
    if (next !== stateRef.current) {
      soundEngine.playEdict();
      commitState(next);
    }
  };

  const handleRequestHelp = (target: 'building' | 'training' | 'research') => {
    const next = requestAllianceHelp(stateRef.current, target);
    if (next !== stateRef.current) {
      soundEngine.playEdict();
      commitState(next);
    }
  };

  if (phase === 'title') {
    return (
      <TitleScreen
        selectedCiv={selectedCiv}
        difficulty={difficulty}
        ecoMode={ecoMode}
        onSelectCiv={(civ) => {
          setSelectedCiv(civ);
          soundEngine.playSelect();
        }}
        onSelectDifficulty={(d) => {
          setDifficulty(d);
          soundEngine.playSelect();
        }}
        onToggleEcoMode={() => setEcoMode((prev) => !prev)}
        onStartGame={() => startKingdom(selectedCiv, difficulty)}
      />
    );
  }

  return (
    <>
      <RokHud
        state={uiState}
        viewMode={viewMode}
        ecoMode={ecoMode}
        muted={muted}
        onToggleViewMode={() => {
          setTavernOpen(false);
          setViewMode((prev) => (prev === 'city' ? 'world' : 'city'));
          soundEngine.playSelect();
        }}
        onUseSpeedup={handleUseSpeedup}
        onRequestHelp={handleRequestHelp}
        onRecallMarch={(marchId) => {
          const next = recallMarch(stateRef.current, marchId);
          if (next !== stateRef.current) {
            soundEngine.playSelect();
            commitState(next);
          }
        }}
        onOpenTavern={() => {
          setTavernOpen(true);
          soundEngine.playSelect();
        }}
        onClaimQuest={() => {
          const next = claimQuestReward(stateRef.current);
          if (next !== stateRef.current) {
            soundEngine.playVictory();
            commitState(next);
          }
        }}
        onToggleEcoMode={() => setEcoMode((prev) => !prev)}
        onToggleMute={() => setMuted((prev) => !prev)}
        onPause={() => {
          setTavernOpen(false);
          setPhase('paused');
        }}
      >
        {viewMode === 'city' ? (
          <CityView
            state={uiState}
            selectedBuilding={selectedBuilding}
            onSelectBuilding={(id) => {
              setSelectedBuilding(id);
              if (id) soundEngine.playSelect();
            }}
            onUpgradeBuilding={(id) => {
              const next = startBuildingUpgrade(stateRef.current, id);
              if (next !== stateRef.current) {
                soundEngine.playBuild();
                commitState(next);
              }
            }}
            onTrainTroops={(type: TroopType, mult: number) => {
              const next = startTrainTroops(stateRef.current, type, mult);
              if (next !== stateRef.current) {
                soundEngine.playRecruit();
                commitState(next);
              }
            }}
            onResearchTech={(tech: TechId) => {
              const next = startResearchTech(stateRef.current, tech);
              if (next !== stateRef.current) {
                soundEngine.playBuild();
                commitState(next);
              }
            }}
            onUseSpeedup={handleUseSpeedup}
            onRequestHelp={handleRequestHelp}
            onHealWounded={() => {
              const next = healWounded(stateRef.current);
              if (next !== stateRef.current) {
                soundEngine.playEdict();
                commitState(next);
              }
            }}
            onRepairWall={() => {
              const next = repairCityWall(stateRef.current);
              if (next !== stateRef.current) {
                soundEngine.playBuild();
                commitState(next);
              }
            }}
          />
        ) : (
          <WorldMapView
            stateRef={stateRef}
            uiState={uiState}
            ecoMode={ecoMode}
            onDispatchMarch={(
              targetId: string,
              troops?: Troops,
              commanderId?: string,
              isRally?: boolean
            ) => {
              const next = dispatchMarch(stateRef.current, targetId, troops, commanderId, isRally);
              if (next !== stateRef.current) {
                soundEngine.playMarch();
                commitState(next);
              }
            }}
            onDispatchScout={(x: number, y: number) => {
              const next = dispatchScout(stateRef.current, x, y);
              if (next !== stateRef.current) {
                soundEngine.playMarch();
                commitState(next);
              }
            }}
            onClaimVillage={(villageId: string) => {
              const next = claimTribalVillage(stateRef.current, villageId);
              if (next !== stateRef.current) {
                soundEngine.playEdict();
                commitState(next);
              }
            }}
          />
        )}
      </RokHud>

      {tavernOpen && phase === 'playing' && (
        <TavernModal
          state={uiState}
          onOpenGoldenChest={() => {
            const next = openGoldenChest(stateRef.current);
            if (next !== stateRef.current) {
              soundEngine.playVictory();
              commitState(next);
            }
          }}
          onClose={() => setTavernOpen(false)}
        />
      )}

      {phase === 'paused' && (
        <PauseModal
          ecoMode={ecoMode}
          muted={muted}
          onResume={() => setPhase('playing')}
          onRestart={() => startKingdom(selectedCiv, difficulty)}
          onToggleEcoMode={() => setEcoMode((prev) => !prev)}
          onToggleMute={() => setMuted((prev) => !prev)}
          onBackToTitle={() => setPhase('title')}
        />
      )}

      {phase === 'gameover' && runSnapshot && (
        <GameOverModal
          snapshot={runSnapshot}
          onPlayAgain={() => startKingdom(selectedCiv, difficulty)}
          onBackToTitle={() => setPhase('title')}
        />
      )}
    </>
  );
}
