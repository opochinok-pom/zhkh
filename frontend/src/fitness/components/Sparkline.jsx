import React, { useMemo, useState } from 'react';

// Мини-график тренда одной метрики. Один ряд — легенда не нужна (заголовок
// снаружи называет ряд), но hover-подсказка обязательна для линии.
function Sparkline({ points, color = '#10B981', unit = '', width = 220, height = 56 }) {
  const [hover, setHover] = useState(null);

  const clean = useMemo(
    () => points.filter(p => p.value !== null && p.value !== undefined && !Number.isNaN(p.value)),
    [points]
  );

  if (clean.length < 2) {
    return <div className="spark-empty">Недостаточно данных</div>;
  }

  const pad = 6;
  const values = clean.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = clean.map((p, i) => ({
    x: pad + (i / (clean.length - 1)) * (width - pad * 2),
    y: height - pad - ((p.value - min) / range) * (height - pad * 2),
    ...p,
  }));

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1];
  const active = hover !== null ? coords[hover] : last;

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, relX / rect.width));
    const idx = Math.round(ratio * (coords.length - 1));
    setHover(idx);
  };

  return (
    <div className="spark-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {active && (
          <>
            <line x1={active.x} y1={pad} x2={active.x} y2={height - pad} stroke={color} strokeOpacity="0.25" strokeWidth="1" />
            <circle cx={active.x} cy={active.y} r="4" fill={color} stroke="#08090D" strokeWidth="1.5" />
          </>
        )}
      </svg>
      {active && (
        <div className="spark-tip">
          <span className="spark-tip-v">{active.value}{unit}</span>
          <span className="spark-tip-d">{active.label}</span>
        </div>
      )}
    </div>
  );
}

export default Sparkline;
