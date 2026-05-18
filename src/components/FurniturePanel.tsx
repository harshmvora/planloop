import { useState } from 'react';
import { FURNITURE_CATALOG, CATEGORIES } from '../furnitureCatalog';

export function FurniturePanel() {
  const [activeCategory, setActiveCategory] = useState('Bedroom');
  const [search, setSearch] = useState('');

  const items = FURNITURE_CATALOG.filter(f =>
    f.category === activeCategory &&
    f.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent, def: typeof FURNITURE_CATALOG[0]) => {
    e.dataTransfer.setData('furniture', JSON.stringify(def));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-700">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search furniture…"
          className="w-full bg-slate-800 text-slate-200 text-sm rounded px-2 py-1.5 outline-none border border-slate-600 focus:border-blue-500"
        />
      </div>
      <div className="flex gap-1 p-2 border-b border-slate-700 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 content-start">
        {items.map(def => (
          <div
            key={def.type}
            draggable
            onDragStart={e => handleDragStart(e, def)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 rounded-lg p-2 cursor-grab active:cursor-grabbing transition-colors select-none"
          >
            <div className="text-2xl mb-1 text-center">{def.emoji}</div>
            <div className="text-xs text-slate-200 text-center font-medium leading-tight">{def.label}</div>
            <div className="text-xs text-slate-500 text-center mt-0.5">{def.widthCm}×{def.heightCm} cm</div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-slate-700 text-xs text-slate-500 text-center">
        Drag items onto the floor plan
      </div>
    </div>
  );
}
