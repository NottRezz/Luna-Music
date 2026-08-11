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

  post({ type: 'luna:ready' });
})();
