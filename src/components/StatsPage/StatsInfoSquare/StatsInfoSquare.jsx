import React from 'react';
import {
  Utensils,
  Store,
  Globe,
  MapPin,
  PoundSterling,
  Users,
  Layers,
} from 'lucide-react';
import './StatsInfoSquare.css';

export default function StatsInfoSquare({ kpis }) {
  const {
    mealsCount = 0,
    uniqueRestaurantsCount = 0,
    countriesCount = 0,
    citiesCount = 0,
    totalSpend = 0,
    peopleCount = 0,
  } = kpis || {};

  const stats = [
    {
      id: 'meals',
      label: 'Meals',
      value: mealsCount.toLocaleString(),
      icon: Utensils,
      colorClass: 'emerald',
    },
    {
      id: 'restaurants',
      label: 'Restaurants',
      value: uniqueRestaurantsCount.toLocaleString(),
      icon: Store,
      colorClass: 'blue',
    },
    {
      id: 'countries',
      label: 'Countries',
      value: countriesCount.toLocaleString(),
      icon: Globe,
      colorClass: 'indigo',
    },
    {
      id: 'cities',
      label: 'Cities',
      value: citiesCount.toLocaleString(),
      icon: MapPin,
      colorClass: 'purple',
    },
    {
      id: 'spend',
      label: 'Total Spend',
      value: `£${totalSpend.toLocaleString()}`,
      icon: PoundSterling,
      colorClass: 'amber',
    },
    {
      id: 'people',
      label: 'People',
      value: peopleCount.toLocaleString(),
      icon: Users,
      colorClass: 'rose',
    },
  ];

  return (
    <div className="stats-card info-square-card">
      <div className="stats-card-header info-square-header">
        <div>
          <h3 className="stats-card-title">Archive Summary</h3>
          <p className="stats-card-subtitle">Key volume metrics for selection</p>
        </div>
        <div className="stats-card-badge">
          <Layers size={13} />
          <span>Core KPIs</span>
        </div>
      </div>

      <div className="info-square-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.id} className="info-stat-tile">
              <div className="info-tile-top">
                <div className={`info-tile-icon-wrap ${stat.colorClass}`}>
                  <Icon size={14} />
                </div>
                <span className="info-tile-label">{stat.label}</span>
              </div>
              <div className="info-tile-value">{stat.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
