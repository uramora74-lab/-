import { useEffect, useRef, useState } from 'react';
import {
  BARBARIAN_AP_COST,
  CIVILIZATIONS,
  RALLY_ALLIED_TROOPS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../game/civilizations';
import {
  getFogExploredPct,
  getMarchCapacity,
  getMaxMarches,
  isPointRevealed,
  totalTroops,
} from '../game/rokEngine';
import type { RokGameState, Troops, WorldEntity } from '../game/types';

interface WorldMapViewProps {
  stateRef: React.MutableRefObject<RokGameState>;
  uiState: RokGameState;
  ecoMode: boolean;
  onDispatchMarch: (
    targetId: string,
    troops?: Troops,
    commanderId?: string,
    isRally?: boolean
  ) => void;
  onDispatchScout: (x: number, y: number) => void;
  onClaimVillage: (villageId: string) => void;
}

export function WorldMapView({
  stateRef,
  uiState,
  ecoMode,
  onDispatchMarch,
  onDispatchScout,
  onClaimVillage,
}: WorldMapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera state lives in a ref so panning never triggers React re-renders
  const camRef = useRef({
    x: 480,
    y: 500,
    dragging: false,
    moved: false,
    lastClientX: 0,
    lastClientY: 0,
  });
  const keysRef = useRef<Set<string>>(new Set());

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedFogPoint, setSelectedFogPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedCommanderId, setSelectedCommanderId] = useState<string>(
    uiState.commanders[0]?.id ?? ''
  );
  const [sendHalf, setSendHalf] = useState<boolean>(false);

  const unlockedCommanders = uiState.commanders.filter((c) => c.unlocked);
  const activeCommander =
    unlockedCommanders.find((c) => c.id === selectedCommanderId) ?? unlockedCommanders[0];

  const selectedEntity: WorldEntity | null = selectedEntityId
    ? uiState.entities[selectedEntityId] ?? null
    : null;

  // Center camera on player city or a specific entity
  const focusOn = (x: number, y: number) => {
    camRef.current.x = Math.max(120, Math.min(WORLD_WIDTH - 120, x));
    camRef.current.y = Math.max(100, Math.min(WORLD_HEIGHT - 100, y));
  };

  // WASD / Arrow panning on world map + clear keys on window blur
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysRef.current.add(k);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    const onBlur = () => {
      keysRef.current.clear();
      camRef.current.dragging = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Isolated lightweight Canvas2D renderer (throttled cleanly in Eco-mode for weak PCs)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, ecoMode ? 1 : 1.5);

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastRenderTs = 0;
    const minFrameMs = ecoMode ? 50 : 16; // 20fps Eco-mode vs 60fps standard

    const draw = (ts: number) => {
      rafId = requestAnimationFrame(draw);
      if (ts - lastRenderTs < minFrameMs) return;
      const dt = Math.min(0.05, (ts - lastRenderTs) / 1000 || 0.016);
      lastRenderTs = ts;

      // Apply WASD camera pan
      const panSpeed = 420 * dt;
      const keys = keysRef.current;
      if (keys.has('a') || keys.has('arrowleft')) camRef.current.x -= panSpeed;
      if (keys.has('d') || keys.has('arrowright')) camRef.current.x += panSpeed;
      if (keys.has('w') || keys.has('arrowup')) camRef.current.y -= panSpeed;
      if (keys.has('s') || keys.has('arrowdown')) camRef.current.y += panSpeed;

      const minCamX = Math.min(WORLD_WIDTH / 2, width / 2);
      const maxCamX = Math.max(WORLD_WIDTH / 2, WORLD_WIDTH - width / 2);
      const minCamY = Math.min(WORLD_HEIGHT / 2, height / 2);
      const maxCamY = Math.max(WORLD_HEIGHT / 2, WORLD_HEIGHT - height / 2);

      camRef.current.x = Math.max(minCamX, Math.min(maxCamX, camRef.current.x));
      camRef.current.y = Math.max(minCamY, Math.min(maxCamY, camRef.current.y));

      const s = stateRef.current;
      const offsetX = width / 2 - camRef.current.x;
      const offsetY = height / 2 - camRef.current.y;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Lush flat kingdom terrain background
      ctx.fillStyle = '#253823';
      ctx.fillRect(0, 0, width, height);

      ctx.translate(offsetX, offsetY);

      // Kingdom border meadow
      ctx.fillStyle = '#2f472a';
      ctx.fillRect(20, 20, WORLD_WIDTH - 40, WORLD_HEIGHT - 40);

      // Subtle tactical grid (low contrast, cartographic)
      ctx.strokeStyle = 'rgba(220, 200, 150, 0.06)';
      ctx.lineWidth = 1;
      for (let gx = 100; gx < WORLD_WIDTH; gx += 120) {
        ctx.beginPath();
        ctx.moveTo(gx, 20);
        ctx.lineTo(gx, WORLD_HEIGHT - 20);
        ctx.stroke();
      }
      for (let gy = 100; gy < WORLD_HEIGHT; gy += 120) {
        ctx.beginPath();
        ctx.moveTo(20, gy);
        ctx.lineTo(WORLD_WIDTH - 20, gy);
        ctx.stroke();
      }

      // Lightweight ambient landscape groves & hills (static vector triangles — 0 CPU cost)
      ctx.fillStyle = '#22381f';
      const groves = [
        [140, 290], [160, 305], [130, 560], [290, 820], [560, 810],
        [720, 140], [1050, 175], [1420, 390], [1440, 660], [1230, 860],
      ];
      for (const [tx, ty] of groves) {
        ctx.beginPath();
        ctx.moveTo(tx - 12, ty + 10);
        ctx.lineTo(tx, ty - 14);
        ctx.lineTo(tx + 12, ty + 10);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(130, 134, 138, 0.22)';
      const hills = [
        [430, 210], [950, 285], [1160, 195], [890, 745],
      ];
      for (const [hx, hy] of hills) {
        ctx.beginPath();
        ctx.moveTo(hx - 28, hy + 14);
        ctx.lineTo(hx - 4, hy - 18);
        ctx.lineTo(hx + 24, hy + 14);
        ctx.closePath();
        ctx.fill();
      }

      // Scenic Kingdom River
      ctx.strokeStyle = '#1d455e';
      ctx.lineWidth = 34;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(40, 180);
      ctx.bezierCurveTo(380, 240, 560, 80, 810, 420);
      ctx.bezierCurveTo(960, 620, 1260, 420, 1560, 580);
      ctx.stroke();

      ctx.strokeStyle = '#285e7d';
      ctx.lineWidth = 22;
      ctx.stroke();

      // Golden royal road connecting player valley to Lost Temple
      ctx.strokeStyle = 'rgba(182, 152, 102, 0.28)';
      ctx.lineWidth = 10;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(360, 520);
      ctx.lineTo(980, 495);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw dotted march & scout paths first
      for (const m of s.marches) {
        ctx.save();
        ctx.strokeStyle = m.isScout
          ? '#75d8fa'
          : m.owner === 'player'
            ? m.status === 'returning'
              ? '#6ce0ad'
              : m.isRally
                ? '#ffd972'
                : '#f4c960'
            : '#ef6a62';
        ctx.lineWidth = m.isRally ? 3.2 : 2.3;
        ctx.setLineDash(m.isScout ? [4, 5] : [6, 6]);
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.targetX, m.targetY);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Revealed World Entities (plus Lost Temple landmark)
      for (const id of s.entityOrder) {
        const e = s.entities[id];
        if (e.defeated) continue;
        const visible =
          e.kind === 'playerCity' || e.kind === 'lostTemple' || isPointRevealed(s, e.x, e.y);
        if (!visible) continue;

        const isSel = id === selectedEntityId;

        ctx.save();
        ctx.translate(e.x, e.y);

        // Selection ring
        if (isSel) {
          ctx.beginPath();
          ctx.arc(0, 0, e.kind === 'lostTemple' ? 44 : 34, 0, Math.PI * 2);
          ctx.strokeStyle = '#f8d572';
          ctx.lineWidth = 2.8;
          ctx.stroke();
        }

        if (e.kind === 'playerCity') {
          const civ = CIVILIZATIONS[s.civId];
          ctx.fillStyle = '#3c362c';
          ctx.beginPath();
          ctx.arc(0, 4, 28, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#d4cbb8';
          ctx.fillRect(-18, -12, 36, 22);
          ctx.fillStyle = civ.roofColor;
          ctx.beginPath();
          ctx.moveTo(-22, -12);
          ctx.lineTo(0, -30);
          ctx.lineTo(22, -12);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = civ.accentStroke;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else if (e.kind === 'lostTemple') {
          ctx.fillStyle = 'rgba(232, 186, 74, 0.16)';
          ctx.beginPath();
          ctx.arc(0, 0, 42, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#d6c8a8';
          ctx.fillRect(-26, -10, 52, 24);
          ctx.fillStyle = '#d9a638';
          ctx.beginPath();
          ctx.moveTo(-30, -10);
          ctx.lineTo(0, -34);
          ctx.lineTo(30, -10);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fff1c2';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (e.kind === 'village') {
          // RoK Tribal Village with golden gift aura if unvisited
          ctx.fillStyle = e.visited ? 'rgba(90, 120, 95, 0.16)' : 'rgba(245, 204, 96, 0.24)';
          ctx.beginPath();
          ctx.arc(0, 2, 23, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = e.visited ? '#7f7868' : '#c99b44';
          ctx.fillRect(-12, -4, 24, 15);
          ctx.fillStyle = e.visited ? '#5a5347' : '#8a5328';
          ctx.beginPath();
          ctx.moveTo(-16, -4);
          ctx.lineTo(0, -19);
          ctx.lineTo(16, -4);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = e.visited ? '#b8b0a0' : '#ffefba';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          if (!e.visited) {
            ctx.fillStyle = '#ffe58c';
            ctx.beginPath();
            ctx.arc(13, -14, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1d150c';
            ctx.font = '700 9px Manrope, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('★', 13, -11);
          }
        } else if (e.kind === 'shrine') {
          const owned = e.owner === 'player';
          ctx.fillStyle = owned ? 'rgba(108, 224, 173, 0.2)' : 'rgba(155, 118, 240, 0.18)';
          ctx.beginPath();
          ctx.arc(0, 0, 29, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = owned ? '#49b882' : '#8d64e6';
          ctx.beginPath();
          ctx.moveTo(0, -24);
          ctx.lineTo(18, 10);
          ctx.lineTo(-18, 10);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#f5ebcf';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (e.kind === 'rivalCity') {
          const rCiv = e.civId ? CIVILIZATIONS[e.civId] : CIVILIZATIONS.rome;
          ctx.fillStyle = '#b9b09f';
          ctx.fillRect(-16, -10, 32, 20);
          ctx.fillStyle = rCiv.roofColor;
          ctx.beginPath();
          ctx.moveTo(-20, -10);
          ctx.lineTo(0, -26);
          ctx.lineTo(20, -10);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = rCiv.accentStroke;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else if (e.kind === 'barbarian') {
          ctx.fillStyle = 'rgba(210, 62, 56, 0.22)';
          ctx.beginPath();
          ctx.arc(0, 2, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#9e2e29';
          ctx.beginPath();
          ctx.moveTo(-16, 12);
          ctx.lineTo(0, -18);
          ctx.lineTo(16, 12);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#f59e95';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (e.kind === 'resourceNode') {
          const resColor =
            e.resourceType === 'food'
              ? '#d4a63a'
              : e.resourceType === 'wood'
                ? '#397d49'
                : e.resourceType === 'stone'
                  ? '#8e96a1'
                  : '#f2c144';
          ctx.fillStyle = 'rgba(20, 17, 13, 0.55)';
          ctx.beginPath();
          ctx.arc(0, 2, 21, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = resColor;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f7efde';
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }

        // HP bar for damaged combat entities
        if (e.kind !== 'resourceNode' && e.kind !== 'village' && e.hp < e.maxHp) {
          ctx.fillStyle = '#14100c';
          ctx.fillRect(-24, -36, 48, 6);
          ctx.fillStyle = e.owner === 'player' ? '#56d68f' : '#e85a54';
          ctx.fillRect(-23, -35, Math.round(46 * (e.hp / Math.max(1, e.maxHp))), 4);
        }

        // Crisp entity label
        ctx.font = '600 11px Manrope, sans-serif';
        ctx.textAlign = 'center';
        const labelText = e.kind === 'village' && e.visited ? `${e.name} ✓` : e.name;
        const tw = ctx.measureText(labelText).width;
        ctx.fillStyle = 'rgba(18, 14, 10, 0.85)';
        ctx.fillRect(-tw / 2 - 6, 19, tw + 12, 17);
        ctx.fillStyle =
          e.kind === 'lostTemple'
            ? '#f8d675'
            : e.kind === 'village' && !e.visited
              ? '#ffe38d'
              : '#f2eadb';
        ctx.fillText(labelText, 0, 31);

        ctx.restore();
      }

      // Draw Coarse Lightweight Fog of War (16x10 grid — ultra-fast for low-spec PCs!)
      const cellW = WORLD_WIDTH / s.fogCols;
      const cellH = WORLD_HEIGHT / s.fogRows;
      for (let r = 0; r < s.fogRows; r++) {
        for (let c = 0; c < s.fogCols; c++) {
          if (s.fogRevealed[r * s.fogCols + c]) continue;
          const fx = c * cellW;
          const fy = r * cellH;
          ctx.fillStyle = 'rgba(24, 21, 16, 0.78)';
          ctx.fillRect(fx, fy, cellW + 0.6, cellH + 0.6);
          // Subtle warm mist cloud crest inside unrevealed tiles
          ctx.fillStyle = 'rgba(196, 182, 152, 0.08)';
          ctx.beginPath();
          ctx.arc(fx + cellW * 0.45, fy + cellH * 0.52, cellW * 0.28, 0, Math.PI * 2);
          ctx.arc(fx + cellW * 0.64, fy + cellH * 0.46, cellW * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Highlight selected Fog point for scouting
      if (selectedFogPoint) {
        ctx.save();
        ctx.translate(selectedFogPoint.x, selectedFogPoint.y);
        ctx.strokeStyle = '#75d8fa';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Live Real-Time Army Marches & Scouts (drawn above Fog so scouts are always visible!)
      for (const m of s.marches) {
        ctx.save();
        ctx.translate(m.x, m.y);

        if (m.isScout) {
          // Fast RoK Scout Rider Diamond
          ctx.fillStyle = '#38a7d8';
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(12, 0);
          ctx.lineTo(0, 12);
          ctx.lineTo(-12, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#d4f6ff';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.font = '700 9px Manrope, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('Р', 0, 3);
          ctx.restore();
          continue;
        }

        // Commander active skill golden shockwave burst
        if (!ecoMode && m.skillFlashTimer > 0) {
          const p = 1 - m.skillFlashTimer / 0.65;
          ctx.beginPath();
          ctx.arc(0, 0, 16 + p * 34, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(246, 207, 101, ${Math.max(0, 1 - p)})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Rally halo ring
        if (m.isRally) {
          ctx.beginPath();
          ctx.arc(0, 0, 19, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 217, 114, 0.85)';
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }

        const isPlayer = m.owner === 'player';
        const civColor = isPlayer ? CIVILIZATIONS[s.civId].color : '#d94848';

        // Army shield circle
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = m.hitFlashTimer > 0 ? '#ffffff' : civColor;
        ctx.fill();
        ctx.strokeStyle = '#fff4d6';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Troop count inside banner (including allied rally forces)
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(totalTroops(m.troops) + m.alliedBonusTroops), 0, 3.5);

        // HP Bar + Golden Rage Bar (Signature Rise of Kingdoms look!)
        ctx.fillStyle = '#14100c';
        ctx.fillRect(-18, -24, 36, 5);
        ctx.fillStyle = isPlayer ? '#5ee097' : '#f0665e';
        ctx.fillRect(-17, -23, Math.round(34 * (m.hp / Math.max(1, m.maxHp))), 3);

        if (isPlayer) {
          ctx.fillStyle = '#14100c';
          ctx.fillRect(-18, -18, 36, 3.5);
          ctx.fillStyle = '#f6cf65';
          ctx.fillRect(-17, -17.5, Math.round(34 * (m.rage / 100)), 2.5);
        }

        ctx.restore();
      }

      // Draw Floating Combat/Gather Effects
      ctx.font = '700 12px Manrope, sans-serif';
      ctx.textAlign = 'center';
      for (const ef of s.effects) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ef.ttl / ef.maxTtl));
        ctx.fillStyle = '#120e0a';
        ctx.fillText(ef.text, ef.x + 1, ef.y + 1);
        ctx.fillStyle = ef.color;
        ctx.fillText(ef.text, ef.x, ef.y);
        ctx.restore();
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [stateRef, ecoMode, selectedEntityId, selectedFogPoint]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    camRef.current.dragging = true;
    camRef.current.moved = false;
    camRef.current.lastClientX = e.clientX;
    camRef.current.lastClientY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!camRef.current.dragging) return;
    const dx = e.clientX - camRef.current.lastClientX;
    const dy = e.clientY - camRef.current.lastClientY;
    if (Math.hypot(dx, dy) > 3) camRef.current.moved = true;
    camRef.current.x -= dx;
    camRef.current.y -= dy;
    camRef.current.lastClientX = e.clientX;
    camRef.current.lastClientY = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasMoved = camRef.current.moved;
    camRef.current.dragging = false;
    if (wasMoved) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = e.clientX - rect.left - rect.width / 2 + camRef.current.x;
    const worldY = e.clientY - rect.top - rect.height / 2 + camRef.current.y;

    const s = stateRef.current;
    // Hit-test visible world entities first
    let closestId: string | null = null;
    let bestDist = 48;
    for (const id of s.entityOrder) {
      const ent = s.entities[id];
      if (ent.defeated) continue;
      const visible =
        ent.kind === 'playerCity' || ent.kind === 'lostTemple' || isPointRevealed(s, ent.x, ent.y);
      if (!visible) continue;
      const d = Math.hypot(ent.x - worldX, ent.y - worldY);
      if (d < bestDist) {
        bestDist = d;
        closestId = id;
      }
    }

    if (closestId) {
      setSelectedEntityId(closestId);
      setSelectedFogPoint(null);
      return;
    }

    // If user clicked inside Fog of War, offer Scout dispatch!
    if (
      worldX >= 20 &&
      worldX <= WORLD_WIDTH - 20 &&
      worldY >= 20 &&
      worldY <= WORLD_HEIGHT - 20 &&
      !isPointRevealed(s, worldX, worldY)
    ) {
      setSelectedEntityId(null);
      setSelectedFogPoint({ x: Math.round(worldX), y: Math.round(worldY) });
      return;
    }

    setSelectedEntityId(null);
    setSelectedFogPoint(null);
  };

  const playerMarchesCount = uiState.marches.filter(
    (m) => m.owner === 'player' && !m.isScout
  ).length;
  const scoutActive = uiState.marches.some((m) => m.owner === 'player' && m.isScout);
  const maxMarches = getMaxMarches(uiState);
  const availTroops = totalTroops(uiState.garrison);
  const marchCap = getMarchCapacity(uiState, activeCommander?.id);
  const fogPct = getFogExploredPct(uiState);

  const computeDispatchTroops = (): Troops => {
    const targetCap = sendHalf
      ? Math.max(1, Math.floor(Math.min(availTroops, marchCap) / 2))
      : Math.min(availTroops, marchCap);
    const ratio = availTroops > 0 ? Math.min(1, targetCap / availTroops) : 0;
    return {
      infantry: Math.floor(uiState.garrison.infantry * ratio),
      archers: Math.floor(uiState.garrison.archers * ratio),
      cavalry: Math.floor(uiState.garrison.cavalry * ratio),
    };
  };

  // Find nearest unrevealed Fog sector to player city for 1-click Scout exploration
  const findNearestFogCell = (): { x: number; y: number } | null => {
    const city = uiState.entities['player-city'];
    const cellW = WORLD_WIDTH / uiState.fogCols;
    const cellH = WORLD_HEIGHT / uiState.fogRows;
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (let r = 0; r < uiState.fogRows; r++) {
      for (let c = 0; c < uiState.fogCols; c++) {
        if (uiState.fogRevealed[r * uiState.fogCols + c]) continue;
        const cx = (c + 0.5) * cellW;
        const cy = (r + 0.5) * cellH;
        const d = Math.hypot(cx - city.x, cy - city.y);
        if (d < bestDist) {
          bestDist = d;
          best = { x: Math.round(cx), y: Math.round(cy) };
        }
      }
    }
    return best;
  };

  const nearestFog = findNearestFogCell();
  const revealedUnvisitedVillage = uiState.entityOrder
    .map((id) => uiState.entities[id])
    .find((e) => e.kind === 'village' && !e.visited && isPointRevealed(uiState, e.x, e.y));

  const quickTargets = [
    {
      label: 'Моє місто',
      entity: uiState.entities['player-city'],
    },
    {
      label: 'Варвари',
      entity: uiState.entityOrder
        .map((id) => uiState.entities[id])
        .find((e) => e.kind === 'barbarian' && !e.defeated && isPointRevealed(uiState, e.x, e.y)),
    },
    {
      label: 'Ресурси',
      entity: uiState.entityOrder
        .map((id) => uiState.entities[id])
        .find((e) => e.kind === 'resourceNode' && !e.defeated && isPointRevealed(uiState, e.x, e.y)),
    },
    ...(revealedUnvisitedVillage
      ? [{ label: 'Село ★', entity: revealedUnvisitedVillage }]
      : []),
    {
      label: 'Святиня',
      entity: uiState.entityOrder
        .map((id) => uiState.entities[id])
        .find((e) => e.kind === 'shrine' && e.owner !== 'player' && isPointRevealed(uiState, e.x, e.y)),
    },
    {
      label: 'Храм',
      entity: uiState.entities['lost-temple'],
    },
  ];

  const isBarbarian = selectedEntity?.kind === 'barbarian';
  const notEnoughAp = isBarbarian && uiState.actionPoints < BARBARIAN_AP_COST;
  const canRallySelected =
    selectedEntity &&
    (selectedEntity.kind === 'shrine' ||
      selectedEntity.kind === 'rivalCity' ||
      selectedEntity.kind === 'lostTemple') &&
    selectedEntity.owner !== 'player';

  return (
    <div ref={containerRef} data-testid="world-map-container" className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          camRef.current.dragging = false;
        }}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Quick Kingdom Navigation Strip (bottom-right, unobtrusive single line) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-[#17130f]/94 border border-[#c89b3c]/35 rounded-md p-1 max-w-[calc(100vw-24px)] overflow-x-auto">
        {nearestFog && (
          <button
            type="button"
            disabled={scoutActive}
            onClick={() => {
              focusOn(nearestFog.x, nearestFog.y);
              onDispatchScout(nearestFog.x, nearestFog.y);
              setSelectedEntityId(null);
              setSelectedFogPoint(null);
            }}
            className="px-2.5 py-1.5 rounded bg-[#1d394a] hover:bg-[#264b61] disabled:opacity-50 text-[11px] font-bold text-[#9de6ff] cursor-pointer whitespace-nowrap"
          >
            {scoutActive ? 'Розвідка...' : `Розвідка (${fogPct}%)`}
          </button>
        )}
        {quickTargets.map((qt) =>
          qt.entity ? (
            <button
              key={qt.label}
              type="button"
              onClick={() => {
                focusOn(qt.entity!.x, qt.entity!.y);
                setSelectedFogPoint(null);
                if (qt.entity!.kind !== 'playerCity') {
                  setSelectedEntityId(qt.entity!.id);
                } else {
                  setSelectedEntityId(null);
                }
              }}
              className="px-2.5 py-1.5 rounded text-[11px] font-semibold text-[#e6dac4] hover:bg-[#2a2219] hover:text-[#fff3d2] cursor-pointer whitespace-nowrap"
            >
              {qt.label}
            </button>
          ) : null
        )}
      </div>

      {/* Fog of War Scout Dispatch Popover */}
      {selectedFogPoint && (
        <aside
          aria-label="Незвідані землі"
          className="absolute bottom-14 right-3 z-30 w-[calc(100vw-24px)] max-w-[300px] rounded-md bg-[#181410]/96 border border-[#5bbfe6]/55 shadow-[0_16px_40px_rgba(0,0,0,0.72)] p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-[#e6f8ff]">Туман війни</h2>
              <p className="text-xs text-[#b5a78f] mt-0.5">
                Розвідано {fogPct}% королівства. Відправте розвідника, щоб знайти племінні села, святині та ворогів.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFogPoint(null)}
              aria-label="Закрити вікно розвідки"
              className="text-xs text-[#b5a78f] hover:text-[#fff4df] cursor-pointer px-1.5"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            disabled={scoutActive}
            onClick={() => {
              onDispatchScout(selectedFogPoint.x, selectedFogPoint.y);
              setSelectedFogPoint(null);
            }}
            className="w-full py-2.5 rounded bg-[#369bc7] hover:bg-[#49b2df] disabled:opacity-45 disabled:cursor-not-allowed text-[#0d1820] font-bold text-sm cursor-pointer"
          >
            {scoutActive ? 'Розвідник уже в дорозі' : 'Відправити розвідника'}
          </button>
        </aside>
      )}

      {/* Tribal Village Gift Popover */}
      {selectedEntity && selectedEntity.kind === 'village' && (
        <aside
          aria-label={`Племінне село: ${selectedEntity.name}`}
          className="absolute bottom-14 right-3 z-30 w-[calc(100vw-24px)] max-w-[320px] rounded-md bg-[#181410]/96 border border-[#c89b3c]/55 shadow-[0_16px_40px_rgba(0,0,0,0.72)] p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-[#ffe593]">
                {selectedEntity.name}
              </h2>
              <p className="text-xs text-[#b5a78f] mt-0.5">
                {selectedEntity.visited
                  ? 'Жителі вже приєдналися до вашої імперії та передали дари.'
                  : 'Дружнє село дарує ресурси, Прискорення та Золотий ключ Таверни.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEntityId(null)}
              aria-label="Закрити вікно села"
              className="text-xs text-[#b5a78f] hover:text-[#fff4df] cursor-pointer px-1.5"
            >
              ✕
            </button>
          </div>
          {!selectedEntity.visited && (
            <button
              type="button"
              onClick={() => {
                onClaimVillage(selectedEntity.id);
                setSelectedEntityId(null);
              }}
              className="w-full py-2.5 rounded bg-[#d4a64a] hover:bg-[#e3b75c] text-[#17120c] font-bold text-sm cursor-pointer"
            >
              Забрати дари села
            </button>
          )}
        </aside>
      )}

      {/* Rise of Kingdoms-style March Dispatch Popover when a combat/resource target is selected */}
      {selectedEntity &&
        selectedEntity.kind !== 'playerCity' &&
        selectedEntity.kind !== 'village' &&
        !selectedEntity.defeated && (
          <aside
            aria-label={`Ціль: ${selectedEntity.name}`}
            className="absolute bottom-14 right-3 z-30 w-[calc(100vw-24px)] max-w-[340px] rounded-md bg-[#181410]/96 border border-[#c89b3c]/50 shadow-[0_16px_40px_rgba(0,0,0,0.72)] p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-[#faf2e1]">
                  {selectedEntity.name}
                </h2>
                <div className="text-xs text-[#b5a78f] mt-0.5">
                  {selectedEntity.kind === 'resourceNode'
                    ? `Запас: ${Math.round(selectedEntity.resourceRemaining ?? 0)} / ${selectedEntity.resourceMax ?? 0}`
                    : selectedEntity.owner === 'player'
                      ? 'Під вашим контролем'
                      : `Оборона: ${Math.round(selectedEntity.hp)} HP · Атака ${selectedEntity.attack}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntityId(null)}
                aria-label="Закрити вікно походу"
                className="text-xs text-[#b5a78f] hover:text-[#fff4df] cursor-pointer px-1.5"
              >
                ✕
              </button>
            </div>

            {selectedEntity.owner !== 'player' && (
              <>
                <div className="rounded bg-[#221c16] border border-[#3a3025] p-2.5 flex flex-col gap-2 text-xs">
                  {/* Commander Picker */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-[#a99c85]">Полководець походу:</span>
                    <div className="flex flex-wrap gap-1">
                      {unlockedCommanders.map((cmd) => {
                        const isPicked = activeCommander?.id === cmd.id;
                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            onClick={() => setSelectedCommanderId(cmd.id)}
                            aria-pressed={isPicked}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                              isPicked
                                ? 'bg-[#312618] border-[#d4a64a] text-[#ffe18c]'
                                : 'bg-[#17130f] border-[#382f24] text-[#bdb09a] hover:border-[#78623d]'
                            }`}
                          >
                            {cmd.name} (Р.{cmd.level})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#32291f]">
                    <span className="text-[#b5a78f]">
                      У похід:{' '}
                      <strong className="font-mono-num text-[#f3ecde]">
                        {totalTroops(computeDispatchTroops())} / {availTroops}
                      </strong>
                    </span>
                    <div className="inline-flex rounded bg-[#181410] border border-[#3d3327] p-0.5">
                      <button
                        type="button"
                        onClick={() => setSendHalf(false)}
                        aria-pressed={!sendHalf}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-sm cursor-pointer ${
                          !sendHalf ? 'bg-[#c89b3c] text-[#17120c]' : 'text-[#b5a78f]'
                        }`}
                      >
                        Макс
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendHalf(true)}
                        aria-pressed={sendHalf}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-sm cursor-pointer ${
                          sendHalf ? 'bg-[#c89b3c] text-[#17120c]' : 'text-[#b5a78f]'
                        }`}
                      >
                        50%
                      </button>
                    </div>
                  </div>

                  {isBarbarian && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#9cc9e6]">Очки дій (ОД):</span>
                      <span
                        className={`font-mono-num font-bold ${
                          notEnoughAp ? 'text-[#ef7a72]' : 'text-[#8ad9ff]'
                        }`}
                      >
                        -{BARBARIAN_AP_COST} ОД (є {Math.floor(uiState.actionPoints)})
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    disabled={playerMarchesCount >= maxMarches || availTroops <= 0 || notEnoughAp}
                    onClick={() => {
                      onDispatchMarch(
                        selectedEntity.id,
                        computeDispatchTroops(),
                        activeCommander?.id,
                        false
                      );
                      setSelectedEntityId(null);
                    }}
                    className="w-full py-2.5 rounded bg-[#d4a64a] hover:bg-[#e3b75c] disabled:opacity-40 disabled:cursor-not-allowed text-[#17120c] font-bold text-sm cursor-pointer"
                  >
                    {notEnoughAp
                      ? `Мало ОД (потрібно ${BARBARIAN_AP_COST})`
                      : playerMarchesCount >= maxMarches
                        ? `Усі походи зайняті (${playerMarchesCount}/${maxMarches})`
                        : availTroops <= 0
                          ? 'Немає вільних військ у місті'
                          : selectedEntity.kind === 'resourceNode'
                            ? 'Відправити на збір'
                            : 'Вирушити в похід'}
                  </button>

                  {canRallySelected && (
                    <button
                      type="button"
                      disabled={playerMarchesCount >= maxMarches || availTroops <= 0}
                      onClick={() => {
                        onDispatchMarch(
                          selectedEntity.id,
                          computeDispatchTroops(),
                          activeCommander?.id,
                          true
                        );
                        setSelectedEntityId(null);
                      }}
                      className="w-full py-2 rounded border border-[#d4a64a]/60 bg-[#2b2216] hover:bg-[#3a2d1c] disabled:opacity-40 disabled:cursor-not-allowed text-[#f8d780] font-bold text-xs cursor-pointer"
                    >
                      Збір альянсу (+{RALLY_ALLIED_TROOPS} союзників)
                    </button>
                  )}
                </div>
              </>
            )}
          </aside>
        )}
    </div>
  );
}
