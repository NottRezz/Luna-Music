"""
Rebuild public/prototype/index.html from the app repo's design/mockup.

The mockup is the design source of truth, but the app has moved on from it, and
a demo showing controls the app no longer has is worse than no demo. This script
re-derives the vendored copy from the pristine file every time, so the edits are
a reviewable list rather than an accumulating pile of hand-patches.

Blocks are removed by matching indentation, not by regex across `</div>`. A
non-greedy `.*?</div>` walks straight past the nested divs it should stop at and
swallows whatever follows — which is exactly how the "Jump back in" section
disappeared on the first attempt.
"""

import re
import sys

SRC = sys.argv[1]
DST = sys.argv[2]

lines = open(SRC, encoding="utf-8").read().split("\n")

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Luna Music — interactive prototype</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="stylesheet" href="css/embed.css" />
</head>
<body data-mode="prototype" class="is-embed">"""

FOOT = """  <script src="js/app.js"></script>
  <script src="js/embed.js"></script>
</body>
</html>"""

# The device subtree only: <div class="device"> through its matching close,
# dropping the site shell (left rail, mock-up gallery) the React page replaces.
#
# Found by counting div depth. Taking "the next </section>" instead stops at the
# end of the first view inside the phone and truncates the other three.
start = next(i for i, l in enumerate(lines) if '<div class="device">' in l)
depth = 0
for end in range(start, len(lines)):
    depth += lines[end].count("<div") - lines[end].count("</div>")
    if depth == 0 and end > start:
        break
body = lines[start : end + 1]


def indent(line):
    return len(line) - len(line.lstrip())


def drop_block(rows, needle, opener='<div', closer='</div>'):
    """Delete the element containing `needle`, from its opening tag through the
    close that returns to the same indentation. Depth-counted, so nested
    elements of the same kind cannot terminate it early."""
    i = next((k for k, l in enumerate(rows) if needle in l), None)
    if i is None:
        raise SystemExit(f"NOT FOUND: {needle}")
    # Walk back to the line that opens this element.
    while opener not in rows[i]:
        i -= 1
    base = indent(rows[i])
    depth = 0
    for j in range(i, len(rows)):
        depth += rows[j].count(opener) - rows[j].count(closer)
        if depth <= 0 and j > i:
            break
        if depth == 0 and j == i and closer in rows[j]:
            break
    # Absorb one trailing blank line so removals do not leave gaps.
    k = j + 1
    if k < len(rows) and rows[k].strip() == "":
        k += 1
    del rows[i:k]
    return rows


def drop_selfcontained(rows, needle, opener="<button", closer="</button>"):
    return drop_block(rows, needle, opener, closer)


# ---------------------------------------------------------------- removals
# Each of these is gone from the shipped app.
drop_block(body, 'class="mood-grid"')                     # Moods: implied a curated model that does not exist
drop_block(body, 'class="section-label">Moods')
drop_block(body, 'class="ticker"')                        # Luna Radio: no radio, no channel, no listener count
drop_block(body, 'class="genre-grid"')                    # Browse genres: counts for a genre model that does not exist
drop_block(body, 'class="section-label">Browse genres')
drop_selfcontained(body, 'id="plLike"')                   # Playlist heart: local state, stored nowhere
drop_block(body, '<div class="stat green">')              # "SAVED": counts sharing the app does not have
drop_block(body, 'class="section-label">Playback')        # Playback settings: four controls that changed nothing
drop_block(body, 'class="segmented" role="tablist" aria-label="Audio quality"')
drop_block(body, 'class="switches"')

text = "\n".join(body)

# ---------------------------------------------------------------- rewrites
# The green "AI" button became a magnifier when the AI affordance was dropped.
text = text.replace(
    '<button type="button" class="ai-btn" title="Ask Luna AI">AI</button>',
    '<button type="button" class="ai-btn" title="Search" aria-label="Search">'
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" '
    'stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg></button>',
)

# Seeded, read-only playlists are gone; the account only has its own.
text = text.replace(
    '<div class="section-label">Made for you <span>See all</span></div>',
    '<div class="section-label">Your playlists</div>',
)
text = text.replace("1h 09m · Weekly mix", "1h 09m").replace("1h 42m · Updated today", "1h 42m")

# A single stored password became a real change-password form: the current one
# is verified before the new one is set.
LOCK = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="#7e9fc4"><path d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9zm-8-2a3 3 '
        '0 0 1 6 0v2H9zm3 6a2 2 0 0 1 1 3.7V19h-2v-2.3A2 2 0 0 1 12 13z"/></svg>')
EYE = ('<button type="button" class="reveal" id="pfReveal" aria-pressed="false" aria-label="Show password">\n'
       '                  <svg viewBox="0 0 24 24"><path d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 '
       '11.5A4.5 4.5 0 1 1 16.5 12 4.5 4.5 0 0 1 12 16.5zm0-7A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5z"/></svg>\n'
       '                </button>')

pw = re.search(r' *<div class="form-row">\s*<label for="pfPass">.*?\n *</div>\n *</div>\n', text, re.S)
if not pw:
    raise SystemExit("NOT FOUND: password form-row")
text = text[: pw.start()] + f'''            <div class="form-row">
              <label for="pfPass">Current password</label>
              <div class="field">
                {LOCK}
                <input id="pfPass" type="password" value="" placeholder="Your password now" autocomplete="current-password" />
                {EYE}
              </div>
            </div>

            <div class="form-row">
              <label for="pfNew">New password</label>
              <div class="field">
                {LOCK}
                <input id="pfNew" type="password" value="" placeholder="At least 6 characters" autocomplete="new-password" />
              </div>
            </div>
''' + text[pw.end():]

text = text.replace(
    '<button type="button" class="btn btn-blue">Save changes</button>',
    '<button type="button" class="btn btn-blue">Update password</button>',
)

# The app edits a display name separately from the handle.
PERSON = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="#7e9fc4"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 '
          '2c-3.9 0-9 1.9-9 4.5V21h18v-2.5c0-2.6-5.1-4.5-9-4.5z"/></svg>')
text = text.replace(
    '            <div class="form-row">\n              <label for="pfUser">Username</label>',
    f'''            <div class="form-row">
              <label for="pfName">Display name</label>
              <div class="field">
                {PERSON}
                <input id="pfName" type="text" value="Alex Rivera" autocomplete="name" />
              </div>
            </div>

            <div class="form-row">
              <label for="pfUser">Username</label>''',
)

# Third profile stat counts recently played rows, not hours listened — there is
# no listening-time column anywhere in the schema.
text = text.replace('<div><b>92h</b><span>This year</span></div>',
                    '<div><b>48</b><span>Recent</span></div>')

# Sublines that promised data the app does not have: a genre per playlist, an
# owner other than you, and a sort order with no control to change it.
text = text.replace('2h 04m · Ambient', '2h 04m')
text = text.replace('Luna Collective · 24 tracks', '24 tracks · 1h 42m')
text = text.replace('<div class="section-label">Tracks <span>Sort: Custom</span></div>',
                    '<div class="section-label">Tracks</div>')
text = text.replace('<div class="section-label">Jump back in <span>History</span></div>',
                    '<div class="section-label">Jump back in</div>')

open(DST, "w", encoding="utf-8").write(HEAD + "\n" + text + "\n" + FOOT + "\n")

# ---------------------------------------------------------------- assertions
out = open(DST, encoding="utf-8").read()
must_go = ["mood-grid", "Luna Radio", "genre-grid", "plLike", "SAVED",
           "Crossfade", "Offline downloads", "Ask Luna AI", "Made for you", "Save changes"]
must_stay = ['id="app"', "Jump back in", "Recent", "Your playlists", 'id="dock"', 'class="sheet"',
             'id="queue"', "Up next", "Account", "Update password", 'id="pfNew"', 'id="libList"',
             'id="trackList"' if 'id="trackList"' in out else "Tracks"]
bad = [t for t in must_go if t in out] + [t for t in must_stay if t not in out]
print("REMOVED OK" if not [t for t in must_go if t in out] else "STILL PRESENT: " + str([t for t in must_go if t in out]))
print("KEPT OK" if not [t for t in must_stay if t not in out] else "MISSING: " + str([t for t in must_stay if t not in out]))
print("divs balanced:", out.count("<div") - out.count("</div>"), "(want 0)")
print("bytes:", len(out))
