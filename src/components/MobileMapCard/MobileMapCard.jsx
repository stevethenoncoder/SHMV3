import React from 'react';
import { Star, Heart, MapPin, Tag, X } from 'lucide-react';
import { getStatusStyle } from '../../utils/statusColors.js';
import './MobileMapCard.css';

export default function MobileMapCard({
  item,
  onClose,
  onToggleStatusFilter,
  onToggleLocationFilter,
  onToggleCategoryFilter,
  onSelectDetail,
  isCarousel = false,
}) {
  if (!item) return null;

  const statusInfo = getStatusStyle(item.status);

  return (
    <div className={`mobile-map-sheet ${isCarousel ? 'carousel-mode' : ''}`}>
      <div className="mobile-map-card">
        {/* Dismiss button (only shown if onClose callback is provided) */}
        {onClose && (
          <button
            type="button"
            className="mobile-map-card-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close card"
          >
            <X size={18} />
          </button>
        )}

        {/* Top Row: Title completely across the top (single-line with ellipsis if long) */}
        <div className="mobile-map-card-top">
          <h4
            className="mobile-map-card-title"
            onClick={(e) => {
              e.stopPropagation();
              onSelectDetail && onSelectDetail(item);
            }}
            role="button"
            tabIndex={0}
            title="View place details"
          >
            {item.place}
          </h4>
        </div>

        {/* Content Row: Picture (Left) & Everything Else to the right */}
        <div className="mobile-map-card-content">
          {/* Left: Thumbnail Picture (Clickable to open details) */}
          <div
            className="mobile-map-card-thumb"
            onClick={(e) => {
              e.stopPropagation();
              onSelectDetail && onSelectDetail(item);
            }}
            role="button"
            tabIndex={0}
            title="View place details"
          >
            {item.featurePhoto ? (
              <img
                src={item.featurePhoto}
                alt={item.place}
                className="mobile-map-card-img"
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}

            <div
              className="mobile-map-card-placeholder"
              style={{ display: item.featurePhoto ? 'none' : 'flex' }}
            >
              <MapPin size={22} className="placeholder-pin" />
            </div>

            {item.favourite && (
              <div className="mobile-map-fav-badge" aria-label="Favourite place">
                <Heart size={13} fill="#ef4444" color="#ef4444" />
              </div>
            )}
          </div>

          {/* Right: Info Column with county, category, completeness, rating, and map */}
          <div className="mobile-map-card-info-col">
            <div className="mobile-map-card-chips">
              {item.location && (
                <button
                  type="button"
                  className="mobile-map-chip"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLocationFilter && onToggleLocationFilter(item.location);
                  }}
                >
                  <MapPin size={10} /> <span>{item.location}</span>
                </button>
              )}

              {item.category && (
                <button
                  type="button"
                  className="mobile-map-chip"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCategoryFilter && onToggleCategoryFilter(item.category);
                  }}
                >
                  <Tag size={10} /> <span>{item.category}</span>
                </button>
              )}
            </div>

            <div className="mobile-map-card-meta-row">
              <div className="mobile-map-card-meta-left">
                {item.status ? (
                  <button
                    type="button"
                    className="mobile-map-status-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatusFilter && onToggleStatusFilter(item.status);
                    }}
                  >
                    <span className="status-dot" style={{ backgroundColor: statusInfo.dotBg }} />
                    <span>{statusInfo.label}</span>
                  </button>
                ) : null}

                {item.rating !== null && item.rating !== undefined && (
                  <div className="mobile-map-card-rating">
                    <Star size={12} fill="#f59e0b" color="#f59e0b" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {item.googleMapLink && (
                <a
                  href={item.googleMapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-map-gmaps-link"
                  onClick={(e) => e.stopPropagation()}
                  title="Open location in Google Maps"
                  aria-label="Open in Google Maps"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4" />
                    <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
