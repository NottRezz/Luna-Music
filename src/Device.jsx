import { useEffect, useRef, useState } from 'react';

/**
 * The prototype, running for real inside an iframe.
 *
 * It is the design mockup vendored from the app repository, unmodified apart
 * from an embed stylesheet and a message bridge. Driving it rather than
 * screenshotting it means this page cannot drift from the design the way a
 * folder of images does, and it costs the reader nothing to try.
 *
 * `screen` is applied through postMessage. The frame answers `luna:ready` once
 * app.js has run, and until then requests are held — posting into a frame that
 * has not finished parsing is the usual reason a first click does nothing.
 */
export default function Device({ screen, src, title, hint }) {
  const frame = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'luna:ready') setReady(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready || !screen) return;
    frame.current?.contentWindow?.postMessage(
      { type: 'luna:show', screen },
      window.location.origin,
    );
  }, [ready, screen]);

  return (
    <div className="device">
      <div className="device__shell">
        <iframe
          ref={frame}
          className="device__screen"
          src={src}
          title={title}
          loading="lazy"
        />
      </div>
      {hint ? <p className="device__hint">{hint}</p> : null}
    </div>
  );
}
