import {
  ALLIANCE_HELP_SECONDS,
  BUILDING_META,
  BUILDING_ORDER,
  CIVILIZATIONS,
  SPEEDUP_SECONDS,
  TECH_META,
  TECH_ORDER,
  TROOP_META,
  TROOP_ORDER,
} from '../game/civilizations';
import {
  canAfford,
  getProductionRatesPerSec,
  getTechCost,
  getUpgradeCost,
  getUpgradeDurationSec,
  totalTroops,
} from '../game/rokEngine';
import type { BuildingId, Resources, RokGameState, TechId, TroopType } from '../game/types';
import { ResourceIcon } from './NationEmblem';

interface CityViewProps {
  state: RokGameState;
  selectedBuilding: BuildingId | null;
  onSelectBuilding: (id: BuildingId | null) => void;
  onUpgradeBuilding: (id: BuildingId) => void;
  onTrainTroops: (type: TroopType, mult: number) => void;
  onResearchTech: (tech: TechId) => void;
  onUseSpeedup: (target: 'building' | 'training' | 'research') => void;
  onRequestHelp: (target: 'building' | 'training' | 'research') => void;
  onHealWounded: () => void;
  onRepairWall: () => void;
}

function CostRow({ cost, current }: { cost: Resources; current: Resources }) {
  const rawEntries: Array<{ key: keyof Resources; val: number }> = [
    { key: 'food', val: cost.food },
    { key: 'wood', val: cost.wood },
    { key: 'stone', val: cost.stone },
    { key: 'gold', val: cost.gold },
  ];
  const entries = rawEntries.filter((e) => e.val > 0);

  return (
    <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono-num">
      {entries.map((e) => {
        const enough = current[e.key] >= e.val;
        return (
          <span
            key={e.key}
            className={`inline-flex items-center gap-1 ${enough ? 'text-[#e8decb]' : 'text-[#ef7a72]'}`}
          >
            <ResourceIcon type={e.key} size={13} />
            {e.val}
          </span>
        );
      })}
    </div>
  );
}

