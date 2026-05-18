import { useState } from 'react';
import { GitBranch, Plus, Pencil, Check, X, Trash2, Copy, ArrowLeftRight } from 'lucide-react';
import { useStore } from '../store';
import type { Variation } from '../types';

const TAG_COLORS: Record<Variation['tag'], string> = {
  draft: 'bg-slate-600 text-slate-200',
  submitted: 'bg-blue-600 text-white',
  approved: 'bg-green-600 text-white',
  rejected: 'bg-red-600 text-white',
};

export function VariationsPanel() {
  const store = useStore();
  const { project, compareVariationId } = store;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEdit = (v: Variation) => {
    setEditingId(v.id);
    setEditName(v.name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      store.renameVariation(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <GitBranch size={14} /> Variations
        </span>
        <button
          onClick={() => store.forkVariation(project.activeVariationId)}
          className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
        >
          <Plus size={12} /> Fork
        </button>
      </div>

      {compareVariationId && (
        <div className="mx-2 mt-2 p-2 bg-orange-900/40 border border-orange-700 rounded text-xs text-orange-200 flex items-center justify-between">
          <span className="flex items-center gap-1"><ArrowLeftRight size={12} /> Compare mode active</span>
          <button onClick={() => store.setCompareVariation(null)} className="text-orange-300 hover:text-white"><X size={12} /></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {project.variations.map(v => {
          const isActive = v.id === project.activeVariationId;
          const isCompare = v.id === compareVariationId;
          return (
            <div
              key={v.id}
              className={`rounded-lg border p-3 transition-colors ${
                isActive ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {editingId === v.id ? (
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    className="flex-1 bg-slate-700 text-slate-200 text-sm rounded px-2 py-0.5 outline-none border border-blue-500"
                  />
                ) : (
                  <button
                    onClick={() => store.setActiveVariation(v.id)}
                    className="flex-1 text-left text-sm font-medium text-slate-100 hover:text-white truncate"
                  >
                    {v.name}
                  </button>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  {editingId === v.id ? (
                    <>
                      <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(v)} className="text-slate-400 hover:text-slate-300"><Pencil size={13} /></button>
                      <button
                        onClick={() => store.forkVariation(v.id)}
                        title="Fork this variation"
                        className="text-slate-400 hover:text-blue-400"
                      ><Copy size={13} /></button>
                      {project.variations.length > 1 && (
                        <button
                          onClick={() => store.deleteVariation(v.id)}
                          className="text-slate-400 hover:text-red-400"
                        ><Trash2 size={13} /></button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded ${TAG_COLORS[v.tag]}`}>{v.tag}</span>
                <span className="text-xs text-slate-500">{v.items.length} items · {v.comments.length} comments</span>
              </div>

              <div className="mt-2 flex gap-1 flex-wrap">
                {(['draft', 'submitted', 'approved', 'rejected'] as const).map(tag => (
                  <button
                    key={tag}
                    onClick={() => store.tagVariation(v.id, tag)}
                    className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                      v.tag === tag ? TAG_COLORS[tag] + ' border-transparent' : 'border-slate-600 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {isActive && !isCompare && project.variations.length > 1 && (
                <div className="mt-2">
                  <span className="text-xs text-slate-500 mr-1">Compare with:</span>
                  {project.variations.filter(other => other.id !== v.id).map(other => (
                    <button
                      key={other.id}
                      onClick={() => store.setCompareVariation(other.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 mr-2 underline"
                    >
                      {other.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
