import React from 'react';
import { Star, Heart, MapPin, Tag, Calendar, FileText, Sparkles, AlignLeft } from 'lucide-react';
import { getStatusStyle, getPlaceholderText } from '../../utils/statusColors.js';
import { parseDate, extractBlogReport, formatDescription } from '../../utils/formatUtils.js';
import './DesktopListCard.css';

export default function DesktopListCard({
  item,
  config,
  onToggleStatusFilter,
  onToggleLocationFilter,
  onToggleCategoryFilter,
  onSelectDetail,
}) {
  const statusInfo = getStatusStyle(item.status);
  const parsedDate = parseDate(item.date);
  const blogReport = extractBlogReport(item.content, 300);
  const descriptionText = formatDescription(item.description, 260);
  const placeholderText = getPlaceholderText(item.status, config);

  const handleOpenDetail = (e) => {
    e.stopPropagation();
    if (onSelectDetail) onSelectDetail(item);
  };

  return (
    <article className="desktop-list-card">
      {/* Left Column: Substantial Feature Photo (50% bigger, square) */}
      <div className="dlist-media-wrapper">
        {item.featurePhoto ? (
          <img
            src={item.featurePhoto}
            alt={item.place}
            className="dlist-media"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        <div
          className="dlist-placeholder"
          style={{ display: item.featurePhoto ? 'none' : 'flex' }}
        >
          <MapPin size={32} className="placeholder-pin" />
          <p className="dlist-placeholder-text">{placeholderText}</p>
        </div>

        {/* Favourite heart overlay - ONLY IF FAVOURITE */}
        {item.favourite && (
          <div className="dlist-fav-badge" aria-label="Favourite place">
            <Heart size={16} fill="#ef4444" color="#ef4444" />
          </div>
        )}
      </div>

      {/* Right Column: Main Content */}
      <div className="dlist-content">
        {/* Row 1: Title & Google Maps Action Icon */}
        <div className="dlist-header-row">
          <button
            type="button"
            className="dlist-title-link"
            onClick={handleOpenDetail}
            title={`View details for ${item.place}`}
          >
            <h3 className="dlist-title">
              {item.place}
            </h3>
          </button>

          {item.googleMapLink && (
            <a
              href={item.googleMapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="dlist-gmaps-link"
              title="Open location in Google Maps"
              aria-label={`Open ${item.place} in Google Maps`}
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                  fill="#4285F4"
                />
                <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
              </svg>
            </a>
          )}
        </div>

        {/* Row 2: Rating, Date, Metadata Chips, and Status Pill (moved up with the rest of attributes) */}
        <div className="dlist-meta-row">
          {item.rating !== null && (
            <div className="dlist-rating">
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <span className="rating-num">{item.rating.toFixed(1)}</span>
            </div>
          )}

          {parsedDate.formatted && (
            <div className="dlist-date">
              <Calendar size={13} className="dlist-date-icon" />
              <span>{parsedDate.formatted}</span>
            </div>
          )}

          {item.location && (
            <button
              type="button"
              className="dlist-chip"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleLocationFilter) onToggleLocationFilter(item.location);
              }}
              title={`Filter by location: ${item.location}`}
            >
              <MapPin size={12} className="chip-icon" />
              <span>{item.location}</span>
            </button>
          )}

          {item.category && (
            <button
              type="button"
              className="dlist-chip"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleCategoryFilter) onToggleCategoryFilter(item.category);
              }}
              title={`Filter by category: ${item.category}`}
            >
              <Tag size={12} className="chip-icon" />
              <span>{item.category}</span>
            </button>
          )}

          {item.status && (
            <button
              type="button"
              className="dlist-status-pill"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleStatusFilter) onToggleStatusFilter(item.status);
              }}
              title={`Filter by status: ${statusInfo.label}`}
            >
              <span className="status-dot" style={{ backgroundColor: statusInfo.dotBg }} />
              <span className="status-label">{statusInfo.label}</span>
            </button>
          )}
        </div>

        {/* 1. Description Section (Top) */}
        {descriptionText && (
          <div className="dlist-section dlist-desc-section">
            <h4 className="dlist-section-title">
              <AlignLeft size={13} className="section-title-icon" />
              Description
            </h4>
            <div className="dlist-section-box">
              <p className="dlist-section-text">
                {descriptionText}
              </p>
            </div>
          </div>
        )}

        {/* 2. Summary Section (Second - AI summary when available) */}
        {item.aiSummary && (
          <div className="dlist-section dlist-summary-section">
            <h4 className="dlist-section-title">
              <Sparkles size={13} className="section-title-icon" />
              Summary
            </h4>
            <div className="dlist-section-box">
              <p className="dlist-section-text">
                {item.aiSummary}
              </p>
            </div>
          </div>
        )}

        {/* 3. Report Section (Blog text when available, with embedded Report lozenge) */}
        {blogReport && (
          <div className="dlist-section dlist-report-section">
            <div className="dlist-report-header">
              <h4 className="dlist-section-title">
                <FileText size={13} className="section-title-icon" />
                Report
              </h4>
              <button
                type="button"
                className="dlist-report-badge-btn"
                onClick={handleOpenDetail}
                title={`Read full report for ${item.place}`}
              >
                <FileText size={11} className="dlist-report-icon" />
                <span>Full Report →</span>
              </button>
            </div>
            <div className="dlist-section-box">
              <p className="dlist-section-text">
                {blogReport}
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
