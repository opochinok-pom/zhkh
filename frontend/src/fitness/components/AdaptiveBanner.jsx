import React from 'react';

function AdaptiveBanner({ sleepWarning, latestBodyLog }) {
  if (!sleepWarning) return null;
  return (
    <div className={`f-sleep-banner f-sleep-${sleepWarning.level}`}>
      <div className="f-sleep-title">🚨 ПРИОРИТЕТ №1 — СОН (сейчас {sleepWarning.hours}ч)</div>
      <div className="f-sleep-text">{sleepWarning.message}</div>
    </div>
  );
}

export default AdaptiveBanner;
