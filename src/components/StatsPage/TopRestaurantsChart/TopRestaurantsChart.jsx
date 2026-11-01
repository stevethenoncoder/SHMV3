import React from 'react';
import { Building2, MapPin } from 'lucide-react';
import './TopRestaurantsChart.css';

export default function TopRestaurantsChart({
  restaurantData,
  activeRestaurantId,
  onSelectRestaurant,
}) {
  const { restaurants = [], maxVisits = 1, total = 0 } = restaurantData || {};

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3 className="stats-card-title">Most Visited Destinations</h3>
          <p className="stats-card-subtitle">
            Most frequent dining venues in this view ({restaurants.length} shown)
          </p>
        </div>
        <div className="stats-card-badge">
          <Building2 size={13} />
          <span>Top Rankings</span>
        </div>
      </div>

      <div className="top-rest-list">
        {restaurants.map((rest, idx) => {
          const isSelected = activeRestaurantId === rest.id;
          const barWidth = Math.max((rest.visitCount / maxVisits) * 100, 2);

          return (
            <div
              key={rest.id}
              className={`top-rest-row ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelectRestaurant && onSelectRestaurant(rest.id, rest.name)}
              role="button"
              tabIndex={0}
              title={`Click to filter by ${rest.name}`}
            >
              <div className="rest-row-info">
                <span className="rest-rank">#{idx + 1}</span>
                <div className="rest-names-col">
                  <span className="rest-name">{rest.name}</span>
                  {rest.cityName && (
                    <span className="rest-city">
                      <MapPin size={10} />
                      <span>{rest.cityName}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="rest-bar-track">
                <div
                  className="rest-bar-fill"
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="rest-visit-count">
                <strong>{rest.visitCount}</strong>
                <span>{rest.visitCount === 1 ? 'visit' : 'visits'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
