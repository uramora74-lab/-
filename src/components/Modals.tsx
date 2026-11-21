import { CIVILIZATIONS } from '../game/civilizations';
import type { RunSnapshot } from '../game/types';
import { CivEmblem } from './NationEmblem';

interface PauseModalProps {
  ecoMode: boolean;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleEcoMode: () => void;
  onToggleMute: () => void;
  onBackToTitle: () => void;
}

export function PauseModal({
  ecoMode,
  muted,
  onResume,
  onRestart,
  onToggleEcoMode,
  onToggleMute,
  onBackToTitle,
}: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-40 bg-[#0d0a08]/80 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-[380px] rounded-md bg-[#1b1611] border border-[#c89b3c]/45 shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 id="pause-title" className="font-display text-2xl font-bold text-[#faf2e1]">
            Пауза
          </h2>
          <p className="text-xs text-[#b5a78f]">
            Симуляцію королівства призупинено. Усі таймери й походи збережено.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onToggleEcoMode}
            aria-pressed={ecoMode}
            className="w-full px-3.5 py-2.5 rounded border border-[#3d3327] bg-[#231d17] hover:border-[#8c7143] flex items-center justify-between text-sm text-[#e8decb] cursor-pointer"
          >
            <span>Еко-режим (слабкий ПК)</span>
            <span className={`font-semibold text-xs ${ecoMode ? 'text-[#6ce0ad]' : 'text-[#a89b84]'}`}>
              {ecoMode ? 'Увімкнено' : 'Вимкнено'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={!muted}
            className="w-full px-3.5 py-2.5 rounded border border-[#3d3327] bg-[#231d17] hover:border-[#8c7143] flex items-center justify-between text-sm text-[#e8decb] cursor-pointer"
          >
            <span>Звукові ефекти</span>
            <span className={`font-semibold text-xs ${!muted ? 'text-[#6ce0ad]' : 'text-[#e86f66]'}`}>
              {!muted ? 'Увімкнено' : 'Вимкнено'}
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 rounded bg-[#d4a64a] hover:bg-[#e3b75c] text-[#17120c] font-bold text-sm cursor-pointer"
          >
            Продовжити гру
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="py-2 rounded border border-[#4a3d2d] bg-[#241e18] hover:border-[#c89b3c] text-[#ece2cf] font-semibold text-xs cursor-pointer"
            >
              Почати заново
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="py-2 rounded border border-[#4a3d2d] bg-[#241e18] hover:border-[#c89b3c] text-[#ece2cf] font-semibold text-xs cursor-pointer"
            >
              Змінити цивілізацію
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function GameOverModal({
  snapshot,
  onPlayAgain,
  onBackToTitle,
}: {
  snapshot: RunSnapshot;
  onPlayAgain: () => void;
  onBackToTitle: () => void;
}) {
  const isVictory = snapshot.outcome === 'victory';
  const civ = CIVILIZATIONS[snapshot.civId];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-title"
      className="fixed inset-0 z-40 bg-[#0d0a08]/85 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-[460px] rounded-md bg-[#1b1611] border border-[#c89b3c]/55 shadow-[0_24px_60px_rgba(0,0,0,0.75)] p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3.5">
          <CivEmblem civId={snapshot.civId} size={46} className="shrink-0" />
          <div>
            <h2
              id="outcome-title"
              className={`font-display text-2xl sm:text-3xl font-bold ${
                isVictory ? 'text-[#f5cf74]' : 'text-[#ef7a72]'
              }`}
            >
              {isVictory ? 'Володар Королівства' : 'Місто впало'}
            </h2>
            <p className="text-xs text-[#c7b9a1] mt-0.5">
              {civ.name} · Час {formatDuration(snapshot.elapsedSec)}
            </p>
          </div>
        </div>

        <p className="text-sm text-[#e4d9c6] leading-relaxed">{snapshot.reason}</p>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded bg-[#241e18] border border-[#3a3025] p-3 flex flex-col">
            <span className="text-[11px] text-[#a99c85]">Мощь</span>
            <span className="font-mono-num text-lg font-bold text-[#f2c866]">
              {snapshot.power.toLocaleString('uk-UA')}
            </span>
          </div>
          <div className="rounded bg-[#241e18] border border-[#3a3025] p-3 flex flex-col">
            <span className="text-[11px] text-[#a99c85]">Ратуша / Ком.</span>
            <span className="font-mono-num text-lg font-bold text-[#f7efde]">
              {snapshot.cityHallLevel} / {snapshot.commanderLevel}
            </span>
          </div>
          <div className="rounded bg-[#241e18] border border-[#3a3025] p-3 flex flex-col">
            <span className="text-[11px] text-[#a99c85]">Варварів</span>
            <span className="font-mono-num text-lg font-bold text-[#6ce0ad]">
              {snapshot.barbariansDefeated}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 py-2.5 rounded bg-[#d4a64a] hover:bg-[#e3b75c] text-[#17120c] font-bold text-sm cursor-pointer whitespace-nowrap"
          >
            {isVictory ? 'Нове королівство' : 'Спробувати ще раз'}
          </button>
          <button
            type="button"
            onClick={onBackToTitle}
            className="px-4 py-2.5 rounded border border-[#4a3d2d] bg-[#241e18] hover:border-[#c89b3c] text-[#ece2cf] font-semibold text-sm cursor-pointer whitespace-nowrap"
          >
            Інша цивілізація
          </button>
        </div>
      </div>
    </div>
  );
}
