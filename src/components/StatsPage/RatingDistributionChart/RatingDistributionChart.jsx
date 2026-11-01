import React from 'react';
import { Star } from 'lucide-react';
import './RatingDistributionChart.css';

export default function RatingDistributionChart({
  distribution,
  activeRatings = [],
  onToggleRating,
}) {
  const { rows = [], totalRated = 0, totalMeals = 0 } = distribution || {};

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Rating Distribution</h3>
          <p className="stats-card-subtitle">
            Semantic breakdown in canonical order ({totalRated.toLocaleString()} of {totalMeals.toLocaleString()} rated)
          </p>
        </div>
        <div className="stats-card-badge">
          <Star size={13} />
          <span>Authoritative Order</span>
        </div>
      </div>

      <div className="rating-distribution-list">
        {rows.map((row) => {
          const isSelected = activeRatings.includes(row.text);
          return (
            <div
              key={row.id}
              className={`rating-row ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onToggleRating && onToggleRating(row.text)}
              role="button"
              tabIndex={0}
              title={`Click to filter by ${row.text}`}
            >
              <div className="rating-row-label">
                <span className="rating-rank-num">#{row.id}</span>
                <span className="rating-name">{row.text}</span>
              </div>

              <div className="rating-bar-track">
                <div
                  className="rating-bar-fill"
                  style={{
                    width: `${Math.max(row.percentage, row.count > 0 ? 1.5 : 0)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>

              <div className="rating-row-counts">
                <span className="rating-count">{row.count.toLocaleString()}</span>
                <span className="rating-percentage">({row.percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
