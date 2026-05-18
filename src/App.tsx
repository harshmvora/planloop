import { useEffect, useRef, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { FloorCanvas } from './components/FloorCanvas';
import { Sidebar } from './components/Sidebar';
import { CommentDialog } from './components/CommentDialog';
import { ThreeDView } from './components/ThreeDView';
import { useStore } from './store';
import './index.css';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const { activePanel, setActivePanel } = useStore();

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      setCanvasSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', overflow: 'hidden' }}>
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <FloorCanvas width={canvasSize.width} height={canvasSize.height} />
        </div>
        <Sidebar />
        <CommentDialog />
      </div>

      {/* Fullscreen 3D overlay */}
      {activePanel === '3d' && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
          <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-3 shrink-0">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-sm">P</div>
            <span className="text-slate-200 font-semibold text-sm">3D View</span>
            <span className="text-slate-500 text-xs">Drag to orbit · Scroll to zoom</span>
            <button
              onClick={() => setActivePanel('furniture')}
              className="ml-auto flex items-center gap-1.5 text-sm text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
            >
              ✕ Exit 3D
            </button>
          </div>
          <div className="flex-1 relative">
            <ThreeDView />
          </div>
        </div>
      )}
    </div>
  );
}
