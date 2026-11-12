import React from 'react';
import { MapPin, Globe, UtensilsCrossed } from 'lucide-react';

export default function IndividualDiningGeography({ diningGeography = {} }) {
  const { cities = [], countries = [], restaurantTypes = [] } = diningGeography;

  if (cities.length === 0 && countries.length === 0 && restaurantTypes.length === 0) {
    return null;
  }

  return (
    <div className="people-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <UtensilsCrossed size={18} />
            Dining Preferences & Geography
          </h3>
          <p className="people-card-subtitle">
            Leading cities, countries, and restaurant styles frequented together
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Top Cities */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} /> Top Cities
          </h4>
          <div className="freq-dist-list">
            {cities.slice(0, 5).map((c) => (
              <div key={c.name} className="freq-dist-row" style={{ gridTemplateColumns: '120px 1fr 60px' }}>
                <span className="freq-dist-label">{c.name}</span>
                <div className="freq-dist-bar-track">
                  <div className="freq-dist-bar-fill" style={{ width: `${Math.max(4, c.percentage)}%` }} />
                </div>
                <span className="freq-dist-stats">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Countries */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={14} /> Top Countries
          </h4>
          <div className="freq-dist-list">
            {countries.slice(0, 5).map((c) => (
              <div key={c.name} className="freq-dist-row" style={{ gridTemplateColumns: '120px 1fr 60px' }}>
                <span className="freq-dist-label">{c.name}</span>
                <div className="freq-dist-bar-track">
                  <div className="freq-dist-bar-fill" style={{ width: `${Math.max(4, c.percentage)}%`, background: '#3b82f6' }} />
                </div>
                <span className="freq-dist-stats">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Restaurant Types */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UtensilsCrossed size={14} /> Restaurant Types
          </h4>
          <div className="freq-dist-list">
            {restaurantTypes.slice(0, 5).map((t) => (
              <div key={t.name} className="freq-dist-row" style={{ gridTemplateColumns: '120px 1fr 60px' }}>
                <span className="freq-dist-label">{t.name}</span>
                <div className="freq-dist-bar-track">
                  <div className="freq-dist-bar-fill" style={{ width: `${Math.max(4, t.percentage)}%`, background: '#f59e0b' }} />
                </div>
                <span className="freq-dist-stats">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
