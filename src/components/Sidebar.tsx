import { Armchair, GitBranch, MessageCircle, Download, Box } from 'lucide-react';
import { useStore, useActiveVariation } from '../store';
import { FurniturePanel } from './FurniturePanel';
import { VariationsPanel } from './VariationsPanel';
import { CommentsPanel } from './CommentsPanel';
import { ExportPanel } from './ExportPanel';
import type { ActivePanel } from '../types';

const TABS: { id: ActivePanel; icon: React.ReactNode; label: string }[] = [
  { id: 'furniture', icon: <Armchair size={18} />, label: 'Furniture' },
  { id: 'variations', icon: <GitBranch size={18} />, label: 'Variations' },
  { id: 'comments', icon: <MessageCircle size={18} />, label: 'Comments' },
  { id: '3d', icon: <Box size={18} />, label: '3D' },
  { id: 'export', icon: <Download size={18} />, label: 'Export' },
];

export function Sidebar() {
  const { activePanel, setActivePanel } = useStore();
  const av = useActiveVariation();
  const openComments = av.comments.filter(c => !c.resolved).length;

  return (
    <div className="w-72 flex flex-col bg-slate-900 border-l border-slate-700 shrink-0">
      {/* Tab bar */}
      <div className="flex border-b border-slate-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            title={tab.label}
            className={`relative flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs transition-colors ${
              activePanel === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            <span className="text-[10px]">{tab.label}</span>
            {tab.id === 'comments' && openComments > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                {openComments}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'furniture' && <FurniturePanel />}
        {activePanel === 'variations' && <VariationsPanel />}
        {activePanel === 'comments' && <CommentsPanel />}
        {activePanel === 'export' && <ExportPanel />}
      </div>
    </div>
  );
}
