import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Line, Text, Group, Circle, RegularPolygon } from 'react-konva';
import Konva from 'konva';
import { v4 as uuid } from 'uuid';
import { useStore, useActiveVariation } from '../store';
import { cmToPixels } from '../furnitureCatalog';
import { loadImage } from '../services/imageDb';
import type { FurnitureItem, WallMaterial, Wall } from '../types';
import { FurnitureShape } from './FurnitureShape';
import { CommentPin } from './CommentPin';

const MATERIALS: { id: WallMaterial; label: string; stroke: string; outline: string; opacity: number }[] = [
  { id: 'concrete', label: 'Concrete', stroke: '#374151', outline: '#ffffff', opacity: 1 },
  { id: 'brick',    label: 'Brick',    stroke: '#b45309', outline: '#fde68a', opacity: 1 },
  { id: 'glass',    label: 'Glass',    stroke: '#38bdf8', outline: '#e0f2fe', opacity: 0.5 },
  { id: 'wood',     label: 'Wood',     stroke: '#78350f', outline: '#fef3c7', opacity: 1 },
  { id: 'drywall',  label: 'Drywall',  stroke: '#9ca3af', outline: '#ffffff', opacity: 1 },
  { id: 'steel',    label: 'Steel',    stroke: '#1e3a5f', outline: '#cbd5e1', opacity: 1 },
];

function WallPropertiesPanel({ wall, onUpdate, onDelete, onDone, onPushUndo }: {
  wall: Wall;
  onUpdate: (patch: Partial<Wall>) => void;
  onDelete: () => void;
  onDone: () => void;
  onPushUndo: () => void;
}) {
  const dragRef = useRef<{ startX: number; startThickness: number } | null>(null);

  const handleThicknessDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    onPushUndo();
    dragRef.current = { startX: e.clientX, startThickness: wall.thickness };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = (me.clientX - dragRef.current.startX) / 2.5;
      onUpdate({ thickness: Math.round(Math.max(4, Math.min(80, dragRef.current.startThickness + delta))) });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const mat = MATERIALS.find(m => m.id === (wall.material ?? 'concrete'))!;

  return (
    <div className="bg-slate-800/95 border border-slate-600 rounded-lg p-3 text-xs text-slate-200 flex flex-col gap-2.5 w-64 shadow-xl pointer-events-auto">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: mat.stroke }} />
          Wall · {mat.label}
        </span>
        <div className="flex gap-1">
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 hover:bg-red-900/30 px-1.5 py-0.5 rounded transition-colors">Delete</button>
          <button onClick={onDone} className="text-slate-400 hover:text-white hover:bg-slate-700 px-1.5 py-0.5 rounded transition-colors">✕</button>
        </div>
      </div>

      <div>
        <div className="text-slate-400 mb-1.5">Material</div>
        <div className="grid grid-cols-3 gap-1">
          {MATERIALS.map(m => (
            <button
              key={m.id}
              onClick={() => onUpdate({ material: m.id })}
              className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-xs transition-all ${
                (wall.material ?? 'concrete') === m.id
                  ? 'ring-2 ring-white bg-slate-600'
                  : 'bg-slate-700/50 hover:bg-slate-700'
              }`}
            >
              <span className="w-3 h-3 rounded-sm shrink-0 border border-slate-500" style={{ background: m.stroke, opacity: m.opacity }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-slate-400 mb-1.5">Wall Height</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0.5} max={10} step={0.1}
            value={wall.height ?? 2.7}
            onChange={e => onUpdate({ height: parseFloat(e.target.value) || 2.7 })}
            className="w-20 bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 outline-none border border-slate-600 focus:border-blue-500"
          />
          <span className="text-slate-400">metres</span>
          <span className="text-slate-500 ml-auto">≈ {((wall.height ?? 2.7) * 3.28).toFixed(1)} ft</span>
        </div>
        <div className="text-slate-500 mt-1">2.7 m (9 ft) office · 3.05 m (10 ft) default</div>
      </div>

      <div>
        <div className="text-slate-400 mb-1.5">Thickness: <span className="text-white font-medium">{wall.thickness}px</span></div>
        <div
          className="flex items-center gap-2 bg-slate-700 rounded px-2 py-2 cursor-ew-resize select-none group"
          onMouseDown={handleThicknessDragStart}
          title="Drag left/right to change thickness"
        >
          <span className="text-slate-500 group-hover:text-slate-300 transition-colors text-base leading-none">⟵</span>
          <div className="flex-1 h-2 bg-slate-600 rounded-full relative overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (wall.thickness / 80) * 100)}%` }} />
          </div>
          <span className="text-slate-500 group-hover:text-slate-300 transition-colors text-base leading-none">⟶</span>
        </div>
        <div className="text-slate-500 mt-1">Drag left/right to resize</div>
      </div>

      <div className="text-slate-500 border-t border-slate-700 pt-1.5">
        Drag orange dots to reshape endpoints
      </div>
    </div>
  );
}

