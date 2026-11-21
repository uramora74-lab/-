import type { ReactNode } from 'react';
import {
  BUILDING_META,
  BUILDING_ORDER,
  CHAPTER_QUESTS,
  CIVILIZATIONS,
  TECH_META,
} from '../game/civilizations';
import {
  calculatePower,
  getMaxMarches,
  isCurrentQuestComplete,
  totalTroops,
} from '../game/rokEngine';
import type { RokGameState, ViewMode } from '../game/types';
import { CivEmblem, ResourceIcon } from './NationEmblem';

interface RokHudProps {
  children: ReactNode;
  state: RokGameState;
  viewMode: ViewMode;
  ecoMode: boolean;
  muted: boolean;
  onToggleViewMode: () => void;
  onUseSpeedup: (target: 'building' | 'training' | 'research') => void;
  onRequestHelp: (target: 'building' | 'training' | 'research') => void;
  onRecallMarch: (marchId: string) => void;
  onOpenTavern: () => void;
  onClaimQuest: () => void;
  onToggleEcoMode: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

export function RokHud({
  children,
  state,
  viewMode,
  ecoMode,
  muted,
  onToggleViewMode,
  onUseSpeedup,
  onRequestHelp,
  onRecallMarch,
  onOpenTavern,
  onClaimQuest,
  onToggleEcoMode,
  onToggleMute,
  onPause,
}: RokHudProps) {
  const civ = CIVILIZATIONS[state.civId];
  const power = calculatePower(state);
  const primaryCmd = state.commanders[0];
  const activeUpgrade = BUILDING_ORDER.map((id) => state.buildings[id]).find((b) => b.upgrading);
  const playerMarches = state.marches.filter((m) => m.owner === 'player' && !m.isScout);
  const activeScout = state.marches.find((m) => m.owner === 'player' && m.isScout);
  const enemyRaids = state.marches.filter((m) => m.owner === 'barbarian');
  const maxMarches = getMaxMarches(state);
  const woundedCount = totalTroops(state.wounded);
  const lastLog = state.logs[0] ?? null;

  const currentQuest = CHAPTER_QUESTS[state.questIndex] ?? null;
  const questReady = currentQuest ? isCurrentQuestComplete(state) : false;
  const apPct = Math.min(100, Math.round((state.actionPoints / Math.max(1, state.maxActionPoints)) * 100));

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#12100d]">
      {/* TOP RISE OF KINGDOMS HUD BAR (Power + AP + Resources + Utility Controls) */}
      <div className="shrink-0 z-20 bg-[#17130f] border-b border-[#c89b3c]/25 px-2.5 sm:px-4 h-12 sm:h-13 flex items-center justify-between gap-2">
        {/* Left: Governor Crest + Power + Action Points */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <CivEmblem civId={state.civId} size={26} />
          <div className="flex flex-col leading-none">
            <span className="text-[10px] text-[#a99c85] hidden md:block">
              {civ.shortName} · Ком. Рів.{primaryCmd?.level ?? 1}
            </span>
            <div className="flex items-baseline gap-1" aria-label={`Мощь ${power}`}>
              <span className="text-[10px] text-[#b5a78f] hidden sm:inline">Мощь</span>
              <span className="font-mono-num text-xs sm:text-sm font-bold text-[#f4cb6a]">
                {power.toLocaleString('uk-UA')}
              </span>
            </div>
          </div>

          {/* Action Points (ОД) Bar */}
          <div
            title="Очки дій (ОД) — витрачаються на битви з варварами та автоматично відновлюються"
            className="hidden sm:flex flex-col gap-0.5 pl-2 border-l border-[#c89b3c]/20"
          >
            <div className="flex items-baseline gap-1 text-[10px]">
              <span className="text-[#8ad9ff] font-semibold">ОД</span>
              <span className="font-mono-num font-bold text-[#e2f5ff]">
                {Math.floor(state.actionPoints)}/{state.maxActionPoints}
              </span>
            </div>
            <div className="w-16 h-1.5 rounded-full bg-[#101c24] overflow-hidden border border-[#3a6b88]/40">
              <div
                className="h-full bg-[#4db8ff]"
                style={{ width: `${apPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: 4 Classic RoK Resources (Food, Wood, Stone, Gold) */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
          {(
            [
              { key: 'food', val: state.resources.food, label: 'Їжа' },
              { key: 'wood', val: state.resources.wood, label: 'Дерево' },
              { key: 'stone', val: state.resources.stone, label: 'Камінь' },
              { key: 'gold', val: state.resources.gold, label: 'Золото' },
            ] as const
          ).map((r) => (
            <div
              key={r.key}
              aria-label={`${r.label}: ${Math.floor(r.val)}`}
              className="flex items-center gap-1 whitespace-nowrap"
            >
              <ResourceIcon type={r.key} size={14} />
              <span className="font-mono-num text-xs sm:text-sm font-bold text-[#f3ecde]">
                {Math.floor(r.val)}
              </span>
            </div>
          ))}

          {/* Speedups counter */}
          <div
            title="Прискорення (зрізають 5с будівництва, тренування або науки)"
            className="hidden lg:flex items-center gap-1 pl-2 border-l border-[#c89b3c]/20 whitespace-nowrap"
          >
            <span className="text-[11px] text-[#7be3b5]">Приск.</span>
            <span className="font-mono-num text-xs font-bold text-[#d2fce6]">{state.speedups}</span>
          </div>
        </div>

        {/* Right: Utility Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleEcoMode();
            }}
            tabIndex={-1}
            aria-pressed={ecoMode}
            aria-label="Еко-режим для слабких ПК"
            className={`ui-transition h-8 px-2 rounded border text-xs font-semibold cursor-pointer whitespace-nowrap hidden sm:inline-flex items-center ${
              ecoMode
                ? 'bg-[#1f3325] border-[#4ca16f]/60 text-[#b4efc9]'
                : 'bg-[#221c16] border-[#3d3327] text-[#a99c85] hover:text-[#f3ecde]'
            }`}
          >
            Еко
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            tabIndex={-1}
            aria-label={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
            className="ui-transition w-8 h-8 rounded border bg-[#221c16] border-[#3d3327] text-[#dcd1bd] hover:border-[#8c7143] flex items-center justify-center cursor-pointer shrink-0"
          >
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M11 5L6 9H3V15H6L11 19V5Z" stroke="currentColor" strokeWidth="1.9" />
                <path d="M16 9L21 15M21 9L16 15" stroke="#e86f66" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M11 5L6 9H3V15H6L11 19V5Z" stroke="currentColor" strokeWidth="1.9" />
                <path d="M16 8.5C17.5 10 17.5 14 16 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            tabIndex={-1}
            aria-label="Пауза"
            className="ui-transition w-8 h-8 rounded border bg-[#221c16] border-[#3d3327] text-[#dcd1bd] hover:border-[#8c7143] flex items-center justify-center cursor-pointer shrink-0"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* MAIN PLAYFIELD (City Diorama or Open-World Kingdom Canvas) */}
      <main className="flex-1 min-h-0 relative overflow-hidden">
        {children}

        {/* TOP-LEFT PERIMETER OVERLAY: Compact RoK Chapter Quest Tracker */}
        {currentQuest && (
          <div className="pointer-events-none absolute top-3 left-3 z-20 max-w-[235px]">
            <div
              className={`pointer-events-auto rounded px-2.5 py-2 border flex flex-col gap-1.5 ${
                questReady
                  ? 'bg-[#261e12]/96 border-[#e8bc54]'
                  : 'bg-[#181410]/90 border-[#c89b3c]/35'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-bold text-[#e6c06d] whitespace-nowrap shrink-0">
                  Глава {currentQuest.chapter}
                </span>
                <span className="text-[#9e917b] truncate">{currentQuest.rewardDesc}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#f3ecde] leading-snug">
                  {currentQuest.title}
                </span>
                {questReady && (
                  <button
                    type="button"
                    onClick={onClaimQuest}
                    className="px-2 py-1 rounded bg-[#d4a64a] hover:bg-[#e3b75c] text-[#17120c] font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    Забрати
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TOP-RIGHT PERIMETER OVERLAY: Active Queues, Raid Warning & World Marches */}
        <div className="pointer-events-none absolute top-3 right-3 z-20 flex flex-col items-end gap-2 max-w-[260px]">
          {enemyRaids.length > 0 && (
            <div className="pointer-events-auto rounded bg-[#4a1816]/95 border border-[#f06e65] px-3 py-1.5 text-xs text-[#ffe3e0] font-semibold shadow-lg">
              Набіг варварів на місто! Стіна: {Math.round(state.wallHp)} HP
            </div>
          )}

          {activeUpgrade && (
            <div className="pointer-events-auto rounded bg-[#181410]/92 border border-[#c89b3c]/40 px-2.5 py-1.5 flex items-center gap-1.5 text-xs">
              <span className="text-[#f3ecde] truncate">
                {BUILDING_META[activeUpgrade.id].name} ·{' '}
                <strong className="font-mono-num text-[#f4cb6a]">
                  {Math.ceil(activeUpgrade.upgradeTimeLeft)}с
                </strong>
              </span>
              {!activeUpgrade.helpRequested && (
                <button
                  type="button"
                  onClick={() => onRequestHelp('building')}
                  className="px-1.5 py-0.5 rounded bg-[#274059] hover:bg-[#325273] text-[10px] font-bold text-[#cce8ff] cursor-pointer whitespace-nowrap"
                >
                  Доп.
                </button>
              )}
              {state.speedups > 0 && (
                <button
                  type="button"
                  onClick={() => onUseSpeedup('building')}
                  className="px-1.5 py-0.5 rounded bg-[#2c523b] hover:bg-[#3a6b4e] text-[10px] font-bold text-[#d4fce4] cursor-pointer whitespace-nowrap"
                >
                  -5с
                </button>
              )}
            </div>
          )}

          {state.trainingQueue && (
            <div className="pointer-events-auto rounded bg-[#181410]/92 border border-[#c89b3c]/40 px-2.5 py-1.5 flex items-center gap-1.5 text-xs">
              <span className="text-[#f3ecde]">
                Казарми ·{' '}
                <strong className="font-mono-num text-[#f4cb6a]">
                  {Math.ceil(state.trainingQueue.timeLeft)}с
                </strong>
              </span>
              {!state.trainingQueue.helpRequested && (
                <button
                  type="button"
                  onClick={() => onRequestHelp('training')}
                  className="px-1.5 py-0.5 rounded bg-[#274059] hover:bg-[#325273] text-[10px] font-bold text-[#cce8ff] cursor-pointer whitespace-nowrap"
                >
                  Доп.
                </button>
              )}
              {state.speedups > 0 && (
                <button
                  type="button"
                  onClick={() => onUseSpeedup('training')}
                  className="px-1.5 py-0.5 rounded bg-[#2c523b] hover:bg-[#3a6b4e] text-[10px] font-bold text-[#d4fce4] cursor-pointer whitespace-nowrap"
                >
                  -5с
                </button>
              )}
            </div>
          )}

          {state.researchQueue && (
            <div className="pointer-events-auto rounded bg-[#181410]/92 border border-[#c89b3c]/40 px-2.5 py-1.5 flex items-center gap-1.5 text-xs">
              <span className="text-[#f3ecde] truncate">
                {TECH_META[state.researchQueue.techId].name} ·{' '}
                <strong className="font-mono-num text-[#f4cb6a]">
                  {Math.ceil(state.researchQueue.timeLeft)}с
                </strong>
              </span>
              {!state.researchQueue.helpRequested && (
                <button
                  type="button"
                  onClick={() => onRequestHelp('research')}
                  className="px-1.5 py-0.5 rounded bg-[#274059] hover:bg-[#325273] text-[10px] font-bold text-[#cce8ff] cursor-pointer whitespace-nowrap"
                >
                  Доп.
                </button>
              )}
              {state.speedups > 0 && (
                <button
                  type="button"
                  onClick={() => onUseSpeedup('research')}
                  className="px-1.5 py-0.5 rounded bg-[#2c523b] hover:bg-[#3a6b4e] text-[10px] font-bold text-[#d4fce4] cursor-pointer whitespace-nowrap"
                >
                  -5с
                </button>
              )}
            </div>
          )}

          {(playerMarches.length > 0 || activeScout) && (
            <div className="pointer-events-auto rounded bg-[#181410]/92 border border-[#c89b3c]/40 px-2.5 py-2 flex flex-col gap-1.5 w-full">
              <div className="text-[11px] font-semibold text-[#c9bca4] flex justify-between">
                <span>Походи</span>
                <span className="font-mono-num text-[#f4cb6a]">
                  {playerMarches.length}/{maxMarches}
                </span>
              </div>
              {activeScout && (
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#8ad9ff]">
                  <span className="truncate">
                    {activeScout.status === 'returning' ? '↩ ' : '◎ '}
                    Розвідник
                  </span>
                  <span className="text-[10px] text-[#78a6be]">Туман</span>
                </div>
              )}
              {playerMarches.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#ece2cf] truncate">
                    {m.status === 'fighting'
                      ? '⚔ '
                      : m.status === 'gathering'
                        ? '⛏ '
                        : m.status === 'returning'
                          ? '↩ '
                          : m.isRally
                            ? '⚑ '
                            : '→ '}
                    {m.targetName}
                  </span>
                  {m.status !== 'returning' && (
                    <button
                      type="button"
                      onClick={() => onRecallMarch(m.id)}
                      className="text-[10px] text-[#e6c06d] hover:underline cursor-pointer shrink-0"
                    >
                      Назад
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM PERIMETER STRIP: Signature RoK City <-> World Map Button + Tavern + Garrison */}
      <div className="shrink-0 z-20 bg-[#17130f] border-t border-[#c89b3c]/25 px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleViewMode}
            className="ui-transition px-3 sm:px-4 py-2 rounded-md bg-[#d4a64a] hover:bg-[#e3b75c] text-[#17120c] font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 shadow-[0_3px_12px_rgba(0,0,0,0.4)]"
          >
            {viewMode === 'city' ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 12H21M12 3C14.8 6 14.8 18 12 21M12 3C9.2 6 9.2 18 12 21" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                <span>Карта світу</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 20V9L12 4L20 9V20H4ZM9 20V14H15V20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                <span>До міста</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenTavern}
            className="ui-transition px-2.5 sm:px-3 py-2 rounded-md bg-[#251f18] hover:bg-[#332a20] border border-[#c89b3c]/40 text-[#f3e6cc] font-semibold text-xs cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <span>Командири</span>
            {state.goldenKeys > 0 && (
              <span className="font-mono-num px-1.5 py-0.2 rounded bg-[#d4a64a] text-[#17120c] text-[10px] font-bold">
                {state.goldenKeys}
              </span>
            )}
          </button>

          <div className="text-xs text-[#bfb39d] whitespace-nowrap">
            Гарнізон:{' '}
            <strong className="font-mono-num text-[#f6eedc]">{totalTroops(state.garrison)}</strong>
          </div>

          {woundedCount > 0 && (
            <div className="text-xs text-[#f29188] whitespace-nowrap hidden md:block">
              Поранені: <strong className="font-mono-num">{woundedCount}</strong>
            </div>
          )}
        </div>

        {/* Quiet single-line event whisper */}
        {lastLog && (
          <div className="text-[11px] text-[#b4a68e] truncate hidden sm:block min-w-0">
            {lastLog.message}
          </div>
        )}

        <div className="text-[11px] text-[#a99c85] whitespace-nowrap shrink-0 hidden xl:block">
          Ціль: Загублений Храм або Ратуша 5 + 12 000 Моці
        </div>
      </div>
    </div>
  );
}
