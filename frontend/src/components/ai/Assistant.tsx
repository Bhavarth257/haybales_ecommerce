'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Tx, useI18n } from '../../lib/i18n';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  /** A user turn that got no answer; kept on screen but left out of the history sent to the model. */
  failed?: boolean;
}

const MAX_TURNS = 12; // matches chatSchema on the API
const MAX_LEN = 2000;
const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
// iOS sheet curve: fast start, long soft settle (reads like a critically damped spring).
const EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]';

export function Assistant() {
  const { me } = useAuth();
  const { t, locale } = useI18n();
  // Polly voices here read Devanagari/Latin only; pa/ta/te/ml replies come back in other scripts.
  const canSpeak = locale === 'en' || locale === 'hi' || locale === 'bgc';
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<number | null>(null);
  const [ttsError, setTtsError] = useState(false);

  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setPlaying(null);
  }, []);

  const close = useCallback(() => {
    stopAudio();
    setOpen(false);
    fabRef.current?.focus();
  }, [stopAudio]);

  // Focus the input once the sheet is open; stop audio when the component goes away.
  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => () => {
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, busy]);

  if (!me) return null;

  const send = async (text: string, base: Msg[] = msgs) => {
    const q = text.trim().slice(0, MAX_LEN);
    if (!q || busy) return;
    const next: Msg[] = [...base, { role: 'user', text: q }];
    setMsgs(next);
    setDraft('');
    setError(false);
    setBusy(true);
    // History alternates user/assistant and ends on the user; an odd-sized tail keeps it starting on the user.
    const history = next.filter((m) => !m.failed).slice(-(MAX_TURNS - 1));
    try {
      const { reply } = await api<{ reply: string }>('/ai/chat', {
        body: { messages: history.map(({ role, text }) => ({ role, text: text.slice(0, MAX_LEN) })), locale },
      });
      setMsgs((m) => [...m, { role: 'assistant', text: reply }]);
    } catch {
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, failed: true } : x)));
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    const last = msgs[msgs.length - 1];
    if (!last?.failed) return;
    void send(last.text, msgs.slice(0, -1));
  };

  const readAloud = async (i: number) => {
    stopAudio();
    setTtsError(false);
    setLoadingAudio(i);
    const lang = locale === 'hi' || locale === 'bgc' ? 'hi' : 'en';
    try {
      const { audio } = await api<{ audio: string }>('/tts', { body: { text: msgs[i].text.slice(0, 1500), lang } });
      const el = new Audio(`data:audio/mpeg;base64,${audio}`);
      audioRef.current = el;
      el.onended = () => audioRef.current === el && stopAudio();
      await el.play();
      setPlaying(i);
    } catch {
      // Polly unavailable (local dev, outage): fall back to the browser's own voice.
      if (!window.speechSynthesis) return setTtsError(true);
      const u = new SpeechSynthesisUtterance(msgs[i].text.slice(0, 1500));
      u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      u.onend = () => setPlaying((p) => (p === i ? null : p));
      u.onerror = () => setTtsError(true);
      window.speechSynthesis.speak(u);
      setPlaying(i);
    } finally {
      setLoadingAudio(null);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  // Esc closes; Tab cycles inside the panel while it is open.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onInputKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a line (skip while an IME is composing).
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(draft);
    }
  };

  const starters = ['ai.starter1', 'ai.starter2', 'ai.starter3'];
  const safe = 'right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))]';

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="ai-panel"
        className={`press fixed z-40 ${safe} flex min-h-14 items-center gap-2 rounded-full bg-field px-5 text-base font-semibold text-white shadow-[0_10px_30px_-8px_rgb(28_27_23/0.45)] hover:bg-field-strong transition-[opacity,transform] duration-300 ${
          open ? 'pointer-events-none scale-90 opacity-0' : ''
        }`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
          <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
        </svg>
        <span>{t('ai.open')}</span>
      </button>

      <div
        ref={panelRef}
        id="ai-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('ai.title')}
        inert={!open}
        onKeyDown={onKeyDown}
        className={`fixed z-50 flex flex-col overflow-hidden bg-paper text-ink
          inset-x-0 bottom-0 h-dvh origin-bottom-right
          sm:inset-x-auto sm:right-[max(1rem,env(safe-area-inset-right))] sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:h-[min(640px,calc(100dvh-2rem))] sm:w-[400px] sm:rounded-[var(--radius-card)] sm:border sm:border-line sm:shadow-[0_24px_60px_-12px_rgb(28_27_23/0.4)]
          transition-[transform,opacity,visibility] duration-500 ${EASE} motion-reduce:transition-opacity motion-reduce:duration-200
          ${open ? 'visible translate-y-0 opacity-100 sm:scale-100' : 'invisible translate-y-full opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-0 sm:translate-y-0 sm:scale-90 sm:opacity-0'}`}
      >
        <header className="material-bar relative z-10 flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <Tx k="ai.title" as="h2" className="flex-1 font-display text-xl font-semibold" />
          <button
            type="button"
            onClick={close}
            aria-label={t('ai.close')}
            className="press grid size-12 place-items-center rounded-full text-muted hover:bg-field-soft hover:text-ink"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <p className="mb-4 text-muted">{t('ai.intro')}</p>
          {msgs.length === 0 && (
            <ul aria-label={t('ai.suggestions')} className="flex flex-wrap gap-2">
              {starters.map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => void send(t(k))}
                    className="press min-h-11 rounded-full border border-line bg-surface px-4 py-2 text-left text-[0.95rem] hover:border-field"
                  >
                    {t(k)}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <ol aria-live="polite" aria-relevant="additions" className="flex flex-col gap-3">
            {msgs.map((m, i) => (
              <li key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start gap-1.5'}>
                <span className="sr-only">{m.role === 'user' ? t('ai.you') : t('ai.assistant')}: </span>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 ${
                    m.role === 'user' ? `rounded-br-md bg-field text-white ${m.failed ? 'opacity-70' : ''}` : 'rounded-bl-md border border-line bg-surface'
                  }`}
                >
                  {m.text}
                </p>
                {m.role === 'assistant' && canSpeak &&
                  (playing === i ? (
                    <button type="button" onClick={stopAudio} className="press inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ember hover:bg-ember-soft">
                      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                      {t('ai.stop')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void readAloud(i)}
                      disabled={loadingAudio !== null}
                      aria-busy={loadingAudio === i || undefined}
                      className="press inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-field hover:bg-field-soft disabled:opacity-50"
                    >
                      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
                      </svg>
                      {t('ai.readAloud')}
                    </button>
                  ))}
              </li>
            ))}
            {busy && (
              <li className="flex items-center gap-2 text-muted">
                <span className="flex gap-1" aria-hidden>
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="size-2 animate-bounce rounded-full bg-muted motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-sm">{t('ai.typing')}</span>
              </li>
            )}
          </ol>

          {(error || ttsError) && (
            <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ember-soft px-3 py-2 text-sm text-ember">
              <span className="flex-1">{error ? t('ai.error') : t('ai.ttsError')}</span>
              {error && (
                <button type="button" onClick={retry} className="press min-h-11 rounded-lg px-3 font-semibold underline underline-offset-2">
                  {t('ai.retry')}
                </button>
              )}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-line bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <label htmlFor="ai-input" className="sr-only">
              {t('ai.inputLabel')}
            </label>
            <textarea
              ref={inputRef}
              id="ai-input"
              rows={1}
              value={draft}
              maxLength={MAX_LEN}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onInputKey}
              placeholder={t('ai.placeholder')}
              enterKeyHint="send"
              className="max-h-32 min-h-12 flex-1 resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base placeholder:text-muted/70 focus:border-field focus:outline-none focus:ring-2 focus:ring-field/25"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label={t('ai.send')}
              className="press grid size-12 shrink-0 place-items-center rounded-xl bg-field text-white hover:bg-field-strong disabled:opacity-50"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">{t('ai.disclaimer')}</p>
        </form>
      </div>
    </>
  );
}
