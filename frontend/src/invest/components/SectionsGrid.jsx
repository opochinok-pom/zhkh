import React from 'react';

const SECTION_ICONS = {
  summary: '🧾', composition: '📦', allocation: '🧮', sector: '🏭', geography: '🌍',
  risk: '⚠️', diversification: '🧩', performance: '📈', news_impact: '📰', recommendations: '✅',
};

function SectionsGrid({ sections }) {
  if (!sections) return null;
  const keys = Object.keys(sections);

  return (
    <div className="i-sections">
      {keys.map((k, i) => (
        <div className="i-section-card" key={k}>
          <div className="i-section-head">
            <span className="i-section-num">{i + 1}</span>
            <span className="i-section-icon">{SECTION_ICONS[k] || '•'}</span>
            <span className="i-section-title">{sections[k].title || k}</span>
          </div>
          <div className="i-section-text">
            {String(sections[k].text || '').split('\n').map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SectionsGrid;
