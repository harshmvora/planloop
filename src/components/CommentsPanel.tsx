import { useState } from 'react';
import { MessageCircle, CheckCircle, Circle, Reply } from 'lucide-react';
import { useStore, useActiveVariation } from '../store';

export function CommentsPanel() {
  const store = useStore();
  const av = useActiveVariation();
  const [newText, setNewText] = useState('');
  const [newAuthor, setNewAuthor] = useState('Homeowner');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const submitComment = () => {
    if (!newText.trim()) return;
    store.addComment({ x: 100, y: 100, text: newText.trim(), author: newAuthor });
    setNewText('');
  };

  const submitReply = (commentId: string) => {
    if (!replyText.trim()) return;
    store.addReply(commentId, { author: newAuthor, text: replyText.trim() });
    setReplyText('');
    setReplyingTo(null);
  };

  const active = av.comments.filter(c => !c.resolved);
  const resolved = av.comments.filter(c => c.resolved);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-1.5 mb-2">
          <MessageCircle size={14} className="text-amber-400" />
          <span className="text-sm font-semibold text-slate-200">Comments</span>
          <span className="ml-auto text-xs text-slate-500">{active.length} open</span>
        </div>
        <input
          value={newAuthor}
          onChange={e => setNewAuthor(e.target.value)}
          placeholder="Your name"
          className="w-full bg-slate-800 text-slate-300 text-xs rounded px-2 py-1 outline-none border border-slate-600 focus:border-amber-500 mb-1.5"
        />
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Add a comment… (or use 📍 tool on canvas to pin)"
          rows={2}
          className="w-full bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 outline-none border border-slate-600 focus:border-amber-500 resize-none"
        />
        <button
          onClick={submitComment}
          disabled={!newText.trim()}
          className="mt-1.5 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-xs py-1 rounded transition-colors"
        >
          Add Comment
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {av.comments.length === 0 && (
          <p className="text-slate-500 text-xs text-center mt-4">No comments yet.<br />Use the 📍 pin tool or add one above.</p>
        )}
        {active.map((c, i) => (
          <CommentCard
            key={c.id}
            comment={c}
            index={i + 1}

            replyingTo={replyingTo}
            replyText={replyText}
            setReplyText={setReplyText}
            setReplyingTo={setReplyingTo}
            onResolve={() => store.resolveComment(c.id)}
            onSubmitReply={() => submitReply(c.id)}
          />
        ))}
        {resolved.length > 0 && (
          <>
            <div className="text-xs text-slate-500 mt-3 mb-1">Resolved ({resolved.length})</div>
            {resolved.map((c, i) => (
              <CommentCard
                key={c.id}
                comment={c}
                index={active.length + i + 1}
    
                replyingTo={replyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                setReplyingTo={setReplyingTo}
                onResolve={() => store.resolveComment(c.id)}
                onSubmitReply={() => submitReply(c.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function CommentCard({ comment, index, replyingTo, replyText, setReplyText, setReplyingTo, onResolve, onSubmitReply }: {
  comment: import('../types').Comment;
  index: number;
  replyingTo: string | null;
  replyText: string;
  setReplyText: (t: string) => void;
  setReplyingTo: (id: string | null) => void;
  onResolve: () => void;
  onSubmitReply: () => void;
}) {
  const isOpen = !comment.resolved;
  return (
    <div className={`rounded-lg border p-2.5 ${isOpen ? 'border-amber-700/50 bg-amber-900/10' : 'border-slate-700 bg-slate-800/50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0">{index}</span>
          <span className="text-xs font-semibold text-slate-200">{comment.author}</span>
        </div>
        <button onClick={onResolve} title={isOpen ? 'Mark resolved' : 'Reopen'} className="text-slate-400 hover:text-green-400 shrink-0">
          {isOpen ? <Circle size={14} /> : <CheckCircle size={14} className="text-green-500" />}
        </button>
      </div>
      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{comment.text}</p>
      <p className="text-xs text-slate-600 mt-0.5">{new Date(comment.createdAt).toLocaleString()}</p>

      {comment.replies.map(r => (
        <div key={r.id} className="mt-2 ml-3 border-l-2 border-slate-600 pl-2">
          <span className="text-xs font-semibold text-slate-300">{r.author}: </span>
          <span className="text-xs text-slate-400">{r.text}</span>
        </div>
      ))}

      {replyingTo === comment.id ? (
        <div className="mt-2">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Reply…"
            rows={2}
            className="w-full bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 outline-none border border-slate-600 focus:border-amber-500 resize-none"
          />
          <div className="flex gap-1 mt-1">
            <button onClick={onSubmitReply} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white text-xs py-1 rounded">Reply</button>
            <button onClick={() => setReplyingTo(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs py-1 rounded">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setReplyingTo(comment.id)} className="mt-2 text-xs text-slate-500 hover:text-amber-400 flex items-center gap-1">
          <Reply size={11} /> Reply
        </button>
      )}
    </div>
  );
}
