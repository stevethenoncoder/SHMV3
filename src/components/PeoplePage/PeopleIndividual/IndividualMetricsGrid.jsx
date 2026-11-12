import React from 'react';
import { Utensils, MapPin, Globe, Sparkles, Calendar, Clock } from 'lucide-react';

export default function IndividualMetricsGrid({ metrics = {} }) {
  const {
    totalMeals = 0,
    uniqueRestaurants = 0,
    uniqueCities = 0,
    uniqueCountries = 0,
    firstMealDate = '',
    latestMealDate = '',
    relationshipSpanYears = 1,
    newVenuesTogether = 0,
  } = metrics;

  return (
    <div className="people-kpi-grid">
      {/* 1. Total Meals */}
      <div className="people-kpi-card highlight">
        <div className="people-kpi-header">
          <span className="people-kpi-label">Total Meals</span>
          <Utensils size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value">{totalMeals.toLocaleString()}</div>
        <div className="people-kpi-sub">Total shared dining records</div>
      </div>

      {/* 2. Unique Venues */}
      <div className="people-kpi-card">
        <div className="people-kpi-header">
          <span className="people-kpi-label">Restaurants</span>
          <Utensils size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value">{uniqueRestaurants.toLocaleString()}</div>
        <div className="people-kpi-sub">Distinct dining venues visited</div>
      </div>

      {/* 3. Cities & Countries */}
      <div className="people-kpi-card">
        <div className="people-kpi-header">
          <span className="people-kpi-label">Geography</span>
          <MapPin size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value">
          {uniqueCities} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>cities</span>
        </div>
        <div className="people-kpi-sub">Across {uniqueCountries} {uniqueCountries === 1 ? 'country' : 'countries'}</div>
      </div>

      {/* 4. New Venues Together */}
      <div className="people-kpi-card">
        <div className="people-kpi-header">
          <span className="people-kpi-label">First-Time Discoveries</span>
          <Sparkles size={18} className="people-kpi-icon" style={{ color: '#f59e0b' }} />
        </div>
        <div className="people-kpi-value">{newVenuesTogether.toLocaleString()}</div>
        <div className="people-kpi-sub">Venues discovered together on their 1st visit</div>
      </div>

      {/* 5. Relationship Span */}
      <div className="people-kpi-card">
        <div className="people-kpi-header">
          <span className="people-kpi-label">Dining Span</span>
          <Clock size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value">
          {relationshipSpanYears} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>years</span>
        </div>
        <div className="people-kpi-sub">First: {firstMealDate}</div>
      </div>

      {/* 6. Most Recent Visit */}
      <div className="people-kpi-card">
        <div className="people-kpi-header">
          <span className="people-kpi-label">Most Recent Meal</span>
          <Calendar size={18} className="people-kpi-icon" />
        </div>
        <div className="people-kpi-value" style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {latestMealDate || 'N/A'}
        </div>
        <div className="people-kpi-sub">Latest shared meal in archive</div>
      </div>
    </div>
  );
}
