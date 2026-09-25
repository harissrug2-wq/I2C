import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Bot, Clock3, History, MessageSquarePlus, Sparkles, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getAskI2cFaqs, getAskI2cHistory, sendAskI2cMessage } from '../domain/askI2cApi';

function newId() {
  return crypto.randomUUID();
}

function ChatBubble({ message, userInitials }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#701a75] text-white shadow-sm">
          <Bot className="size-4" />
        </div>
      )}

      <div className={`max-w-[84%] ${isUser ? 'order-first' : ''}`}>
        <div className={`mb-1 text-[11px] font-semibold ${isUser ? 'text-right text-muted-foreground' : 'text-[#701a75]'}`}>
          {isUser ? 'You' : 'Ask i2C'}
        </div>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'rounded-tr-md bg-[#0d9488] text-white'
              : 'rounded-tl-md border border-border bg-card text-foreground'
          } ${message.pending ? 'animate-pulse text-muted-foreground' : ''}`}
        >
          {message.content}
        </div>
      </div>

      {isUser && (
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#bef264] text-[10px] font-bold text-[#112723]">
          {userInitials}
        </div>
      )}
    </div>
  );
}

export default function AskAiModal({ isOpen, onClose }) {
  const { user } = useData();
  const [conversationId, setConversationId] = useState(null);
  const [messageCount, setMessageCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [topic, setTopic] = useState('i2cashflow');
  const [suggestions, setSuggestions] = useState([]);
  const [view, setView] = useState('chat');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [olderOffset, setOlderOffset] = useState(0);
  const [olderHasMore, setOlderHasMore] = useState(false);
  const [retry, setRetry] = useState(null);
  const textareaRef = useRef(null);
  const requestEpoch = useRef(0);

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
  const userInitials = useMemo(
    () => (user?.name || user?.email || 'U')
      .split(/\s+|@/)
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    [user?.name, user?.email],
  );

  const freshChat = () => {
    if (sending) return;
    requestEpoch.current += 1;
    setConversationId(newId());
    setMessageCount(0);
    setMessages([]);
    setInput('');
    setError('');
    setView('chat');
    setOlderOffset(0);
    setOlderHasMore(false);
    setRetry(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!isOpen) return;
    freshChat();
    let cancelled = false;

    getAskI2cFaqs(currentPath)
      .then(result => {
        if (cancelled) return;
        setTopic(result.topic || 'i2cashflow');
        setSuggestions(Array.isArray(result.questions) ? result.questions : []);
      })
      .catch(err => {
        if (cancelled) return;
        setTopic('i2cashflow');
        setSuggestions([]);
        setError(err?.message || 'Ask i2C suggestions could not load.');
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentPath]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = event => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const loadHistory = async ({ append = false } = {}) => {
    if (sending) return;
    const ticket = ++requestEpoch.current;
    setView('history');
    setLoading(true);
    setError('');
    const offset = append ? historyOffset : 0;
    if (!append) setHistoryRows([]);

    try {
      const result = await getAskI2cHistory({ offset });
      if (ticket !== requestEpoch.current) return;
      const incoming = Array.isArray(result.conversations) ? result.conversations : [];
      setHistoryRows(prev => append ? [...prev, ...incoming] : incoming);
      setHistoryOffset(result.nextOffset || offset + 30);
      setHistoryHasMore(Boolean(result.hasMore));
    } catch (err) {
      if (ticket === requestEpoch.current) setError(err?.message || 'Chat history could not load.');
    } finally {
      if (ticket === requestEpoch.current) setLoading(false);
    }
  };

  const resumeConversation = async id => {
    const ticket = ++requestEpoch.current;
    setLoading(true);
    setError('');

    try {
      const result = await getAskI2cHistory({ conversationId: id, offset: 0 });
      if (ticket !== requestEpoch.current) return;
      setConversationId(id);
      setMessageCount(Number(result.messageCount || 0));
      setMessages((result.messages || []).map(row => ({
        id: row.id || newId(),
        role: row.role,
        content: row.content,
      })));
      setOlderOffset(result.nextOffset || 50);
      setOlderHasMore(Boolean(result.hasMore));
      setRetry(null);
      setView('chat');
      setTimeout(() => textareaRef.current?.focus(), 0);
    } catch (err) {
      if (ticket === requestEpoch.current) setError(err?.message || 'Conversation could not be opened.');
    } finally {
      if (ticket === requestEpoch.current) setLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!conversationId || loading) return;
    const ticket = requestEpoch.current;
    setLoading(true);
    setError('');

    try {
      const result = await getAskI2cHistory({ conversationId, offset: olderOffset });
      if (ticket !== requestEpoch.current) return;
      const incoming = (result.messages || []).map(row => ({
        id: row.id || newId(),
        role: row.role,
        content: row.content,
      }));
      setMessages(prev => {
        const known = new Set(prev.map(row => row.id));
        return [...incoming.filter(row => !known.has(row.id)), ...prev];
      });
      setOlderOffset(result.nextOffset || olderOffset + 50);
      setOlderHasMore(Boolean(result.hasMore));
    } catch (err) {
      if (ticket === requestEpoch.current) setError(err?.message || 'Older messages could not load.');
    } finally {
      if (ticket === requestEpoch.current) setLoading(false);
    }
  };

  const handleSend = async queryText => {
    if (sending || loading) return;
    const message = String(queryText ?? input).trim();
    if (!message || !conversationId) return;

    const requestId = retry?.message === message ? retry.id : newId();
    const userRow = { id: `user-${requestId}`, role: 'user', content: message };
    const pendingRow = { id: `pending-${requestId}`, role: 'assistant', content: 'Thinking…', pending: true };
    const ticket = requestEpoch.current;

    setRetry({ message, id: requestId });
    setSending(true);
    setError('');
    setInput('');
    setMessages(prev => [...prev, userRow, pendingRow]);

    try {
      const result = await sendAskI2cMessage({
        message,
        currentPath,
        conversationId,
        requestId,
        messageCount,
      });

      setMessageCount(Number(result.messageCount || messageCount + 2));
      setMessages(prev => prev.map(row => row.id === pendingRow.id
        ? { ...row, content: result.answer, pending: false }
        : row));
      setRetry(null);
    } catch (err) {
      if (ticket === requestEpoch.current) {
        setMessages(prev => prev.filter(row => row.id !== userRow.id && row.id !== pendingRow.id));
        setInput(message);
        setError(err?.message || 'Ask i2C could not respond. Please retry.');
      }
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-transparent"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="ask-i2c-title"
        className="flex h-dvh w-full max-w-[430px] flex-col border-l border-border bg-background shadow-[-16px_0_48px_rgba(15,23,42,0.16)]"
      >
        <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#701a75] text-white shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="ask-i2c-title" className="text-lg font-bold tracking-tight text-foreground">Ask i2C</h2>
            <p className="truncate text-xs font-medium text-muted-foreground">{topic} guidance</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close Ask i2C">
            <X className="size-5" />
          </button>
        </header>

        <nav className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-2.5">
          <button type="button" onClick={freshChat} disabled={sending} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-50">
            <MessageSquarePlus className="size-3.5" />
            New chat
          </button>
          <button
            type="button"
            onClick={() => loadHistory()}
            disabled={sending}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50 ${
              view === 'history'
                ? 'border-[#701a75]/30 bg-[#701a75]/10 text-[#701a75]'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            <History className="size-3.5" />
            History
          </button>
          <span className="ml-auto max-w-[135px] truncate text-[11px] font-medium text-muted-foreground">{topic}</span>
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {view === 'history' ? (
            <div className="space-y-3">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-foreground">Your conversations</h3>
                <p className="mt-1 text-xs text-muted-foreground">Saved only for this signed-in i2C workspace.</p>
              </div>

              {!loading && historyRows.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center">
                  <Clock3 className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">No saved chats yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Start a new chat to create your first conversation.</p>
                </div>
              )}

              {historyRows.map(row => (
                <button key={row.id} type="button" onClick={() => resumeConversation(row.id)} className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-[#701a75]/30 hover:bg-[#701a75]/5">
                  <div className="truncate text-sm font-semibold text-foreground">{row.title}</div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span>{new Date(row.updated_at).toLocaleString()}</span>
                    <span>{row.message_count} messages</span>
                  </div>
                </button>
              ))}

              {loading && <div className="py-6 text-center text-xs text-muted-foreground">Loading…</div>}

              {historyHasMore && !loading && (
                <button type="button" onClick={() => loadHistory({ append: true })} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                  Load more conversations
                </button>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div>
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-[#701a75]/10 text-[#701a75]">
                  <Sparkles className="size-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">How can I help with {topic}?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Ask about i2cashflow or the data in your signed-in workspace. I use the active workspace as read-only evidence and won’t invent missing numbers.
                </p>
              </section>

              <div className="mt-5">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Suggestions</div>
                <div className="space-y-2">
                  {(suggestions.length ? suggestions : ['What should I review first?']).map(question => (
                    <button key={question} type="button" onClick={() => handleSend(question)} disabled={sending || loading} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition hover:border-[#0d9488]/40 hover:bg-[#0d9488]/5 disabled:opacity-50">
                      <span>{question}</span>
                      <ArrowUp className="size-4 rotate-45 text-muted-foreground transition group-hover:text-[#0d9488]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {olderHasMore && (
                <button type="button" onClick={loadOlderMessages} disabled={loading} className="mx-auto block rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  Load older messages
                </button>
              )}
              {messages.map(message => <ChatBubble key={message.id} message={message} userInitials={userInitials} />)}
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-[#ef4444]/20 bg-[#ef4444]/5 px-5 py-2.5 text-xs font-medium text-[#dc2626]" role="alert">{error}</div>
        )}

        <form onSubmit={event => { event.preventDefault(); handleSend(); }} className="border-t border-border bg-card px-5 pb-4 pt-3">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:border-[#701a75]/40 focus-within:ring-2 focus-within:ring-[#701a75]/10">
            <textarea
              ref={textareaRef}
              rows={1}
              maxLength={4000}
              value={input}
              disabled={loading || view !== 'chat'}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!sending && !loading && input.trim()) handleSend();
                }
              }}
              placeholder={`Ask about ${topic.toLowerCase()}, your workspace, or connected data…`}
              className="max-h-32 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button type="submit" disabled={sending || loading || view !== 'chat' || !input.trim()} className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#701a75] text-white shadow-sm transition hover:bg-[#86198f] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
              <ArrowUp className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground">
            i2cashflow guidance · Check important financial decisions
          </p>
        </form>
      </section>
    </div>
  );
}