function BuildingGraphic({
  id,
  x,
  y,
  level,
  roofColor,
  accentStroke,
  selected,
  woundedCount,
}: {
  id: BuildingId;
  x: number;
  y: number;
  level: number;
  roofColor: string;
  accentStroke: string;
  selected: boolean;
  woundedCount: number;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <ellipse
        cx="0"
        cy="18"
        rx={id === 'cityHall' ? 76 : id === 'wall' ? 110 : 54}
        ry={id === 'cityHall' ? 34 : id === 'wall' ? 22 : 25}
        fill={selected ? '#4c5f36' : '#354829'}
        stroke={selected ? '#f6d16e' : '#657a49'}
        strokeWidth={selected ? 2.6 : 1.2}
      />

      {id === 'cityHall' && (
        <g>
          <rect x="-46" y="-20" width="92" height="40" rx="3" fill="#cfc5b2" stroke="#2c241b" strokeWidth="2" />
          <rect x="-56" y="-32" width="22" height="52" rx="2" fill="#beb29e" stroke="#2c241b" strokeWidth="1.8" />
          <rect x="34" y="-32" width="22" height="52" rx="2" fill="#beb29e" stroke="#2c241b" strokeWidth="1.8" />
          <polygon points="-60,-30 -45,-52 -30,-30" fill={roofColor} stroke={accentStroke} strokeWidth="1.4" />
          <polygon points="30,-30 45,-52 60,-30" fill={roofColor} stroke={accentStroke} strokeWidth="1.4" />
          <polygon points="-50,-20 0,-56 50,-20" fill={roofColor} stroke={accentStroke} strokeWidth="1.8" />
          <path d="M-12 20V2C-12 -5 12 -5 12 2V20Z" fill="#4d3420" stroke="#2c241b" strokeWidth="1.6" />
          <line x1="0" y1="-56" x2="0" y2="-72" stroke="#f5d98c" strokeWidth="2" />
          <polygon points="0,-72 18,-66 0,-60" fill={roofColor} stroke={accentStroke} strokeWidth="1" />
        </g>
      )}

      {id === 'farm' && (
        <g>
          <polygon points="-44,12 -6,-4 44,10 6,24" fill="#c2973b" stroke="#7d5d1e" strokeWidth="1.4" />
          <path d="M-30 12L4 -1M-18 16L16 3M-6 20L28 7" stroke="#f2d179" strokeWidth="1.6" />
          <rect x="-34" y="-22" width="32" height="24" fill="#a87447" stroke="#2d2015" strokeWidth="1.6" />
          <polygon points="-38,-22 -18,-38 2,-22" fill={roofColor} stroke={accentStroke} strokeWidth="1.3" />
        </g>
      )}

      {id === 'lumber' && (
        <g>
          <rect x="-32" y="-18" width="44" height="30" fill="#8f633e" stroke="#291c11" strokeWidth="1.6" />
          <polygon points="-38,-18 -10,-36 18,-18" fill={roofColor} stroke={accentStroke} strokeWidth="1.3" />
          <circle cx="24" cy="6" r="7" fill="#b37a47" stroke="#291c11" strokeWidth="1.4" />
          <circle cx="34" cy="10" r="7" fill="#c78b56" stroke="#291c11" strokeWidth="1.4" />
          <polygon points="-44,4 -34,-18 -24,4" fill="#214d2c" />
        </g>
      )}

      {id === 'quarry' && (
        <g>
          <polygon points="-38,14 -24,-22 10,-28 36,14" fill="#8c929b" stroke="#2a2d33" strokeWidth="1.8" />
          <polygon points="-14,14 -2,-16 24,-10 30,14" fill="#adb3bc" stroke="#2a2d33" strokeWidth="1.4" />
          <line x1="-18" y1="12" x2="-18" y2="-32" stroke="#855a34" strokeWidth="3" />
          <line x1="-18" y1="-30" x2="10" y2="-22" stroke="#855a34" strokeWidth="2.5" />
        </g>
      )}

      {id === 'barracks' && (
        <g>
          <rect x="-38" y="-18" width="76" height="32" rx="2" fill="#b7ad9c" stroke="#2a231b" strokeWidth="1.8" />
          <polygon points="-42,-18 0,-42 42,-18" fill={roofColor} stroke={accentStroke} strokeWidth="1.5" />
          <path d="M-12 -2L12 -14M12 -2L-12 -14" stroke="#f7e2a3" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="-10" y="2" width="20" height="12" fill="#4a311e" />
        </g>
      )}

      {id === 'academy' && (
        <g>
          <rect x="-36" y="-14" width="72" height="28" rx="2" fill="#d9d0be" stroke="#2c241b" strokeWidth="1.8" />
          <path d="M-24 -14C-24 -38 24 -38 24 -14Z" fill={roofColor} stroke={accentStroke} strokeWidth="1.6" />
          <line x1="-22" y1="-12" x2="-22" y2="12" stroke="#8a7f6d" strokeWidth="2" />
          <line x1="0" y1="-12" x2="0" y2="12" stroke="#8a7f6d" strokeWidth="2" />
          <line x1="22" y1="-12" x2="22" y2="12" stroke="#8a7f6d" strokeWidth="2" />
        </g>
      )}

      {id === 'hospital' && (
        <g>
          <rect x="-34" y="-16" width="68" height="30" rx="2" fill="#dfd9ce" stroke="#2c241b" strokeWidth="1.8" />
          <polygon points="-38,-16 0,-38 38,-16" fill={roofColor} stroke={accentStroke} strokeWidth="1.5" />
          <rect x="-4" y="-11" width="8" height="20" rx="1" fill="#d94848" />
          <rect x="-10" y="-5" width="20" height="8" rx="1" fill="#d94848" />
          {woundedCount > 0 && (
            <g transform="translate(26, -30)">
              <circle cx="0" cy="0" r="11" fill="#c93632" stroke="#fff3d2" strokeWidth="1.4" />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#ffffff"
                style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9.5px', fontWeight: 700 }}
              >
                {woundedCount}
              </text>
            </g>
          )}
        </g>
      )}

      {id === 'wall' && (
        <g>
          <rect x="-95" y="-10" width="190" height="24" rx="2" fill="#aba497" stroke="#26211b" strokeWidth="2" />
          <rect x="-102" y="-22" width="24" height="36" fill="#9c9588" stroke="#26211b" strokeWidth="1.8" />
          <rect x="78" y="-22" width="24" height="36" fill="#9c9588" stroke="#26211b" strokeWidth="1.8" />
          <path d="M-16 14V-2C-16 -10 16 -10 16 -2V14Z" fill="#472f1c" stroke="#26211b" strokeWidth="1.8" />
          <polygon points="-104,-22 -90,-34 -76,-22" fill={roofColor} stroke={accentStroke} strokeWidth="1.2" />
          <polygon points="76,-22 90,-34 104,-22" fill={roofColor} stroke={accentStroke} strokeWidth="1.2" />
        </g>
      )}

      {/* Level Plate */}
      <g transform="translate(0, 34)">
        <rect
          x="-48"
          y="-10"
          width="96"
          height="20"
          rx="4"
          fill="#17130f"
          fillOpacity="0.92"
          stroke={selected ? '#f4c960' : '#6c5a3f'}
          strokeWidth={selected ? 1.6 : 1}
        />
        <text
          x="0"
          y="4"
          textAnchor="middle"
          fill="#f4ecdc"
          style={{ fontFamily: '"Manrope", sans-serif', fontSize: '11px', fontWeight: 700 }}
        >
          {BUILDING_META[id].name} · {level}
        </text>
      </g>
    </g>
  );
}

