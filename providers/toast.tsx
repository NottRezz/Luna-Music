/**
 * The app's one way of telling you something went wrong.
 *
 * Before this, 24 failure paths ended in `console.warn` and nothing else. A
 * track that could not be found played silence with a live-looking transport
 * (LM-7); a like that failed to save looked saved until the next launch; a
 * device with no connection showed empty lists and no explanation, which reads
 * as data loss rather than a network problem.
 *
 * Deliberately not a full notification system. It is one line of text at the
 * top of the screen, it dismisses itself, and it is only used for things the
 * user *did* — a tap that did not do what it looked like it did. Background
 * failures that will retry (recording a play, say) stay in the log, because a
 * toast the user cannot act on is just noise.
 *
 * Mounted OUTSIDE every other provider. The provider order is Auth → Library →
 * Player → UI, so anything nested cannot be read by what wraps it, and the
 * player is the single biggest source of things worth reporting.
 */

import { createContext, use, useCallback, useMemo, useRef, useState } from 'react';

type Tone = 'error' | 'info';

type Toast = { id: number; message: string; tone: Tone };

type ToastValue = {
  toasts: Toast[];
  /**
   * Show a message. Same text already on screen is not queued twice — a failing
   * sync can fire the same error several times in a second.
   */
  notify: (message: string, tone?: Tone) => void;
  dismiss: (id: number) => void;
};

const Ctx = createContext<ToastValue | null>(null);

export function useToast() {
  const v = use(Ctx);
  if (!v) throw new Error('useToast must be used inside <ToastProvider>');
  return v;
}

/** Long enough to read a sentence, short enough not to sit over the UI. */
const DISMISS_MS = 4200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message: string, tone: Tone = 'error') => {
      const text = message.trim();
      if (!text) return;

      setToasts((prev) => {
        if (prev.some((t) => t.message === text)) return prev;

        const id = nextId.current++;
        timers.current.set(
          id,
          setTimeout(() => {
            setToasts((cur) => cur.filter((t) => t.id !== id));
            timers.current.delete(id);
          }, DISMISS_MS),
        );

        // Two at once is already a lot of bad news; older ones fall off.
        return [...prev, { id, message: text, tone }].slice(-2);
      });
    },
    [],
  );

  const value = useMemo<ToastValue>(
    () => ({ toasts, notify, dismiss }),
    [toasts, notify, dismiss],
  );

  return <Ctx value={value}>{children}</Ctx>;
}
