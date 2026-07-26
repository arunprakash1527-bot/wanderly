import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import './styles/braindump.css';

// ─── Constants ──────────────────────────────────────────────────────────────────

const PRIORITY_META = {
  1: { label: 'P1', name: 'Urgent', color: '#E5484D', bg: '#E5484D14' },
  2: { label: 'P2', name: 'Normal', color: '#F5A623', bg: '#F5A62314' },
  3: { label: 'P3', name: 'Low',    color: '#3B82F6', bg: '#3B82F614' },
};

const VIEWS = {
  ALL:      'all',
  PRIORITY: 'priority',
  CATEGORY: 'category',
  DONE:     'done',
};

const DEFAULT_COLORS = [
  '#3060D4', '#7C4DBC', '#E5484D', '#D4593B',
  '#F5A623', '#30A46C', '#0EA5E9', '#8B5CF6',
];

// ─── Utilities ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupBy(items, keyFn) {
  const groups = {};
  items.forEach(item => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

// ─── Auth Screen ────────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="bd-auth">
      <div className="bd-auth-card">
        <div className="bd-auth-logo">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="var(--bd-accent)" />
            <path d="M10 12h16M10 18h12M10 24h8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="bd-auth-title">Braindump</h1>
        <p className="bd-auth-subtitle">Dump it. AI sorts it. You clear it.</p>

        {sent ? (
          <div className="bd-auth-sent">
            <p>Check your email for a sign-in link.</p>
            <button className="bd-btn-text" onClick={() => setSent(false)}>Try again</button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="bd-auth-form">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bd-input"
                autoFocus
              />
              <button type="submit" className="bd-btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Sign in with email'}
              </button>
            </form>
            <div className="bd-auth-divider"><span>or</span></div>
            <button className="bd-btn-secondary" onClick={handleGoogleSignIn}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            {error && <p className="bd-auth-error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Priority Badge ─────────────────────────────────────────────────────────────

function PriorityBadge({ priority, onClick, size = 'sm' }) {
  const meta = PRIORITY_META[priority];
  return (
    <button
      className={`bd-priority-badge bd-priority-${size}`}
      style={{ color: meta.color, background: meta.bg }}
      onClick={onClick}
      title={meta.name}
    >
      {meta.label}
    </button>
  );
}

// ─── Category Chip ──────────────────────────────────────────────────────────────

function CategoryChip({ category, onClick, selected, small }) {
  if (!category) return null;
  return (
    <button
      className={`bd-category-chip ${selected ? 'selected' : ''} ${small ? 'small' : ''}`}
      onClick={onClick}
      style={{ '--chip-color': category.color }}
    >
      <span className="bd-chip-dot" />
      {category.name}
    </button>
  );
}

// ─── AI Suggestion Chip ────────────────────────────────────────────────────────

function AISuggestion({ suggestion, onAccept, onDismiss }) {
  if (!suggestion) return null;
  return (
    <div className="bd-ai-suggestion">
      <span className="bd-ai-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
      </span>
      <span className="bd-ai-text">
        AI suggests: <strong>{suggestion.category}</strong>
        {suggestion.priority && ` · ${PRIORITY_META[suggestion.priority]?.label}`}
      </span>
      <button className="bd-ai-accept" onClick={onAccept}>Accept</button>
      <button className="bd-ai-dismiss" onClick={onDismiss}>×</button>
    </div>
  );
}

// ─── Quick Capture ──────────────────────────────────────────────────────────────

function QuickCapture({ onAdd, disabled }) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState(2);
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed, priority);
    setText('');
    setPriority(2);
    inputRef.current?.focus();
  };

  const cyclePriority = () => {
    setPriority(p => p === 3 ? 1 : p + 1);
  };

  return (
    <form className="bd-capture" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Dump something..."
        className="bd-capture-input"
        disabled={disabled}
        autoComplete="off"
      />
      <PriorityBadge priority={priority} onClick={(e) => { e.preventDefault(); cyclePriority(); }} />
      <button type="submit" className="bd-capture-submit" disabled={!text.trim() || disabled}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </form>
  );
}

// ─── Note Card ──────────────────────────────────────────────────────────────────

function NoteCard({
  note, categories, onToggleDone, onDelete, onSelect,
  onUpdatePriority, onUpdateCategory, aiSuggestion, onAcceptAI, onDismissAI,
  commentCounts,
}) {
  const [swiping, setSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStart = useRef(null);
  const category = categories.find(c => c.id === note.category_id);
  const isDone = note.status === 'done';
  const count = commentCounts[note.id] || 0;

  const handleTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStart.current) return;
    const diff = e.touches[0].clientX - touchStart.current;
    setSwipeX(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (swipeX > 60) {
      onToggleDone(note);
    } else if (swipeX < -60) {
      onDelete(note.id);
    }
    setSwipeX(0);
    setSwiping(false);
    touchStart.current = null;
  };

  return (
    <div
      className={`bd-note-card ${isDone ? 'done' : ''} ${swiping ? 'swiping' : ''}`}
      style={swiping ? { transform: `translateX(${swipeX}px)` } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="bd-note-row">
        <button
          className={`bd-check ${isDone ? 'checked' : ''}`}
          onClick={() => onToggleDone(note)}
          aria-label={isDone ? 'Mark active' : 'Mark done'}
        >
          {isDone && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </button>

        <div className="bd-note-body" onClick={() => onSelect(note)}>
          <p className={`bd-note-content ${isDone ? 'done-text' : ''}`}>{note.content}</p>
          <div className="bd-note-meta">
            {category && <CategoryChip category={category} small />}
            <span className="bd-note-time">{timeAgo(note.created_at)}</span>
            {count > 0 && (
              <span className="bd-note-comments">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                {count}
              </span>
            )}
          </div>
        </div>

        <PriorityBadge
          priority={note.priority}
          onClick={() => onUpdatePriority(note.id, note.priority === 3 ? 1 : note.priority + 1)}
        />
      </div>

      {aiSuggestion && (
        <AISuggestion
          suggestion={aiSuggestion}
          onAccept={() => onAcceptAI(note.id, aiSuggestion)}
          onDismiss={() => onDismissAI(note.id)}
        />
      )}
    </div>
  );
}

// ─── Note Detail ────────────────────────────────────────────────────────────────

function NoteDetail({
  note, categories, comments, onClose, onUpdate, onDelete,
  onAddComment, onDeleteComment, onUpdateCategory
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [commentText, setCommentText] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const textareaRef = useRef(null);
  const category = categories.find(c => c.id === note.category_id);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  const handleSave = () => {
    if (editContent.trim() && editContent.trim() !== note.content) {
      onUpdate(note.id, { content: editContent.trim() });
    }
    setEditing(false);
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(note.id, commentText.trim());
    setCommentText('');
  };

  const cyclePriority = () => {
    const next = note.priority === 3 ? 1 : note.priority + 1;
    onUpdate(note.id, { priority: next });
  };

  return (
    <div className="bd-detail-overlay" onClick={onClose}>
      <div className="bd-detail" onClick={e => e.stopPropagation()}>
        <div className="bd-detail-header">
          <button className="bd-btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div className="bd-detail-actions">
            <PriorityBadge priority={note.priority} onClick={cyclePriority} size="md" />
            <button
              className={`bd-btn-icon ${note.status === 'done' ? 'active' : ''}`}
              onClick={() => onUpdate(note.id, { status: note.status === 'done' ? 'active' : 'done' })}
              title={note.status === 'done' ? 'Reopen' : 'Mark done'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button className="bd-btn-icon danger" onClick={() => { onDelete(note.id); onClose(); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>

        <div className="bd-detail-body">
          {editing ? (
            <div className="bd-detail-edit">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="bd-detail-textarea"
                rows={4}
              />
              <div className="bd-detail-edit-actions">
                <button className="bd-btn-primary bd-btn-sm" onClick={handleSave}>Save</button>
                <button className="bd-btn-text" onClick={() => { setEditing(false); setEditContent(note.content); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p className={`bd-detail-content ${note.status === 'done' ? 'done-text' : ''}`} onClick={() => setEditing(true)}>
              {note.content}
            </p>
          )}

          <div className="bd-detail-meta-row">
            <div className="bd-detail-category" onClick={() => setShowCategoryPicker(!showCategoryPicker)}>
              {category ? (
                <CategoryChip category={category} />
              ) : (
                <span className="bd-add-category">+ Add category</span>
              )}
            </div>
            <span className="bd-detail-time">{timeAgo(note.created_at)}</span>
          </div>

          {showCategoryPicker && (
            <div className="bd-category-picker">
              {categories.map(c => (
                <CategoryChip
                  key={c.id}
                  category={c}
                  selected={note.category_id === c.id}
                  onClick={() => {
                    onUpdateCategory(note.id, note.category_id === c.id ? null : c.id);
                    setShowCategoryPicker(false);
                  }}
                />
              ))}
              {note.category_id && (
                <button className="bd-btn-text bd-btn-sm" onClick={() => { onUpdateCategory(note.id, null); setShowCategoryPicker(false); }}>
                  Remove category
                </button>
              )}
            </div>
          )}

          <div className="bd-comments-section">
            <h3 className="bd-comments-title">
              Comments {comments.length > 0 && <span className="bd-comments-count">{comments.length}</span>}
            </h3>
            <div className="bd-comments-list">
              {comments.map(c => (
                <div key={c.id} className="bd-comment">
                  <p className="bd-comment-content">{c.content}</p>
                  <div className="bd-comment-footer">
                    <span className="bd-comment-time">{timeAgo(c.created_at)}</span>
                    <button className="bd-btn-text bd-btn-xs" onClick={() => onDeleteComment(c.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <form className="bd-comment-form" onSubmit={handleAddComment}>
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="bd-input bd-comment-input"
              />
              <button type="submit" className="bd-btn-primary bd-btn-sm" disabled={!commentText.trim()}>
                Add
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category Manager ───────────────────────────────────────────────────────────

function CategoryManager({ categories, onAdd, onUpdate, onDelete, onClose }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName.trim(), newColor);
    setNewName('');
    setNewColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
  };

  return (
    <div className="bd-detail-overlay" onClick={onClose}>
      <div className="bd-detail bd-category-mgr" onClick={e => e.stopPropagation()}>
        <div className="bd-detail-header">
          <h2 className="bd-mgr-title">Categories</h2>
          <button className="bd-btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="bd-detail-body">
          <form className="bd-mgr-form" onSubmit={handleAdd}>
            <div className="bd-mgr-color-row">
              {DEFAULT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`bd-color-swatch ${newColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className="bd-mgr-input-row">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="New category name"
                className="bd-input"
              />
              <button type="submit" className="bd-btn-primary bd-btn-sm" disabled={!newName.trim()}>Add</button>
            </div>
          </form>

          <div className="bd-mgr-list">
            {categories.map(cat => (
              <div key={cat.id} className="bd-mgr-item">
                <span className="bd-chip-dot" style={{ '--chip-color': cat.color }} />
                <span className="bd-mgr-name">{cat.name}</span>
                <button className="bd-btn-text bd-btn-xs danger" onClick={() => onDelete(cat.id)}>Remove</button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="bd-empty-text">No categories yet. Add one above, or let AI suggest them.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ view }) {
  const messages = {
    [VIEWS.ALL]: { title: 'Nothing here yet', desc: 'Type something in the box above to dump your first note.' },
    [VIEWS.PRIORITY]: { title: 'No active notes', desc: 'Your notes will appear here grouped by priority.' },
    [VIEWS.CATEGORY]: { title: 'No categorized notes', desc: 'Add categories or let AI sort your notes.' },
    [VIEWS.DONE]: { title: 'Nothing completed', desc: 'Completed notes will appear here.' },
  };
  const msg = messages[view] || messages[VIEWS.ALL];
  return (
    <div className="bd-empty">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.3">
        <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="2"/>
        <line x1="14" y1="16" x2="34" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="14" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="14" y1="32" x2="22" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <h3 className="bd-empty-title">{msg.title}</h3>
      <p className="bd-empty-desc">{msg.desc}</p>
    </div>
  );
}

// ─── Search Bar ─────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, onClear }) {
  return (
    <div className="bd-search">
      <svg className="bd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search notes..."
        className="bd-search-input"
      />
      {value && (
        <button className="bd-search-clear" onClick={onClear}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────────

export default function BraindumpApp() {
  // Auth
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});

  // UI
  const [currentView, setCurrentView] = useState(VIEWS.ALL);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showCategoryMgr, setShowCategoryMgr] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    const [notesRes, catsRes, commentsCountRes] = await Promise.all([
      supabase.from('notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('comments').select('note_id'),
    ]);

    if (notesRes.data) setNotes(notesRes.data);
    if (catsRes.data) setCategories(catsRes.data);

    if (commentsCountRes.data) {
      const counts = {};
      commentsCountRes.data.forEach(c => {
        counts[c.note_id] = (counts[c.note_id] || 0) + 1;
      });
      setCommentCounts(counts);
    }

    setDataLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Realtime ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('braindump-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotes(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
          if (selectedNote?.id === payload.new.id) setSelectedNote(payload.new);
        } else if (payload.eventType === 'DELETE') {
          setNotes(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${user.id}` }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedNote, loadData]);

  // ── Note CRUD ─────────────────────────────────────────────────────────────

  const addNote = useCallback(async (content, priority) => {
    if (!user) return;
    const newNote = {
      user_id: user.id,
      content,
      priority,
      status: 'active',
    };

    const { data, error } = await supabase.from('notes').insert(newNote).select().single();
    if (error) { console.error('Add note error:', error); return; }

    setNotes(prev => [data, ...prev]);
    triggerAICategorize(data);
  }, [user, categories]);

  const updateNote = useCallback(async (noteId, updates) => {
    const { error } = await supabase.from('notes').update(updates).eq('id', noteId);
    if (error) { console.error('Update note error:', error); return; }
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n));
    if (selectedNote?.id === noteId) setSelectedNote(prev => ({ ...prev, ...updates }));
  }, [selectedNote]);

  const deleteNote = useCallback(async (noteId) => {
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error) { console.error('Delete note error:', error); return; }
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedNote?.id === noteId) setSelectedNote(null);
  }, [selectedNote]);

  const toggleDone = useCallback((note) => {
    updateNote(note.id, { status: note.status === 'done' ? 'active' : 'done' });
  }, [updateNote]);

  const updatePriority = useCallback((noteId, priority) => {
    updateNote(noteId, { priority });
  }, [updateNote]);

  const updateCategory = useCallback((noteId, categoryId) => {
    updateNote(noteId, { category_id: categoryId });
  }, [updateNote]);

  // ── Category CRUD ─────────────────────────────────────────────────────────

  const addCategory = useCallback(async (name, color) => {
    if (!user) return;
    const { data, error } = await supabase.from('categories')
      .insert({ user_id: user.id, name, color, sort_order: categories.length })
      .select().single();
    if (error) { console.error('Add category error:', error); return; }
    setCategories(prev => [...prev, data]);
  }, [user, categories.length]);

  const deleteCategory = useCallback(async (categoryId) => {
    await supabase.from('notes').update({ category_id: null }).eq('category_id', categoryId);
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) { console.error('Delete category error:', error); return; }
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    setNotes(prev => prev.map(n => n.category_id === categoryId ? { ...n, category_id: null } : n));
  }, []);

  // ── Comments ──────────────────────────────────────────────────────────────

  const loadComments = useCallback(async (noteId) => {
    const { data } = await supabase.from('comments')
      .select('*').eq('note_id', noteId).order('created_at');
    if (data) setComments(data);
  }, []);

  const addComment = useCallback(async (noteId, content) => {
    if (!user) return;
    const { data, error } = await supabase.from('comments')
      .insert({ note_id: noteId, user_id: user.id, content })
      .select().single();
    if (error) { console.error('Add comment error:', error); return; }
    setComments(prev => [...prev, data]);
    setCommentCounts(prev => ({ ...prev, [noteId]: (prev[noteId] || 0) + 1 }));
  }, [user]);

  const deleteComment = useCallback(async (commentId) => {
    const comment = comments.find(c => c.id === commentId);
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) { console.error('Delete comment error:', error); return; }
    setComments(prev => prev.filter(c => c.id !== commentId));
    if (comment) {
      setCommentCounts(prev => ({ ...prev, [comment.note_id]: Math.max(0, (prev[comment.note_id] || 1) - 1) }));
    }
  }, [comments]);

  useEffect(() => {
    if (selectedNote) loadComments(selectedNote.id);
    else setComments([]);
  }, [selectedNote, loadComments]);

  // ── AI Categorization ─────────────────────────────────────────────────────

  const triggerAICategorize = useCallback(async (note) => {
    try {
      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: note.content, categories }),
      });
      if (!res.ok) return;
      const suggestion = await res.json();
      setAiSuggestions(prev => ({ ...prev, [note.id]: suggestion }));
    } catch {
      // AI categorization is best-effort
    }
  }, [categories]);

  const acceptAISuggestion = useCallback(async (noteId, suggestion) => {
    let categoryId = null;

    if (suggestion.isNew) {
      const color = DEFAULT_COLORS[categories.length % DEFAULT_COLORS.length];
      const { data } = await supabase.from('categories')
        .insert({ user_id: user.id, name: suggestion.category, color, sort_order: categories.length })
        .select().single();
      if (data) {
        setCategories(prev => [...prev, data]);
        categoryId = data.id;
      }
    } else {
      const existing = categories.find(c => c.name.toLowerCase() === suggestion.category.toLowerCase());
      categoryId = existing?.id;
    }

    const updates = {};
    if (categoryId) updates.category_id = categoryId;
    if (suggestion.priority) updates.priority = suggestion.priority;
    if (Object.keys(updates).length) updateNote(noteId, updates);

    setAiSuggestions(prev => { const next = { ...prev }; delete next[noteId]; return next; });
  }, [categories, user, updateNote]);

  const dismissAISuggestion = useCallback((noteId) => {
    setAiSuggestions(prev => { const next = { ...prev }; delete next[noteId]; return next; });
  }, []);

  const bulkCategorize = useCallback(async () => {
    const uncategorized = notes.filter(n => !n.category_id && n.status === 'active');
    if (!uncategorized.length) return;

    setAiLoading(true);
    try {
      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'batch',
          notes: uncategorized.map(n => ({ id: n.id, content: n.content })),
          categories,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const { suggestions } = await res.json();

      const newSuggestions = {};
      suggestions.forEach(s => {
        const note = uncategorized[s.index];
        if (note) newSuggestions[note.id] = s;
      });
      setAiSuggestions(prev => ({ ...prev, ...newSuggestions }));
    } catch {
      // Best-effort
    }
    setAiLoading(false);
  }, [notes, categories]);

  // ── Filtering & Grouping ──────────────────────────────────────────────────

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (currentView === VIEWS.DONE) {
      result = result.filter(n => n.status === 'done');
    } else if (currentView !== VIEWS.ALL || !searchQuery) {
      result = result.filter(n => n.status === 'active');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.content.toLowerCase().includes(q));
    }

    return result;
  }, [notes, currentView, searchQuery]);

  const groupedNotes = useMemo(() => {
    if (currentView === VIEWS.PRIORITY) {
      return groupBy(filteredNotes, n => n.priority);
    }
    if (currentView === VIEWS.CATEGORY) {
      return groupBy(filteredNotes, n => n.category_id || '_uncategorized');
    }
    return null;
  }, [currentView, filteredNotes]);

  // ── Counts ────────────────────────────────────────────────────────────────

  const activeCount = notes.filter(n => n.status === 'active').length;
  const doneCount = notes.filter(n => n.status === 'done').length;
  const uncategorizedCount = notes.filter(n => !n.category_id && n.status === 'active').length;

  // ── Sign Out ──────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNotes([]);
    setCategories([]);
  };

  // ── Render Helpers ────────────────────────────────────────────────────────

  const renderNoteCard = (note) => (
    <NoteCard
      key={note.id}
      note={note}
      categories={categories}
      onToggleDone={toggleDone}
      onDelete={deleteNote}
      onSelect={setSelectedNote}
      onUpdatePriority={updatePriority}
      onUpdateCategory={updateCategory}
      aiSuggestion={aiSuggestions[note.id]}
      onAcceptAI={acceptAISuggestion}
      onDismissAI={dismissAISuggestion}
      commentCounts={commentCounts}
    />
  );

  const renderGroupedByPriority = () => {
    return [1, 2, 3].map(p => {
      const group = groupedNotes[p];
      if (!group || !group.length) return null;
      const meta = PRIORITY_META[p];
      return (
        <div key={p} className="bd-group">
          <div className="bd-group-header">
            <span className="bd-group-dot" style={{ background: meta.color }} />
            <span className="bd-group-title">{meta.name}</span>
            <span className="bd-group-count">{group.length}</span>
          </div>
          {group.map(renderNoteCard)}
        </div>
      );
    });
  };

  const renderGroupedByCategory = () => {
    const categoryIds = Object.keys(groupedNotes).filter(k => k !== '_uncategorized');
    const uncategorized = groupedNotes['_uncategorized'];

    return (
      <>
        {categoryIds.map(catId => {
          const cat = categories.find(c => c.id === catId);
          const group = groupedNotes[catId];
          if (!cat || !group?.length) return null;
          return (
            <div key={catId} className="bd-group">
              <div className="bd-group-header">
                <span className="bd-group-dot" style={{ background: cat.color }} />
                <span className="bd-group-title">{cat.name}</span>
                <span className="bd-group-count">{group.length}</span>
              </div>
              {group.map(renderNoteCard)}
            </div>
          );
        })}
        {uncategorized?.length > 0 && (
          <div className="bd-group">
            <div className="bd-group-header">
              <span className="bd-group-dot" style={{ background: 'var(--bd-muted)' }} />
              <span className="bd-group-title">Uncategorized</span>
              <span className="bd-group-count">{uncategorized.length}</span>
            </div>
            {uncategorized.map(renderNoteCard)}
          </div>
        )}
      </>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="bd-loading">
        <div className="bd-spinner" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="bd-app">
      {/* Header */}
      <header className="bd-header">
        <div className="bd-header-left">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="var(--bd-accent)" />
            <path d="M10 12h16M10 18h12M10 24h8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h1 className="bd-app-title">Braindump</h1>
        </div>
        <div className="bd-header-right">
          {uncategorizedCount > 0 && (
            <button
              className={`bd-btn-ai ${aiLoading ? 'loading' : ''}`}
              onClick={bulkCategorize}
              disabled={aiLoading}
              title={`AI sort ${uncategorizedCount} uncategorized notes`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              {aiLoading ? 'Sorting...' : `Sort ${uncategorizedCount}`}
            </button>
          )}
          <button className="bd-btn-icon" onClick={() => setShowCategoryMgr(true)} title="Manage categories">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
          <button className="bd-btn-icon" onClick={handleSignOut} title="Sign out">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      {/* Quick Capture */}
      <QuickCapture onAdd={addNote} disabled={dataLoading} />

      {/* Search */}
      <SearchBar value={searchQuery} onChange={setSearchQuery} onClear={() => setSearchQuery('')} />

      {/* View Tabs */}
      <div className="bd-views">
        <button className={`bd-view-tab ${currentView === VIEWS.ALL ? 'active' : ''}`} onClick={() => setCurrentView(VIEWS.ALL)}>
          All <span className="bd-tab-count">{activeCount}</span>
        </button>
        <button className={`bd-view-tab ${currentView === VIEWS.PRIORITY ? 'active' : ''}`} onClick={() => setCurrentView(VIEWS.PRIORITY)}>
          Priority
        </button>
        <button className={`bd-view-tab ${currentView === VIEWS.CATEGORY ? 'active' : ''}`} onClick={() => setCurrentView(VIEWS.CATEGORY)}>
          Category
        </button>
        <button className={`bd-view-tab ${currentView === VIEWS.DONE ? 'active' : ''}`} onClick={() => setCurrentView(VIEWS.DONE)}>
          Done <span className="bd-tab-count">{doneCount}</span>
        </button>
      </div>

      {/* Notes List */}
      <div className="bd-notes">
        {dataLoading ? (
          <div className="bd-loading-inline"><div className="bd-spinner" /></div>
        ) : filteredNotes.length === 0 ? (
          <EmptyState view={currentView} />
        ) : groupedNotes ? (
          currentView === VIEWS.PRIORITY ? renderGroupedByPriority() : renderGroupedByCategory()
        ) : (
          filteredNotes.map(renderNoteCard)
        )}
      </div>

      {/* Detail Modal */}
      {selectedNote && (
        <NoteDetail
          note={selectedNote}
          categories={categories}
          comments={comments}
          onClose={() => setSelectedNote(null)}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
          onUpdateCategory={updateCategory}
        />
      )}

      {/* Category Manager */}
      {showCategoryMgr && (
        <CategoryManager
          categories={categories}
          onAdd={addCategory}
          onDelete={deleteCategory}
          onClose={() => setShowCategoryMgr(false)}
        />
      )}
    </div>
  );
}
