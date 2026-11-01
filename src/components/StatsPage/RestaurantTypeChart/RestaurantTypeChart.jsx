import React from 'react';
import { Utensils } from 'lucide-react';
import './RestaurantTypeChart.css';

export default function RestaurantTypeChart({
  typeData,
  activeTypes = [],
  onToggleType,
}) {
  const { types = [], maxCount = 1, total = 0 } = typeData || {};

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Top Restaurant Types</h3>
          <p className="stats-card-subtitle">
            Ranked cuisine preferences across {total.toLocaleString()} meals
          </p>
        </div>
        <div className="stats-card-badge">
          <Utensils size={13} />
          <span>Top 10</span>
        </div>
      </div>

      <div className="type-distribution-list">
        {types.map((t, idx) => {
          const isSelected = activeTypes.includes(t.typeName);
          const barWidth = Math.max((t.count / maxCount) * 100, 2);

          return (
            <div
              key={t.typeName}
              className={`type-row ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onToggleType && onToggleType(t.typeName)}
              role="button"
              tabIndex={0}
              title={`Click to filter by ${t.typeName}`}
            >
              <div className="type-row-label">
                <span className="type-rank-num">#{idx + 1}</span>
                <span className="type-name">{t.typeName}</span>
              </div>

              <div className="type-bar-track">
                <div
                  className="type-bar-fill"
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="type-row-counts">
                <span className="type-count">{t.count.toLocaleString()}</span>
                <span className="type-percentage">({t.percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
