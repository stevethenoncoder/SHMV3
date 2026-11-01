import React from 'react';
import { Sparkles, Calendar, TrendingUp, Building2, PoundSterling, Star, Smile } from 'lucide-react';
import './StatsInsights.css';

export default function StatsInsights({ insights = [] }) {
  if (!insights || insights.length === 0) return null;

  const getInsightIcon = (id) => {
    switch (id) {
      case 'day':
      case 'month':
        return <Calendar size={16} />;
      case 'single_visit':
        return <Sparkles size={16} />;
      case 'top_restaurant':
        return <Building2 size={16} />;
      case 'spend':
        return <PoundSterling size={16} />;
      case 'rating':
        return <Star size={16} />;
      case 'sentiment':
        return <Smile size={16} />;
      default:
        return <TrendingUp size={16} />;
    }
  };

  return (
    <div className="stats-card insights-card">
      <div className="stats-card-header">
        <div className="insights-header-left">
          <div className="insights-icon-pill">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="stats-card-title">Things Your Data Says</h3>
            <p className="stats-card-subtitle">
              Deterministic patterns and behavioural observations from the current view
            </p>
          </div>
        </div>
      </div>

      <div className="insights-grid">
        {insights.map((item) => (
          <div key={item.id} className="insight-item-card">
            <div className="insight-card-top">
              <div className="insight-icon-circle">{getInsightIcon(item.id)}</div>
              <span className="insight-badge">{item.badge}</span>
            </div>
            <h4 className="insight-title">{item.title}</h4>
            <p className="insight-text">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
