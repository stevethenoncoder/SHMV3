import React from 'react';
import { ArrowLeft, ArrowUp, Star, Heart, MapPin, Tag, Calendar, ExternalLink, Sparkles, Navigation } from 'lucide-react';
import { getStatusStyle } from '../../utils/statusColors.js';
import { parseDate } from '../../utils/formatUtils.js';
import { sanitizeBlogContent } from '../../utils/htmlSanitizer.js';
import './PlaceDetailPage.css';

export default function PlaceDetailPage({
  item,
  onBack,
  activeConfig,
  backLabel = 'Back to Explorer',
}) {
  if (!item) {
    return (
      <div className="place-detail-container">
        <div className="detail-not-found">
          <MapPin size={36} className="not-found-icon" />
          <h2>Place Not Found</h2>
          <p>We couldn't find the requested place in this project.</p>
          <button type="button" className="btn-back-action" onClick={onBack}>
            <ArrowLeft size={16} /> {backLabel}
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusStyle(item.status);
  const parsedDate = parseDate(item.date);
  const cleanContentHtml = sanitizeBlogContent(item.content);

  return (
    <article className="place-detail-container">
      {/* 1. Back navigation control */}
      <nav className="detail-navigation-bar" aria-label="Breadcrumb">
        <button
          type="button"
          className="btn-back-to-explorer"
          onClick={onBack}
          aria-label={backLabel}
        >
          <ArrowLeft size={16} />
          <span>{backLabel}</span>
        </button>
      </nav>

      <div className="detail-article-layout">
        {/* 2. Place Title */}
        <header className="detail-header">
          <div className="detail-title-row">
            <h1 className="detail-main-title">{item.place}</h1>
            {item.favourite && (
              <div className="detail-favourite-badge" title="Favourite place" aria-label="Favourite place">
                <Heart size={20} fill="#ef4444" color="#ef4444" />
              </div>
            )}
          </div>

          {/* 3. Metadata / Attributes */}
          <div className="detail-meta-row">
            {item.rating !== null && (
              <div className="detail-meta-rating">
                <Star size={15} fill="#f59e0b" color="#f59e0b" />
                <span className="rating-score">{item.rating.toFixed(1)}</span>
                {item.ratingLabel && (
                  <span className="rating-label-desc">({item.ratingLabel})</span>
                )}
              </div>
            )}

            {parsedDate.formatted && (
              <div className="detail-meta-date">
                <Calendar size={14} className="date-icon" />
                <span>{parsedDate.formatted}</span>
              </div>
            )}

            {item.status && (
              <div className="detail-status-pill">
                <span className="status-dot" style={{ backgroundColor: statusInfo.dotBg }} />
                <span>{statusInfo.label}</span>
              </div>
            )}

            {item.location && (
              <span className="detail-meta-chip">
                <MapPin size={12} />
                <span>{item.location}</span>
              </span>
            )}

            {item.category && (
              <span className="detail-meta-chip">
                <Tag size={12} />
                <span>{item.category}</span>
              </span>
            )}
          </div>
        </header>

        {/* 5. Description (Introductory standfirst paragraph) */}
        {item.description && (
          <section className="detail-description-standfirst">
            <p>{item.description}</p>
          </section>
        )}

        {/* 6. AI Summary */}
        {item.aiSummary && (
          <aside className="detail-ai-summary-card">
            <div className="ai-summary-card-head">
              <Sparkles size={16} className="ai-summary-icon" />
              <h2 className="ai-summary-card-title">AI Summary</h2>
            </div>
            <p className="ai-summary-text">{item.aiSummary}</p>
          </aside>
        )}

        {/* 7. Full Blog Content */}
        <section className="detail-blog-section">
          {cleanContentHtml ? (
            <div
              className="detail-blog-body prose-content"
              dangerouslySetInnerHTML={{ __html: cleanContentHtml }}
            />
          ) : (
            <div className="detail-content-placeholder">
              <p>Full blog entry not available yet.</p>
            </div>
          )}
        </section>

        {/* 7b. Video Section */}
        {item.videoEmbedSrc && (
          <section className="detail-video-section">
            <h2 className="detail-section-heading">Video</h2>
            <div className="detail-video-wrapper">
              <iframe
                title={`Video of ${item.place}`}
                src={item.videoEmbedSrc}
                className="detail-video-iframe"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* 8. Map Section */}
        <section className="detail-map-section">
          <h2 className="detail-section-heading">Location & Map</h2>

          {item.googleMapEmbedSrc ? (
            <div className="detail-map-embed-wrapper">
              <iframe
                title={`Map location of ${item.place}`}
                src={item.googleMapEmbedSrc}
                className="detail-map-iframe"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="detail-map-fallback-banner">
              <MapPin size={20} className="banner-pin-icon" />
              <span>Map coordinates: {item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : (item.location || 'Location available')}</span>
            </div>
          )}
        </section>

        {/* 9. External Actions & Back to Top */}
        <footer className="detail-footer-actions">
          {item.googleMapLink && (
            <a
              href={item.googleMapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-external-action"
              title="Open place in Google Maps"
            >
              <Navigation size={15} />
              <span>Open in Google Maps</span>
              <ExternalLink size={13} className="ext-icon" />
            </a>
          )}

          <button
            type="button"
            className="btn-back-to-top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Back to the top"
            aria-label="Back to the top"
          >
            <ArrowUp size={15} />
            <span>Back to top</span>
          </button>
        </footer>
      </div>
    </article>
  );
}
