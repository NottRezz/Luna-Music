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
      'Recent searches persist on the device only. They are the one piece of state that never reaches the server, because a list of what you searched for is not worth the privacy cost of syncing it.',
      'A failed search shows an error and leaves the previous results alone. It used to render an empty list, which said "nothing matched" when the truth was "the request did not complete".',
      'Every row carries a + that adds it to a playlist. That used to be a long-press with nothing on screen to suggest it, which meant the feature may as well not have existed.',
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
      'The queue lives in a provider mounted above the router, so playback survives moving between tabs and the dock keeps working everywhere.',
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

/**
 * The technical decisions. Each names what was chosen *instead*, because a
 * decision with no alternative is not a decision, and each ends on what it
 * cost — a trade-off list with no costs in it is marketing.
 */
export const TECH = [
  {
    id: 'itunes',
    tag: 'Catalogue',
    title: 'Why the iTunes Search API',
    instead: 'instead of Spotify or YouTube',
    body: [
      'It needs no API key and no OAuth flow. That matters more than convenience here: Luna is a client-side app, so any credential it holds ships to the device and can be extracted. An endpoint that requires no secret is one that cannot leak one.',
      'Spotify was the obvious alternative and was rejected on playback. Its Web API returns metadata freely, but actually playing a track requires the Spotify SDK and a Premium account — every marker and every teammate would have needed to buy one. Its audio previews were also being withdrawn during development.',
      'iTunes returns a plain HTTPS MP3 preview URL per track, which any audio library can play directly with no SDK in between.',
    ],
    tradeoff:
      'Thirty-second previews only, no full tracks and no lyrics. The catalogue is Apple’s, so anything missing there is missing in Luna.',
  },
  {
    id: 'supabase',
    tag: 'Backend',
    title: 'Why Supabase',
    instead: 'instead of Firebase or our own server',
    body: [
      'The data is relational. A playlist has many tracks, a track appears in many playlists, and the same track is referenced by favourites and history. That is a join table and foreign keys — Postgres describes it in one schema, whereas Firestore would have meant duplicating track documents per user and keeping them in sync by hand.',
      'Supabase also bundles the auth server, and the JWT it issues is readable inside the database as auth.uid(). That is what makes the security model below possible without writing an API layer.',
      'A custom Express and Postgres server was the third option. It would have meant hosting, deployment and a second codebase to maintain for a four-person course project, in exchange for capabilities we did not need.',
    ],
    tradeoff:
      'The authorisation rules are Postgres-specific SQL. Moving off Supabase means rewriting every policy, not just swapping a client library.',
  },
  {
    id: 'rls',
    tag: 'Security',
    title: 'Why the rules live in the database',
    instead: 'instead of checks in the app',
    body: [
      'The Supabase anon key ships inside the app bundle, and anything shipped to a device can be read off it. With that key, anyone can call the REST API directly and skip the app entirely.',
      'So a check written in React is advisory. "Only fetch the playlists where user_id equals me" is a filter, not a permission — the server would happily return everyone’s if asked differently.',
      'Row-level security moves that sentence into the table itself, where it runs on every query no matter who is asking or what client they used. The app cannot forget it and an attacker cannot skip it.',
    ],
    tradeoff:
      'Policies are easy to get subtly wrong and the failure is silent — a too-permissive policy looks identical to a correct one until someone tests it. That is what the audit was for.',
  },
  {
    id: 'audio',
    tag: 'Playback',
    title: 'Why expo-audio',
    instead: 'instead of expo-av',
    body: [
      'expo-av was the long-standing choice and is now deprecated; expo-audio is its replacement, so starting on expo-av would have meant a migration before the project was even finished.',
      'Its API is hooks rather than imperative objects, so playback state arrives the same way every other value in a React component does, instead of being mirrored into state by hand.',
    ],
    tradeoff:
      'It is young, and some behaviour is undocumented. Its "track finished" flag reports a state rather than an event, so it stays true after firing and auto-advance needs a guard to avoid skipping twice.',
  },
  {
    id: 'securestore',
    tag: 'Session',
    title: 'Why expo-secure-store holds the session',
    instead: 'instead of AsyncStorage',
    body: [
      'Staying signed in means storing a refresh token, and a refresh token is a long-lived key to the account.',
      'AsyncStorage keeps it in plain text on disk, where any process with file access on a rooted or jailbroken device can read it. SecureStore hands it to the Android Keystore or the iOS Keychain, which are hardware-backed.',
    ],
    tradeoff:
      'SecureStore caps a single value at 2048 bytes and a Supabase session exceeds that, so the storage adapter splits the value across numbered keys and reassembles it on read.',
  },
  {
    id: 'cache',
    tag: 'Schema',
    title: 'Why one shared tracks table',
    instead: 'instead of a copy per user',
    body: [
      'Playlists, favourites and history all need to point at something stable. The iTunes track id is stable and globally unique, so it is used directly as the primary key and every other table references it.',
      'One shared row per track also means a song saved by fifty accounts is stored once, not fifty times.',
    ],
    tradeoff:
      'A shared row with a client-chosen key belongs to whoever writes it first, so one account’s bad data would be everyone’s. That is why the table is insert-only and why its URLs are constrained to Apple’s hosts by the database itself.',
  },
];

