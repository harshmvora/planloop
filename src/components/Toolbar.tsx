import { MousePointer2, Minus, MessageSquarePlus, Hand, Undo2, Redo2, Trash2, Lock, Unlock, RotateCcw, Upload, Sparkles, Key, Loader2, Copy, CopyPlus } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useStore, useActiveVariation } from '../store';
import { detectFloorPlan } from '../services/autoDetect';
import { saveImage } from '../services/imageDb';
import { ApiKeyModal } from './ApiKeyModal';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function Toolbar() {
  const store = useStore();
  const { activeTool, selectedItemId, selectedItemIds, selectedWallId, selectedWallIds, apiKey, isDetecting, isWalkMode } = store;
  const av = useActiveVariation();
  const selectedItem = selectedItemId ? av.items.find(i => i.id === selectedItemId) : null;
  const totalSelected = selectedItemIds.length + selectedWallIds.length;
  const multiSelected = totalSelected > 1 || (selectedItemIds.length > 0 && selectedWallIds.length > 0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const tools = [
    { id: 'select' as const, icon: <MousePointer2 size={16} />, title: 'Select (V)' },
    { id: 'wall' as const, icon: <Minus size={16} />, title: 'Draw Wall (W)' },
    { id: 'comment-pin' as const, icon: <MessageSquarePlus size={16} />, title: 'Pin Comment (C)' },
    { id: 'pan' as const, icon: <Hand size={16} />, title: 'Pan (Space)' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDetectError(null);

    const saveAndSet = async (dataUrl: string) => {
      store.setFloorPlan(dataUrl, 100);
      // Persist image to IndexedDB (bypasses localStorage quota limits)
      await saveImage(store.project.activeVariationId, dataUrl);
    };

    if (file.type === 'application/pdf') {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, viewport } as Parameters<typeof page.render>[0]).promise;
      await saveAndSet(canvas.toDataURL('image/jpeg', 0.92));
    } else {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        await saveAndSet(ev.target!.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSmartDetect = async () => {
    if (!av.floorPlanImage) return;
    if (!apiKey) { setShowApiModal(true); return; }

    setDetectError(null);
    store.setIsDetecting(true);
    try {
      const img = new window.Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = av.floorPlanImage!;
      });
      const result = await detectFloorPlan(apiKey, av.floorPlanImage, img.naturalWidth, img.naturalHeight);
      store.setDetectionResult(result.walls, result.rooms, result.detectedFurniture, result.imageWidth, result.imageHeight);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDetectError(msg.slice(0, 120));
    } finally {
      store.setIsDetecting(false);
    }
  };

  // Keyboard shortcuts — must be in useEffect to avoid re-assigning on every render
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isWalkMode) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'v' || e.key === 'V') store.setActiveTool('select');
        if (e.key === 'w' || e.key === 'W') store.setActiveTool('wall');
        if (e.key === 'c' || e.key === 'C') store.setActiveTool('comment-pin');
      }
      if (e.key === ' ') { e.preventDefault(); store.setActiveTool('pan'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); store.undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); store.redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); store.selectAll(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); store.copyItem(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); store.pasteItem(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); store.duplicateSelected(); }
      if (e.key === 'Escape') { store.setSelectedItems([]); store.setSelectedWalls([]); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        store.deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedItemId, selectedItemIds, selectedWallId, selectedWallIds, isWalkMode]);

  return (
    <>
      <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-3 gap-2 shrink-0 overflow-x-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-3 shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-sm">P</div>
          <span className="font-semibold text-slate-200 text-sm">PlanLoop</span>
        </div>

        <input
          value={store.project.name}
          onChange={e => store.setProjectName(e.target.value)}
          className="bg-transparent text-slate-300 text-sm outline-none border-b border-transparent hover:border-slate-600 focus:border-blue-500 px-1 w-36 shrink-0"
        />

        <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />

        {/* Tools */}
        <div className="flex items-center gap-1 shrink-0">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => store.setActiveTool(t.id)}
              title={t.title}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                activeTool === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />

        <button onClick={() => store.undo()} title="Undo (Ctrl+Z)" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-200 rounded shrink-0">
          <Undo2 size={15} />
        </button>
        <button onClick={() => store.redo()} title="Redo (Ctrl+Y)" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-200 rounded shrink-0">
          <Redo2 size={15} />
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />

        {/* Import */}
        <button
          onClick={() => fileRef.current?.click()}
          title="Import floor plan (PDF / JPG / PNG)"
          className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1.5 rounded transition-colors shrink-0"
        >
          <Upload size={14} /> Import Plan
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />

        {/* Smart Detect — only shown when floor plan loaded */}
        {av.floorPlanImage && (
          <>
            <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />
            <button
              onClick={handleSmartDetect}
              disabled={isDetecting}
              title="Auto-detect rooms, walls and furniture using Claude AI"
              className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-60 text-white px-3 py-1.5 rounded transition-all shrink-0 font-medium shadow-lg shadow-violet-900/30"
            >
              {isDetecting
                ? <><Loader2 size={14} className="animate-spin" /> Detecting…</>
                : <><Sparkles size={14} /> Smart Detect</>
              }
            </button>
            <button
              onClick={() => setShowApiModal(true)}
              title={apiKey ? 'API key set — click to change' : 'Set API key'}
              className={`w-8 h-8 flex items-center justify-center rounded shrink-0 transition-colors ${apiKey ? 'text-green-400 hover:bg-slate-700' : 'text-amber-400 hover:bg-slate-700'}`}
            >
              <Key size={14} />
            </button>
          </>
        )}

        {/* Error badge */}
        {detectError && (
          <div className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded px-2 py-1 max-w-xs truncate shrink-0" title={detectError}>
            ⚠ {detectError}
          </div>
        )}

        {/* Multi-selection actions */}
        {multiSelected && (
          <>
            <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />
            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0 font-medium">
              {totalSelected} selected
              {selectedWallIds.length > 0 && selectedItemIds.length > 0 && (
                <> ({selectedItemIds.length}f+{selectedWallIds.length}w)</>
              )}
            </span>
            {selectedItemIds.length > 0 && (
              <button onClick={() => store.copyItem()} title="Copy (Ctrl+C)" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-400 rounded hover:bg-slate-700 shrink-0">
                <Copy size={14} />
              </button>
            )}
            <button onClick={() => store.duplicateSelected()} title="Duplicate beside original (Ctrl+D)" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-700 shrink-0">
              <CopyPlus size={14} />
            </button>
            <button onClick={() => store.deleteSelected()} title="Delete all (Del)" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-400 rounded hover:bg-slate-700 shrink-0">
              <Trash2 size={14} />
            </button>
            <button onClick={() => { store.setSelectedItems([]); store.setSelectedWalls([]); }} title="Deselect (Esc)" className="text-xs text-slate-500 hover:text-slate-300 px-1 shrink-0">✕</button>
          </>
        )}
        {/* Single-selection actions */}
        {selectedItem && !multiSelected && (
          <>
            <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />
            <span className="text-xs text-slate-400 shrink-0">{selectedItem.label}</span>
            <button onClick={() => store.updateItem(selectedItem.id, { locked: !selectedItem.locked })} title={selectedItem.locked ? 'Unlock' : 'Lock'} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-400 rounded hover:bg-slate-700 shrink-0">
              {selectedItem.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            <button onClick={() => store.updateItem(selectedItem.id, { rotation: selectedItem.rotation + 90 })} title="Rotate 90°" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-400 rounded hover:bg-slate-700 shrink-0">
              <RotateCcw size={14} />
            </button>
            <button onClick={() => store.duplicateSelected()} title="Duplicate beside original (Ctrl+D)" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-700 shrink-0">
              <CopyPlus size={14} />
            </button>
            <button onClick={() => store.deleteItem(selectedItem.id)} title="Delete (Del)" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-400 rounded hover:bg-slate-700 shrink-0">
              <Trash2 size={14} />
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
          <span>Scale:</span>
          <input
            type="number"
            value={av.scale}
            onChange={e => store.setScale(Number(e.target.value))}
            className="w-16 bg-slate-700 text-slate-200 rounded px-1.5 py-0.5 outline-none border border-slate-600 focus:border-blue-500 text-xs"
            title="Pixels per meter"
          />
          <span>px/m</span>
        </div>
      </div>

      {showApiModal && <ApiKeyModal onClose={() => setShowApiModal(false)} />}
    </>
  );
}
