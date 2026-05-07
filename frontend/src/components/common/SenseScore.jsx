import './SenseScore.css';

const SENSES = [
  { key: 'sight', label: 'Sight', emoji: '👁️', color: 'var(--sense-sight)' },
  { key: 'sound', label: 'Sound', emoji: '👂', color: 'var(--sense-sound)' },
  { key: 'smell', label: 'Smell', emoji: '👃', color: 'var(--sense-smell)' },
  { key: 'taste', label: 'Taste', emoji: '👅', color: 'var(--sense-taste)' },
  { key: 'touch', label: 'Touch', emoji: '🤚', color: 'var(--sense-touch)' },
];

export function SenseScoreBars({ scores, compact = false }) {
  const provided = SENSES.filter(s => scores?.[`avg_${s.key}`] != null || scores?.[s.key] != null);

  return (
    <div className={`sense-bars ${compact ? 'compact' : ''}`}>
      {provided.map(sense => {
        const val = scores?.[`avg_${sense.key}`] ?? scores?.[sense.key] ?? 0;
        const pct = (val / 5) * 100;
        return (
          <div key={sense.key} className="sense-bar-row">
            <span className="sense-emoji">{sense.emoji}</span>
            {!compact && <span className="sense-label">{sense.label}</span>}
            <div className="sense-bar-track">
              <div
                className="sense-bar-fill"
                style={{ width: `${pct}%`, background: sense.color }}
              />
            </div>
            <span className="sense-score">{Number(val).toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SenseDots({ scores, size = 'md' }) {
  return (
    <div className={`sense-dots sense-dots--${size}`}>
      {SENSES.map(sense => {
        const val = scores?.[`avg_${sense.key}`] ?? scores?.[sense.key];
        if (val == null) return null;
        return (
          <div key={sense.key} className="sense-dot-item" title={`${sense.label}: ${Number(val).toFixed(1)}`}>
            <span className="sense-dot-emoji">{sense.emoji}</span>
            <div className="sense-dot-ring" style={{ '--sense-color': sense.color, '--pct': `${(val / 5) * 100}%` }}>
              <svg viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--clr-border)" strokeWidth="3"/>
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke={sense.color}
                  strokeWidth="3"
                  strokeDasharray={`${(val / 5) * 94.25} 94.25`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <span>{Number(val).toFixed(1)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OverallScore({ score, count, large }) {
  const stars = Math.round(score * 2) / 2; // round to nearest 0.5
  return (
    <div className={`overall-score ${large ? 'large' : ''}`}>
      <span className="score-number">{Number(score || 0).toFixed(1)}</span>
      <div className="score-stars">
        {[1,2,3,4,5].map(i => (
          <span key={i} className={`star ${i <= stars ? 'filled' : i - 0.5 <= stars ? 'half' : ''}`}>★</span>
        ))}
      </div>
      {count != null && <span className="score-count">{count} reviews</span>}
    </div>
  );
}

export function SenseRatingInput({ values, onChange }) {
  return (
    <div className="sense-rating-input">
      {SENSES.map(sense => (
        <div key={sense.key} className="sense-input-row">
          <div className="sense-input-label">
            <span>{sense.emoji}</span>
            <span>{sense.label}</span>
          </div>
          <div className="sense-input-stars">
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                type="button"
                className={`star-btn ${values?.[sense.key] >= star ? 'active' : ''}`}
                style={{ '--sense-color': sense.color }}
                onClick={() => onChange(sense.key, values?.[sense.key] === star ? null : star)}
              >★</button>
            ))}
          </div>
          {values?.[sense.key] && (
            <span className="sense-input-val" style={{ color: sense.color }}>
              {values[sense.key]}/5
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export { SENSES };
