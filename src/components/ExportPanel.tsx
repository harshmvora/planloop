import { Download, FileImage, FileText, Share2, Save, FolderOpen } from 'lucide-react';
import { useRef, useState } from 'react';
import { useStore, useActiveVariation } from '../store';
import { saveImage } from '../services/imageDb';
import type { Project } from '../types';

export function ExportPanel() {
  const store = useStore();
  const av = useActiveVariation();
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // ── Save project to .planloop file ───────────────────────────────────────────
  const saveProject = () => {
    const payload = JSON.stringify({ version: 1, project: store.project, savedAt: new Date().toISOString() });
    const blob = new Blob([payload], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${store.project.name.replace(/\s+/g, '_')}.planloop`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ── Load project from .planloop file ─────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.project) throw new Error('Not a valid .planloop file');
      const project = data.project as Project;
      // Re-save any embedded floor plan images to IndexedDB
      for (const v of project.variations) {
        if (v.floorPlanImage) await saveImage(v.id, v.floorPlanImage);
      }
      store.loadProject(project);
      setImportMsg('Project loaded!');
    } catch {
      setImportMsg('Could not read file — make sure it is a .planloop file');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const exportPNG = () => {
    const stage = document.querySelector('canvas');
    if (!stage) return;
    const link = document.createElement('a');
    link.download = `${av.name.replace(/\s+/g, '_')}.png`;
    link.href = stage.toDataURL('image/png');
    link.click();
  };

  const exportVariationReport = () => {
    const { project } = store;
    let html = `<html><head><title>PlanLoop — Variation Report</title>
    <style>body{font-family:sans-serif;padding:32px;max-width:800px;margin:0 auto}
    h1{color:#1e293b}h2{color:#334155;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-top:32px}
    .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:#e2e8f0}
    .approved{background:#d1fae5;color:#065f46}.submitted{background:#dbeafe;color:#1e40af}
    .rejected{background:#fee2e2;color:#991b1b}.comment{background:#fffbeb;border-left:3px solid #f59e0b;padding:8px;margin:8px 0}
    </style></head><body>
    <h1>PlanLoop — ${project.name}</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>`;
    project.variations.forEach(v => {
      html += `<h2>${v.name} <span class="tag ${v.tag}">${v.tag}</span></h2>
      <p>${v.items.length} furniture items · ${v.walls.length} walls</p>
      <h3>Furniture</h3><ul>`;
      v.items.forEach(i => { html += `<li>${i.label} — ${Math.round(i.width)}×${Math.round(i.height)}px</li>`; });
      html += `</ul><h3>Comments (${v.comments.length})</h3>`;
      v.comments.forEach((c, idx) => {
        html += `<div class="comment"><strong>[${idx + 1}] ${c.author}</strong> (${c.resolved ? 'resolved' : 'open'})<br/>${c.text}`;
        c.replies.forEach(r => { html += `<br/><em>&nbsp;&nbsp;↳ ${r.author}: ${r.text}</em>`; });
        html += `</div>`;
      });
    });
    html += `</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.download = `${project.name.replace(/\s+/g, '_')}_report.html`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const copyReadOnlyLink = () => {
    const data = btoa(JSON.stringify({ project: store.project }));
    const url = `${window.location.origin}${window.location.pathname}?view=${data}`;
    navigator.clipboard.writeText(url).then(() => alert('Read-only link copied!'));
  };

  return (
    <div className="flex flex-col h-full p-3 space-y-3 overflow-y-auto">
      <p className="text-sm font-semibold text-slate-200">Export & Share</p>

      {/* ── Project file (save / load) ─────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Project File</p>

        <button
          onClick={saveProject}
          className="w-full flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm px-3 py-2.5 rounded-lg transition-colors"
        >
          <Save size={16} className="text-emerald-400 shrink-0" />
          <div className="text-left">
            <div className="font-medium">Save Project</div>
            <div className="text-xs text-slate-500">Download .planloop file — all walls, furniture &amp; images included</div>
          </div>
          <Download size={14} className="ml-auto text-slate-500 shrink-0" />
        </button>

        <button
          onClick={() => importRef.current?.click()}
          disabled={importing}
          className="w-full flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm px-3 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          <FolderOpen size={16} className="text-amber-400 shrink-0" />
          <div className="text-left">
            <div className="font-medium">{importing ? 'Loading…' : 'Load Project'}</div>
            <div className="text-xs text-slate-500">Open a .planloop file — replaces current project</div>
          </div>
        </button>
        <input ref={importRef} type="file" accept=".planloop,.json" className="hidden" onChange={handleImport} />

        {importMsg && (
          <p className={`text-xs px-2 py-1 rounded ${importMsg.startsWith('Could') ? 'text-red-400 bg-red-900/20' : 'text-emerald-400 bg-emerald-900/20'}`}>
            {importMsg}
          </p>
        )}

        <p className="text-[10px] text-slate-600 leading-snug px-1">
          Share the .planloop file with teammates — they load it to see your exact layout, variations and comments. The hosted app URL is just the editor; the file carries the work.
        </p>
      </div>

      {/* ── Other exports ─────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Other Exports</p>

        <button onClick={exportPNG} className="w-full flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm px-3 py-2.5 rounded-lg transition-colors">
          <FileImage size={16} className="text-blue-400 shrink-0" />
          <div className="text-left">
            <div className="font-medium">Canvas Snapshot</div>
            <div className="text-xs text-slate-500">PNG of current 2D view</div>
          </div>
          <Download size={14} className="ml-auto text-slate-500 shrink-0" />
        </button>

        <button onClick={exportVariationReport} className="w-full flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm px-3 py-2.5 rounded-lg transition-colors">
          <FileText size={16} className="text-green-400 shrink-0" />
          <div className="text-left">
            <div className="font-medium">Variation Report</div>
            <div className="text-xs text-slate-500">HTML with all variations &amp; comments</div>
          </div>
          <Download size={14} className="ml-auto text-slate-500 shrink-0" />
        </button>

        <button onClick={copyReadOnlyLink} className="w-full flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm px-3 py-2.5 rounded-lg transition-colors">
          <Share2 size={16} className="text-purple-400 shrink-0" />
          <div className="text-left">
            <div className="font-medium">Share Read-Only Link</div>
            <div className="text-xs text-slate-500">Encodes project in URL (no images)</div>
          </div>
        </button>
      </div>

      {/* ── Summary ───────────────────────────────────────── */}
      <div className="mt-auto pt-3 border-t border-slate-700">
        <p className="text-xs text-slate-500 font-semibold mb-1.5">Active Variation</p>
        <div className="text-xs text-slate-400 space-y-1">
          <p>Name: <span className="text-slate-200">{av.name}</span></p>
          <p>Status: <span className="text-slate-200 capitalize">{av.tag}</span></p>
          <p>Items: <span className="text-slate-200">{av.items.length}</span></p>
          <p>Walls: <span className="text-slate-200">{av.walls.length}</span></p>
          <p>Comments: <span className="text-slate-200">{av.comments.length}</span></p>
        </div>
      </div>
    </div>
  );
}
