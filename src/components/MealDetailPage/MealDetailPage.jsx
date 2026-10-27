import React from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Star,
  Utensils,
  Camera,
  ExternalLink,
  Shield,
  Briefcase,
  Globe,
  Quote,
} from 'lucide-react';
import './MealDetailPage.css';

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

export default function MealDetailPage({ meal, onBack }) {
  if (!meal) {
    return (
      <div className="meal-detail-container">
        <div className="detail-not-found">
          <h2>Meal Not Found</h2>
          <p>The requested dining record could not be found.</p>
          <button type="button" className="btn-back" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Chronicle
          </button>
        </div>
      </div>
    );
  }

  const ratingStyle = getRatingBadgeStyle(meal.rating);
  const restaurantName = meal.restaurant?.name || 'Restaurant Record Missing';
  const locationBreadcrumb = [
    meal.restaurant?.city?.country?.name,
    meal.restaurant?.city?.name,
    meal.restaurant?.name,
  ]
    .filter(Boolean)
    .join('  ›  ');

  return (
    <div className="meal-detail-container">
      {/* 1. Back Navigation */}
      <nav className="detail-nav-bar">
        <button type="button" className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Chronicle</span>
        </button>
      </nav>

      <article className="detail-content">
        {/* 2. Hero Header */}
        <header className="detail-header">
          {locationBreadcrumb && (
            <div className="detail-breadcrumb">
              <MapPin size={13} />
              <span>{locationBreadcrumb}</span>
            </div>
          )}

          <div className="detail-title-row">
            <h1 className="detail-restaurant-name">{restaurantName}</h1>
            {meal.rating && meal.rating !== 'Unrated' && (
              <span
                className="detail-rating-pill"
                style={{
                  backgroundColor: ratingStyle.bg,
                  color: ratingStyle.text,
                  borderColor: ratingStyle.border,
                }}
              >
                <Star size={14} fill="currentColor" />
                <span>{meal.rating}</span>
              </span>
            )}
          </div>

          {/* Metadata Row */}
          <div className="detail-meta-row">
            <div className="meta-item">
              <Calendar size={15} />
              <span>{meal.formattedDate}</span>
            </div>

            {meal.valueGBP !== null && (
              <div className="meta-item value-tag">
                <span>£{meal.valueGBP.toFixed(2)} GBP</span>
              </div>
            )}

            {meal.isBusiness ? (
              <div className="meta-item business-badge">
                <Briefcase size={13} />
                <span>Business Dining</span>
              </div>
            ) : (
              <div className="meta-item leisure-badge">
                <span>Leisure Dining</span>
              </div>
            )}

            {meal.sentiment && (
              <div className="meta-item sentiment-badge">
                <span>Sentiment: {meal.sentiment}</span>
                {meal.sentimentCategory && (
                  <span className="sentiment-cat">({meal.sentimentCategory})</span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* 3. Conditional Arsenal Matchday Callout */}
        {meal.arsenal && (
          <section className="arsenal-matchday-banner">
            <div className="arsenal-badge-icon">
              <Shield size={20} />
            </div>
            <div className="arsenal-content">
              <h3 className="arsenal-title">
                Arsenal Matchday Dining
                {meal.arsenal.opponent && ` — vs ${meal.arsenal.opponent}`}
              </h3>
              {(meal.arsenal.arsenalScore !== null || meal.arsenal.opponentScore !== null) && (
                <div className="arsenal-score">
                  Final Score: Arsenal {meal.arsenal.arsenalScore ?? '?'} -{' '}
                  {meal.arsenal.opponentScore ?? '?'} {meal.arsenal.opponent || 'Opponent'}
                </div>
              )}
              {meal.arsenal.comment && (
                <p className="arsenal-comment">&ldquo;{meal.arsenal.comment}&rdquo;</p>
              )}
            </div>
          </section>
        )}

        {/* 4. Personal Review / Comment */}
        {meal.comment && (
          <section className="detail-review-section">
            <div className="review-quote-wrapper">
              <Quote size={24} className="quote-icon" />
              <blockquote className="review-text">{meal.comment}</blockquote>
            </div>
          </section>
        )}

        {/* 5. Main Dishes Section */}
        <section className="detail-section mains-section">
          <h2 className="section-heading">
            <Utensils size={18} />
            <span>Main Courses Ordered ({meal.mains.length})</span>
          </h2>

          {meal.mains.length > 0 ? (
            <div className="mains-grid">
              {meal.mains.map((main) => {
                const dishRatingStyle = getRatingBadgeStyle(main.rating);
                return (
                  <div key={main.id} className="main-dish-card">
                    <div className="dish-card-header">
                      <h3 className="dish-card-title">
                        {main.food?.name || 'Unnamed Dish'}
                      </h3>
                      {main.rating && (
                        <span
                          className="dish-rating-badge"
                          style={{
                            backgroundColor: dishRatingStyle.bg,
                            color: dishRatingStyle.text,
                            borderColor: dishRatingStyle.border,
                          }}
                        >
                          <Star size={11} fill="currentColor" />
                          <span>{main.rating}</span>
                        </span>
                      )}
                    </div>

                    {main.comment && (
                      <p className="dish-comment">&ldquo;{main.comment}&rdquo;</p>
                    )}

                    {main.food && (
                      <div className="dish-taxonomy-pills">
                        {main.food.category && (
                          <span className="taxonomy-pill cat">
                            Category: {main.food.category}
                          </span>
                        )}
                        {main.food.ingredient?.name && (
                          <span className="taxonomy-pill ing">
                            Ingredient: {main.food.ingredient.name}
                          </span>
                        )}
                        {main.food.foodType?.name && (
                          <span className="taxonomy-pill type">
                            Style: {main.food.foodType.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-subtext">No specific main course entries recorded for this meal.</p>
          )}
        </section>

        {/* 6. Photo Gallery Section */}
        {meal.photos.length > 0 && (
          <section className="detail-section photos-section">
            <h2 className="section-heading">
              <Camera size={18} />
              <span>Photographs ({meal.photos.length})</span>
            </h2>

            <div className="detail-photos-grid">
              {meal.photos.map((photo) => (
                <figure key={photo.id} className="photo-figure">
                  <a href={photo.url} target="_blank" rel="noopener noreferrer" title="View full photo">
                    <img
                      src={photo.url}
                      alt={photo.comment || `${restaurantName} food`}
                      className="gallery-image"
                      loading="lazy"
                    />
                  </a>
                  {photo.comment && (
                    <figcaption className="photo-caption">{photo.comment}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* 7. Restaurant Venue Profile Card */}
        {meal.restaurant && (
          <section className="detail-section venue-section">
            <h2 className="section-heading">
              <MapPin size={18} />
              <span>Venue Information</span>
            </h2>

            <div className="venue-card">
              <div className="venue-main-info">
                <h3 className="venue-name">{meal.restaurant.name}</h3>
                <p className="venue-address">
                  {meal.restaurant.address || meal.restaurant.googleAddress || 'Address on file'}
                </p>

                <div className="venue-meta-pills">
                  {meal.restaurant.type?.name && (
                    <span className="venue-pill cuisine">
                      Cuisine: {meal.restaurant.type.name}
                    </span>
                  )}
                  {meal.restaurant.googleRating && (
                    <span className="venue-pill google-rating">
                      <Star size={12} fill="#f59e0b" color="#f59e0b" />
                      <span>Google {meal.restaurant.googleRating.toFixed(1)}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="venue-actions">
                {meal.restaurant.mapUrl && (
                  <a
                    href={meal.restaurant.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="venue-btn map"
                  >
                    <ExternalLink size={14} />
                    <span>View on Google Maps</span>
                  </a>
                )}
                {meal.restaurant.website && (
                  <a
                    href={meal.restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="venue-btn website"
                  >
                    <Globe size={14} />
                    <span>Official Website</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
