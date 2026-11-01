import React from 'react';
import {
  Utensils,
  Building2,
  Sparkles,
  Repeat,
  Star,
  PoundSterling,
  Smile,
  MapPin,
  Globe2,
  TrendingUp,
} from 'lucide-react';
import './StatsKpiStrip.css';

export default function StatsKpiStrip({ kpis }) {
  if (!kpis) return null;

  return (
    <div className="stats-kpi-grid">
      {/* 1. Meals Count */}
      <div className="stats-kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Total Meals</span>
          <div className="kpi-icon-wrap emerald">
            <Utensils size={15} />
          </div>
        </div>
        <div className="kpi-value">{kpis.mealsCount.toLocaleString()}</div>
        <div className="kpi-subtext">
          {kpis.comparison ? (
            <span className={`comparison-pill ${kpis.comparison.diff >= 0 ? 'up' : 'down'}`}>
              <TrendingUp size={12} />
              <span>{kpis.comparison.text}</span>
            </span>
          ) : (
            <span>Filtered dining events</span>
          )}
        </div>
      </div>

      {/* 2. Unique Restaurants */}
      <div className="stats-kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Restaurants</span>
          <div className="kpi-icon-wrap blue">
            <Building2 size={15} />
          </div>
        </div>
        <div className="kpi-value">{kpis.uniqueRestaurantsCount.toLocaleString()}</div>
        <div className="kpi-subtext">Unique destinations</div>
      </div>

      {/* 3. New Restaurants */}
      <div className="stats-kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">New Venues</span>
          <div className="kpi-icon-wrap teal">
            <Sparkles size={15} />
          </div>
        </div>
        <div className="kpi-value">{kpis.newRestaurantsCount.toLocaleString()}</div>
        <div className="kpi-subtext">First ever visited in period</div>
      </div>

      {/* 4. Repeat Visit Rate */}
      <div className="stats-kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Repeat Rate</span>
          <div className="kpi-icon-wrap amber">
            <Repeat size={15} />
          </div>
        </div>
        <div className="kpi-value">{kpis.repeatVisitRate}%</div>
        <div className="kpi-subtext">{kpis.repeatMealsCount.toLocaleString()} repeat visits</div>
      </div>

      {/* 5. Average Rating */}
      <div className="stats-kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Average Rating</span>
          <div className="kpi-icon-wrap yellow">
            <Star size={15} />
          </div>
        </div>
        <div className="kpi-value text-compact">
          {kpis.averageRatingText || 'Unrated'}
        </div>
        <div className="kpi-subtext">
          {kpis.averageRatingNumeric
            ? `Mean ${kpis.averageRatingNumeric}/8 · ${kpis.ratedMealsCount.toLocaleString()} rated`
            : 'No evaluations'}
        </div>
      </div>

      {/* 6. Median Meal Spend */}
      <div className="stats-kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Median Spend</span>
          <div className="kpi-icon-wrap indigo">
            <PoundSterling size={15} />
          </div>
        </div>
        <div className="kpi-value">
          {kpis.medianMealValue !== null ? `£${kpis.medianMealValue.toLocaleString()}` : '—'}
        </div>
        <div className="kpi-subtext">
          {kpis.recordedValuesCount > 0
            ? `Based on ${kpis.recordedValuesCount.toLocaleString()} records`
            : 'No prices recorded'}
        </div>
      </div>

      {/* 7. Sentiment Split */}
      <div className="stats-kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Positive Sentiment</span>
          <div className="kpi-icon-wrap green">
            <Smile size={15} />
          </div>
        </div>
        <div className="kpi-value">
          {kpis.positiveShare !== null ? `${kpis.positiveShare}%` : '—'}
        </div>
        <div className="kpi-subtext">
          {kpis.sentimentTotal > 0
            ? `${kpis.sentimentTotal.toLocaleString()} evaluated meals`
            : 'No recorded sentiment'}
        </div>
      </div>

      {/* 8. Cities & Countries */}
      <div className="stats-kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-label">Geography</span>
          <div className="kpi-icon-wrap purple">
            <Globe2 size={15} />
          </div>
        </div>
        <div className="kpi-value">
          {kpis.citiesCount} <span className="kpi-sub-unit">cities</span>
        </div>
        <div className="kpi-subtext">Across {kpis.countriesCount} countries</div>
      </div>
    </div>
  );
}
