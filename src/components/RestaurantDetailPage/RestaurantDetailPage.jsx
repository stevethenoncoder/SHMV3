import React, { useState, useMemo, useEffect } from 'react';
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
  Navigation,
  ChevronDown,
  Users,
  Briefcase,
  Tag,
} from 'lucide-react';
import { formatRatingLabel } from '../../utils/restaurantsFilter.js';
import '../MealsMobileCard/MealsMobileCard.css';
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
  selectedMealId = null,
  onBack,
  backLabel = 'Back to Restaurants',
  onSelectMeal = null,
}) {
  const [chronologyOrder, setChronologyOrder] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first
  const [googleViewMode, setGoogleViewMode] = useState('map'); // 'map' | 'details'

  // Manage accordion expansion for individual visits
  // If arrived via a selected meal, that meal starts expanded by default
  const [expandedMealIds, setExpandedMealIds] = useState(() => {
    return new Set(selectedMealId ? [selectedMealId] : []);
  });

  useEffect(() => {
    if (selectedMealId) {
      setExpandedMealIds((prev) => new Set([...prev, selectedMealId]));
    }
  }, [selectedMealId]);

  const toggleExpandMeal = (mealId) => {
    setExpandedMealIds((prev) => {
      const next = new Set(prev);
      if (next.has(mealId)) {
        next.delete(mealId);
      } else {
        next.add(mealId);
      }
      return next;
    });
  };

  if (!restaurant) {
    return (
      <div className="restaurant-detail-container">
        <div className="detail-not-found">
          <h2>Restaurant Not Found</h2>
          <p>The requested dining venue record could not be found.</p>
          <button type="button" className="btn-back" onClick={onBack}>
            <ArrowLeft size={16} /> {backLabel || 'Back to Restaurants'}
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

  // Filter out literal placeholder strings such as "Address"
  const cleanAddress =
    restaurant.googleAddress && restaurant.googleAddress.toLowerCase() !== 'address'
      ? restaurant.googleAddress
      : restaurant.address && restaurant.address.toLowerCase() !== 'address'
      ? restaurant.address
      : null;

  const validMapUrl =
    restaurant.mapUrl && restaurant.mapUrl.startsWith('http')
      ? restaurant.mapUrl
      : restaurant.latitude && restaurant.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [
            restaurant.name,
            cleanAddress,
            restaurant.city?.name,
            restaurant.city?.country?.name,
          ]
            .filter(Boolean)
            .join(', ')
        )}`;

  // Robust Map Embed:
  // 1. Coordinates when available
  // 2. Intelligent fallback: Name + Real Address + City + Country (locates venue even if coordinates are temporarily pending)
  const mapEmbedUrl =
    restaurant.latitude && restaurant.longitude
      ? `https://maps.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}&hl=en&z=15&output=embed`
      : `https://maps.google.com/maps?q=${encodeURIComponent(
          [
            restaurant.googleName || restaurant.name,
            cleanAddress,
            restaurant.city?.name,
            restaurant.city?.country?.name,
          ]
            .filter(Boolean)
            .join(', ')
        )}&hl=en&z=15&output=embed`;

  // Sorted visits: if arriving from a specific meal, place that meal at the very top of the list!
  const sortedMeals = useMemo(() => {
    const allMeals = [...(restaurant.meals || [])];
    if (selectedMealId) {
      const selectedMeal = allMeals.find((m) => m.id === selectedMealId);
      const remainingMeals = allMeals.filter((m) => m.id !== selectedMealId);
      remainingMeals.sort((a, b) => {
        return chronologyOrder === 'desc'
          ? (b.timestamp || 0) - (a.timestamp || 0)
          : (a.timestamp || 0) - (b.timestamp || 0);
      });
      return selectedMeal ? [selectedMeal, ...remainingMeals] : remainingMeals;
    }

    return allMeals.sort((a, b) => {
      return chronologyOrder === 'desc'
        ? (b.timestamp || 0) - (a.timestamp || 0)
        : (a.timestamp || 0) - (b.timestamp || 0);
    });
  }, [restaurant.meals, selectedMealId, chronologyOrder]);

  return (
    <div className="restaurant-detail-container">
      {/* 1. Back Navigation */}
      <nav className="detail-nav-bar">
        <button type="button" className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>{backLabel || 'Back to Restaurants'}</span>
        </button>
      </nav>

      <article className="restaurant-detail-content">
        {/* 2. Hero Header */}
        <header className="restaurant-hero-header">
          <div className="restaurant-hero-main">
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
              {(cleanAddress || restaurant.city?.name) && (
                <div className="meta-item location-address">
                  <MapPin size={15} />
                  <span>
                    {[cleanAddress, restaurant.city?.name, restaurant.city?.country?.name]
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
          </div>

          {/* Right Column: Google Place Box */}
          <div className="restaurant-google-place-box">
            <div className="google-place-header">
              <div className="google-place-title-wrap">
                <span className="google-badge-icon">G</span>
                <span className="google-place-title-text">Google Place</span>
                {hasValidGoogleRating && (
                  <span className="google-place-chip-rating">
                    <Star size={11} fill="#f59e0b" color="#f59e0b" />
                    {restaurant.googleRating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="google-place-tab-switch">
                <button
                  type="button"
                  className={`place-tab-toggle ${googleViewMode === 'map' ? 'active' : ''}`}
                  onClick={() => setGoogleViewMode('map')}
                  title="Show map view"
                >
                  Map
                </button>
                <button
                  type="button"
                  className={`place-tab-toggle ${googleViewMode === 'details' ? 'active' : ''}`}
                  onClick={() => setGoogleViewMode('details')}
                  title="Show Google Place details"
                >
                  Details
                </button>
              </div>
            </div>

            <div className="google-place-content">
              {googleViewMode === 'map' ? (
                mapEmbedUrl ? (
                  <div className="google-place-map-wrap">
                    <iframe
                      title={`Google Place map location for ${restaurant.googleName || restaurant.name}`}
                      src={mapEmbedUrl}
                      className="google-place-iframe"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : (
                  <div className="google-place-empty">
                    <MapPin size={22} className="empty-pin-icon" />
                    <span>Coordinates not available for this venue</span>
                  </div>
                )
              ) : (
                <div className="google-place-details-card">
                  <div className="place-detail-line place-name-line">
                    <span className="place-detail-label">Place:</span>
                    <strong
                      className="place-name-val"
                      title={restaurant.googleName || restaurant.name}
                    >
                      {restaurant.googleName || restaurant.name}
                    </strong>
                  </div>

                  {(restaurant.googleType || restaurant.type?.name) && (
                    <div className="place-detail-line">
                      <span className="place-detail-label">Category:</span>
                      <span className="place-type-pill">
                        {restaurant.googleType || restaurant.type?.name}
                      </span>
                    </div>
                  )}

                  {(restaurant.googleAddress || restaurant.address) && (
                    <div className="place-detail-line">
                      <span className="place-detail-label">Address:</span>
                      <span
                        className="place-address-val"
                        title={restaurant.googleAddress || restaurant.address}
                      >
                        {restaurant.googleAddress || restaurant.address}
                      </span>
                    </div>
                  )}

                  {hasValidGoogleRating && (
                    <div className="place-detail-line">
                      <span className="place-detail-label">Rating:</span>
                      <div className="place-rating-val">
                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        <strong>{restaurant.googleRating.toFixed(1)}</strong>
                        <span className="rating-scale">/ 5.0 (Google Places)</span>
                      </div>
                    </div>
                  )}

                  {validMapUrl && (
                    <div className="place-detail-action-line">
                      <a
                        href={validMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="place-maps-btn"
                      >
                        <MapPin size={13} />
                        <span>View on Google Maps</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 3. Personal Dining History Summary Card */}
        <section className="history-summary-card">
          <h2 className="summary-card-title">
            <Clock size={18} />
            <span>Personal Dining History</span>
          </h2>

          {/* Desktop 4-column Stat Boxes (without extraneous subtext) */}
          <div className="history-stats-desktop">
            <div className="stat-box">
              <span className="stat-label">Total Visits</span>
              <span className="stat-value highlight">{restaurant.mealCount}</span>
            </div>

            <div className="stat-box">
              <span className="stat-label">First Visit</span>
              <span className="stat-value">{restaurant.firstVisit?.formattedDate || '—'}</span>
            </div>

            <div className="stat-box">
              <span className="stat-label">Latest Visit</span>
              <span className="stat-value">{restaurant.latestVisit?.formattedDate || '—'}</span>
            </div>

            <div className="stat-box">
              <span className="stat-label">Dining Span</span>
              <span className="stat-value">{restaurant.yearSpan || '—'}</span>
            </div>
          </div>

          {/* Mobile Clean Text Lines (replaces bulky KPI boxes) */}
          <div className="history-stats-mobile">
            <div className="history-stat-line">
              <span className="stat-line-label">Total Visits:</span>
              <strong className="stat-line-value">{restaurant.mealCount}</strong>
            </div>
            <div className="history-stat-line">
              <span className="stat-line-label">First Visit:</span>
              <strong className="stat-line-value">{restaurant.firstVisit?.formattedDate || '—'}</strong>
            </div>
            <div className="history-stat-line">
              <span className="stat-line-label">Latest Visit:</span>
              <strong className="stat-line-value">{restaurant.latestVisit?.formattedDate || '—'}</strong>
            </div>
            <div className="history-stat-line">
              <span className="stat-line-label">Dining Span:</span>
              <strong className="stat-line-value">{restaurant.yearSpan || '—'}</strong>
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
              const isSelected = meal.id === selectedMealId;
              const isExpanded = expandedMealIds.has(meal.id);
              const ratingStyle = getRatingBadgeStyle(meal.rating);
              const ratingText = meal.rating && meal.rating !== 'Unrated' ? formatRatingLabel(meal.rating) : null;
              const photoUrl =
                meal.photos && meal.photos.length > 0 && meal.photos[0]?.url
                  ? meal.photos[0].url
                  : restaurant.typeIcon || null;

              const firstMain = meal.mains?.[0]?.food?.name;
              const extraMainsCount = (meal.mains?.length || 0) - 1;
              const mealTitle = firstMain
                ? `${firstMain}${extraMainsCount > 0 ? ` +${extraMainsCount}` : ''}`
                : `Meal at ${restaurant.name}`;

              const cityName = restaurant.city?.name || null;
              const countryName = restaurant.city?.country?.name || null;
              const cuisine = restaurant.type?.name || null;

              return (
                <div
                  key={meal.id}
                  id={`meal-visit-${meal.id}`}
                  className={`visit-history-card meals-mobile-card ${isSelected ? 'selected-visit' : ''} ${
                    isExpanded ? 'is-expanded' : ''
                  }`}
                  onClick={() => toggleExpandMeal(meal.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpandMeal(meal.id);
                    }
                  }}
                >
                  {/* Selected Visit Callout Pill */}
                  {isSelected && (
                    <div className="selected-visit-banner">
                      <span className="selected-visit-pill">
                        <Star size={11} fill="currentColor" />
                        <span>Selected Visit from Chronicle</span>
                      </span>
                    </div>
                  )}

                  {/* Main Summary: Exactly matches Chronicle Meal Cards */}
                  <div className="meals-mobile-card-row">
                    {/* Left Media Column (140px Thumbnail + Cost badge directly underneath) */}
                    <div className="meals-mobile-card-left-col">
                      <div className="meals-mobile-card-media-wrap">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={restaurant.name}
                            className="meals-mobile-card-img"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="meals-mobile-card-placeholder"
                          style={{ display: photoUrl ? 'none' : 'flex' }}
                        >
                          <Utensils size={24} className="placeholder-icon" />
                        </div>

                        {/* Rating Overlay on Picture at bottom center */}
                        {ratingText && (
                          <span
                            className="meals-mobile-card-rating-overlay"
                            style={{
                              backgroundColor: ratingStyle.bg,
                              color: ratingStyle.text,
                              borderColor: ratingStyle.border,
                            }}
                          >
                            <Star size={9} fill="currentColor" />
                            <span>{ratingText}</span>
                          </span>
                        )}
                      </div>

                      {/* Cost Underneath Picture */}
                      {meal.valueGBP !== null && (
                        <span className="visit-spend-badge-under-media">
                          £{meal.valueGBP.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Right Content Area */}
                    <div className="meals-mobile-card-content">
                      {/* Restaurant Name as Main Heading */}
                      <h3 className="meals-mobile-card-restaurant-heading" title={restaurant.name}>
                        {restaurant.name}
                      </h3>

                      {/* Dish Title as Subheading */}
                      <p className="meals-mobile-card-dish-sub" title={mealTitle}>
                        {mealTitle}
                      </p>

                      {/* Date Row (No cost collision, date does not wrap) */}
                      <div className="meals-mobile-card-meta-row">
                        {meal.formattedDate && (
                          <span className="meals-mobile-date">
                            <Calendar size={11} className="meta-icon" />
                            <span>{meal.formattedDate}</span>
                          </span>
                        )}
                        {meal.arsenal && (
                          <span className="visit-arsenal-tag" title="Arsenal Matchday Meal">
                            <Shield size={11} />
                            <span>Arsenal</span>
                          </span>
                        )}
                      </div>

                      {/* Stacked Location Chips (Full Width - No Truncation) */}
                      {(cityName || countryName) && (
                        <div className="meals-mobile-chips-col">
                          {cityName && (
                            <span className="meals-mobile-chip city" title={`City: ${cityName}`}>
                              <MapPin size={10} className="chip-icon" />
                              <span className="chip-text">{cityName}</span>
                            </span>
                          )}
                          {countryName && (
                            <span className="meals-mobile-chip country" title={`Country: ${countryName}`}>
                              <Globe size={10} className="chip-icon" />
                              <span className="chip-text">{countryName}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bottom Action Row: Cuisine on Left, More Details on Bottom Right */}
                      <div className="meals-mobile-card-bottom-row">
                        {cuisine ? (
                          <span className="meals-mobile-chip cuisine" title={`Cuisine: ${cuisine}`}>
                            <Tag size={10} className="chip-icon" />
                            <span className="chip-text">{cuisine}</span>
                          </span>
                        ) : <span />}

                        {/* Dropdown Affordance at Bottom Right */}
                        <button
                          type="button"
                          className="visit-more-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandMeal(meal.id);
                          }}
                          aria-expanded={isExpanded}
                          title={isExpanded ? 'Hide details' : 'View more details'}
                        >
                          <span>{isExpanded ? 'Hide Details' : 'More Details'}</span>
                          <ChevronDown
                            size={14}
                            className={`more-details-chevron ${isExpanded ? 'open' : ''}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED ACCORDION DETAILS */}
                  {isExpanded && (
                    <div
                      className="visit-expanded-details"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* 1. Review Quote */}
                      {meal.comment && (
                        <div className="expanded-section expanded-review">
                          <div className="expanded-review-box">
                            <Quote size={20} className="expanded-quote-icon" />
                            <blockquote className="expanded-quote-content">
                              {meal.comment}
                            </blockquote>
                          </div>
                        </div>
                      )}

                      {/* 2. Metadata Tags Row */}
                      <div className="expanded-meta-badges-row">
                        {meal.valueGBP !== null && (
                          <div className="expanded-badge value-badge">
                            <span>£{meal.valueGBP.toFixed(2)} GBP</span>
                          </div>
                        )}
                        <div className={`expanded-badge ${meal.isBusiness ? 'business' : 'leisure'}`}>
                          {meal.isBusiness && <Briefcase size={12} />}
                          <span>{meal.isBusiness ? 'Business Dining' : 'Leisure Dining'}</span>
                        </div>
                        {meal.sentiment && (
                          <div className="expanded-badge sentiment-badge">
                            <span>Sentiment: {meal.sentiment}</span>
                            {meal.sentimentCategory && (
                              <span className="sent-cat">({meal.sentimentCategory})</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 3. Arsenal Matchday Callout */}
                      {meal.arsenal && (
                        <div className="expanded-arsenal-box">
                          <Shield size={18} className="arsenal-shield-icon" />
                          <div className="arsenal-box-body">
                            <div className="arsenal-box-title">
                              Arsenal Matchday — vs {meal.arsenal.opponent || 'Opponent'}
                            </div>
                            {(meal.arsenal.arsenalScore !== null || meal.arsenal.opponentScore !== null) && (
                              <div className="arsenal-box-score">
                                Final Score: Arsenal {meal.arsenal.arsenalScore ?? '?'} - {meal.arsenal.opponentScore ?? '?'} {meal.arsenal.opponent || ''}
                              </div>
                            )}
                            {meal.arsenal.comment && (
                              <p className="arsenal-box-comment">&ldquo;{meal.arsenal.comment}&rdquo;</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 4. Dining Companions */}
                      {meal.companions && meal.companions.length > 0 && (
                        <div className="expanded-section companions-sub">
                          <div className="expanded-sub-title">
                            <Users size={14} />
                            <span>Dining Companions ({meal.companions.length})</span>
                          </div>
                          <div className="expanded-companions-chips">
                            {meal.companions.map((comp) => (
                              <span key={comp.peopleId} className="expanded-companion-chip">
                                {comp.publicName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. Courses & Dishes Details */}
                      {meal.mains && meal.mains.length > 0 && (
                        <div className="expanded-section dishes-sub">
                          <div className="expanded-sub-title">
                            <Utensils size={14} />
                            <span>Courses Recorded ({meal.mains.length})</span>
                          </div>
                          <div className="expanded-dishes-grid">
                            {meal.mains.map((main) => {
                              const dishRatingStyle = getRatingBadgeStyle(main.rating);
                              return (
                                <div key={main.id} className="expanded-dish-card">
                                  <div className="expanded-dish-header">
                                    <span className="expanded-dish-name">
                                      {main.food?.name || 'Unnamed Dish'}
                                    </span>
                                    {main.rating && (
                                      <span
                                        className="expanded-dish-rating"
                                        style={{
                                          backgroundColor: dishRatingStyle.bg,
                                          color: dishRatingStyle.text,
                                          borderColor: dishRatingStyle.border,
                                        }}
                                      >
                                        <Star size={10} fill="currentColor" />
                                        <span>{formatRatingLabel(main.rating)}</span>
                                      </span>
                                    )}
                                  </div>
                                  {main.comment && (
                                    <p className="expanded-dish-comment">&ldquo;{main.comment}&rdquo;</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 6. Photographs Gallery for this Visit */}
                      {meal.photos && meal.photos.length > 0 && (
                        <div className="expanded-section photos-sub">
                          <div className="expanded-sub-title">
                            <Camera size={14} />
                            <span>Photos from this visit ({meal.photos.length})</span>
                          </div>
                          <div className="expanded-photos-grid">
                            {meal.photos.map((photo) => (
                              <figure key={photo.id} className="expanded-photo-figure">
                                <a
                                  href={photo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View full image"
                                >
                                  <img
                                    src={photo.url}
                                    alt={photo.comment || `${restaurant.name} food photo`}
                                    className="expanded-photo-img"
                                    loading="lazy"
                                  />
                                </a>
                                {photo.comment && (
                                  <figcaption className="expanded-photo-caption">
                                    {photo.comment}
                                  </figcaption>
                                )}
                              </figure>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </article>
    </div>
  );
}