/**
 * Interface decisions, kept short. The technical section above is the argument;
 * these are the three places where the visual design had a measurable
 * consequence rather than an aesthetic one.
 */
export const INTERFACE = [
  {
    title: 'A gradient that failed contrast',
    body:
      'The login screen first reused the near-white content gradient. White display type on top of it measured about 1.05:1 — legible on the designer’s monitor, invisible in daylight. It now uses the app bar’s blue ramp stretched full-screen.',
    spec: {
      kind: 'split',
      left: { css: 'linear-gradient(160deg,#eaf3ff,#f7fbff)', label: 'Before · 1.05:1', onDark: false },
      right: { css: 'linear-gradient(168deg,#5d9ef5,#245edb 40%,#1941a5 78%,#102b6b)', label: 'After', onDark: true },
    },
  },
  {
    title: 'A gesture nobody could find',
    body:
      'Adding a song to a playlist worked, wrote to the database and persisted — but long-press was the only way in and nothing on screen said so. It was reported as a missing feature. Every row now carries a visible +, and every add confirms.',
    spec: { kind: 'toast' },
  },
  {
    title: 'Numbers nobody counted',
    body:
      'Seeded playlists, mood tiles, a radio channel with 2,418 listeners, a "saved" count for sharing that does not exist. All removed. A demo account now looks exactly as empty as it is.',
    spec: { kind: 'text', text: '312 → 0', tone: 'ink' },
  },
];

