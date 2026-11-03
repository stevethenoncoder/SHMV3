import React from 'react';
import { Star, MapPin, Tag, Calendar, Utensils } from 'lucide-react';
import { formatRatingLabel } from '../../utils/restaurantsFilter.js';
import './MealsMobileCard.css';

export default function MealsMobileCard({ meal, onSelectMeal, onShowOnMap }) {
  if (!meal) return null;

  // Meal primary name: first main course or fallback
  const firstMain = meal.mains?.[0]?.food?.name;
  const extraMainsCount = (meal.mains?.length || 0) - 1;
  const mealTitle = firstMain
    ? `${firstMain}${extraMainsCount > 0 ? ` +${extraMainsCount}` : ''}`
    : `Meal at ${meal.restaurant?.name || 'Restaurant'}`;

  const restaurantName = meal.restaurant?.name || 'Unknown Restaurant';
  const cityName = meal.restaurant?.city?.name;
  const countryName = meal.restaurant?.city?.country?.name;
  const locationText = [cityName, countryName].filter(Boolean).join(', ') || cityName || countryName || '—';
  const cuisine = meal.restaurant?.type?.name || null;
  const ratingText = meal.rating && meal.rating !== 'Unrated' ? formatRatingLabel(meal.rating) : null;

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
      aria-label={`View details for ${mealTitle}`}
    >
      {/* Left Media Thumbnail */}
      <div className="meals-mobile-card-media-wrap">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={mealTitle}
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
          <Utensils size={20} className="placeholder-icon" />
        </div>
      </div>

      {/* Right Content Area */}
      <div className="meals-mobile-card-content">
        {/* Title */}
        <h3 className="meals-mobile-card-title" title={mealTitle}>
          {mealTitle}
        </h3>

        {/* Restaurant Name */}
        <p className="meals-mobile-card-restaurant" title={restaurantName}>
          {restaurantName}
        </p>

        {/* Rating & Date Row */}
        <div className="meals-mobile-card-meta-row">
          {ratingText && (
            <span className="meals-mobile-rating">
              <Star size={12} fill="#f59e0b" color="#f59e0b" />
              <span>{ratingText}</span>
            </span>
          )}
          {meal.formattedDate && (
            <span className="meals-mobile-date">
              <Calendar size={11} className="meta-icon" />
              <span>{meal.formattedDate}</span>
            </span>
          )}
        </div>

        {/* Chips Row: Location, Cuisine, and Map Pin */}
        <div className="meals-mobile-card-bottom-row">
          <div className="meals-mobile-chips">
            {locationText && (
              <span className="meals-mobile-chip location" title={locationText}>
                <MapPin size={10} className="chip-icon" />
                <span className="chip-text">{locationText}</span>
              </span>
            )}
            {cuisine && (
              <span className="meals-mobile-chip cuisine" title={cuisine}>
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
