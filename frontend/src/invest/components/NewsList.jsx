import React from 'react';

const SENTIMENT_CLASS = { positive: 'i-sent-pos', negative: 'i-sent-neg', neutral: 'i-sent-neu' };
const SENTIMENT_LABEL = { positive: 'позитив', negative: 'негатив', neutral: 'нейтрально' };

function NewsList({ news }) {
  if (!news || news.length === 0) {
    return (
      <div className="i-card">
        <div className="i-card-head"><span className="i-card-title">📰 Новости</span></div>
        <p className="i-empty-row">Свежих новостей по портфелю не найдено.</p>
      </div>
    );
  }

  return (
    <div className="i-card">
      <div className="i-card-head"><span className="i-card-title">📰 Новости, учтённые в анализе</span></div>
      <div className="i-news-list">
        {news.map((n, i) => (
          <div className="i-news-item" key={i}>
            <div className="i-news-top">
              {n.ticker && <span className="i-pill">{n.ticker}</span>}
              <span className={`i-sent ${SENTIMENT_CLASS[n.sentiment] || 'i-sent-neu'}`}>
                {SENTIMENT_LABEL[n.sentiment] || 'нейтрально'}
              </span>
              {n.date && <span className="i-news-date">{n.date}</span>}
            </div>
            {n.url ? (
              <a className="i-news-title" href={n.url} target="_blank" rel="noreferrer">{n.title}</a>
            ) : (
              <span className="i-news-title">{n.title}</span>
            )}
            {n.summary && <p className="i-news-summary">{n.summary}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NewsList;
