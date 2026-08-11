/**
 * Each design decision carries a specimen: the thing itself, rendered live,
 * rather than a description of it or a screenshot of it.
 *
 * The contrast card is the one that earns this. Being told that white on a
 * near-white gradient failed is abstract; being shown the two panels side by
 * side, with the failing one actually failing on your screen, is not.
 */
export default function Spec({ spec }) {
  if (!spec) return null;

  if (spec.kind === 'split') {
    return (
      <div className="spec spec--split" aria-hidden="true">
        {[spec.left, spec.right].map((side, i) => (
          <div key={i} style={{ background: side.css }}>
            <span
              className="spec__label"
              style={{ color: '#ffffff', textShadow: side.onDark ? '0 1px 1px rgba(0,0,0,.28)' : 'none' }}>
              Luna
            </span>
            <span className={`spec__tag${side.onDark ? ' spec__tag--onblue' : ''}`}>{side.label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (spec.kind === 'weights') {
    return (
      <div className="spec" style={{ background: 'var(--surface-2)' }} aria-hidden="true">
        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', fontFamily: 'var(--font-app)' }}>
          {[
            [600, 'Semi'],
            [700, 'Bold'],
            [800, 'Extra'],
            [900, 'Black'],
          ].map(([weight, label]) => (
            <span key={weight} style={{ fontWeight: weight, fontSize: 17, color: 'var(--ink)' }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (spec.kind === 'toast') {
    return (
      <div className="spec" style={{ background: 'var(--surface-2)' }} aria-hidden="true">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: '#ffffff',
            border: '1px solid rgba(126,159,196,.28)',
            borderRadius: 12,
            padding: '9px 13px',
            boxShadow: '0 2px 10px rgba(20,60,140,.14)',
            maxWidth: '86%',
          }}>
          <span style={{ color: '#245edb', fontWeight: 900, fontSize: 14 }}>✓</span>
          <span style={{ fontFamily: 'var(--font-app)', fontWeight: 700, fontSize: 12.5, color: '#14315e' }}>
            Added to Late Night.
          </span>
        </div>
      </div>
    );
  }

  if (spec.kind === 'text') {
    return (
      <div className="spec" style={{ background: 'var(--surface-2)' }} aria-hidden="true">
        <span
          className="spec__label"
          style={{
            color: 'var(--ink-2)',
            fontFamily: spec.tone === 'mono' ? 'var(--font-mono)' : 'var(--font-app)',
            fontSize: spec.tone === 'mono' ? 13 : 15,
          }}>
          {spec.text}
        </span>
      </div>
    );
  }

  return (
    <div className="spec" style={{ background: spec.css }} aria-hidden="true">
      <span
        className="spec__label"
        style={{ color: '#fff', textShadow: spec.onDark ? '0 1px 1px rgba(0,0,0,.28)' : 'none' }}>
        {spec.label}
      </span>
    </div>
  );
}