export const STACK = [
  {
    kind: 'Client',
    name: 'Expo · React Native',
    body: 'SDK 54 on React Native 0.81 and React 19, routed with Expo Router. The stack was set by the course rather than chosen, which is why it is listed here and not argued for above. Playback is expo-audio; the queue lives in a provider mounted above the router so it survives navigation.',
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

/**
 * Presentation mode.
 *
 * Read from across a room while somebody talks over it, so every line stays
 * short. Two rules shaped this list.
 *
 * Say only what was actually decided. Expo and React Native were set by the
 * course, so a slide defending them argues with nobody. What is left is the
 * handful of places where there were real options and we picked one.
 *
 * Describe, do not sell. It is a music player. Claiming more than that invites
 * the obvious question about what makes it special, and there is no answer to
 * that worth giving. The interesting part is not the idea, it is what the build
 * ran into.
 */
export const SLIDES = [
  {
    kind: 'title',
    title: 'Luna Music',
    subtitle: 'A music player for iOS and Android',
    note: 'CPRG 303-B · SPHR Studios',
  },
  {
    kind: 'points',
    eyebrow: 'What it does',
    title: 'Search, play, keep',
    points: [
      'Search a real catalogue and play what you find',
      'Save songs and sort them into playlists',
      'Sign in anywhere and your library is already there',
    ],
    aside: {
      label: 'By the numbers',
      items: ['4 screens', '6 database tables', '30-second previews', '1 codebase, 2 platforms'],
    },
  },
  {
    kind: 'demo',
    eyebrow: 'Live',
    title: 'The app',
    screen: 'search',
    // Nothing here about the demo being a browser rather than a phone. That is
    // a fact about our setup, not about the app, and volunteering it puts "so
    // why aren't we seeing the real thing" into a room that was not asking.
    points: [
      'Four screens: search, playlist, library, profile',
      'Results come from Apple’s live catalogue, not a fixed list',
      'One player shared by every tab, so audio survives navigation',
    ],
  },
  {
    kind: 'compare',
    eyebrow: 'Decision',
    title: 'Where the music comes from',
    left: {
      label: 'iTunes Search API',
      tone: 'good',
      items: ['No API key to ship or leak', 'Plain MP3 preview per track', 'Works for anyone, no account'],
    },
    right: {
      label: 'Spotify Web API',
      tone: 'bad',
      items: ['Needs a key and a login flow', 'Playback needs their SDK', 'Every listener needs Premium'],
    },
    note: 'The cost: thirty-second previews, not full songs.',
  },
  {
    kind: 'compare',
    eyebrow: 'Decision',
    title: 'Where the data lives',
    left: {
      label: 'Postgres, via Supabase',
      tone: 'good',
      items: ['A song sits in many playlists — one join table', 'Auth and database in one service', 'Real SQL, real foreign keys'],
    },
    right: {
      label: 'Firebase / Firestore',
      tone: 'bad',
      items: ['Documents, not tables', 'Copy each song per user', 'Keep those copies in sync by hand'],
    },
    note: 'The cost: the security rules are Postgres-specific SQL.',
  },
  {
    kind: 'points',
    eyebrow: 'Decision',
    title: 'The app’s database key is public',
    points: [
      'It ships inside the app, so anyone can pull it out',
      'With it, they can query the database without our app',
      'So a check in our code is a suggestion, not a rule',
    ],
    aside: {
      label: 'What we did',
      items: [
        'Rules moved into the tables themselves',
        'Postgres checks every request, from any client',
        'Enabled on all 6 tables',
      ],
    },
  },
  {
    kind: 'demo',
    eyebrow: 'Live',
    title: 'Now playing',
    screen: 'now',
    points: [
      'Artwork, scrubber, queue — the full player',
      'Orange marks the playing row, the only warm colour in the app',
      'Built from a web mockup we wrote before any app code',
    ],
  },
  {
    kind: 'findings',
    eyebrow: 'Security',
    title: 'We audited our own database',
    items: [
      { state: 'fixed', text: 'Any account could rewrite any song — title, artist, audio — for everyone' },
      { state: 'fixed', text: 'Any account could grant itself a PREMIUM plan' },
      { state: 'fixed', text: 'One account could fill the shared song table' },
      { state: 'fixed', text: 'Two database functions could be tricked into using the wrong tables' },
      { state: 'open', text: 'A key committed early still needs rotating' },
    ],
    note: 'Five found, five fixed, one still open — and listed as open.',
  },
  {
    kind: 'points',
    eyebrow: 'What we changed',
    title: 'We deleted a lot of our own work',
    points: [
      'Settings that stored a value and changed nothing',
      'Starter playlists and a radio station that did not exist',
      'A working feature nobody could find, because it was a hidden gesture',
    ],
    aside: {
      label: 'The rule we settled on',
      items: ['A control that lies is worse than no control', 'An empty account should look empty'],
    },
  },
  {
    kind: 'title',
    title: 'Luna Music',
    subtitle: 'Source, write-up and this deck',
    note: 'github.com/NottRezz/Luna-Music',
  },
];
