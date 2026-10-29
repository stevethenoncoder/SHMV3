import React from 'react';
import { Star, MapPin, Calendar, Camera, Utensils, Repeat } from 'lucide-react';
import './RestaurantGridCard.css';

/**
 * Visual styling helper for qualitative meal ratings.
 */
function getRatingBadgeStyle(rating) {
  const r = (rating || '').toLowerCase();
  if (r.includes('exceptional') || r.includes('the dogs')) {
    return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' }; // Gold/Amber
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

export default function RestaurantGridCard({ restaurant, onSelectRestaurant }) {
  const hasPhotos = restaurant.photos && restaurant.photos.length > 0;
  const primaryPhoto = restaurant.primaryPhoto;
  const ratingToDisplay = restaurant.bestRating || restaurant.latestRating;
  const ratingStyle = getRatingBadgeStyle(ratingToDisplay);

  const locationText = [
    restaurant.city?.name,
    restaurant.city?.country?.name,
  ]
    .filter(Boolean)
    .join(', ');

  const handleCardClick = () => {
    if (onSelectRestaurant) onSelectRestaurant(restaurant.id);
  };

  const visitText = restaurant.mealCount === 1 ? '1 visit' : `${restaurant.mealCount} visits`;

  return (
    <article
      className="restaurant-card"
      onClick={handleCardClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* 1. Media: Photo vs Adaptive Typographic Header */}
      {primaryPhoto ? (
        <div className="restaurant-card-media">
          <img
            src={primaryPhoto.url}
            alt={`${restaurant.name} food photograph`}
            className="restaurant-card-image"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.classList.add('media-failed');
            }}
          />
          {restaurant.photos.length > 1 && (
            <div
              className="restaurant-card-photo-count"
              title={`${restaurant.photos.length} photos from visits to this restaurant`}
            >
              <Camera size={13} />
              <span>{restaurant.photos.length}</span>
            </div>
          )}
          <div className="restaurant-card-visits-pill">{visitText}</div>
        </div>
      ) : (
        <div className="restaurant-card-typographic-header">
          <div className="typographic-header-left">
            <span className="typographic-cuisine-pill">
              {restaurant.type?.name || 'Restaurant'}
            </span>
            <span className="restaurant-typographic-visits">{visitText}</span>
          </div>
          {restaurant.yearSpan && (
            <span className="typographic-year-marker">{restaurant.yearSpan}</span>
          )}
        </div>
      )}

      {/* 2. Body Details */}
      <div className="restaurant-card-body">
        {/* Name and Rating Badge */}
        <div className="restaurant-card-header-row">
          <h3 className="restaurant-card-title" title={restaurant.name}>
            {restaurant.name}
          </h3>
          {ratingToDisplay && (
            <span
              className="restaurant-card-rating-badge"
              style={{
                backgroundColor: ratingStyle.bg,
                color: ratingStyle.text,
                borderColor: ratingStyle.border,
              }}
              title={
                restaurant.bestRating
                  ? `Best recorded meal rating: ${restaurant.bestRating}`
                  : `Rating: ${ratingToDisplay}`
              }
            >
              <Star size={11} fill="currentColor" />
              <span>{ratingToDisplay}</span>
            </span>
          )}
        </div>

        {/* Location & Cuisine Subtitle */}
        <div className="restaurant-card-meta-line">
          {locationText && (
            <span className="meta-location">
              <MapPin size={13} />
              <span>{locationText}</span>
            </span>
          )}
          {restaurant.type?.name && (
            <span className="meta-cuisine">· {restaurant.type.name}</span>
          )}
        </div>

        {/* Visit History Summary Footer */}
        <div className="restaurant-card-footer">
          <div className="footer-visit-timeline">
            <Calendar size={13} />
            <span>
              {restaurant.mealCount > 1
                ? `First: ${restaurant.firstVisit?.year} · Latest: ${restaurant.latestVisit?.formattedDate}`
                : `Visited ${restaurant.latestVisit?.formattedDate}`}
            </span>
          </div>
          {restaurant.mainDishes && restaurant.mainDishes.length > 0 && (
            <div className="footer-dish-preview" title={`Main dishes: ${restaurant.mainDishes.slice(0, 3).map(d => d.name).join(', ')}`}>
              <Utensils size={12} />
              <span className="footer-dish-name">{restaurant.mainDishes[0].name}</span>
              {restaurant.mainDishes.length > 1 && (
                <span className="footer-more-dishes">+{restaurant.mainDishes.length - 1}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
