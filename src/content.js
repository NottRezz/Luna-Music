/**
 * Every claim on this page is traceable to the app repository — a token file, a
 * migration, or a commit. Where a decision came out of a bug, the bug is named,
 * because "we chose a separate gradient for the auth screens" is not interesting
 * and "reusing the content gradient left white text at 1.05:1" is.
 */

export const REPO = 'https://github.com/NottRezz/Luna-Music';

export const SCREENS = [
  {
    id: 'search',
    name: 'Search',
    title: 'Search is the front door',
    blurb:
      'Luna has no catalogue of its own. Everything starts as a query against the iTunes Search API, which returns metadata and a thirty-second preview for each result.',
    points: [
      'Recent searches persist as chips on the device only. They are the one piece of state that never reaches the server, because a list of what you searched for is not worth the privacy cost of syncing it.',
      'A failed search shows an error and leaves the previous results alone. It used to render an empty list, which said "nothing matched" when the truth was "the request did not complete".',
      'Every row carries a + that opens the playlist sheet. That used to be a long-press with nothing on screen to suggest it, which meant the feature may as well not have existed.',
    ],
  },
  {
    id: 'playlist',
    name: 'Playlist',
    title: 'Playlists are the only real content',
    blurb:
      'A new account starts genuinely empty — no starter playlists, no suggested mixes, nothing pre-liked. Everything visible here is something the account holder did.',
    points: [
      'The seeded demo playlists were deleted outright. They were read-only chrome that inflated every stat on the profile and made an empty account look used.',
      'The empty state names the exact action that fills it, rather than saying "nothing here yet" and leaving you to guess.',
      'Removing a track has a visible control too. It is destructive, so of the two it was the worse one to leave hidden behind a gesture.',
    ],
  },
  {
    id: 'library',
    name: 'Library',
    title: 'Library is everything you kept',
    blurb:
      'Saved songs, grouped by song, album or artist, filterable in place. It is backed by the same Supabase tables as playlists, so it survives a reinstall.',
    points: [
      'The list/grid toggle renders an actual two-column cover grid. It previously held state and changed nothing on screen — a control that lies about what it does.',
      'Grouping is computed on the device from tracks already loaded, so switching between Songs, Albums and Artists costs no network round trip.',
    ],
  },
  {
    id: 'now',
    name: 'Now playing',
    title: 'The sheet is the centrepiece',
    blurb:
      'Cover, waveform, transport, queue. This is where the Frutiger Aero language is densest: glass, gloss, saturated depth and a single warm accent.',
    points: [
      'The playing row is the only warm colour anywhere in the interface. Because nothing else competes for it, orange alone is enough to say "this one".',
      'Playback runs through expo-audio with the queue held in a provider above the router, so the dock keeps playing while you move between tabs.',
      'Previews are thirty seconds. The transport shows real elapsed and remaining time rather than a fabricated full-track duration.',
    ],
  },
  {
    id: 'profile',
    name: 'Profile',
    title: 'Profile is account, not settings theatre',
    blurb:
      'Display name, username, email, and a password change that actually verifies the current password first. The counts above are real rows.',
    points: [
      'A whole Playback section was removed — audio quality, crossfade, offline downloads, explicit content. Four controls that stored a value and changed nothing about playback.',
      'Changing a password re-authenticates first. Supabase’s updateUser does not ask for the current password, so without that step a borrowed unlocked phone is a full account takeover.',
      'Only three columns on this table are writable by the account holder. The plan badge is not one of them.',
    ],
  },
];

