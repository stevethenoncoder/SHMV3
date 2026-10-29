import React from 'react';
import { Star, MapPin, Calendar, Utensils, Camera, Shield } from 'lucide-react';
import { formatRatingLabel, getDecade } from '../../utils/mealsFilter.js';
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

export default function MealGridCard({ meal, onSelectMeal, onAddFilter }) {
  const hasPhotos = Boolean(meal.photos && meal.photos.length > 0);
  const primaryPhoto = hasPhotos ? meal.photos[0] : null;
  const typeIcon = meal.restaurant?.type?.typeIcon || meal.typeIcon || null;
  const displayPhotoUrl = primaryPhoto ? primaryPhoto.url : typeIcon;
  const isTypeFallback = !primaryPhoto && Boolean(typeIcon);

  const primaryMain = meal.mains && meal.mains.length > 0 ? meal.mains[0] : null;
  const ratingStyle = getRatingBadgeStyle(meal.rating);

  const restaurantName = meal.restaurant?.name || 'Restaurant Record Missing';
  const cityName = meal.restaurant?.city?.name || null;
  const countryName = meal.restaurant?.city?.country?.name || null;
  const cuisineName = meal.restaurant?.type?.name || null;

  const handleMediaClick = () => {
    if (onSelectMeal) onSelectMeal(meal.id);
  };

  const handleTitleClick = (e) => {
    e.stopPropagation();
    if (onSelectMeal) onSelectMeal(meal.id);
  };

  return (
    <article className="meal-card">
      {/* 1. Media Container: Real photo or generic type icon fallback (Clicking navigates to Meal Detail) */}
      {displayPhotoUrl ? (
        <div
          className={`meal-card-media clickable-media ${isTypeFallback ? 'type-fallback-container' : ''}`}
          onClick={handleMediaClick}
          tabIndex={0}
          role="button"
          aria-label={`View details for meal at ${restaurantName}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleMediaClick();
            }
          }}
        >
          <img
            src={displayPhotoUrl}
            alt={isTypeFallback ? `${cuisineName || restaurantName} cuisine icon` : `${restaurantName} meal photo`}
            className={`meal-card-image ${isTypeFallback ? 'type-fallback-image' : ''}`}
            loading="lazy"
            onError={(e) => {
              if (primaryPhoto && typeIcon && e.currentTarget.src !== typeIcon) {
                e.currentTarget.src = typeIcon;
              } else {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement.classList.add('media-failed');
              }
            }}
          />
          {cuisineName && (
            <button
              type="button"
              className="meal-card-cuisine-badge"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddFilter) onAddFilter('cuisines', cuisineName);
              }}
              title={`Filter by cuisine: ${cuisineName}`}
            >
              {cuisineName}
            </button>
          )}
          {hasPhotos && meal.photos.length > 1 && (
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
        <div
          className="meal-card-typographic-header clickable-media"
          onClick={handleMediaClick}
          tabIndex={0}
          role="button"
          aria-label={`View details for meal at ${restaurantName}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleMediaClick();
            }
          }}
        >
          <div className="typographic-header-left">
            {cuisineName && (
              <button
                type="button"
                className="typographic-cuisine-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddFilter) onAddFilter('cuisines', cuisineName);
                }}
                title={`Filter by cuisine: ${cuisineName}`}
              >
                {cuisineName}
              </button>
            )}
            {meal.valueGBP !== null && (
              <span className="typographic-value">£{meal.valueGBP.toFixed(0)}</span>
            )}
          </div>
          {meal.year && (
            <button
              type="button"
              className="typographic-year-marker"
              onClick={(e) => {
                e.stopPropagation();
                const decade = getDecade(meal.year);
                if (decade && onAddFilter) onAddFilter('decades', decade);
              }}
              title={`Filter by decade: ${getDecade(meal.year) || meal.year}`}
            >
              {meal.year}
            </button>
          )}
        </div>
      )}

      {/* 2. Card Content Body */}
      <div className="meal-card-body">
        {/* Top Header: Restaurant (Click navigates to Meal Detail) & Rating Badge (Click filters by Rating) */}
        <div className="meal-card-header-row">
          <h3
            className="meal-card-title clickable-title"
            title={`View meal details for ${restaurantName}`}
            onClick={handleTitleClick}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTitleClick(e);
              }
            }}
          >
            {restaurantName}
          </h3>
          {meal.rating && meal.rating !== 'Unrated' && (
            <button
              type="button"
              className="meal-card-rating-badge"
              style={{
                backgroundColor: ratingStyle.bg,
                color: ratingStyle.text,
                borderColor: ratingStyle.border,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onAddFilter) onAddFilter('ratings', meal.rating);
              }}
              title={`Filter by rating: ${formatRatingLabel(meal.rating)}`}
            >
              <Star size={11} fill="currentColor" />
              <span>{formatRatingLabel(meal.rating)}</span>
            </button>
          )}
        </div>

        {/* Location Subtitle: City and Country independently add to filter */}
        {(cityName || countryName) && (
          <div className="meal-card-location">
            <MapPin size={13} className="location-pin-icon" />
            <span className="location-links">
              {cityName && (
                <button
                  type="button"
                  className="meal-card-link-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddFilter) onAddFilter('cities', cityName);
                  }}
                  title={`Filter by city: ${cityName}`}
                >
                  {cityName}
                </button>
              )}
              {cityName && countryName && <span className="location-sep">, </span>}
              {countryName && (
                <button
                  type="button"
                  className="meal-card-link-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddFilter) onAddFilter('countries', countryName);
                  }}
                  title={`Filter by country: ${countryName}`}
                >
                  {countryName}
                </button>
              )}
            </span>
          </div>
        )}

        {/* Primary Main Dish Tag: Click filters by dish name */}
        {primaryMain && primaryMain.food && (
          <div className="meal-card-dish-row">
            <button
              type="button"
              className="meal-card-dish-tag"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddFilter) onAddFilter('search', primaryMain.food.name);
              }}
              title={`Filter by dish: ${primaryMain.food.name}`}
            >
              <Utensils size={13} className="dish-icon" />
              <span className="dish-name">{primaryMain.food.name}</span>
              {primaryMain.rating && (
                <span className="dish-rating-sub">({formatRatingLabel(primaryMain.rating)})</span>
              )}
            </button>
          </div>
        )}

        {/* Comment Excerpt (Neutral, does not navigate) */}
        {meal.comment && (
          <p className="meal-card-comment">
            &ldquo;{meal.comment}&rdquo;
          </p>
        )}

        {/* Card Footer: Date & Contextual Tags */}
        <div className="meal-card-footer">
          <div
            className="meal-card-date"
            onClick={(e) => {
              const decade = getDecade(meal.year);
              if (decade && onAddFilter) {
                e.stopPropagation();
                onAddFilter('decades', decade);
              }
            }}
            title={meal.year ? `Filter by decade: ${getDecade(meal.year)}` : ''}
            style={{ cursor: meal.year ? 'pointer' : 'default' }}
          >
            <Calendar size={13} />
            <span>{meal.formattedDate}</span>
          </div>

          <div className="meal-card-badges-right">
            {meal.arsenal && (
              <button
                type="button"
                className="meal-card-afc-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddFilter) onAddFilter('isArsenalMatch', true);
                }}
                title={`Filter to Arsenal Matchday: vs ${meal.arsenal.opponent || 'Match'}`}
              >
                <Shield size={11} />
                <span>AFC</span>
              </button>
            )}
            {meal.isBusiness && (
              <button
                type="button"
                className="meal-card-biz-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddFilter) onAddFilter('isBusiness', true);
                }}
                title="Filter to Business Dining"
              >
                Biz
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
