/*
 * Bridge between the demo site and the prototype running inside the iframe.
 *
 * app.js already exposes exactly what a host needs — `window.Luna.show(screen)`
 * — and its own comment says the shell "has no business reaching anything
 * else". This keeps that boundary: the host sends a screen name, and gets told
 * when the frame is ready. Nothing else crosses.
 *
 * Messages are used rather than reaching in through `contentWindow` so the host
 * does not have to guess when the frame has finished parsing, which is the
 * usual source of a first click that silently does nothing.
 */
(function () {
  'use strict';

  var SCREENS = ['search', 'playlist', 'library', 'profile', 'now'];

  function post(message) {
    // Same-origin by construction: the frame is served from the site's own
    // /prototype/ path. Anything else and this should not be answering.
    if (window.parent !== window) window.parent.postMessage(message, window.location.origin);
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) return;

    var data = event.data;
    if (!data || data.type !== 'luna:show') return;
    if (SCREENS.indexOf(data.screen) === -1) return;
    if (!window.Luna || typeof window.Luna.show !== 'function') return;

    window.Luna.show(data.screen);
    post({ type: 'luna:shown', screen: data.screen });
  });

  /* ------------------------------------------------------------------
     Row actions

     The app grew a visible "+" on every track row, and a bin on rows already
     in a playlist. Adding used to be long-press only: the gesture worked, but
     nothing on screen said so, and the first thing anyone said about the app
     was that there was no way to add a song to a playlist.

     They are injected here rather than edited into app.js so that file stays as
     close to the mockup it was vendored from as possible. app.js is patched
     only where it bound listeners to controls the app removed — leaving those
     in threw on load and stopped window.Luna from ever being defined.

     A <span role="button"> rather than a <button>: the rows themselves are
     buttons, and nesting one inside another is invalid HTML that browsers
     recover from unpredictably.
     ------------------------------------------------------------------ */

  var PLUS = '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>';
  var BIN =
    '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg>';

  function decorate(rows, kind) {
    Array.prototype.forEach.call(rows, function (row) {
      if (row.querySelector('.row-act')) return;
      var act = document.createElement('span');
      act.className = 'row-act row-act--' + kind;
      act.setAttribute('role', 'button');
      act.setAttribute('tabindex', '0');
      act.setAttribute('aria-label', kind === 'add' ? 'Add to playlist' : 'Remove from playlist');
      act.innerHTML = kind === 'add' ? PLUS : BIN;
      row.appendChild(act);
    });
  }

  function toast(message) {
    var app = document.getElementById('app');
    if (!app) return;
    var old = app.querySelector('.mini-toast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'mini-toast';
    el.setAttribute('role', 'status');
    el.innerHTML = '<b>&#10003;</b><span></span>';
    el.querySelector('span').textContent = message;
    app.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.remove();
    }, 2600);
  }

  function wire() {
    // Playlist tracks are already in a playlist, so their action is removal.
    decorate(document.querySelectorAll('#trackList .track'), 'remove');
    decorate(document.querySelectorAll('#libList .track'), 'add');
    // "Jump back in" on Search. The Up Next queue is deliberately left alone —
    // it has no add button in the app either.
    decorate(document.querySelectorAll('.view[data-view="search"] .q-item'), 'add');
    wireSearch();
  }

  document.addEventListener(
    'click',
    function (e) {
      var act = e.target.closest && e.target.closest('.row-act');
      if (!act) return;
      // The row is a button; without this the tap also starts playback.
      e.preventDefault();
      e.stopPropagation();

      var row = act.closest('.track, .q-item');
      var title = row ? (row.querySelector('b') || {}).textContent : null;

      if (act.classList.contains('row-act--remove')) {
        if (row) row.remove();
        toast(title ? 'Removed “' + title + '”.' : 'Removed.');
      } else {
        // The app opens a playlist picker first. The prototype skips that step
        // and shows the confirmation the picker ends in.
        toast('Added to Midnight Echoes.');
      }
    },
    true,
  );

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  /* ------------------------------------------------------------------
     Search

     The mockup drew a search field and never wired it, because it only ever had
     to be a picture. On the demo site Search is the first screen anyone opens
     and a whole slide of the walkthrough, so a field that does nothing is the
     most visible way the prototype can look unlike the app.

     The app submits a query to the iTunes API and swaps the browse stack for
     the results. This does the same against the mockup's own catalogue: same
     swap, same row markup, same behaviour on an empty result.

     Rows carry `data-idx` inside a `.tracks` container, which is exactly what
     app.js's own renderTrack looks for when it marks the playing row — so the
     orange highlight follows into these results with no extra bookkeeping.
     ------------------------------------------------------------------ */

  function mmss(sec) {
    var n = Math.max(0, Math.round(sec));
    return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  }

  function esc(text) {
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function searchView() {
    return document.querySelector('.view[data-view="search"]');
  }

  function browseNodes() {
    // Everything below the field: what the app replaces when results arrive.
    var view = searchView();
    if (!view) return [];
    return Array.prototype.filter.call(view.children, function (el) {
      return !el.classList.contains('search-row') && !el.classList.contains('results');
    });
  }

  function clearResults() {
    var view = searchView();
    if (!view) return;
    var old = view.querySelector('.results');
    if (old) old.remove();
    browseNodes().forEach(function (el) {
      el.hidden = false;
    });
  }

  function runSearch(term) {
    var view = searchView();
    if (!view) return;
    var q = term.trim().toLowerCase();
    if (!q) return clearResults();

    var all = window.Luna && window.Luna.catalogue ? window.Luna.catalogue() : [];
    var hits = [];
    all.forEach(function (tr, i) {
      if (tr.t.toLowerCase().indexOf(q) !== -1 || tr.a.toLowerCase().indexOf(q) !== -1) {
        hits.push({ tr: tr, i: i });
      }
    });

    browseNodes().forEach(function (el) {
      el.hidden = true;
    });

    var old = view.querySelector('.results');
    if (old) old.remove();

    var wrap = document.createElement('div');
    wrap.className = 'results';

    var label = document.createElement('div');
    label.className = 'section-label';
    label.innerHTML = hits.length
      ? 'Results · ' + hits.length + ' <span class="results__clear">Clear</span>'
      : 'Results <span class="results__clear">Clear</span>';
    wrap.appendChild(label);

    if (!hits.length) {
      var empty = document.createElement('div');
      empty.className = 'results__empty';
      empty.innerHTML =
        '<b>Nothing matched “' + esc(term.trim()) + '”</b><span>Try a different word.</span>';
      wrap.appendChild(empty);
    } else {
      var list = document.createElement('div');
      list.className = 'tracks';
      hits.forEach(function (hit, n) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'track';
        btn.dataset.idx = hit.i;
        btn.innerHTML =
          '<span class="track__idx"><em>' + (n + 1) + '</em>' +
          '<span class="eq"><i></i><i></i><i></i><i></i></span></span>' +
          '<span class="art art--' + hit.tr.art + '"></span>' +
          '<span class="track__meta"><b>' + esc(hit.tr.t) + '</b><span>' + esc(hit.tr.a) + '</span></span>' +
          '<span class="track__dur">' + mmss(hit.tr.d) + '</span>';
        list.appendChild(btn);
      });
      wrap.appendChild(list);
    }

    view.appendChild(wrap);

    // Match the row that is already playing, then hand the rest to app.js.
    var now = window.Luna && window.Luna.playing ? window.Luna.playing() : -1;
    wrap.querySelectorAll('.track').forEach(function (row) {
      row.classList.toggle('is-current', +row.dataset.idx === now);
    });
    decorate(wrap.querySelectorAll('.track'), 'add');
  }

  function wireSearch() {
    var view = searchView();
    if (!view) return;
    var input = view.querySelector('input[type="search"]');
    var button = view.querySelector('.ai-btn');
    if (!input) return;

    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      runSearch(input.value);
    });
    input.addEventListener('input', function () {
      if (!input.value.trim()) clearResults();
    });
    if (button) button.addEventListener('click', function () { runSearch(input.value); });

    view.addEventListener('click', function (e) {
      if (e.target.closest('.results__clear')) {
        input.value = '';
        clearResults();
        return;
      }
      var row = e.target.closest('.results .track');
      if (row && window.Luna && window.Luna.play) window.Luna.play(+row.dataset.idx);
    });

    // Tapping a recent chip searches for it, as it does in the app.
    var chips = document.getElementById('recentChips');
    if (chips) {
      chips.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        input.value = chip.textContent.trim();
        runSearch(input.value);
      });
    }
  }

  /* ------------------------------------------------------------------
     Keyboard escape hatch

     Key events raised inside an iframe never reach the parent document. In
     presentation mode that means the moment a presenter clicks the phone to
     demo something — which is the entire reason the phone is on the slide —
     the arrow keys stop advancing the deck, with nothing on screen to explain
     why.

     So navigation keys are forwarded out. Only these: anything else belongs to
     whatever the reader is doing inside the prototype.
     ------------------------------------------------------------------ */

  var FORWARD = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End', 'Escape', 'f', 'F'];

  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (FORWARD.indexOf(e.key) === -1) return;
    // Typing in the prototype's own search box should stay in it.
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    post({ type: 'luna:key', key: e.key });
  });

  post({ type: 'luna:ready' });
})();
