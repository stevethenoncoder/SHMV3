import React from 'react';
import { Utensils, ChevronRight } from 'lucide-react';

export default function IndividualFavouriteHaunts({
  haunts = [],
  personName = '',
  onSelectRestaurant,
}) {
  if (haunts.length === 0) return null;

  return (
    <div className="people-card">
      <div className="people-card-header">
        <div className="people-card-title-group">
          <h3 className="people-card-title">
            <Utensils size={18} />
            Favourite Haunts
          </h3>
          <p className="people-card-subtitle">
            Venues Stevie and {personName} visited most frequently together
          </p>
        </div>
      </div>

      <div className="favourite-haunts-list">
        {haunts.map((haunt, idx) => (
          <div
            key={haunt.id}
            className="favourite-haunt-item"
            onClick={() => onSelectRestaurant && onSelectRestaurant(haunt.id)}
            title={`View restaurant details for ${haunt.name}`}
          >
            <div className="haunt-left">
              <span className="haunt-rank">#{idx + 1}</span>
              <div>
                <div className="haunt-name">{haunt.name}</div>
                <div className="haunt-sub">
                  {haunt.city}
                  {haunt.country ? `, ${haunt.country}` : ''} • First visited: {haunt.firstVisit} • Latest:{' '}
                  {haunt.latestVisit}
                </div>
              </div>
            </div>

            <div className="haunt-right">
              <span className="haunt-count-pill">
                {haunt.count.toLocaleString()} {haunt.count === 1 ? 'meal' : 'meals'}
              </span>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
