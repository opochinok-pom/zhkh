import React from 'react';

const fmt = n => n === null || n === undefined ? '—' : Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

function PositionsTable({ portfolio }) {
  if (!portfolio) return null;
  const positions = portfolio.positions || [];

  return (
    <div className="i-card">
      <div className="i-card-head">
        <span className="i-card-title">📈 Состав портфеля</span>
        <div className="i-card-meta">
          {portfolio.broker && <span className="i-pill">{portfolio.broker}</span>}
          {portfolio.total_value != null && (
            <span className="i-pill i-pill-accent">
              {fmt(portfolio.total_value)} {portfolio.currency || ''}
            </span>
          )}
        </div>
      </div>
      <div className="i-table-wrap">
        <table className="i-table">
          <thead>
            <tr>
              <th>Тикер</th>
              <th>Название</th>
              <th>Класс</th>
              <th>Кол-во</th>
              <th>Цена</th>
              <th>Сумма</th>
              <th>Вес</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p, i) => (
              <tr key={i}>
                <td className="i-td-ticker">{p.ticker || '—'}</td>
                <td>{p.name || '—'}</td>
                <td>{p.asset_class || '—'}</td>
                <td>{fmt(p.quantity)}</td>
                <td>{fmt(p.current_price)}</td>
                <td>{fmt(p.value)}</td>
                <td>{p.weight_pct != null ? `${fmt(p.weight_pct)}%` : '—'}</td>
              </tr>
            ))}
            {positions.length === 0 && (
              <tr><td colSpan={7} className="i-empty-row">Позиции не распознаны</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PositionsTable;
