import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';

export function CommentDialog() {
  const store = useStore();
  const { pendingCommentPos } = store;
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('Homeowner');

  if (!pendingCommentPos) return null;

  const submit = () => {
    if (!text.trim()) return;
    store.addComment({ x: pendingCommentPos.x, y: pendingCommentPos.y, text: text.trim(), author });
    setText('');
    store.setActivePanel('comments');
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-5 w-80 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-100">Add Comment</h3>
          <button onClick={() => store.setPendingCommentPos(null)} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <input
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Your name"
          className="w-full bg-slate-700 text-slate-200 text-sm rounded px-2.5 py-2 outline-none border border-slate-600 focus:border-amber-500 mb-2"
        />
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's your question or note here?"
          rows={3}
          autoFocus
          className="w-full bg-slate-700 text-slate-200 text-sm rounded px-2.5 py-2 outline-none border border-slate-600 focus:border-amber-500 resize-none"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-sm py-2 rounded transition-colors"
          >
            Pin Comment
          </button>
          <button
            onClick={() => store.setPendingCommentPos(null)}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm py-2 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
