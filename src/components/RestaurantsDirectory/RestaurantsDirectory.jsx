import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  ExternalLink,
  MapPin,
  Utensils,
  Calendar,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { formatRatingLabel } from '../../utils/restaurantsFilter.js';
import './RestaurantsDirectory.css';

/**
 * Maps rating label to a CSS class for color treatment
 */
function getRatingClass(rating) {
  if (!rating) return 'rating-neutral';
  const r = rating.toLowerCase();
  if (r.includes('dogs')) return 'rating-dogs';
  if (r.includes('exceptional')) return 'rating-exceptional';
  if (r.includes('very good')) return 'rating-very-good';
  if (r.includes('fine')) return 'rating-fine';
  if (r.includes('ok')) return 'rating-ok';
  if (r.includes('very bad')) return 'rating-very-bad';
  if (r.includes('never again')) return 'rating-never-again';
  if (r.includes('worst')) return 'rating-worst';
  return 'rating-neutral';
}

/**
 * Formats concise main dish representation
 */
function formatMainDishes(mains) {
  if (!mains || mains.length === 0) return '—';
  const first = mains[0]?.food?.name || 'Main Course';
  if (mains.length === 1) return first;
  return `${first} +${mains.length - 1}`;
}

/**
 * Formats GBP monetary value
 */
function formatValueGBP(val) {
  if (typeof val !== 'number' || isNaN(val)) return '—';
  return `£${val.toFixed(2)}`;
}

