import { useState } from 'react';
import { Key, X, ExternalLink } from 'lucide-react';
import { useStore } from '../store';

interface Props { onClose: () => void }

export function ApiKeyModal({ onClose }: Props) {
  const { apiKey, setApiKey } = useStore();
  const [draft, setDraft] = useState(apiKey);

  const save = () => { setApiKey(draft.trim()); onClose(); };

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-[420px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Key size={16} className="text-blue-400" /> Anthropic API Key
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Required for <strong className="text-slate-200">Smart Detect</strong> — automatically maps rooms, walls, and furniture from your floor plan image using Claude vision.
        </p>

        <input
          type="password"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="sk-ant-api03-…"
          autoFocus
          className="w-full bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 outline-none border border-slate-600 focus:border-blue-500 font-mono"
        />

        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
          Your key is stored only in your browser (localStorage) and never sent anywhere except Anthropic's API.
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={!draft.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm py-2 rounded-lg transition-colors font-medium"
          >
            Save Key
          </button>
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm py-2 rounded-lg transition-colors">
            Cancel
          </button>
        </div>

        <a
          href="https://console.anthropic.com/account/keys"
          target="_blank"
          rel="noreferrer"
          className="mt-3 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 justify-center"
        >
          Get an API key at console.anthropic.com <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
