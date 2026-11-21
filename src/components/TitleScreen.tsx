import { useEffect, useState } from 'react';
import { CIV_ORDER, CIVILIZATIONS } from '../game/civilizations';
import type { CivId, Difficulty } from '../game/types';
import { CivEmblem, TitleLockup } from './NationEmblem';

interface TitleScreenProps {
  selectedCiv: CivId;
  difficulty: Difficulty;
  ecoMode: boolean;
  onSelectCiv: (civ: CivId) => void;
  onSelectDifficulty: (diff: Difficulty) => void;
  onToggleEcoMode: () => void;
  onStartGame: () => void;
}

const DIFFICULTY_OPTIONS: Array<{ id: Difficulty; label: string; hint: string }> = [
  { id: 'novice', label: 'Новачок', hint: 'Легші варвари та спокійний старт' },
  { id: 'strategist', label: 'Стратег', hint: 'Збалансоване королівство' },
  { id: 'emperor', label: 'Імператор', hint: 'Часті набіги та сильний Храм' },
];

export function TitleScreen({
  selectedCiv,
  difficulty,
  ecoMode,
  onSelectCiv,
  onSelectDifficulty,
  onToggleEcoMode,
  onStartGame,
}: TitleScreenProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const current = CIVILIZATIONS[selectedCiv];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const active = document.activeElement;
        if (active && active.tagName === 'BUTTON' && !active.hasAttribute('data-start')) {
          return;
        }
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame]);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#120f0c] flex flex-col justify-between">
      {!imgFailed ? (
        <img
          src="/src/assets/images/title_bg_1795247942173.jpg"
          alt="Старовинний стіл стратега з картою королівства та прапорами цивілізацій"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_72%_45%,#3c2a1a_0%,#18130e_55%,#0e0b09_100%)]"
        />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(95deg, rgba(14,11,8,0.95) 0%, rgba(16,13,10,0.90) 48%, rgba(16,13,10,0.42) 74%, rgba(14,11,8,0.22) 100%)',
        }}
      />

      <div className="relative z-10 flex-1 flex items-center px-5 sm:px-10 lg:px-14 py-5 overflow-y-auto war-scroll">
        <div className="w-full max-w-[600px] flex flex-col gap-4">
          <TitleLockup />

          {/* 7 Civilizations Selection Deck */}
          <section aria-label="Вибір цивілізації" className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-semibold text-[#e6d7bd] tracking-wide">
                Оберіть вашу цивілізацію
              </h2>
              <span className="text-xs text-[#a89b84]">7 історичних держав</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {CIV_ORDER.map((id) => {
                const civ = CIVILIZATIONS[id];
                const isSelected = id === selectedCiv;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectCiv(id)}
                    aria-pressed={isSelected}
                    className={`ui-transition flex flex-col items-center gap-1 px-1.5 py-2 rounded-md border text-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e2b659] ${
                      isSelected
                        ? 'bg-[#2a2219] border-[#d9ac50] text-[#fff6e3] shadow-[0_0_0_1px_rgba(217,172,80,0.35)]'
                        : 'bg-[#191511]/90 border-[#3d3327] text-[#c8bba4] hover:border-[#8c7143] hover:text-[#f3ecde]'
                    }`}
                  >
                    <CivEmblem civId={id} size={26} />
                    <span className="text-[11px] font-semibold whitespace-nowrap leading-tight">
                      {civ.shortName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Civilization & Commander Dossier */}
            <div className="rounded-md bg-[#181410]/95 border border-[#c89b3c]/30 px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <CivEmblem civId={current.id} size={36} className="shrink-0" />
                <div className="min-w-0">
                  <div className="font-display text-lg font-bold text-[#faf2e1] leading-snug">
                    {current.name}
                  </div>
                  <div className="text-xs text-[#b5a78f]">
                    Командир: <span className="text-[#f5d27b] font-semibold">{current.commanderName}</span> · Юніт: <span className="text-[#e6dac4]">{current.uniqueUnit}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#ddd2be] leading-relaxed">
                <span className="text-[#e6c06d] font-medium">{current.bonusTitle}:</span> {current.bonusDesc}
              </p>

              <div className="pt-2 border-t border-[#c89b3c]/15 text-xs text-[#c5b79f] leading-relaxed">
                <span className="text-[#e6c06d] font-semibold">Активне вміння «{current.skillName}»:</span>{' '}
                {current.skillDesc}
              </div>
            </div>
          </section>

          {/* Difficulty & Low-Spec Eco Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Складність королівства"
              className="inline-flex items-center p-1 rounded-md bg-[#181410]/95 border border-[#3a3025] gap-1"
            >
              {DIFFICULTY_OPTIONS.map((opt) => {
                const active = opt.id === difficulty;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectDifficulty(opt.id)}
                    aria-pressed={active}
                    title={opt.hint}
                    className={`ui-transition px-3 py-1.5 text-xs font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#e2b659] ${
                      active
                        ? 'bg-[#c89b3c] text-[#17120c]'
                        : 'text-[#bfb39d] hover:text-[#f5ecdc]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onToggleEcoMode}
              aria-pressed={ecoMode}
              className={`ui-transition px-3 py-2 text-xs font-medium rounded-md border cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#e2b659] ${
                ecoMode
                  ? 'bg-[#213326] border-[#4ca16f]/60 text-[#b8f0cd]'
                  : 'bg-[#181410]/90 border-[#3a3025] text-[#b9ab94] hover:text-[#f3ecde]'
              }`}
            >
              Еко-режим (слабкий ПК): {ecoMode ? 'Увімк.' : 'Вимк.'}
            </button>
          </div>

          {/* Primary Start CTA */}
          <div className="flex items-center gap-4 pt-0.5">
            <button
              type="button"
              data-start="true"
              onClick={onStartGame}
              className="ui-transition px-7 py-3 rounded-md bg-[#d4a64a] hover:bg-[#e2b659] active:scale-[0.99] text-[#16110b] font-bold text-base tracking-wide cursor-pointer shadow-[0_6px_20px_rgba(0,0,0,0.45)] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fff2cf]"
            >
              Заснувати місто
            </button>
            <span className="text-xs text-[#b5a78f] leading-snug">
              Туман війни · Таверна · Альянс · Без WebGL
            </span>
          </div>
        </div>
      </div>

      <footer className="relative z-10 px-5 sm:px-10 lg:px-14 pb-3.5 pt-1 text-xs text-[#a99c85] flex items-center justify-between gap-4">
        <span className="truncate">
          Tab Місто / Карта світу · C Командири · WASD або перетягування — карта · Esc Пауза
        </span>
        <span className="hidden sm:inline whitespace-nowrap shrink-0 text-[#8f836f]">
          Enter — старт
        </span>
      </footer>
    </main>
  );
}
