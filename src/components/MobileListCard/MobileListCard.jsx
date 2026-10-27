import React from 'react';
import { Star, Heart, MapPin, Tag, Calendar } from 'lucide-react';
import { getStatusStyle } from '../../utils/statusColors.js';
import { parseDate } from '../../utils/formatUtils.js';
import './MobileListCard.css';

export default function MobileListCard({
  item,
  onToggleStatusFilter,
  onToggleLocationFilter,
  onToggleCategoryFilter,
  onSelectDetail,
}) {
  const statusInfo = getStatusStyle(item.status);
  const parsedDate = parseDate(item.date);

  const handleOpenDetail = (e) => {
    e.stopPropagation();
    if (onSelectDetail) onSelectDetail(item);
  };

  return (
    <article className="mobile-list-card">
      {/* Left Thumbnail (Square-ish) */}
      <div className="list-card-media-wrapper">
        {item.featurePhoto ? (
          <img
            src={item.featurePhoto}
            alt={item.place}
            className="list-card-media"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        <div
          className="list-card-placeholder"
          style={{ display: item.featurePhoto ? 'none' : 'flex' }}
        >
          <MapPin size={22} className="placeholder-pin" />
        </div>
      </div>

      {/* Right Content Area */}
      <div className="list-card-content">
        {/* Header row: Title, Favourite Heart */}
        <div className="list-card-header">
          <button
            type="button"
            className="list-card-title-link"
            onClick={handleOpenDetail}
            title={`View details for ${item.place}`}
          >
            <h3 className="list-card-title">{item.place}</h3>
          </button>
          {item.favourite && (
            <div className="list-card-fav" aria-label="Favourite place">
              <Heart size={16} fill="#ef4444" color="#ef4444" />
            </div>
          )}
        </div>

        {/* Rating & Date row */}
        {(item.rating !== null || parsedDate.formatted) && (
          <div className="list-card-rating">
            {item.rating !== null && (
              <>
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span className="rating-score">{item.rating.toFixed(1)}</span>
              </>
            )}
            {parsedDate.formatted && (
              <span className="list-card-date">
                <Calendar size={11} className="date-icon" />
                {parsedDate.formatted}
              </span>
            )}
          </div>
        )}

        {/* Location & Category chips / icons */}
        <div className="list-card-tags">
          {item.location && (
            <button
              type="button"
              className="list-tag-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleLocationFilter) onToggleLocationFilter(item.location);
              }}
            >
              <MapPin size={11} /> {item.location}
            </button>
          )}

          {item.category && (
            <button
              type="button"
              className="list-tag-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleCategoryFilter) onToggleCategoryFilter(item.category);
              }}
            >
              <Tag size={11} /> {item.category}
            </button>
          )}
        </div>

        {/* Footer: Status dot + label, and Google Maps icon */}
        <div className="list-card-footer">
          {item.status ? (
            <button
              type="button"
              className="list-status-pill"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleStatusFilter) onToggleStatusFilter(item.status);
              }}
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
              className="gmaps-action-btn"
              title="Open location in Google Maps"
              aria-label={`Open ${item.place} in Google Maps`}
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
