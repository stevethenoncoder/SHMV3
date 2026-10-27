import React from 'react';
import { Star, Heart, MapPin, Tag } from 'lucide-react';
import { getStatusStyle } from '../../utils/statusColors.js';
import { extractBlogReport, formatDescription } from '../../utils/formatUtils.js';
import './MapPopupCard.css';

export default function MapPopupCard({
  item,
  onToggleStatusFilter,
  onToggleLocationFilter,
  onToggleCategoryFilter,
  onSelectDetail,
}) {
  if (!item) return null;

  const statusInfo = getStatusStyle(item.status);
  const blogSnippet = extractBlogReport(item.content, 140);
  const descSnippet = formatDescription(item.description, 130);

  return (
    <div className="map-popup-card">
      {/* Top Media & Header Layout */}
      <div className="map-popup-main-row">
        {/* Thumbnail on left */}
        <div className="map-popup-media-wrapper">
          {item.featurePhoto ? (
            <img
              src={item.featurePhoto}
              alt={item.place}
              className="map-popup-media"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="map-popup-placeholder"
            style={{ display: item.featurePhoto ? 'none' : 'flex' }}
          >
            <MapPin size={16} className="placeholder-pin" />
          </div>

          {item.favourite && (
            <div className="map-popup-fav" title="Favourite">
              <Heart size={11} fill="#ef4444" color="#ef4444" />
            </div>
          )}
        </div>

        {/* Header Details */}
        <div className="map-popup-header-content">
          <div className="map-popup-header">
            <h4 className="map-popup-title" title={item.place}>
              {item.place}
            </h4>
            {item.rating !== null && (
              <div className="map-popup-rating">
                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                <span>{item.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Attributes Chips */}
          <div className="map-popup-chips">
            {item.location && (
              <button
                type="button"
                className="map-popup-chip"
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
                className="map-popup-chip"
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
        </div>
      </div>

      {/* Excerpt: Exclusively the Report snippet */}
      {blogSnippet && (
        <div className="map-popup-text-content">
          <div className="map-popup-snippet-box">
            <span className="map-popup-snippet-tag">Report</span>
            <p className="map-popup-snippet-text">{blogSnippet}</p>
          </div>
        </div>
      )}

      {/* Footer: status and Google Maps / Detail actions */}
      <div className="map-popup-footer">
        {item.status ? (
          <button
            type="button"
            className="map-popup-status-pill"
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

        <div className="map-popup-actions">
          {onSelectDetail && (
            <button
              type="button"
              className="map-popup-detail-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDetail(item);
              }}
              title="View full place details"
            >
              Details →
            </button>
          )}

          {item.googleMapLink && (
            <a
              href={item.googleMapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="map-popup-gmaps-link"
              title="Open in Google Maps"
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4" />
                <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