interface Props { width: number; height: number }

export function FloorCanvas({ width, height }: Props) {
  const store = useStore();
  const av = useActiveVariation();
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Refs for live-preview during wall drag (no React re-renders = no position fight)
  const wallMainRefs = useRef<Record<string, Konva.Line | null>>({});
  const wallOutlineRefs = useRef<Record<string, Konva.Line | null>>({});
  // Manual wall-body drag — bypasses Konva draggable to avoid position-offset fights
  const wallBodyDragWasMoved = useRef(false); // suppress onClick after a drag
  const wallBodyDrag = useRef<{
    wallIds: string[];
    startPos: { x: number; y: number };
    startWalls: Record<string, { x1: number; y1: number; x2: number; y2: number }>;
    moved: boolean;
  } | null>(null);

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [showRooms, setShowRooms] = useState(true);
  const [showDetectedFurniture, setShowDetectedFurniture] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [wallPreview, setWallPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [snapTarget, setSnapTarget] = useState<{ x: number; y: number } | null>(null);
  const [hudScale, setHudScale] = useState(1);

  const { activeTool, selectedItemIds, selectedWallIds, compareVariationId, project } = store;
  const isSelect = activeTool === 'select';

  // Track drag-start positions for all selected items (group drag)
  const groupDragStart = useRef<Record<string, { x: number; y: number }>>({});

  // Marquee (rubber-band) selection
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const marqueeMoved = useRef(false);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // ── Image loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const loadBg = async () => {
      const src = av.floorPlanImage ?? await loadImage(av.id);
      if (cancelled || !src) { setBgImage(null); return; }
      if (!av.floorPlanImage && src) store.setFloorPlan(src, av.scale);
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        if (cancelled) return;
        setBgImage(img);
        const stage = stageRef.current;
        if (stage && width > 0 && height > 0 && img.naturalWidth > 0) {
          const s = Math.min((width - 40) / img.naturalWidth, (height - 40) / img.naturalHeight, 1);
          const pos = { x: (width - img.naturalWidth * s) / 2, y: (height - img.naturalHeight * s) / 2 };
          stage.scale({ x: s, y: s });
          stage.position(pos);
          stage.batchDraw();
          setHudScale(s);
        }
      };
    };
    loadBg();
    return () => { cancelled = true; };
  }, [av.id, av.floorPlanImage]);

  // ── Transformer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const nodes = selectedItemIds
      .map(id => stageRef.current!.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];
    trRef.current.nodes(nodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedItemIds, av.items]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const SNAP = 10;
  const snap = (v: number) => Math.round(v / SNAP) * SNAP;

  const getPointerPos = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const p = stage.getPointerPosition() ?? { x: 0, y: 0 };
    const pos = stage.position();
    const s = stage.scaleX();
    return { x: (p.x - pos.x) / s, y: (p.y - pos.y) / s };
  };

  // Snaps to nearby wall endpoints (20 px screen radius), then grid
  const getWallSnapPos = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const p = stage.getPointerPosition() ?? { x: 0, y: 0 };
    const pos = stage.position();
    const s = stage.scaleX();
    const wx = (p.x - pos.x) / s;
    const wy = (p.y - pos.y) / s;
    const snapRadius = 20 / s;
    for (const wall of av.walls) {
      for (const ep of [{ x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 }]) {
        if (Math.hypot(wx - ep.x, wy - ep.y) <= snapRadius) return ep;
      }
    }
    return { x: snap(wx), y: snap(wy) };
  };

  // ── Wheel zoom — reads from stage directly to avoid stale closure ────────────
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current!;
    const old = stage.scaleX();
    const ptr = stage.getPointerPosition()!;
    const pos = stage.position();
    const to = { x: (ptr.x - pos.x) / old, y: (ptr.y - pos.y) / old };
    const next = Math.max(0.05, Math.min(5, e.evt.deltaY < 0 ? old * 1.08 : old / 1.08));
    stage.scale({ x: next, y: next });
    stage.position({ x: ptr.x - to.x * next, y: ptr.y - to.y * next });
    stage.batchDraw();
    setHudScale(next);
  };

  // ── Stage events ─────────────────────────────────────────────────────────────
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Suppress click that followed a marquee drag
    if (marqueeMoved.current) { marqueeMoved.current = false; return; }
    const isBg = e.target === stageRef.current || e.target.getClassName() === 'Image';
    if (!isBg) return;
    if (isSelect) { store.setSelectedItems([]); store.setSelectedWalls([]); }
    if (activeTool === 'comment-pin') { store.setPendingCommentPos(getPointerPos()); store.setActiveTool('select'); }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    void e;
    if (activeTool === 'wall') {
      const p = getWallSnapPos();
      setSnapTarget(p);
      if (wallStart) setWallPreview({ x1: wallStart.x, y1: wallStart.y, x2: p.x, y2: p.y });
      return;
    }
    // Manual wall-body drag — update all selected wall visuals imperatively (no state = no re-render)
    if (wallBodyDrag.current) {
      const p = getPointerPos();
      const { startPos, startWalls } = wallBodyDrag.current;
      const dx = p.x - startPos.x;
      const dy = p.y - startPos.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) { wallBodyDrag.current.moved = true; wallBodyDragWasMoved.current = true; }
      Object.entries(startWalls).forEach(([id, s]) => {
        const pts = [s.x1 + dx, s.y1 + dy, s.x2 + dx, s.y2 + dy];
        const main = wallMainRefs.current[id];
        const ol = wallOutlineRefs.current[id];
        if (main) main.points(pts);
        if (ol) ol.points(pts);
      });
      return;
    }
    if (marqueeStart.current) {
      const p = getPointerPos();
      const ms = marqueeStart.current;
      marqueeMoved.current = true;
      setMarqueeRect({
        x: Math.min(ms.x, p.x), y: Math.min(ms.y, p.y),
        w: Math.abs(p.x - ms.x), h: Math.abs(p.y - ms.y),
      });
    } else {
      setSnapTarget(null);
    }
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'wall') {
      const p = getWallSnapPos();
      if (!wallStart) { setWallStart(p); }
      else {
        store.addWall({ id: uuid(), x1: wallStart.x, y1: wallStart.y, x2: p.x, y2: p.y, thickness: 8, material: 'concrete', height: 3.05 });
        setWallStart(null); setWallPreview(null);
      }
      return;
    }
    if (isSelect) {
      const isBg = e.target === stageRef.current || e.target.getClassName() === 'Image';
      if (isBg) {
        marqueeStart.current = getPointerPos();
        marqueeMoved.current = false;
      }
    }
  };

  const handleStageMouseUp = () => {
    // Commit manual wall-body drag
    if (wallBodyDrag.current) {
      if (wallBodyDrag.current.moved) {
        const p = getPointerPos();
        const { startPos, startWalls } = wallBodyDrag.current;
        const dx = snap(p.x - startPos.x);
        const dy = snap(p.y - startPos.y);
        Object.entries(startWalls).forEach(([id, s]) => {
          store.updateWall(id, { x1: snap(s.x1 + dx), y1: snap(s.y1 + dy), x2: snap(s.x2 + dx), y2: snap(s.y2 + dy) });
        });
      }
      wallBodyDrag.current = null;
      return;
    }
    if (!marqueeMoved.current || !marqueeRect) {
      marqueeStart.current = null;
      setMarqueeRect(null);
      return;
    }
    const mr = marqueeRect;
    if (mr.w > 5 || mr.h > 5) {
      const selItems = av.items.filter(item => {
        const il = item.x - item.width / 2, ir = item.x + item.width / 2;
        const it = item.y - item.height / 2, ib = item.y + item.height / 2;
        return il < mr.x + mr.w && ir > mr.x && it < mr.y + mr.h && ib > mr.y;
      });
      const selWalls = av.walls.filter(wall => {
        const ep1 = wall.x1 >= mr.x && wall.x1 <= mr.x + mr.w && wall.y1 >= mr.y && wall.y1 <= mr.y + mr.h;
        const ep2 = wall.x2 >= mr.x && wall.x2 <= mr.x + mr.w && wall.y2 >= mr.y && wall.y2 <= mr.y + mr.h;
        return ep1 || ep2;
      });
      store.setSelectionMarquee(selItems.map(i => i.id), selWalls.map(w => w.id));
    }
    marqueeStart.current = null;
    setMarqueeRect(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!stageRef.current) return;
    const data = e.dataTransfer.getData('furniture');
    if (!data) return;
    const def = JSON.parse(data);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const stage = stageRef.current;
    const pos = stage.position(), s = stage.scaleX();
    const x = (e.clientX - rect.left - pos.x) / s;
    const y = (e.clientY - rect.top - pos.y) / s;
    const item: FurnitureItem = {
      id: uuid(), type: def.type, label: def.label, x, y,
      width: cmToPixels(def.widthCm, av.scale), height: cmToPixels(def.heightCm, av.scale),
      rotation: 0, color: def.color, locked: false,
    };
    store.addItem(item);
    store.setSelectedItem(item.id);
  };

  const rooms = av.rooms ?? [];
  const detectedFurniture = av.detectedFurniture ?? [];
  const hasDetection = rooms.length > 0 || av.walls.length > 0 || detectedFurniture.length > 0;
  const compareVariation = compareVariationId ? project.variations.find(v => v.id === compareVariationId) : null;

  return (
    <div
      className="flex-1 relative overflow-hidden bg-slate-900"
      onDrop={handleDrop} onDragOver={e => e.preventDefault()}
      style={{ cursor: activeTool === 'wall' ? 'crosshair' : activeTool === 'comment-pin' ? 'cell' : activeTool === 'pan' ? 'grab' : 'default' }}
    >
      {/* HUD */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="bg-slate-800/80 text-slate-300 text-xs px-2 py-1 rounded flex items-center gap-2">
          <span>{(100 / av.scale).toFixed(2)} cm/px · {(hudScale * 100).toFixed(0)}% zoom</span>
          <label className="flex items-center gap-1 cursor-pointer pointer-events-auto">
            <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="accent-blue-500" />
            Grid (1 ft)
          </label>
        </div>
        {hasDetection && (
          <div className="bg-slate-800/80 text-slate-300 text-xs px-2 py-1 rounded flex gap-3 pointer-events-auto">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showRooms} onChange={e => setShowRooms(e.target.checked)} className="accent-blue-500" />
              Rooms ({rooms.length})
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showDetectedFurniture} onChange={e => setShowDetectedFurniture(e.target.checked)} className="accent-blue-500" />
              Detected ({detectedFurniture.length})
            </label>
          </div>
        )}
        {selectedWallIds.length === 1 && (() => {
          const selWall = av.walls.find(w => w.id === selectedWallIds[0]);
          return selWall ? (
            <WallPropertiesPanel
              wall={selWall}
              onUpdate={patch => store.updateWall(selectedWallIds[0], patch)}
              onDelete={() => store.deleteSelected()}
              onDone={() => store.setSelectedWalls([])}
              onPushUndo={() => store.pushUndo()}
            />
          ) : null;
        })()}
        {selectedWallIds.length > 1 && (
          <div className="bg-slate-800/95 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-200 flex items-center gap-2 shadow-xl pointer-events-auto">
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">{selectedWallIds.length} walls</span>
            <button onClick={() => store.deleteSelected()} className="text-red-400 hover:text-red-300 hover:bg-red-900/30 px-1.5 py-0.5 rounded transition-colors">Delete</button>
            <button onClick={() => store.setSelectedWalls([])} className="text-slate-400 hover:text-white hover:bg-slate-700 px-1.5 py-0.5 rounded transition-colors">✕</button>
          </div>
        )}
      </div>

      {activeTool === 'wall' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-blue-600/90 text-white text-xs px-3 py-1 rounded-full">
          {wallStart ? 'Click to finish wall' : 'Click to start drawing a wall'}
        </div>
      )}

      <Stage
        ref={stageRef}
        width={width} height={height}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        draggable={activeTool === 'pan'}
        onDragEnd={e => { /* stage position managed by Konva internally */ void e; }}
      >
        {/* Background */}
        <Layer>
          {!bgImage && Array.from({ length: Math.ceil((width + 100) / 50) }, (_, i) => (
            <Line key={`gv${i}`} points={[i * 50, -50, i * 50, height + 50]} stroke="#1e293b" strokeWidth={0.5} listening={false} />
          ))}
          {!bgImage && Array.from({ length: Math.ceil((height + 100) / 50) }, (_, i) => (
            <Line key={`gh${i}`} points={[-50, i * 50, width + 50, i * 50]} stroke="#1e293b" strokeWidth={0.5} listening={false} />
          ))}
          {bgImage && <KonvaImage image={bgImage} x={0} y={0} width={bgImage.naturalWidth} height={bgImage.naturalHeight} opacity={0.9} listening={false} />}
        </Layer>

        {/* 1-ft measurement grid */}
        {showGrid && (() => {
          const ftPx = 0.3048 * av.scale;
          const min = -60 * ftPx;
          const max = 250 * ftPx;
          const count = Math.round((max - min) / ftPx);
          const vLines: JSX.Element[] = [];
          const hLines: JSX.Element[] = [];
          for (let i = 0; i <= count; i++) {
            const pos = min + i * ftPx;
            const isMajor = i % 5 === 0;
            vLines.push(<Line key={`gv${i}`} points={[pos, min, pos, max]} stroke={isMajor ? '#2d4a6e' : '#1a2f47'} strokeWidth={isMajor ? 0.8 : 0.4} listening={false} />);
            hLines.push(<Line key={`gh${i}`} points={[min, pos, max, pos]} stroke={isMajor ? '#2d4a6e' : '#1a2f47'} strokeWidth={isMajor ? 0.8 : 0.4} listening={false} />);
          }
          return <Layer listening={false}>{vLines}{hLines}</Layer>;
        })()}

        {/* Room / detected furniture overlays */}
        <Layer listening={false}>
          {showRooms && rooms.map(room => (
            <Group key={room.id}>
              <Rect x={room.x} y={room.y} width={room.width} height={room.height} fill={room.color} opacity={0.15} stroke={room.color} strokeWidth={1.5} cornerRadius={3} />
              <Text x={room.x + 4} y={room.y + 4} width={room.width - 8} text={room.label} fontSize={Math.min(13, Math.max(7, room.width / 12))} fill="#e2e8f0" fontStyle="bold" wrap="word" />
            </Group>
          ))}
          {showDetectedFurniture && detectedFurniture.map(f => (
            <Group key={f.id}>
              <Rect x={f.x} y={f.y} width={f.width} height={f.height} fill="#34d399" opacity={0.1} stroke="#34d399" strokeWidth={1} dash={[4, 3]} cornerRadius={2} />
              <Text x={f.x + 2} y={f.y + 2} width={f.width - 4} text={f.label} fontSize={Math.min(10, Math.max(6, f.width / 10))} fill="#6ee7b7" />
            </Group>
          ))}
        </Layer>

        {/* Walls */}
        <Layer>
          {av.walls.map(wall => {
            const isSel = selectedWallIds.includes(wall.id);
            const mat = MATERIALS.find(m => m.id === (wall.material ?? 'concrete'))!;

            return (
              <Group key={wall.id}>
                {/* Outline — contrasting halo for visibility on any background */}
                <Line
                  ref={node => { wallOutlineRefs.current[wall.id] = node; }}
                  points={[wall.x1, wall.y1, wall.x2, wall.y2]}
                  stroke={isSel ? '#fff7ed' : mat.outline} strokeWidth={wall.thickness + 6}
                  lineCap="butt" opacity={isSel ? 0.7 : 0.5} listening={false}
                />
                {/* Main wall body */}
                <Line
                  ref={node => { wallMainRefs.current[wall.id] = node; }}
                  points={[wall.x1, wall.y1, wall.x2, wall.y2]}
                  stroke={isSel ? '#f97316' : mat.stroke}
                  strokeWidth={isSel ? wall.thickness + 2 : wall.thickness}
                  opacity={mat.opacity}
                  lineCap="butt"
                  hitStrokeWidth={Math.max(wall.thickness, 24 / hudScale)}
                  onMouseEnter={e => { if (isSelect) e.target.getStage()!.container().style.cursor = 'move'; }}
                  onMouseLeave={e => { e.target.getStage()!.container().style.cursor = activeTool === 'pan' ? 'grab' : 'default'; }}
                  onMouseDown={e => {
                    e.cancelBubble = true;
                    if (!isSelect) return;
                    // Drag targets: this wall + any other already-selected walls
                    const wallIds = selectedWallIds.includes(wall.id) ? selectedWallIds : [wall.id];
                    // Use store snapshot for freshest wall data
                    const currentWalls = (useStore.getState().project.variations.find(
                      v => v.id === useStore.getState().project.activeVariationId
                    )?.walls) ?? [];
                    const starts: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {};
                    currentWalls.forEach(w => { if (wallIds.includes(w.id)) starts[w.id] = { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }; });
                    if (!starts[wall.id]) starts[wall.id] = { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 };
                    wallBodyDrag.current = { wallIds, startPos: getPointerPos(), startWalls: starts, moved: false };
                    store.pushUndo();
                  }}
                  onClick={e => {
                    e.cancelBubble = true;
                    if (!isSelect) return;
                    // Suppress click that followed a drag
                    if (wallBodyDragWasMoved.current) { wallBodyDragWasMoved.current = false; return; }
                    if ((e.evt as MouseEvent).ctrlKey || (e.evt as MouseEvent).metaKey) {
                      store.toggleSelectWall(wall.id);
                    } else {
                      store.setSelectedWall(isSel && selectedWallIds.length === 1 ? null : wall.id);
                    }
                  }}
                />

                {/* Endpoint handles — only when exactly this wall is selected alone */}
                {isSel && isSelect && selectedWallIds.length === 1 && (
                  <>
                    {/* Endpoint 1 */}
                    <Circle
                      x={wall.x1} y={wall.y1} radius={11}
                      fill="#f97316" stroke="white" strokeWidth={3}
                      draggable
                      onMouseEnter={e => { e.target.getStage()!.container().style.cursor = 'crosshair'; }}
                      onMouseLeave={e => { e.target.getStage()!.container().style.cursor = 'move'; }}
                      onDragStart={e => { e.cancelBubble = true; }}
                      onDragMove={e => {
                        e.cancelBubble = true;
                        // Update line visuals imperatively — zero React state changes = no position reset
                        const newX = e.target.x(), newY = e.target.y();
                        const main = wallMainRefs.current[wall.id];
                        const ol = wallOutlineRefs.current[wall.id];
                        if (main) main.points([newX, newY, wall.x2, wall.y2]);
                        if (ol) ol.points([newX, newY, wall.x2, wall.y2]);
                        main?.getLayer()?.batchDraw();
                      }}
                      onDragEnd={e => {
                        e.cancelBubble = true;
                        store.updateWall(wall.id, { x1: snap(e.target.x()), y1: snap(e.target.y()) });
                      }}
                    />
                    {/* Endpoint 2 */}
                    <Circle
                      x={wall.x2} y={wall.y2} radius={11}
                      fill="#f97316" stroke="white" strokeWidth={3}
                      draggable
                      onMouseEnter={e => { e.target.getStage()!.container().style.cursor = 'crosshair'; }}
                      onMouseLeave={e => { e.target.getStage()!.container().style.cursor = 'move'; }}
                      onDragStart={e => { e.cancelBubble = true; }}
                      onDragMove={e => {
                        e.cancelBubble = true;
                        const newX = e.target.x(), newY = e.target.y();
                        const main = wallMainRefs.current[wall.id];
                        const ol = wallOutlineRefs.current[wall.id];
                        if (main) main.points([wall.x1, wall.y1, newX, newY]);
                        if (ol) ol.points([wall.x1, wall.y1, newX, newY]);
                        main?.getLayer()?.batchDraw();
                      }}
                      onDragEnd={e => {
                        e.cancelBubble = true;
                        store.updateWall(wall.id, { x2: snap(e.target.x()), y2: snap(e.target.y()) });
                      }}
                    />
                  </>
                )}
              </Group>
            );
          })}

          {compareVariation?.walls.map(wall => (
            <Line key={wall.id} points={[wall.x1, wall.y1, wall.x2, wall.y2]} stroke="#f97316" strokeWidth={wall.thickness} lineCap="round" opacity={0.35} dash={[8, 4]} listening={false} />
          ))}

          {wallPreview && (
            <Line points={[wallPreview.x1, wallPreview.y1, wallPreview.x2, wallPreview.y2]} stroke="#60a5fa" strokeWidth={8} lineCap="butt" dash={[10, 5]} listening={false} />
          )}
          {/* Snap indicator — cyan diamond at endpoint snap target */}
          {activeTool === 'wall' && snapTarget && (
            <RegularPolygon sides={4} radius={8} x={snapTarget.x} y={snapTarget.y} fill="#22d3ee" opacity={0.9} rotation={45} listening={false} />
          )}
          {/* Marquee rubber-band selection rect */}
          {marqueeRect && (
            <Rect
              x={marqueeRect.x} y={marqueeRect.y}
              width={marqueeRect.w} height={marqueeRect.h}
              fill="rgba(59,130,246,0.08)"
              stroke="#3b82f6" strokeWidth={1}
              dash={[6, 3]}
              listening={false}
            />
          )}
        </Layer>

        {/* Furniture */}
        <Layer>
          {compareVariation?.items.map(item => <FurnitureShape key={`cmp-${item.id}`} item={item} ghost opacity={0.3} />)}
          {av.items.map(item => {
            const isSel = selectedItemIds.includes(item.id);
            return (
              <FurnitureShape
                key={item.id} item={item}
                selected={isSel}
                onClick={e => {
                  if (!isSelect) return;
                  if ((e.evt as MouseEvent).ctrlKey || (e.evt as MouseEvent).metaKey) {
                    store.toggleSelectItem(item.id);
                  } else {
                    store.setSelectedItem(item.id);
                  }
                }}
                onDragStart={e => {
                  if (!isSel) { store.setSelectedItem(item.id); }
                  // Capture start positions of all selected items for group drag
                  const ids = selectedItemIds.includes(item.id) ? selectedItemIds : [item.id];
                  const starts: Record<string, { x: number; y: number }> = {};
                  av.items.forEach(it => {
                    if (ids.includes(it.id)) starts[it.id] = { x: it.x, y: it.y };
                  });
                  groupDragStart.current = starts;
                  store.pushUndo();
                  void e;
                }}
                onDragEnd={e => {
                  const draggedX = snap(e.target.x()), draggedY = snap(e.target.y());
                  const origin = groupDragStart.current[item.id];
                  if (!origin) { store.updateItem(item.id, { x: draggedX, y: draggedY }); return; }
                  const dx = draggedX - origin.x, dy = draggedY - origin.y;
                  Object.entries(groupDragStart.current).forEach(([id, start]) => {
                    store.updateItem(id, { x: snap(start.x + dx), y: snap(start.y + dy) });
                  });
                  groupDragStart.current = {};
                }}
                onTransformEnd={e => {
                  const node = e.target;
                  store.updateItem(item.id, {
                    x: snap(node.x()), y: snap(node.y()),
                    width: Math.max(10, node.width() * node.scaleX()),
                    height: Math.max(10, node.height() * node.scaleY()),
                    rotation: node.rotation(),
                  });
                  node.scaleX(1); node.scaleY(1);
                }}
                draggable={!item.locked && isSelect}
              />
            );
          })}
          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio={false}
            enabledAnchors={['top-left','top-center','top-right','middle-right','bottom-right','bottom-center','bottom-left','middle-left']}
            borderStroke="#3b82f6"
            anchorFill="#3b82f6"
            anchorStroke="#1d4ed8"
            anchorSize={8}
          />
        </Layer>

        {/* Comments */}
        <Layer>
          {av.comments.map((c, i) => (
            <CommentPin key={c.id} comment={c} index={i + 1} onClick={() => store.setActivePanel('comments')} />
          ))}
        </Layer>
      </Stage>

      {!bgImage && !hasDetection && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
          <div className="text-6xl opacity-20">🏠</div>
          <p className="text-slate-500 text-sm text-center">
            Import a floor plan PDF or image to get started<br />
            <span className="text-slate-600 text-xs">Then click <strong>✦ Smart Detect</strong> to auto-map rooms</span>
          </p>
        </div>
      )}
    </div>
  );
}
