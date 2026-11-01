import React from 'react';
import { Smile, Sparkles } from 'lucide-react';
import './SentimentOverviewChart.css';

export default function SentimentOverviewChart({
  summary,
  activeSentiments = [],
  onToggleSentiment,
}) {
  const { categories = [], topGranular = [], total = 0 } = summary || {};

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Sentiment Tone Overview</h3>
          <p className="stats-card-subtitle">
            High-level emotional distribution across {total.toLocaleString()} meals
          </p>
        </div>
        <div className="stats-card-badge">
          <Smile size={13} />
          <span>High-Level Split</span>
        </div>
      </div>

      {/* Proportional Segment Bar */}
      <div className="sentiment-proportional-bar">
        {categories.map((c) => {
          if (c.percentage <= 0) return null;
          const isSelected = activeSentiments.includes(c.key);
          return (
            <div
              key={c.key}
              className={`sentiment-bar-segment ${isSelected ? 'is-selected' : ''}`}
              style={{
                width: `${c.percentage}%`,
                backgroundColor: c.color,
              }}
              title={`${c.label}: ${c.count.toLocaleString()} (${c.percentage}%)`}
              onClick={() => onToggleSentiment && onToggleSentiment(c.key)}
            />
          );
        })}
      </div>

      {/* Sentiment Category Cards */}
      <div className="sentiment-category-grid">
        {categories.map((c) => {
          const isSelected = activeSentiments.includes(c.key);
          return (
            <div
              key={c.key}
              className={`sentiment-cat-card ${isSelected ? 'active' : ''}`}
              onClick={() => onToggleSentiment && onToggleSentiment(c.key)}
              role="button"
              tabIndex={0}
              title={`Click to filter by ${c.label}`}
            >
              <div className="cat-header">
                <span className="cat-dot" style={{ backgroundColor: c.color }} />
                <span className="cat-label">{c.label}</span>
              </div>
              <div className="cat-val">{c.count.toLocaleString()}</div>
              <div className="cat-pct">{c.percentage}%</div>
            </div>
          );
        })}
      </div>

      {/* Top Granular Emotion Moods */}
      {topGranular.length > 0 && (
        <div className="granular-sentiments-wrap">
          <span className="granular-label">Common Granular Tones:</span>
          <div className="granular-chips-row">
            {topGranular.map((g) => (
              <span key={g.term} className="granular-chip">
                <span className="granular-term">{g.term}</span>
                <span className="granular-count">{g.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
