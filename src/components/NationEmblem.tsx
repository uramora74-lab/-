import { CIVILIZATIONS } from '../game/civilizations';
import type { CivId, ResourceKey } from '../game/types';

export function CivEmblem({
  civId,
  size = 28,
  className = '',
}: {
  civId: CivId;
  size?: number;
  className?: string;
}) {
  const civ = CIVILIZATIONS[civId];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5 4.5C5 3.67 5.67 3 6.5 3H25.5C26.33 3 27 3.67 27 4.5V15.4C27 22.1 21.8 27.1 16 29.5C10.2 27.1 5 22.1 5 15.4V4.5Z"
        fill={civ.bannerBg}
        stroke={civ.accentStroke}
        strokeWidth="1.8"
      />
      <path
        d="M7.2 5.4H24.8V15C24.8 20.4 20.6 24.6 16 26.8C11.4 24.6 7.2 20.4 7.2 15V5.4Z"
        fill={civ.roofColor}
        fillOpacity="0.68"
      />

      {civId === 'rome' && (
        <path
          d="M9.5 13.5L16 10.5L22.5 13.5M12 16.5L16 14.5L20 16.5M16 9V22.5M12.5 21.5H19.5"
          stroke="#f8d882"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {civId === 'rus' && (
        <path
          d="M16 8V23M11.5 10.5V15.5C11.5 18 13.5 19.5 16 19.5C18.5 19.5 20.5 18 20.5 15.5V10.5M13.5 13L16 10.5L18.5 13"
          stroke="#f8d882"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {civId === 'vikings' && (
        <path
          d="M11 21L21 10M21 21L11 10M16 8.5V22.5M11.8 11.8C10.5 12.8 10.2 14.3 10.5 15.8M20.2 11.8C21.5 12.8 21.8 14.3 21.5 15.8"
          stroke="#d9fbed"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}

      {civId === 'china' && (
        <path
          d="M9.5 13.5H22.5M11.5 10.5H20.5M13.5 8H18.5M12 13.5V21.5M20 13.5V21.5M10.5 21.5H21.5"
          stroke="#fde08d"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {civId === 'ottoman' && (
        <>
          <path d="M17.8 9.2A6.5 6.5 0 1 0 17.8 21.8A5.1 5.1 0 1 1 17.8 9.2Z" fill="#f7d98b" />
          <circle cx="19.5" cy="15.5" r="1.6" fill="#fff1c4" />
        </>
      )}

      {civId === 'germany' && (
        /* Teutonic Iron Cross */
        <path
          d="M14 8.5H18L17.2 13.5H22.5V17.5L17.2 16.8L18 22.5H14L14.8 16.8L9.5 17.5V13.5L14.8 13.5L14 8.5Z"
          fill="#e2e8f0"
          stroke="#1e293b"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}

      {civId === 'japan' && (
        /* Samurai Rising Sun & Kabuto Crescent */
        <>
          <circle cx="16" cy="15.5" r="4.8" fill="#ffe4e6" />
          <path
            d="M10.5 11C12.2 13.2 14 14 16 14C18 14 19.8 13.2 21.5 11"
            stroke="#fde08d"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export function ResourceIcon({
  type,
  size = 15,
}: {
  type: ResourceKey;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
      {type === 'food' && (
        <path
          d="M10 17V4M10 7L6.5 4.5M10 7L13.5 4.5M10 10.5L6 8M10 10.5L14 8M10 14L6.5 11.5M10 14L13.5 11.5"
          stroke="#eab84d"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
      {type === 'wood' && (
        <>
          <rect x="3" y="6.5" width="14" height="7" rx="3.2" fill="#8f5c34" stroke="#d19a66" strokeWidth="1.3" />
          <circle cx="14.5" cy="10" r="2.2" fill="#c9935f" />
        </>
      )}
      {type === 'stone' && (
        <path
          d="M3.5 14L6 6.5L12.5 5L16.5 9.5L15 15H3.5Z"
          fill="#9da4ad"
          stroke="#d4dae2"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      )}
      {type === 'gold' && (
        <>
          <circle cx="10" cy="10" r="7" fill="#e5b342" stroke="#fff0b8" strokeWidth="1.3" />
          <circle cx="10" cy="10" r="3.2" stroke="#7d5610" strokeWidth="1.3" />
        </>
      )}
    </svg>
  );
}

export function TitleLockup() {
  return (
    <div className="select-none">
      <svg
        viewBox="0 0 430 112"
        className="w-full max-w-[400px] h-auto overflow-visible"
        role="img"
        aria-label="Межа Імперій"
      >
        <defs>
          <linearGradient id="brassInkRok7" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff4d6" />
            <stop offset="52%" stopColor="#e3bd69" />
            <stop offset="100%" stopColor="#a07428" />
          </linearGradient>
        </defs>

        <path d="M4 22H128M154 22H292" stroke="#c89b3c" strokeOpacity="0.65" strokeWidth="1.2" />
        <polygon points="141,14 148,22 141,30 134,22" fill="#d4a64a" />
        <polygon points="141,17.5 144.5,22 141,26.5 137.5,22" fill="#17130f" />

        <text
          x="2"
          y="74"
          fill="url(#brassInkRok7)"
          stroke="#120e0a"
          strokeWidth="4"
          paintOrder="stroke fill"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 800,
            fontSize: '46px',
            letterSpacing: '0.03em',
          }}
        >
          МЕЖА ІМПЕРІЙ
        </text>

        <path d="M4 92H362" stroke="#c89b3c" strokeOpacity="0.4" strokeWidth="1" />
        <text
          x="4"
          y="107"
          fill="#c9bca4"
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 600,
            fontSize: '12px',
            letterSpacing: '0.15em',
          }}
        >
          7 ЦИВІЛІЗАЦІЙ · МІСТО, РОЗВІДКА ТА КАРТА СВІТУ
        </text>
      </svg>
    </div>
  );
}
