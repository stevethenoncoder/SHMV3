import React from 'react';
import { Star, Heart, MapPin, Tag } from 'lucide-react';
import { getStatusStyle } from '../../utils/statusColors.js';
import './MapRailCard.css';

export default function MapRailCard({
  item,
  isSelected,
  onSelect,
  onToggleStatusFilter,
  onToggleLocationFilter,
  onToggleCategoryFilter,
  onSelectDetail,
}) {
  const statusInfo = getStatusStyle(item.status);

  return (
    <article
      className={`map-rail-card ${isSelected ? 'is-selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Select ${item.place}`}
    >
      {/* Thumbnail */}
      <div className="rail-card-media-wrapper">
        {item.featurePhoto ? (
          <img
            src={item.featurePhoto}
            alt={item.place}
            className="rail-card-media"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        <div
          className="rail-card-placeholder"
          style={{ display: item.featurePhoto ? 'none' : 'flex' }}
        >
          <MapPin size={18} className="placeholder-pin" />
        </div>

        {item.favourite && (
          <div className="rail-card-fav" title="Favourite">
            <Heart size={12} fill="#ef4444" color="#ef4444" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="rail-card-content">
        <div className="rail-card-header">
          <h4 className="rail-card-title" title={item.place}>
            {item.place}
          </h4>
          {item.rating !== null && (
            <div className="rail-card-rating">
              <Star size={11} fill="#f59e0b" color="#f59e0b" />
              <span>{item.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Chips row */}
        <div className="rail-card-chips">
          {item.location && (
            <button
              type="button"
              className="rail-chip"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleLocationFilter) onToggleLocationFilter(item.location);
              }}
              title={`Filter by ${item.location}`}
            >
              <MapPin size={9} />
              <span>{item.location}</span>
            </button>
          )}

          {item.category && (
            <button
              type="button"
              className="rail-chip"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleCategoryFilter) onToggleCategoryFilter(item.category);
              }}
              title={`Filter by ${item.category}`}
            >
              <Tag size={9} />
              <span>{item.category}</span>
            </button>
          )}
        </div>

        {/* Expanded Details when selected */}
        {isSelected && (
          <div className="rail-card-expanded-section">
            {(item.aiSummary || item.description) && (
              <div className="rail-card-expanded-desc">
                <p>{item.aiSummary || item.description}</p>
              </div>
            )}
            {onSelectDetail && (
              <button
                type="button"
                className="rail-card-detail-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDetail(item);
                }}
              >
                View full place details →
              </button>
            )}
          </div>
        )}

        {/* Footer: status pill + external map link */}
        <div className="rail-card-footer">
          {item.status ? (
            <button
              type="button"
              className="rail-status-pill"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleStatusFilter) onToggleStatusFilter(item.status);
              }}
              title={`Filter by ${statusInfo.label}`}
            >
              <span className="status-dot" style={{ backgroundColor: statusInfo.dotBg }} />
              <span>{statusInfo.label}</span>
            </button>
          ) : (
            <span />
          )}

          {item.googleMapLink && (
            <a
              href={item.googleMapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rail-gmaps-link"
              title="Open location in Google Maps"
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4" />
                <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