export const DECISIONS = [
  {
    id: 'mockup',
    title: 'The mockup is the source of truth',
    spec: { kind: 'gradient', css: 'linear-gradient(180deg,#5d9ef5 0%,#245edb 46%,#1941a5 100%)', label: 'App bar', onDark: true },
    body: [
      'The design was authored as a working HTML and CSS prototype before any React Native was written, and that prototype is vendored into the app repository. The phone at the top of this page is that exact file.',
      'The rule the codebase follows is written into the token file: when a value in the app disagrees with the mockup, the mockup wins. It means the design can be checked rather than argued about.',
    ],
  },
  {
    id: 'scale',
    title: 'Everything is scaled, nothing is fixed',
    spec: { kind: 'text', text: 's(14) → 14 × w/372', tone: 'ink' },
    body: [
      'The mockup was drawn against a 372-pixel-wide phone. Real devices are wider, so shipping those numbers unchanged renders a design that is correct in proportion but slightly too small everywhere.',
      'Every dimension in the app goes through one helper that multiplies by the device width over 372. The designer’s proportions survive; only the absolute size changes.',
    ],
  },
  {
    id: 'contrast',
    title: 'The auth screens needed their own gradient',
    spec: {
      kind: 'split',
      left: { css: 'linear-gradient(160deg,#eaf3ff,#f7fbff)', label: 'Before · 1.05:1', onDark: false },
      right: { css: 'linear-gradient(168deg,#5d9ef5,#245edb 40%,#1941a5 78%,#102b6b)', label: 'After', onDark: true },
    },
    body: [
      'Login and register first reused the content-pane gradient, which is very nearly white. The white display type on top of it landed at about 1.05:1 — legible on the designer’s monitor, invisible in daylight.',
      'They now use the app bar’s blue ramp stretched to a full screen, with a darker stop added at the bottom so it does not wash out over that distance.',
    ],
  },
  {
    id: 'weights',
    title: 'Font weights are named, never numbered',
    spec: { kind: 'weights' },
    body: [
      'Nunito ships as discrete weight files. Android ignores a numeric fontWeight on a custom family and silently falls back to regular, so a heading asking for 900 renders at 400 and nobody sees an error.',
      'The token file exposes the five weights by name. There is no way to ask for a weight that does not exist.',
    ],
  },
  {
    id: 'overscroll',
    title: 'Overscroll is turned off everywhere',
    spec: { kind: 'text', text: 'overScrollMode: never', tone: 'mono' },
    body: [
      'The design has no overscroll affordance, and Android 12’s stretch effect actively fights the fling — it reads on device as the list snapping backwards mid-scroll.',
      'One shared constant is spread onto every scroll view in the app, which is also how it stays consistent rather than being remembered per screen.',
    ],
  },
  {
    id: 'toast',
    title: 'The error surface sits above the dock',
    spec: { kind: 'toast' },
    body: [
      'Before this, twenty-four failure paths ended in a console warning and nothing else. A track with no audio played silence behind a live-looking transport; a like that failed looked saved until the next launch.',
      'The first version placed the message under the tab strip, where on the Search screen it covered the search field — so "search failed, try again" sat directly on top of the control you would try again with. It moved to the bottom, where only the dock lives and the dock’s height is known.',
    ],
  },
];

export const STACK = [
  {
    kind: 'Client',
    name: 'Expo · React Native',
    body: 'SDK 54 on React Native 0.81 and React 19, routed with Expo Router. Playback is expo-audio; the queue lives in a provider mounted above the router so it survives navigation.',
  },
  {
    kind: 'Catalogue',
    name: 'iTunes Search API',
    body: 'Public, unauthenticated, no key to leak. Supplies titles, artists, artwork and a thirty-second preview per track. Luna stores none of the audio.',
  },
  {
    kind: 'Account',
    name: 'Supabase Auth · Postgres',
    body: 'Six tables behind row-level security: profiles, tracks, playlists, playlist_tracks, favorites and recently_played. Every policy is scoped to the requesting user.',
  },
  {
    kind: 'Session',
    name: 'expo-secure-store',
    body: 'Tokens go to the platform keystore rather than AsyncStorage. The store caps values at 2048 bytes, so the adapter chunks anything longer instead of failing at the boundary.',
  },
];

export const HARDENING = [
  {
    state: 'fixed',
    key: 'Shared track cache',
    body: 'tracks is one table keyed by iTunes id, so a write grant broad enough to serve the client also let any account rewrite any track’s title, artist or audio URL for everybody. It is now insert-only, with no UPDATE policy at all.',
  },
  {
    state: 'fixed',
    key: 'Attacker-controlled URLs',
    body: 'Insert-only means the first account to write an id owns that row for everyone, so artwork and preview URLs are constrained at the database to Apple’s hosts, and re-checked on read in the client. Rows written before the constraint existed cannot be trusted by age alone.',
  },
  {
    state: 'fixed',
    key: 'Column-level grants',
    body: 'The profiles table granted UPDATE on every column, which included the plan column — any account could award itself PREMIUM with one request. The grant was revoked and re-issued for exactly three columns.',
  },
  {
    state: 'fixed',
    key: 'Cache flooding',
    body: 'An insert quota caps how many rows one account can add to the shared cache per hour, and stamps the author from the session rather than trusting the payload.',
  },
  {
    state: 'fixed',
    key: 'Function search_path',
    body: 'Both security definer functions pin an empty search_path, so a schema planted earlier on the path cannot shadow a table they reference.',
  },
  {
    state: 'open',
    key: 'Credential rotation',
    body: 'An .env file reached the public repository early in its history. Deleting the file does not remove it from history, so the anon key still needs rotating — the honest status is outstanding, not closed.',
  },
];
