import React from 'react';
import { Star, MapPin, Tag, Calendar, Utensils, Globe } from 'lucide-react';
import { formatRatingLabel } from '../../utils/restaurantsFilter.js';
import './MealsMobileCard.css';

/**
 * Visual styling helper for qualitative meal ratings matching canonical UI palette.
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

export default function MealsMobileCard({ meal, onSelectMeal, onShowOnMap }) {
  if (!meal) return null;

  // Meal primary name: first main course or fallback
  const firstMain = meal.mains?.[0]?.food?.name;
  const extraMainsCount = (meal.mains?.length || 0) - 1;
  const mealTitle = firstMain
    ? `${firstMain}${extraMainsCount > 0 ? ` +${extraMainsCount}` : ''}`
    : `Meal at ${meal.restaurant?.name || 'Restaurant'}`;

  const restaurantName = meal.restaurant?.name || 'Unknown Restaurant';
  const cityName = meal.restaurant?.city?.name || null;
  const countryName = meal.restaurant?.city?.country?.name || null;
  const cuisine = meal.restaurant?.type?.name || null;
  const ratingText = meal.rating && meal.rating !== 'Unrated' ? formatRatingLabel(meal.rating) : null;
  const ratingBadgeStyle = getRatingBadgeStyle(meal.rating);

  const photoUrl =
    meal.photos && meal.photos.length > 0 && meal.photos[0]?.url
      ? meal.photos[0].url
      : meal.restaurant?.typeIcon || null;

  const hasCoordinates = Boolean(meal.restaurant?.latitude && meal.restaurant?.longitude);

  return (
    <article
      className="meals-mobile-card"
      onClick={() => onSelectMeal && onSelectMeal(meal.id)}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${restaurantName} - ${mealTitle}`}
    >
      {/* Left Media Thumbnail (Enlarged 140px, with Rating overlay at bottom center) */}
      <div className="meals-mobile-card-media-wrap">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={restaurantName}
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
              backgroundColor: ratingBadgeStyle.bg,
              color: ratingBadgeStyle.text,
              borderColor: ratingBadgeStyle.border,
            }}
          >
            <Star size={9} fill="currentColor" />
            <span>{ratingText}</span>
          </span>
        )}
      </div>

      {/* Right Content Area */}
      <div className="meals-mobile-card-content">
        {/* Restaurant Name as Main Heading (wraps if necessary) */}
        <h3 className="meals-mobile-card-restaurant-heading" title={restaurantName}>
          {restaurantName}
        </h3>

        {/* Dish Title as Subheading */}
        <p className="meals-mobile-card-dish-sub" title={mealTitle}>
          {mealTitle}
        </p>

        {/* Date Row */}
        {meal.formattedDate && (
          <div className="meals-mobile-card-meta-row">
            <span className="meals-mobile-date">
              <Calendar size={11} className="meta-icon" />
              <span>{meal.formattedDate}</span>
            </span>
          </div>
        )}

        {/* Bottom Chips & Pin Row: City and Country sit underneath each other */}
        <div className="meals-mobile-card-bottom-row">
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
            {cuisine && (
              <span className="meals-mobile-chip cuisine" title={`Cuisine: ${cuisine}`}>
                <Tag size={10} className="chip-icon" />
                <span className="chip-text">{cuisine}</span>
              </span>
            )}
          </div>

          {/* Map Pin Affordance on Far Right */}
          {hasCoordinates && onShowOnMap && (
            <button
              type="button"
              className="meals-mobile-pin-btn"
              onClick={(e) => {
                e.stopPropagation();
                onShowOnMap(meal);
              }}
              title="Show on Map"
              aria-label={`Show ${restaurantName} on Map`}
            >
              <MapPin size={15} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
