# Luna Music — demo site

The public walkthrough for [Luna Music](https://github.com/NottRezz/Luna-Music),
published to GitHub Pages at **https://nottrezz.github.io/Luna-Music/**.

This branch is intentionally an **orphan**: it shares no history with `main` and
contains none of the Expo app's source. Checking it out gives you the site and
nothing else.

## What is on the page

The centrepiece is a live, interactive prototype rather than a folder of
screenshots. `public/prototype/` is the design mockup vendored from the app
repository's `design/mockup/`, running for real in an iframe — you can switch
tabs, open a song and drag the Now Playing sheet.

That choice is deliberate. Screenshots go stale silently: the app loses a
feature, the images keep showing it, and nobody notices for months. A running
prototype is at least checkable, and the screen picker drives it through the
same `window.Luna.show()` surface `app.js` already exposed for a host page.

**Nothing on this site uses real data.** Every artist, cover, play count and
playlist in the prototype is invented. No account, email or username from the
live app appears anywhere.

## Local development

```bash
npm install
npm run dev
```

`npm run build` writes `dist/`. Note that `vite.config.js` sets
`base: '/Luna-Music/'` to match the repository name — `npm run preview` serves
the site at `http://localhost:4173/Luna-Music/`, not at the root.

## Deployment

`.github/workflows/deploy.yml` builds and publishes on every push to
`demo-site`. It requires **Settings → Pages → Source = GitHub Actions** to be
selected once; with the default "Deploy from a branch" the workflow runs and the
deploy step fails.

## Presentation mode

The **Present** button in the header turns the page into a slide deck for
demoing the project live. Arrows or space to move, `F` for fullscreen, `Esc` to
leave; clicking the right or left of the screen also works.

It is deliberately a different medium from the page: eleven slides, a headline
and at most three short lines each, sized to be read across a room while
somebody talks over it. Two of the slides embed the live prototype, so the demo
needs no phone, no emulator and no network to the app.

Slide content lives in `SLIDES` in `src/content.js`.

## Keeping the prototype honest

`public/prototype/` is a copy of the app repo's `design/mockup/`, so it drifts
as the app changes. `scripts/sync-prototype.py` re-derives it from the pristine
source rather than hand-patching the copy, which keeps the edits a reviewable
list and makes them re-runnable after the mockup changes:

```bash
python scripts/sync-prototype.py ../Luna-Music/design/mockup/index.html public/prototype/index.html
```

It removes what the app removed — the Moods grid, the "Ask Luna AI" button,
Browse genres, the Luna Radio ticker, the seeded "Made for you" playlists, the
playlist heart, the "saved" stat and the whole Playback settings block — and
rewrites the profile form to the app's real change-password flow. It asserts on
the result and refuses to write a file with unbalanced markup.

Two things it does not cover, which live alongside it:

- `js/embed.js` injects the visible **+** and bin row actions and the
  confirmation toast, so `app.js` stays close to its vendored original.
- `js/app.js` is patched only where it bound listeners to removed controls.
  Leaving those bindings in threw on load, which stopped `window.Luna` from
  being defined and silently broke the screen picker.

If you add or remove a feature in the app, change it here too. A demo showing
controls the app no longer has is worse than no demo.
