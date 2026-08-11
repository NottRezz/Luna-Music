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
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

function Head({ slide }) {
  return (
    <>
      {slide.eyebrow ? <p className="slide__eyebrow">{slide.eyebrow}</p> : null}
      <h2>{slide.title}</h2>
    </>
  );
}

export default function Present({ onExit, prototypeSrc }) {
  const [i, setI] = useState(0);
  const [hint, setHint] = useState(true);
  const region = useRef(null);

  const go = useCallback((next) => {
    setI((cur) => Math.min(SLIDES.length - 1, Math.max(0, typeof next === 'function' ? next(cur) : next)));
  }, []);

  useEffect(() => {
    function handle(key) {
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
        f: toggleFullscreen,
        F: toggleFullscreen,
      };
      const fn = keys[key];
      if (!fn) return false;
      setHint(false);
      fn();
      return true;
    }

    function onKey(e) {
      // Let the browser have its own shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (handle(e.key)) e.preventDefault();
    }

    // Keys pressed inside the prototype are forwarded out by its embed script,
    // because an iframe keeps its own key events. Without this the deck stops
    // responding to arrows the moment somebody clicks the phone.
    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'luna:key') handle(e.data.key);
    }

    window.addEventListener('keydown', onKey);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('message', onMessage);
    };
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
              <Head slide={slide} />
              {slide.points ? (
                <ul className="slide__bullets">
                  {slide.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Device src={prototypeSrc} screen={slide.screen} title={`Luna Music — ${slide.title}`} compact />
          </div>
        ) : slide.kind === 'compare' ? (
          <div className="slide slide--compare">
            <Head slide={slide} />
            <div className="compare">
              {[slide.left, slide.right].map((side) => (
                <div className={`compare__col compare__col--${side.tone}`} key={side.label}>
                  <p className="compare__label">{side.label}</p>
                  <ul>
                    {side.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {slide.note ? <p className="slide__foot">{slide.note}</p> : null}
          </div>
        ) : slide.kind === 'findings' ? (
          <div className="slide slide--findings">
            <Head slide={slide} />
            <ul className="findings">
              {slide.items.map((f) => (
                <li key={f.text}>
                  <span className={`findings__pill findings__pill--${f.state}`}>
                    {f.state === 'fixed' ? 'Fixed' : 'Open'}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            {slide.note ? <p className="slide__foot">{slide.note}</p> : null}
          </div>
        ) : (
          <div className={slide.aside ? 'slide slide--points slide--split' : 'slide slide--points'}>
            <div>
              <Head slide={slide} />
              <ul className="slide__bullets">
                {slide.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            {slide.aside ? (
              <aside className="aside">
                <p className="aside__label">{slide.aside.label}</p>
                <ul>
                  {slide.aside.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </aside>
            ) : null}
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
