import React from 'react';
import { Star, Heart, MapPin, Calendar, FileText } from 'lucide-react';
import { getStatusStyle, getPlaceholderText } from '../../utils/statusColors.js';
import { parseDate } from '../../utils/formatUtils.js';
import './GridCard.css';

export default function GridCard({
  item,
  config,
  onToggleStatusFilter,
  onToggleLocationFilter,
  onToggleCategoryFilter,
  onSelectDetail,
}) {
  const statusInfo = getStatusStyle(item.status);
  const parsedDate = parseDate(item.date);
  const hasReport = Boolean(item.content && item.content.trim().length > 0) || item.status === 'Blogged';
  const placeholderText = getPlaceholderText(item.status, config);

  const handleOpenDetail = (e) => {
    e.stopPropagation();
    if (onSelectDetail) onSelectDetail(item);
  };

  return (
    <article className="grid-card">
      {/* Photo Container */}
      <div className="card-media-wrapper">
        {item.featurePhoto ? (
          <img
            src={item.featurePhoto}
            alt={item.place}
            className="card-media"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        <div
          className="card-media-placeholder"
          style={{ display: item.featurePhoto ? 'none' : 'flex' }}
        >
          <MapPin size={24} className="placeholder-pin" />
          <p className="placeholder-text">{placeholderText}</p>
        </div>

        {/* Favourite heart overlay - ONLY IF FAVOURITE */}
        {item.favourite && (
          <div className="card-fav-badge" aria-label="Favourite place">
            <Heart size={16} fill="#ef4444" color="#ef4444" />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="card-body">
        {/* Title row & rating */}
        <div className="card-header-row">
          <button
            type="button"
            className="card-title-link"
            onClick={handleOpenDetail}
            title={`View details for ${item.place}`}
          >
            <h3 className="card-title">
              {item.place}
            </h3>
          </button>
          {item.rating !== null && (
            <div className="card-rating">
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <span>{item.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Chips row: Category & Location on left, Report lozenge on right underneath rating */}
        <div className="card-chips-row">
          <div className="card-chips-left">
            {item.category && (
              <button
                type="button"
                className="chip chip-category"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleCategoryFilter) onToggleCategoryFilter(item.category);
                }}
                title={`Filter by category: ${item.category}`}
              >
                {item.category}
              </button>
            )}

            {item.location && (
              <button
                type="button"
                className="chip chip-location"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleLocationFilter) onToggleLocationFilter(item.location);
                }}
                title={`Filter by location: ${item.location}`}
              >
                {item.location}
              </button>
            )}
          </div>

          {hasReport && (
            <button
              type="button"
              className="card-report-badge-btn"
              onClick={handleOpenDetail}
              title={`Read full report for ${item.place}`}
            >
              <FileText size={11} className="card-report-icon" />
              <span>Report</span>
            </button>
          )}
        </div>

        {/* Footer row: Status Pill, Date, and Google Maps Icon */}
        <div className="card-footer-row">
          <div className="card-footer-left">
            {item.status ? (
              <button
                type="button"
                className="card-status-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatusFilter && onToggleStatusFilter(item.status);
                }}
                title={`Filter by status: ${statusInfo.label}`}
              >
                <span className="status-dot" style={{ backgroundColor: statusInfo.dotBg }} />
                <span className="status-label">{statusInfo.label}</span>
              </button>
            ) : null}

            {parsedDate.formatted && (
              <span className="card-date-bottom" title={`Expedition date: ${parsedDate.formatted}`}>
                <Calendar size={11} className="card-date-icon" />
                <span>{parsedDate.formatted}</span>
              </span>
            )}
          </div>

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