export function CityView({
  state,
  selectedBuilding,
  onSelectBuilding,
  onUpgradeBuilding,
  onTrainTroops,
  onResearchTech,
  onUseSpeedup,
  onRequestHelp,
  onHealWounded,
  onRepairWall,
}: CityViewProps) {
  const civ = CIVILIZATIONS[state.civId];
  const rates = getProductionRatesPerSec(state);
  const anyUpgrading = BUILDING_ORDER.some((id) => state.buildings[id].upgrading);
  const selState = selectedBuilding ? state.buildings[selectedBuilding] : null;
  const selMeta = selectedBuilding ? BUILDING_META[selectedBuilding] : null;
  const woundedCount = totalTroops(state.wounded);

  return (
    <div
      data-testid="city-view"
      className="relative w-full h-full overflow-hidden select-none flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at 50% 45%, #3b5732 0%, #273c22 55%, #172415 100%)',
      }}
    >
      <svg
        viewBox="0 0 1000 560"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-w-[1380px] p-1 sm:p-3"
        role="group"
        aria-label="Ваше місто"
      >
        <polygon
          points="125,90 875,90 935,470 65,470"
          fill="#2f4727"
          stroke="#7b7468"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <polygon
          points="136,100 864,100 920,460 80,460"
          fill="none"
          stroke="#4d5c3b"
          strokeWidth="2"
        />

        <g stroke="#7d725d" strokeWidth="14" strokeLinecap="round" opacity="0.65">
          <line x1="500" y1="215" x2="500" y2="480" />
          <line x1="230" y1="295" x2="770" y2="295" />
          <line x1="265" y1="155" x2="500" y2="215" />
          <line x1="735" y1="155" x2="500" y2="215" />
          <line x1="390" y1="380" x2="615" y2="380" />
        </g>

        <g fill="#1c3519" opacity="0.8">
          <polygon points="45,170 60,130 75,170" />
          <polygon points="28,215 45,175 62,215" />
          <polygon points="925,160 943,120 961,160" />
          <polygon points="945,225 961,185 977,225" />
        </g>

        {BUILDING_ORDER.map((id) => {
          const b = state.buildings[id];
          const meta = BUILDING_META[id];
          const isSelected = selectedBuilding === id;

          let activeTimer: { left: number; total: number; label: string } | null = null;
          if (b.upgrading) {
            activeTimer = {
              left: b.upgradeTimeLeft,
              total: b.upgradeTotalTime,
              label: `Рів.${b.level + 1} · ${Math.ceil(b.upgradeTimeLeft)}с`,
            };
          } else if (id === 'barracks' && state.trainingQueue) {
            activeTimer = {
              left: state.trainingQueue.timeLeft,
              total: state.trainingQueue.totalTime,
              label: `Тренування ${Math.ceil(state.trainingQueue.timeLeft)}с`,
            };
          } else if (id === 'academy' && state.researchQueue) {
            activeTimer = {
              left: state.researchQueue.timeLeft,
              total: state.researchQueue.totalTime,
              label: `Наука ${Math.ceil(state.researchQueue.timeLeft)}с`,
            };
          }

          return (
            <g
              key={id}
              role="button"
              tabIndex={0}
              aria-label={`${meta.name}, рівень ${b.level}${b.upgrading ? ', покращується' : ''}`}
              aria-pressed={isSelected}
              onClick={() => onSelectBuilding(isSelected ? null : id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBuilding(isSelected ? null : id);
                }
              }}
              className="cursor-pointer focus:outline-none"
            >
              <BuildingGraphic
                id={id}
                x={meta.plotX}
                y={meta.plotY}
                level={b.level}
                roofColor={civ.roofColor}
                accentStroke={civ.accentStroke}
                selected={isSelected}
                woundedCount={id === 'hospital' ? woundedCount : 0}
              />

              {activeTimer && (
                <g transform={`translate(${meta.plotX}, ${meta.plotY - 56})`} pointerEvents="none">
                  <rect
                    x="-50"
                    y="-12"
                    width="100"
                    height="18"
                    rx="4"
                    fill="#14100c"
                    stroke="#e5ba5c"
                    strokeWidth="1.2"
                  />
                  <rect
                    x="-48"
                    y="-10"
                    width={Math.max(
                      4,
                      Math.round(96 * (1 - activeTimer.left / Math.max(0.1, activeTimer.total)))
                    )}
                    height="14"
                    rx="3"
                    fill="#c89b3c"
                    fillOpacity="0.45"
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    fill="#fff4d6"
                    style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9.5px', fontWeight: 700 }}
                  >
                    {activeTimer.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {selectedBuilding && selState && selMeta && (
        <aside
          aria-label={`Керування: ${selMeta.name}`}
          className="fixed bottom-16 right-3 z-30 w-[calc(100vw-24px)] max-w-[356px] max-h-[calc(100vh-140px)] overflow-y-auto war-scroll rounded-md bg-[#181410]/96 border border-[#c89b3c]/45 shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-[#faf2e1] leading-tight">
                {selMeta.name} · Рівень {selState.level}
              </h2>
              <p className="text-xs text-[#b5a78f] mt-0.5">{selMeta.role}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectBuilding(null)}
              aria-label="Закрити панель будівлі"
              className="text-xs text-[#b5a78f] hover:text-[#fff4df] cursor-pointer px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>

          {selectedBuilding === 'farm' && (
            <div className="text-xs text-[#d6ccb8]">
              Виробництво їжі: <strong className="font-mono-num text-[#6ce0ad]">+{rates.food}/с</strong>
            </div>
          )}
          {selectedBuilding === 'lumber' && (
            <div className="text-xs text-[#d6ccb8]">
              Виробництво дерева: <strong className="font-mono-num text-[#6ce0ad]">+{rates.wood}/с</strong>
            </div>
          )}
          {selectedBuilding === 'quarry' && (
            <div className="text-xs text-[#d6ccb8]">
              Виробництво каменю: <strong className="font-mono-num text-[#6ce0ad]">+{rates.stone}/с</strong>
            </div>
          )}

          {/* Upgrade Section with Alliance Help + Speedup */}
          <div className="rounded bg-[#221c16] border border-[#3a3025] p-3 flex flex-col gap-2">
            {selState.upgrading ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-[#f2ca6b] font-semibold font-mono-num">
                  Покращення → Рів.{selState.level + 1} ({Math.ceil(selState.upgradeTimeLeft)}с)
                </div>
                <div className="flex items-center gap-2">
                  {!selState.helpRequested && (
                    <button
                      type="button"
                      onClick={() => onRequestHelp('building')}
                      className="flex-1 py-1.5 rounded bg-[#2a4a6b] hover:bg-[#37608a] text-xs font-bold text-[#dff0ff] cursor-pointer whitespace-nowrap"
                    >
                      Допомога альянсу (-{ALLIANCE_HELP_SECONDS}с)
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={state.speedups <= 0}
                    onClick={() => onUseSpeedup('building')}
                    className="flex-1 py-1.5 rounded bg-[#2c523b] hover:bg-[#386b4c] disabled:opacity-40 text-xs font-bold text-[#d7fce6] cursor-pointer whitespace-nowrap"
                  >
                    Прискорити (-{SPEEDUP_SECONDS}с)
                  </button>
                </div>
              </div>
            ) : selState.level >= selState.maxLevel ? (
              <div className="text-xs text-[#6ce0ad] font-semibold">Максимальний рівень досягнуто</div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#ede3d0]">
                    Покращити до Рів.{selState.level + 1}
                  </span>
                  <span className="font-mono-num text-[#a99c85]">
                    {getUpgradeDurationSec(state, selectedBuilding)}с
                  </span>
                </div>
                <CostRow
                  cost={getUpgradeCost(selectedBuilding, selState.level)}
                  current={state.resources}
                />
                {selectedBuilding !== 'cityHall' && selState.level >= state.buildings.cityHall.level ? (
                  <div className="text-[11px] text-[#e5a856]">
                    Спочатку покращіть Ратушу до рівня {selState.level + 1}.
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={
                      anyUpgrading ||
                      !canAfford(state.resources, getUpgradeCost(selectedBuilding, selState.level))
                    }
                    onClick={() => onUpgradeBuilding(selectedBuilding)}
                    className="w-full py-2 rounded bg-[#d4a64a] hover:bg-[#e3b75c] disabled:opacity-40 disabled:cursor-not-allowed text-[#17120c] font-bold text-xs cursor-pointer"
                  >
                    {anyUpgrading ? 'Будівельники зайняті' : 'Покращити'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Hospital Healing Panel */}
          {selectedBuilding === 'hospital' && (
            <div className="rounded bg-[#221c16] border border-[#3a3025] p-3 flex items-center justify-between gap-2">
              <div className="text-xs">
                <div className="text-[#ede3d0] font-semibold">Поранені воїни</div>
                <div className="font-mono-num text-[#f2958d]">
                  {woundedCount > 0 ? `${woundedCount} у шпиталі` : 'Усі воїни здорові'}
                </div>
              </div>
              <button
                type="button"
                disabled={woundedCount <= 0}
                onClick={onHealWounded}
                className="px-3 py-1.5 rounded bg-[#2c523b] hover:bg-[#386b4c] disabled:opacity-40 text-xs font-bold text-[#d7fce6] cursor-pointer whitespace-nowrap"
              >
                Вилікувати всіх
              </button>
            </div>
          )}

          {/* Barracks Training Section */}
          {selectedBuilding === 'barracks' && (
            <div className="flex flex-col gap-2 pt-1 border-t border-[#c89b3c]/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#ede3d0]">
                  Тренування · Юніт: <span className="text-[#e6c06d]">{civ.uniqueUnit}</span>
                </span>
                <span className="font-mono-num text-[#a99c85]">
                  У місті: {totalTroops(state.garrison)}
                </span>
              </div>

              {state.trainingQueue ? (
                <div className="rounded bg-[#221c16] border border-[#3a3025] p-2.5 flex flex-col gap-2">
                  <span className="text-xs text-[#f2ca6b] font-mono-num">
                    +{state.trainingQueue.count} {TROOP_META[state.trainingQueue.troopType].name} ·{' '}
                    {Math.ceil(state.trainingQueue.timeLeft)}с
                  </span>
                  <div className="flex items-center gap-2">
                    {!state.trainingQueue.helpRequested && (
                      <button
                        type="button"
                        onClick={() => onRequestHelp('training')}
                        className="flex-1 py-1 rounded bg-[#2a4a6b] hover:bg-[#37608a] text-xs font-bold text-[#dff0ff] cursor-pointer"
                      >
                        Допомога (-{ALLIANCE_HELP_SECONDS}с)
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={state.speedups <= 0}
                      onClick={() => onUseSpeedup('training')}
                      className="flex-1 py-1 rounded bg-[#2c523b] hover:bg-[#386b4c] disabled:opacity-40 text-xs font-bold text-[#d7fce6] cursor-pointer"
                    >
                      Прискорити
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {TROOP_ORDER.map((tKey) => {
                    const tMeta = TROOP_META[tKey];
                    const affordable = canAfford(state.resources, tMeta.costPer10);
                    return (
                      <div
                        key={tKey}
                        className="rounded bg-[#221c16] border border-[#342b21] px-2.5 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#f3ecde]">
                            {tMeta.name}{' '}
                            <span className="font-mono-num text-[#a99c85] font-normal">
                              ({state.garrison[tKey]})
                            </span>
                          </div>
                          <div className="text-[10px] text-[#a99c85] truncate">{tMeta.role}</div>
                          <CostRow cost={tMeta.costPer10} current={state.resources} />
                        </div>
                        <button
                          type="button"
                          disabled={!affordable}
                          onClick={() => onTrainTroops(tKey, 1)}
                          className="px-2.5 py-1.5 rounded bg-[#2e4359] hover:bg-[#3b5775] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#e6f2ff] cursor-pointer whitespace-nowrap shrink-0"
                        >
                          +10
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Academy Research Section */}
          {selectedBuilding === 'academy' && (
            <div className="flex flex-col gap-2 pt-1 border-t border-[#c89b3c]/20">
              <span className="text-xs font-semibold text-[#ede3d0]">Технології королівства</span>
              {state.researchQueue ? (
                <div className="rounded bg-[#221c16] border border-[#3a3025] p-2.5 flex flex-col gap-2">
                  <span className="text-xs text-[#f2ca6b] font-mono-num">
                    {TECH_META[state.researchQueue.techId].name} · {Math.ceil(state.researchQueue.timeLeft)}с
                  </span>
                  <div className="flex items-center gap-2">
                    {!state.researchQueue.helpRequested && (
                      <button
                        type="button"
                        onClick={() => onRequestHelp('research')}
                        className="flex-1 py-1 rounded bg-[#2a4a6b] hover:bg-[#37608a] text-xs font-bold text-[#dff0ff] cursor-pointer"
                      >
                        Допомога (-{ALLIANCE_HELP_SECONDS}с)
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={state.speedups <= 0}
                      onClick={() => onUseSpeedup('research')}
                      className="flex-1 py-1 rounded bg-[#2c523b] hover:bg-[#386b4c] disabled:opacity-40 text-xs font-bold text-[#d7fce6] cursor-pointer"
                    >
                      Прискорити
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {TECH_ORDER.map((tid) => {
                    const meta = TECH_META[tid];
                    const lv = state.techLevels[tid];
                    const cost = getTechCost(tid, lv);
                    const maxed = lv >= meta.maxLevel;
                    const lockedByAcademy = lv >= state.buildings.academy.level;
                    return (
                      <div
                        key={tid}
                        className="rounded bg-[#221c16] border border-[#342b21] px-2.5 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#f3ecde]">
                            {meta.name} ·{' '}
                            <span className="font-mono-num text-[#e6c06d]">
                              {lv}/{meta.maxLevel}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#a99c85]">{meta.desc}</div>
                          {!maxed && <CostRow cost={cost} current={state.resources} />}
                        </div>
                        <button
                          type="button"
                          disabled={maxed || lockedByAcademy || !canAfford(state.resources, cost)}
                          onClick={() => onResearchTech(tid)}
                          className="px-2.5 py-1.5 rounded bg-[#4a3970] hover:bg-[#5e488f] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#f0e6ff] cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {maxed ? 'Макс' : lockedByAcademy ? `Акад.${lv + 1}` : 'Вивчити'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* City Wall Repair */}
          {selectedBuilding === 'wall' && (
            <div className="rounded bg-[#221c16] border border-[#3a3025] p-3 flex items-center justify-between gap-2">
              <div className="text-xs">
                <div className="text-[#ede3d0] font-semibold">Міцність стіни</div>
                <div className="font-mono-num text-[#6ce0ad]">
                  {Math.round(state.wallHp)} / {state.wallMaxHp} HP
                </div>
              </div>
              <button
                type="button"
                disabled={
                  state.wallHp >= state.wallMaxHp ||
                  state.resources.wood < 45 ||
                  state.resources.stone < 55
                }
                onClick={onRepairWall}
                className="px-3 py-1.5 rounded bg-[#2c523b] hover:bg-[#386b4c] disabled:opacity-40 text-xs font-bold text-[#d7fce6] cursor-pointer whitespace-nowrap"
              >
                Ремонт (45д/55к)
              </button>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
