import type { RokGameState } from '../game/types';

interface TavernModalProps {
  state: RokGameState;
  onOpenGoldenChest: () => void;
  onClose: () => void;
}

export function TavernModal({ state, onOpenGoldenChest, onClose }: TavernModalProps) {
  const lockedCount = state.commanders.filter((c) => !c.unlocked).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tavern-title"
      className="fixed inset-0 z-40 bg-[#0d0a08]/82 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto war-scroll rounded-md bg-[#1b1611] border border-[#c89b3c]/50 shadow-[0_22px_54px_rgba(0,0,0,0.75)] p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="tavern-title" className="font-display text-2xl font-bold text-[#faf2e1]">
              Командири та Таверна
            </h2>
            <p className="text-xs text-[#b5a78f] mt-0.5">
              Відкривайте Золоті скрині, щоб наймати легендарних полководців і посилювати походи.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити Таверну"
            className="text-sm text-[#b5a78f] hover:text-[#fff4df] cursor-pointer px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Golden Chest Banner */}
        <div className="rounded bg-[#251e15] border border-[#c89b3c]/40 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-[#f7d881]">
              Золота скриня Таверни · Ключів:{' '}
              <span className="font-mono-num text-[#fff5d4]">{state.goldenKeys}</span>
            </div>
            <div className="text-xs text-[#c5b79f] mt-0.5">
              {lockedCount > 0
                ? `Гарантовано відкриває нового командира (лишилось ${lockedCount})`
                : 'Усі командири відкриті: дає +140 досвіду та +2 Прискорення'}
            </div>
          </div>

          <button
            type="button"
            disabled={state.goldenKeys <= 0}
            onClick={onOpenGoldenChest}
            className="px-4 py-2 rounded bg-[#d4a64a] hover:bg-[#e3b75c] disabled:opacity-40 disabled:cursor-not-allowed text-[#17120c] font-bold text-xs cursor-pointer whitespace-nowrap"
          >
            Відкрити (1 ключ)
          </button>
        </div>

        {/* Commanders Roster */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {state.commanders.map((cmd) => (
            <div
              key={cmd.id}
              className={`rounded border p-3 flex flex-col gap-1.5 ${
                cmd.unlocked
                  ? 'bg-[#221c16] border-[#c89b3c]/35'
                  : 'bg-[#17130f] border-[#2e261d] opacity-65'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#15110c] shrink-0"
                    style={{ backgroundColor: cmd.accentColor }}
                  >
                    {cmd.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#f7efde] truncate">{cmd.name}</div>
                    <div className="text-[11px] text-[#a99c85] truncate">{cmd.title}</div>
                  </div>
                </div>
                <span className="font-mono-num text-xs font-bold text-[#f4cb6a] whitespace-nowrap">
                  {cmd.unlocked ? `Рів.${cmd.level}` : 'Закрито'}
                </span>
              </div>

              <div className="text-[11px] text-[#dcd0bc] leading-snug">
                <strong className="text-[#e6c06d]">{cmd.skillName}:</strong> {cmd.skillDesc}
              </div>

              {cmd.unlocked && (
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono-num text-[#a99c85]">
                  <span>
                    XP {cmd.xp}/{cmd.xpToNext}
                  </span>
                  <span>
                    Атк +{Math.round(cmd.attackBonus * 100)}%
                    {cmd.gatherBonus > 0 ? ` · Збір +${Math.round(cmd.gatherBonus * 100)}%` : ''}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
