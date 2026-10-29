import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Star,
  Utensils,
  Camera,
  ExternalLink,
  Globe,
  Quote,
  Shield,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import { formatRatingLabel } from '../../utils/restaurantsFilter.js';
import './RestaurantDetailPage.css';

function getRatingBadgeStyle(rating) {
  const r = (rating || '').toLowerCase();
  if (r.includes('exceptional') || r.includes('the dogs')) {
    return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
  }
  if (r.includes('very good') || r.includes('superb')) {
    return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
  }
  if (r.includes('fine') || r.includes('good')) {
    return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
  }
  if (r.includes("wouldn't recommend") || r.includes('ok')) {
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  }
  if (r.includes('bad') || r.includes('never again') || r.includes('worst')) {
    return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
  }
  return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
}

export default function RestaurantDetailPage({
  restaurant,
  onBack,
  onSelectMeal,
}) {
  const [chronologyOrder, setChronologyOrder] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first

  if (!restaurant) {
    return (
      <div className="restaurant-detail-container">
        <div className="detail-not-found">
          <h2>Restaurant Not Found</h2>
          <p>The requested dining venue record could not be found.</p>
          <button type="button" className="btn-back" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Restaurants
          </button>
        </div>
      </div>
    );
  }

  const locationBreadcrumb = [
    restaurant.city?.country?.name,
    restaurant.city?.name,
    restaurant.name,
  ]
    .filter(Boolean)
    .join('  ›  ');

  // Clean Google Enrichment
  const hasValidGoogleRating =
    restaurant.googleRating &&
    !isNaN(restaurant.googleRating) &&
    restaurant.googleRating > 0;

  const validWebsite =
    restaurant.website && restaurant.website.startsWith('http')
      ? restaurant.website
      : null;

  const validMapUrl =
    restaurant.mapUrl && restaurant.mapUrl.startsWith('http')
      ? restaurant.mapUrl
      : restaurant.latitude && restaurant.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`
      : null;

  // Sorted visits according to user toggle
  const sortedMeals = [...(restaurant.meals || [])].sort((a, b) => {
    return chronologyOrder === 'desc'
      ? (b.timestamp || 0) - (a.timestamp || 0)
      : (a.timestamp || 0) - (b.timestamp || 0);
  });

  return (
    <div className="restaurant-detail-container">
      {/* 1. Back Navigation */}
      <nav className="detail-nav-bar">
        <button type="button" className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Restaurants</span>
        </button>
      </nav>

      <article className="restaurant-detail-content">
        {/* 2. Hero Header */}
        <header className="restaurant-hero-header">
          {locationBreadcrumb && (
            <div className="detail-breadcrumb">
              <MapPin size={13} />
              <span>{locationBreadcrumb}</span>
            </div>
          )}

          <div className="restaurant-title-row">
            <h1 className="restaurant-title">{restaurant.name}</h1>
            {restaurant.type?.name && (
              <span className="restaurant-cuisine-tag">{restaurant.type.name}</span>
            )}
          </div>

          {/* Address & Meta */}
          <div className="restaurant-meta-row">
            {(restaurant.address || restaurant.city?.name) && (
              <div className="meta-item location-address">
                <MapPin size={15} />
                <span>
                  {[restaurant.address, restaurant.city?.name, restaurant.city?.country?.name]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}

            {hasValidGoogleRating && (
              <div
                className="meta-item google-rating-pill"
                title="Google Places rating score"
              >
                <Star size={13} fill="currentColor" />
                <span>Google: {restaurant.googleRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* External Action Links */}
          {(validWebsite || validMapUrl) && (
            <div className="restaurant-external-actions">
              {validWebsite && (
                <a
                  href={validWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-external-link website"
                >
                  <Globe size={14} />
                  <span>Official Website</span>
                  <ExternalLink size={12} />
                </a>
              )}
              {validMapUrl && (
                <a
                  href={validMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-external-link maps"
                >
                  <MapPin size={14} />
                  <span>Google Maps</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}
        </header>

        {/* 3. Personal Dining History Summary Card */}
        <section className="history-summary-card">
          <h2 className="summary-card-title">
            <Clock size={18} />
            <span>Personal Dining History</span>
          </h2>

          <div className="history-stats-grid">
            <div className="stat-box">
              <span className="stat-label">Total Visits</span>
              <span className="stat-value highlight">{restaurant.mealCount}</span>
              <span className="stat-subtext">
                {restaurant.mealCount === 1 ? 'Recorded meal' : 'Recorded meals'}
              </span>
            </div>

            <div className="stat-box">
              <span className="stat-label">First Visit</span>
              <span className="stat-value">{restaurant.firstVisit?.formattedDate || '—'}</span>
              <span className="stat-subtext">Year {restaurant.firstVisit?.year}</span>
            </div>

            <div className="stat-box">
              <span className="stat-label">Latest Visit</span>
              <span className="stat-value">{restaurant.latestVisit?.formattedDate || '—'}</span>
              <span className="stat-subtext">Year {restaurant.latestVisit?.year}</span>
            </div>

            <div className="stat-box">
              <span className="stat-label">Dining Span</span>
              <span className="stat-value">{restaurant.yearSpan || '—'}</span>
              <span className="stat-subtext">
                {restaurant.yearsVisited?.length || 1}{' '}
                {restaurant.yearsVisited?.length === 1 ? 'active year' : 'active years'}
              </span>
            </div>
          </div>

          {/* Ratings Distribution Pill Breakdown */}
          {restaurant.ratingDistribution &&
            Object.keys(restaurant.ratingDistribution).length > 0 && (
              <div className="rating-distribution-section">
                <span className="distribution-title">Ratings Given:</span>
                <div className="distribution-pills-list">
                  {Object.entries(restaurant.ratingDistribution).map(
                    ([rating, count]) => {
                      const style = getRatingBadgeStyle(rating);
                      return (
                        <span
                          key={rating}
                          className="rating-dist-pill"
                          style={{
                            backgroundColor: style.bg,
                            color: style.text,
                            borderColor: style.border,
                          }}
                        >
                          <Star size={12} fill="currentColor" />
                          <span>
                            {formatRatingLabel(rating)}: <strong>{count}</strong>
                          </span>
                        </span>
                      );
                    }
                  )}
                </div>
              </div>
            )}
        </section>

        {/* 4. Chronological Visit History (All Associated Meals) */}
        <section className="detail-section visit-history-section">
          <div className="section-heading-row">
            <h2 className="section-heading">
              <Calendar size={18} />
              <span>Visit History ({restaurant.mealCount})</span>
            </h2>
            {restaurant.mealCount > 1 && (
              <button
                type="button"
                className="btn-toggle-chronology"
                onClick={() =>
                  setChronologyOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                }
                title="Toggle chronological order"
              >
                <ArrowUpDown size={14} />
                <span>
                  {chronologyOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                </span>
              </button>
            )}
          </div>

          <div className="visits-timeline-list">
            {sortedMeals.map((meal) => {
              const ratingStyle = getRatingBadgeStyle(meal.rating);
              const primaryPhoto =
                meal.photos && meal.photos.length > 0 ? meal.photos[0] : null;

              return (
                <div
                  key={meal.id}
                  className="visit-history-card"
                  onClick={() => onSelectMeal && onSelectMeal(meal.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onSelectMeal) onSelectMeal(meal.id);
                    }
                  }}
                >
                  {/* Left Column: Photo Thumbnail if available */}
                  {primaryPhoto && (
                    <div className="visit-thumbnail-wrap">
                      <img
                        src={primaryPhoto.url}
                        alt="Visit food"
                        className="visit-thumbnail"
                        loading="lazy"
                      />
                      {meal.photos.length > 1 && (
                        <span className="visit-thumb-count">
                          +{meal.photos.length - 1}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Main Details */}
                  <div className="visit-card-main">
                    <div className="visit-card-header">
                      <div className="visit-date-badge">
                        <Calendar size={14} />
                        <span className="visit-date-text">{meal.formattedDate}</span>
                      </div>

                      {meal.rating && meal.rating !== 'Unrated' && (
                        <span
                          className="visit-rating-badge"
                          style={{
                            backgroundColor: ratingStyle.bg,
                            color: ratingStyle.text,
                            borderColor: ratingStyle.border,
                          }}
                        >
                          <Star size={12} fill="currentColor" />
                          <span>{formatRatingLabel(meal.rating)}</span>
                        </span>
                      )}

                      {meal.valueGBP !== null && (
                        <span className="visit-spend-badge">
                          £{meal.valueGBP.toFixed(2)}
                        </span>
                      )}

                      {meal.arsenal && (
                        <span className="visit-arsenal-tag" title="Arsenal Matchday Meal">
                          <Shield size={12} />
                          <span>Arsenal {meal.arsenal.opponent ? `vs ${meal.arsenal.opponent}` : 'Matchday'}</span>
                        </span>
                      )}
                    </div>

                    {/* Review Snippet */}
                    {meal.comment && (
                      <blockquote className="visit-comment-snippet">
                        &ldquo;{meal.comment}&rdquo;
                      </blockquote>
                    )}

                    {/* Main Courses on this visit */}
                    {meal.mains && meal.mains.length > 0 && (
                      <div className="visit-dishes-row">
                        <Utensils size={13} className="dishes-icon" />
                        <span className="dishes-list">
                          {meal.mains.map((m) => m.food?.name).filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Main Dishes Eaten There */}
        {restaurant.mainDishes && restaurant.mainDishes.length > 0 && (
          <section className="detail-section restaurant-dishes-section">
            <h2 className="section-heading">
              <Utensils size={18} />
              <span>Main Courses Recorded ({restaurant.mainDishes.length})</span>
            </h2>

            <div className="restaurant-dishes-grid">
              {restaurant.mainDishes.map((dish) => {
                const dishRatingStyle = getRatingBadgeStyle(dish.latestRating);
                return (
                  <div key={dish.name} className="restaurant-dish-card">
                    <div className="dish-card-header">
                      <h3 className="dish-card-name">{dish.name}</h3>
                      <span className="dish-ordered-count">
                        {dish.count} {dish.count === 1 ? 'order' : 'orders'}
                      </span>
                    </div>

                    <div className="dish-card-footer">
                      {dish.latestRating && (
                        <span
                          className="dish-rating-pill"
                          style={{
                            backgroundColor: dishRatingStyle.bg,
                            color: dishRatingStyle.text,
                            borderColor: dishRatingStyle.border,
                          }}
                        >
                          <Star size={11} fill="currentColor" />
                          <span>{dish.latestRating}</span>
                        </span>
                      )}
                      {dish.category && (
                        <span className="dish-tax-tag">{dish.category}</span>
                      )}
                      {dish.ingredient && (
                        <span className="dish-tax-tag ing">{dish.ingredient}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. Photographs Gallery */}
        {restaurant.photos && restaurant.photos.length > 0 && (
          <section className="detail-section restaurant-gallery-section">
            <h2 className="section-heading">
              <Camera size={18} />
              <span>Photographs from Visits ({restaurant.photos.length})</span>
            </h2>

            <div className="restaurant-photos-grid">
              {restaurant.photos.map((photo) => (
                <figure
                  key={photo.id}
                  className="restaurant-photo-card"
                  onClick={() => photo.mealId && onSelectMeal && onSelectMeal(photo.mealId)}
                  role="button"
                  tabIndex={0}
                  title="Click to view associated meal"
                >
                  <img
                    src={photo.url}
                    alt={photo.comment || `${restaurant.name} food photograph`}
                    className="restaurant-gallery-img"
                    loading="lazy"
                  />
                  <figcaption className="photo-card-caption">
                    <span className="photo-meal-date">
                      <Calendar size={12} />
                      <span>{photo.mealDate}</span>
                    </span>
                    {photo.comment && (
                      <span className="photo-comment-text">{photo.comment}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
