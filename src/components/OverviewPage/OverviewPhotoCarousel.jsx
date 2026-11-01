import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Camera, ArrowRight, MapPin, Star } from 'lucide-react';
import { formatRatingLabel } from '../../utils/mealsFilter.js';
import './OverviewPage.css';

export default function OverviewPhotoCarousel({
  meals = [],
  onNavigateToMealDetail,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Randomly select 20 meals that have actual photos
  const photoMeals = useMemo(() => {
    if (!meals || meals.length === 0) return [];
    const eligible = meals.filter(
      (m) => m.photos && m.photos.length > 0 && m.photos[0]?.url
    );
    if (eligible.length === 0) return [];

    // Fisher-Yates shuffle
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 20);
  }, [meals]);

  // Auto-advance every 4.5 seconds (paused on hover)
  useEffect(() => {
    if (photoMeals.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photoMeals.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [photoMeals.length, isHovered]);

  const handlePrev = useCallback(
    (e) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + photoMeals.length) % photoMeals.length);
    },
    [photoMeals.length]
  );

  const handleNext = useCallback(
    (e) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % photoMeals.length);
    },
    [photoMeals.length]
  );

  if (photoMeals.length === 0) {
    return null;
  }

  const currentMeal = photoMeals[currentIndex] || photoMeals[0];
  const photoUrl = currentMeal?.photos?.[0]?.url;
  const restaurantName = currentMeal?.restaurant?.name || 'Restaurant';
  const visitDate = currentMeal?.formattedDate || currentMeal?.date || '';
  const locationText = [
    currentMeal?.restaurant?.city?.name,
    currentMeal?.restaurant?.city?.country?.name,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      className="overview-photo-carousel-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onNavigateToMealDetail && onNavigateToMealDetail(currentMeal.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigateToMealDetail && onNavigateToMealDetail(currentMeal.id);
        }
      }}
      title={`View meal at ${restaurantName} (${visitDate})`}
      aria-label={`Photo carousel: meal at ${restaurantName}, ${visitDate}`}
    >
      {/* Background Image Container with Crossfade */}
      <div className="carousel-image-container">
        {photoUrl && (
          <img
            key={photoUrl}
            src={photoUrl}
            alt={`Meal at ${restaurantName}`}
            className="carousel-image"
            loading="lazy"
            onError={(e) => {
              // Fallback gracefully if image fails
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Top Floating Badge & Navigation Controls */}
      <div className="carousel-top-bar" onClick={(e) => e.stopPropagation()}>
        <div className="carousel-tag-badge">
          <Camera size={12} className="tag-icon" />
          <span>Archive Memory</span>
        </div>

        <div className="carousel-controls">
          <button
            type="button"
            className="carousel-nav-btn prev"
            onClick={handlePrev}
            aria-label="Previous meal photo"
            title="Previous meal photo"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="carousel-counter-pill">
            {currentIndex + 1} / {photoMeals.length}
          </span>

          <button
            type="button"
            className="carousel-nav-btn next"
            onClick={handleNext}
            aria-label="Next meal photo"
            title="Next meal photo"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Bottom Gradient Overlay: Restaurant Name & Date */}
      <div className="carousel-overlay">
        <div className="carousel-overlay-content">
          <div className="carousel-title-row">
            <h3 className="carousel-restaurant-name">{restaurantName}</h3>
            {currentMeal?.rating && (
              <span className="carousel-rating-pill">
                <Star size={10} fill="currentColor" />
                <span>{formatRatingLabel(currentMeal.rating)}</span>
              </span>
            )}
          </div>

          <div className="carousel-meta-row">
            {visitDate && (
              <span className="carousel-meta-item">
                <Calendar size={12} className="meta-icon" />
                <span>{visitDate}</span>
              </span>
            )}

            {locationText && (
              <>
                <span className="meta-dot">•</span>
                <span className="carousel-meta-item">
                  <MapPin size={12} className="meta-icon" />
                  <span>{locationText}</span>
                </span>
              </>
            )}

            {currentMeal?.restaurant?.type?.name && (
              <>
                <span className="meta-dot">•</span>
                <span className="carousel-cuisine-tag">
                  {currentMeal.restaurant.type.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Prompt */}
        <div className="carousel-action-hint">
          <span>View meal</span>
          <ArrowRight size={13} className="carousel-action-arrow" />
        </div>
      </div>

      {/* Bottom Slide Progress Indicator Track */}
      <div className="carousel-progress-track">
        <div
          className="carousel-progress-fill"
          style={{ width: `${((currentIndex + 1) / photoMeals.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