export default function RestaurantsDirectory({
  restaurants = [],
  sortOption = 'recent_desc',
  onSortChange,
  onSelectMeal,
  onSelectRestaurant,
  onClearFilters,
}) {
  // Set of currently expanded restaurant IDs (multiple can be expanded at once)
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleHeaderSort = (col) => {
    if (!onSortChange) return;
    if (col === 'restaurant') {
      onSortChange(sortOption === 'name_asc' ? 'name_desc' : 'name_asc');
    } else if (col === 'visits') {
      onSortChange(sortOption === 'visits_desc' ? 'visits_asc' : 'visits_desc');
    } else if (col === 'avgRating') {
      onSortChange(sortOption === 'rating_best' ? 'rating_worst' : 'rating_best');
    } else if (col === 'firstVisit') {
      onSortChange(sortOption === 'first_asc' ? 'first_desc' : 'first_asc');
    } else if (col === 'latestVisit') {
      onSortChange(sortOption === 'recent_desc' ? 'recent_asc' : 'recent_desc');
    }
  };

  const getSortIcon = (col) => {
    if (col === 'restaurant') {
      if (sortOption === 'name_asc') return <ArrowUp size={13} className="sort-active-icon" />;
      if (sortOption === 'name_desc') return <ArrowDown size={13} className="sort-active-icon" />;
    } else if (col === 'visits') {
      if (sortOption === 'visits_desc') return <ArrowDown size={13} className="sort-active-icon" />;
      if (sortOption === 'visits_asc') return <ArrowUp size={13} className="sort-active-icon" />;
    } else if (col === 'avgRating') {
      if (sortOption === 'rating_best') return <ArrowUp size={13} className="sort-active-icon" />;
      if (sortOption === 'rating_worst') return <ArrowDown size={13} className="sort-active-icon" />;
    } else if (col === 'firstVisit') {
      if (sortOption === 'first_asc') return <ArrowUp size={13} className="sort-active-icon" />;
      if (sortOption === 'first_desc') return <ArrowDown size={13} className="sort-active-icon" />;
    } else if (col === 'latestVisit') {
      if (sortOption === 'recent_desc') return <ArrowDown size={13} className="sort-active-icon" />;
      if (sortOption === 'recent_asc') return <ArrowUp size={13} className="sort-active-icon" />;
    }
    return <ArrowUpDown size={12} className="sort-dim-icon" />;
  };

  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="restaurants-directory-empty">
        <p>No restaurants match your current filter selections.</p>
        {onClearFilters && (
          <button type="button" className="btn-clear-table-filters" onClick={onClearFilters}>
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="restaurants-directory-wrapper">
      <div className="restaurants-table" role="table" aria-label="Restaurant Directory">
        {/* Table Header Row */}
        <div className="restaurants-table-header" role="row">
          <div className="col-cell col-twisty" role="columnheader"></div>
          <div
            className="col-cell col-restaurant sortable"
            role="columnheader"
            onClick={() => handleHeaderSort('restaurant')}
          >
            <span>Restaurant</span>
            {getSortIcon('restaurant')}
          </div>
          <div className="col-cell col-location" role="columnheader">
            <span>Location</span>
          </div>
          <div className="col-cell col-type" role="columnheader">
            <span>Type</span>
          </div>
          <div
            className="col-cell col-visits sortable"
            role="columnheader"
            onClick={() => handleHeaderSort('visits')}
          >
            <span>Meals</span>
            {getSortIcon('visits')}
          </div>
          <div
            className="col-cell col-avgrating sortable"
            role="columnheader"
            onClick={() => handleHeaderSort('avgRating')}
          >
            <span>Avg Rating</span>
            {getSortIcon('avgRating')}
          </div>
          <div
            className="col-cell col-firstvisit sortable"
            role="columnheader"
            onClick={() => handleHeaderSort('firstVisit')}
          >
            <span>First Visit</span>
            {getSortIcon('firstVisit')}
          </div>
          <div
            className="col-cell col-latestvisit sortable"
            role="columnheader"
            onClick={() => handleHeaderSort('latestVisit')}
          >
            <span>Latest Visit</span>
            {getSortIcon('latestVisit')}
          </div>
        </div>

        {/* Restaurant Rows */}
        <div className="restaurants-table-body" role="rowgroup">
          {restaurants.map((restaurant) => {
            const isExpanded = expandedIds.has(restaurant.id);
            const mealsToShow = restaurant.matchingMeals || restaurant.meals || [];
            const hasFilteredMeals =
              typeof restaurant.matchingCount === 'number' &&
              restaurant.matchingCount < restaurant.mealCount;

            const cityCountry = [restaurant.city?.name, restaurant.city?.country?.name]
              .filter(Boolean)
              .join(', ');

            return (
              <React.Fragment key={restaurant.id}>
                {/* Collapsed Restaurant Row */}
                <div
                  className={`restaurant-row ${isExpanded ? 'expanded' : ''}`}
                  role="row"
                  onClick={() => toggleExpand(restaurant.id)}
                >
                  {/* Twisty / Chevron */}
                  <div className="col-cell col-twisty">
                    <button
                      type="button"
                      className="twisty-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(restaurant.id);
                      }}
                      aria-label={isExpanded ? `Collapse ${restaurant.name}` : `Expand ${restaurant.name}`}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>

                  {/* Restaurant Name */}
                  <div className="col-cell col-restaurant">
                    <span className="restaurant-name-text">{restaurant.name}</span>
                  </div>

                  {/* Location */}
                  <div className="col-cell col-location">
                    <span className="location-text">{cityCountry || '—'}</span>
                  </div>

                  {/* Type / Cuisine */}
                  <div className="col-cell col-type">
                    <span className="type-badge">{restaurant.type?.name || '—'}</span>
                  </div>

                  {/* Meals Count */}
                  <div className="col-cell col-visits">
                    <span className="visits-headline">
                      {restaurant.mealCount} {restaurant.mealCount === 1 ? 'meal' : 'meals'}
                    </span>
                    {hasFilteredMeals && (
                      <span className="visits-matching-pill">
                        {restaurant.matchingCount} matching
                      </span>
                    )}
                  </div>

                  {/* Avg Rating */}
                  <div className="col-cell col-avgrating">
                    {restaurant.averageRatingText ? (
                      <span
                        className={`rating-pill ${getRatingClass(restaurant.averageRatingText)}`}
                      >
                        {formatRatingLabel(restaurant.averageRatingText)}
                      </span>
                    ) : (
                      <span className="rating-pill rating-neutral">Unrated</span>
                    )}
                  </div>

                  {/* First Visit */}
                  <div className="col-cell col-firstvisit">
                    <span className="date-text">
                      {restaurant.firstVisit?.year || restaurant.firstVisit?.formattedDate || '—'}
                    </span>
                  </div>

                  {/* Latest Visit */}
                  <div className="col-cell col-latestvisit">
                    <span className="date-text">
                      {restaurant.latestVisit?.year || restaurant.latestVisit?.formattedDate || '—'}
                    </span>
                  </div>
                </div>

                {/* Expanded Flat Meal History (Directly beneath Restaurant Row) */}
                {isExpanded && (
                  <div className="expanded-meal-history-container" role="rowgroup">
                    {mealsToShow.length > 0 ? (
                      <div className="meal-history-table">
                        <div className="meal-history-header" role="row">
                          <div className="col-meal-date" role="columnheader">Date</div>
                          <div className="col-meal-rating" role="columnheader">Meal Rating</div>
                          <div className="col-meal-dish" role="columnheader">Main Dish</div>
                          <div className="col-meal-value" role="columnheader">Meal Value</div>
                          <div className="col-meal-comment" role="columnheader">Comment</div>
                        </div>

                        {mealsToShow.map((meal) => (
                          <div
                            key={meal.id}
                            className="meal-history-row"
                            role="row"
                            onClick={() => onSelectMeal && onSelectMeal(meal.id)}
                          >
                            {/* Date + Link affordance */}
                            <div className="col-meal-date">
                              <a
                                href={`/meals/${meal.id}`}
                                className="meal-date-link"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onSelectMeal && onSelectMeal(meal.id);
                                }}
                              >
                                <span>{meal.formattedDate}</span>
                                <ExternalLink size={12} className="meal-link-icon" />
                              </a>
                            </div>

                            {/* Meal Rating */}
                            <div className="col-meal-rating">
                              <span className={`rating-pill-sm ${getRatingClass(meal.rating)}`}>
                                {formatRatingLabel(meal.rating) || 'Unrated'}
                              </span>
                            </div>

                            {/* Main Dish */}
                            <div className="col-meal-dish" title={meal.mains?.map((m) => m.food?.name).join(', ')}>
                              <span className="meal-dish-text">{formatMainDishes(meal.mains)}</span>
                            </div>

                            {/* Meal Value */}
                            <div className="col-meal-value">
                              <span className="meal-value-text">{formatValueGBP(meal.valueGBP)}</span>
                            </div>

                            {/* Comment */}
                            <div className="col-meal-comment" title={meal.comment || ''}>
                              <span className="meal-comment-text">{meal.comment || '—'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="meal-history-empty">
                        No meals match the current meal-level filters.
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
