import { useEffect, useState } from 'react';

import Device from './Device.jsx';
import Present from './Present.jsx';
import Spec from './Spec.jsx';
import { HARDENING, INTERFACE, REPO, SCREENS, STACK, TECH } from './content.js';

/** Vite rewrites this to /Luna-Music/prototype/ at build time. */
const PROTOTYPE = `${import.meta.env.BASE_URL}prototype/index.html`;

function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme ?? 'system',
  );

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  return [theme, setTheme];
}

export default function App() {
  const [screen, setScreen] = useState('search');
  const [presenting, setPresenting] = useState(false);
  const [theme, setTheme] = useTheme();
  const active = SCREENS.find((s) => s.id === screen) ?? SCREENS[0];

  if (presenting) {
    return <Present onExit={() => setPresenting(false)} prototypeSrc={PROTOTYPE} />;
  }

  return (
    <>
      <header className="masthead">
        <div className="wrap masthead__in">
          <span className="masthead__name">
            <span className="mark" aria-hidden="true">
              ♪
            </span>
            Luna Music
          </span>
          <nav className="masthead__nav">
            <a href="#screens">Screens</a>
            <a href="#decisions">Decisions</a>
            <a href="#build">Build</a>
            <a href="#security">Security</a>
          </nav>
          <button type="button" className="present-btn" onClick={() => setPresenting(true)}>
            Present
          </button>
          <button
            type="button"
            className="theme-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title="Switch theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <main>
        {/* ---------------- Hero ---------------- */}
        <section className="hero">
          <div className="wrap hero__grid">
            <div>
              <h1>A music player built to a Frutiger Aero mockup.</h1>
              <p className="hero__sub">
                Luna Music searches the iTunes catalogue, plays previews, and keeps your
                playlists and library on your account. It is an Expo React Native app,
                designed as a working prototype first and ported second — and that
                prototype is on this page, running. Every phone you see here is the real
                thing, not a screenshot of it.
              </p>
              <div className="chips">
                <span className="chip chip--hot">Live prototype</span>
                <span className="chip">Expo SDK 54</span>
                <span className="chip">React Native 0.81</span>
                <span className="chip">React 19</span>
                <span className="chip">Supabase</span>
                <span className="chip">Postgres RLS</span>
                <span className="chip">expo-audio</span>
              </div>
              <p className="note">
                Everything in the prototype is invented — the artists, the covers, the
                play counts. No real account data appears anywhere on this page.
              </p>
            </div>

            <Device
              src={PROTOTYPE}
              screen={screen}
              title="Luna Music interactive prototype"
              hint="Interactive — tap the tabs, open a song, drag the sheet."
            />
          </div>
        </section>

        {/* ---------------- Screens ---------------- */}
        <section id="screens">
          <div className="wrap">
            <p className="eyebrow">The screens</p>
            <h2 className="h2">Four tabs and a sheet</h2>
            <p className="lede">
              Pick a screen and the phone follows. Each one is the real prototype, so what
              you read below is describing what you are looking at.
            </p>

            <div className="screens__grid" style={{ marginTop: 32 }}>
              <div>
                <div className="picker">
                  {SCREENS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="picker__btn"
                      aria-pressed={s.id === screen}
                      onClick={() => setScreen(s.id)}>
                      {s.name}
                    </button>
                  ))}
                </div>

                <div className="screen-note">
                  <h3>{active.title}</h3>
                  <p>{active.blurb}</p>
                  <ul className="screen-note__list">
                    {active.points.map((point) => (
                      <li key={point}>
                        <span className="dot" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Device src={PROTOTYPE} screen={screen} title={`Luna Music — ${active.name}`} />
            </div>
          </div>
        </section>

        {/* ---------------- Technical decisions ---------------- */}
        <section id="decisions">
          <div className="wrap">
            <p className="eyebrow">Technical decisions</p>
            <h2 className="h2">What we chose, and what it cost</h2>
            <p className="lede">
              Every one of these had a credible alternative. What follows is why the
              alternative lost, and what we gave up by not taking it — a list of
              trade-offs with no costs in it would be marketing rather than engineering.
            </p>

            <div className="cards cards--tech">
              {TECH.map((d) => (
                <article className="card card--tech" key={d.id}>
                  <p className="card__tag">{d.tag}</p>
                  <h3>
                    {d.title} <span className="card__instead">{d.instead}</span>
                  </h3>
                  {d.body.map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                  <p className="card__tradeoff">
                    <b>Trade-off</b>
                    {d.tradeoff}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Interface decisions ---------------- */}
        <section id="interface">
          <div className="wrap">
            <p className="eyebrow">Interface decisions</p>
            <h2 className="h2">Three places the design had consequences</h2>
            <p className="lede">
              The visual language came from a mockup. These are the three points where a
              choice about it turned out to be measurable rather than a matter of taste.
            </p>

            <div className="cards">
              {INTERFACE.map((d) => (
                <article className="card" key={d.title}>
                  <Spec spec={d.spec} />
                  <h3>{d.title}</h3>
                  <p>{d.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Build ---------------- */}
        <section id="build">
          <div className="wrap">
            <p className="eyebrow">How it is built</p>
            <h2 className="h2">Four moving parts</h2>
            <p className="lede">
              Luna hosts no audio and owns no catalogue. It borrows both, and keeps only
              the part that is genuinely yours — what you saved and what you played.
            </p>

            <div className="flow">
              {STACK.map((node) => (
                <div className="flow__node" key={node.name}>
                  <span className="flow__kind">{node.kind}</span>
                  <h4>{node.name}</h4>
                  <p>{node.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Security ---------------- */}
        <section id="security">
          <div className="wrap">
            <p className="eyebrow">What got hardened</p>
            <h2 className="h2">The audit, and what it cost</h2>
            <p className="lede">
              A security pass over the schema turned up a chain worth writing down: one
              shared table, a client-chosen primary key, and a write grant broad enough to
              be useful was also broad enough to be dangerous.
            </p>

            <div className="rows">
              {HARDENING.map((item) => (
                <div className="row" key={item.key}>
                  <div className="row__key">
                    <span className={`pill pill--${item.state}`}>
                      {item.state === 'fixed' ? 'Fixed' : 'Open'}
                    </span>
                    <br />
                    {item.key}
                  </div>
                  <div className="row__val">{item.body}</div>
                </div>
              ))}
            </div>

            <p className="note">
              The last row is deliberately still open. A page like this is worth very
              little if it only lists the things that went well.
            </p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot__in">
          <span>Luna Music — CPRG 303-B, SPHR Studios.</span>
          <a href={REPO} rel="noreferrer">
            Source on GitHub
          </a>
          <span>Previews and metadata courtesy of the iTunes Search API.</span>
        </div>
      </footer>
    </>
  );
}
