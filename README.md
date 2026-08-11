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

## Keeping the prototype honest

`public/prototype/` is a copy, so it can drift from the app. It has already been
corrected once, to match features removed from the shipped app: the Moods grid,
the "Ask Luna AI" button, Browse genres, the seeded "Made for you" playlists and
the entire Playback settings block. If you remove or add a feature in the app,
change it here too — a demo that shows controls the app no longer has is worse
than no demo.
