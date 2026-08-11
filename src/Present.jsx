import { useCallback, useEffect, useRef, useState } from 'react';

import Device from './Device.jsx';
import { SLIDES } from './content.js';

/**
 * Presentation mode — the page as a deck.
 *
 * Built to be read from the back of a room while somebody talks over it, which
 * is a different job from the page underneath. Type is large, each slide holds a
 * headline and at most three lines, and nothing scrolls: if a slide does not fit
 * on screen at once it is two slides.
 *
 * Keyboard is the primary control because that is what a presenter has —
 * arrows, space, Home/End, Escape. Clicking the halves works for a touchscreen.
 */
export default function Present({ onExit, prototypeSrc }) {
  const [i, setI] = useState(0);
  const [hint, setHint] = useState(true);
  const region = useRef(null);

  const go = useCallback((next) => {
    setI((cur) => Math.min(SLIDES.length - 1, Math.max(0, typeof next === 'function' ? next(cur) : next)));
  }, []);

  useEffect(() => {
    function onKey(e) {
      // Let the browser have its own shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const keys = {
        ArrowRight: () => go((n) => n + 1),
        ArrowDown: () => go((n) => n + 1),
        PageDown: () => go((n) => n + 1),
        ' ': () => go((n) => n + 1),
        ArrowLeft: () => go((n) => n - 1),
        ArrowUp: () => go((n) => n - 1),
        PageUp: () => go((n) => n - 1),
        Home: () => go(0),
        End: () => go(SLIDES.length - 1),
        Escape: onExit,
        f: () => {
          const el = document.documentElement;
          if (document.fullscreenElement) document.exitFullscreen?.();
          else el.requestFullscreen?.().catch(() => {});
        },
      };
      const fn = keys[e.key];
      if (!fn) return;
      e.preventDefault();
      setHint(false);
      fn();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onExit]);

  // The deck owns the whole viewport; letting the page behind it scroll means
  // exiting can land you somewhere you never navigated to.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    region.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  const slide = SLIDES[i];

  return (
    <div
      className="deck"
      ref={region}
      tabIndex={-1}
      role="region"
      aria-roledescription="presentation"
      aria-label={`Slide ${i + 1} of ${SLIDES.length}: ${slide.title}`}>
      <div className="deck__bar">
        <span className="deck__brand">
          <span className="mark" aria-hidden="true">
            ♪
          </span>
          Luna Music
        </span>
        <span className="deck__count">
          {i + 1} / {SLIDES.length}
        </span>
        <button type="button" className="deck__exit" onClick={onExit}>
          Exit
          <kbd>Esc</kbd>
        </button>
      </div>

      <div className="deck__stage" key={i}>
        {slide.kind === 'title' ? (
          <div className="slide slide--title">
            <h2>{slide.title}</h2>
            <p className="slide__sub">{slide.subtitle}</p>
            {slide.note ? <p className="slide__note">{slide.note}</p> : null}
          </div>
        ) : slide.kind === 'demo' ? (
          <div className="slide slide--demo">
            <div>
              {slide.eyebrow ? <p className="slide__eyebrow">{slide.eyebrow}</p> : null}
              <h2>{slide.title}</h2>
              {slide.note ? <p className="slide__sub">{slide.note}</p> : null}
            </div>
            <Device src={prototypeSrc} screen={slide.screen} title={`Luna Music — ${slide.title}`} compact />
          </div>
        ) : (
          <div className="slide slide--points">
            {slide.eyebrow ? <p className="slide__eyebrow">{slide.eyebrow}</p> : null}
            <h2>{slide.title}</h2>
            <ul>
              {slide.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Click targets, not visible controls — a presenter clicking anywhere on
          the right should advance, the way every other deck behaves. */}
      <button
        type="button"
        className="deck__half deck__half--prev"
        onClick={() => go((n) => n - 1)}
        aria-label="Previous slide"
        disabled={i === 0}
      />
      <button
        type="button"
        className="deck__half deck__half--next"
        onClick={() => go((n) => n + 1)}
        aria-label="Next slide"
        disabled={i === SLIDES.length - 1}
      />

      <div className="deck__progress" aria-hidden="true">
        <span style={{ width: `${((i + 1) / SLIDES.length) * 100}%` }} />
      </div>

      {hint ? (
        <p className="deck__hint">
          <kbd>←</kbd> <kbd>→</kbd> to move · <kbd>F</kbd> for fullscreen · <kbd>Esc</kbd> to leave
        </p>
      ) : null}
    </div>
  );
}
