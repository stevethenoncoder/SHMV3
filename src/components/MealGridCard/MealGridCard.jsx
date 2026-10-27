import React from 'react';
import { Star, MapPin, Calendar, Utensils, Camera, PoundSterling, Shield } from 'lucide-react';
import './MealGridCard.css';

/**
 * Visual styling helper for qualitative meal ratings.
 */
function getRatingBadgeStyle(rating) {
  const r = (rating || '').toLowerCase();
  if (r.includes('exceptional') || r.includes('the dogs')) {
    return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' }; // Amber/Gold
  }
  if (r.includes('very good') || r.includes('superb')) {
    return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' }; // Emerald
  }
  if (r.includes('fine') || r.includes('good')) {
    return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }; // Blue
  }
  if (r.includes("wouldn't recommend") || r.includes('ok')) {
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }; // Slate
  }
  if (r.includes('bad') || r.includes('never again') || r.includes('worst')) {
    return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }; // Crimson
  }
  return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
}

export default function MealGridCard({ meal, onSelectMeal }) {
  const hasPhotos = meal.photos && meal.photos.length > 0;
  const primaryPhoto = hasPhotos ? meal.photos[0] : null;
  const primaryMain = meal.mains && meal.mains.length > 0 ? meal.mains[0] : null;
  const ratingStyle = getRatingBadgeStyle(meal.rating);

  const restaurantName = meal.restaurant?.name || 'Restaurant Record Missing';
  const locationText = [
    meal.restaurant?.city?.name,
    meal.restaurant?.city?.country?.name,
  ]
    .filter(Boolean)
    .join(', ');

  const handleCardClick = () => {
    if (onSelectMeal) onSelectMeal(meal.id);
  };

  return (
    <article className="meal-card" onClick={handleCardClick} tabIndex={0}>
      {/* 1. Media Container: Photo vs. Adaptive Typographic Header */}
      {hasPhotos ? (
        <div className="meal-card-media">
          <img
            src={primaryPhoto.url}
            alt={`${restaurantName} meal photo`}
            className="meal-card-image"
            loading="lazy"
            onError={(e) => {
              // Gracefully hide broken image and switch to fallback
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.classList.add('media-failed');
            }}
          />
          {meal.photos.length > 1 && (
            <div className="meal-card-photo-count" title={`${meal.photos.length} photos available`}>
              <Camera size={13} />
              <span>{meal.photos.length}</span>
            </div>
          )}
          {meal.valueGBP !== null && (
            <div className="meal-card-spend-badge">
              £{meal.valueGBP.toFixed(0)}
            </div>
          )}
        </div>
      ) : (
        <div className="meal-card-typographic-header">
          <div className="typographic-header-left">
            <span className="typographic-cuisine-pill">
              {meal.restaurant?.type?.name || 'Dining'}
            </span>
            {meal.valueGBP !== null && (
              <span className="typographic-value">£{meal.valueGBP.toFixed(0)}</span>
            )}
          </div>
          <span className="typographic-year-marker">{meal.year || ''}</span>
        </div>
      )}

      {/* 2. Card Content Body */}
      <div className="meal-card-body">
        {/* Top Header: Restaurant & Rating Badge */}
        <div className="meal-card-header-row">
          <h3 className="meal-card-title" title={restaurantName}>
            {restaurantName}
          </h3>
          {meal.rating && meal.rating !== 'Unrated' && (
            <span
              className="meal-card-rating-badge"
              style={{
                backgroundColor: ratingStyle.bg,
                color: ratingStyle.text,
                borderColor: ratingStyle.border,
              }}
            >
              <Star size={11} fill="currentColor" />
              <span>{meal.rating}</span>
            </span>
          )}
        </div>

        {/* Location Subtitle */}
        {locationText && (
          <div className="meal-card-location">
            <MapPin size={13} className="location-pin-icon" />
            <span>{locationText}</span>
          </div>
        )}

        {/* Primary Main Dish Tag */}
        {primaryMain && primaryMain.food && (
          <div className="meal-card-dish-tag">
            <Utensils size={13} className="dish-icon" />
            <span className="dish-name">{primaryMain.food.name}</span>
            {primaryMain.rating && (
              <span className="dish-rating-sub">({primaryMain.rating})</span>
            )}
          </div>
        )}

        {/* Comment Excerpt */}
        {meal.comment && (
          <p className="meal-card-comment">
            &ldquo;{meal.comment}&rdquo;
          </p>
        )}

        {/* Card Footer: Date & Contextual Tags */}
        <div className="meal-card-footer">
          <div className="meal-card-date">
            <Calendar size={13} />
            <span>{meal.formattedDate}</span>
          </div>

          <div className="meal-card-badges-right">
            {meal.arsenal && (
              <span
                className="meal-card-afc-pill"
                title={`Arsenal Matchday: vs ${meal.arsenal.opponent || 'Match'}`}
              >
                <Shield size={11} />
                <span>AFC</span>
              </span>
            )}
            {meal.isBusiness && (
              <span className="meal-card-biz-pill" title="Business Dining">
                Biz
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
