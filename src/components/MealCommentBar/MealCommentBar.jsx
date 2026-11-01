import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Quote, RefreshCw, ArrowLeft } from 'lucide-react';
import './MealCommentBar.css';

/**
 * Top bar displayed directly underneath the main header.
 * Displays an optional Return button when navigated to Chronicle with pre-selection,
 * and a random personal dining comment formatted as:
 * "Comment (Restaurant, Year)"
 * Clickable to open that specific meal detail.
 * Refreshes on every user action across the site.
 */
export default function MealCommentBar({
  meals = [],
  actionTrigger = 0,
  onSelectMeal,
  returnAction = null,
}) {
  // Pool of all meals that have a non-empty comment
  const mealsWithComments = useMemo(() => {
    if (!Array.isArray(meals)) return [];
    return meals.filter(
      (m) => m && typeof m.comment === 'string' && m.comment.trim().length > 0
    );
  }, [meals]);

  const [currentMeal, setCurrentMeal] = useState(null);
  const [manualRefresh, setManualRefresh] = useState(0);

  const pickRandomMeal = useCallback(() => {
    if (mealsWithComments.length === 0) {
      setCurrentMeal(null);
      return;
    }
    // Pick a random index, ensuring we don't pick the exact same meal twice in a row if multiple exist
    const len = mealsWithComments.length;
    let nextIndex = Math.floor(Math.random() * len);
    if (len > 1 && currentMeal && mealsWithComments[nextIndex]?.id === currentMeal.id) {
      nextIndex = (nextIndex + 1) % len;
    }
    setCurrentMeal(mealsWithComments[nextIndex]);
  }, [mealsWithComments, currentMeal]);

  // Pick a fresh random meal on initial load and whenever any action occurs
  useEffect(() => {
    if (mealsWithComments.length > 0) {
      pickRandomMeal();
    }
  }, [actionTrigger, manualRefresh, mealsWithComments.length]);

  if (!currentMeal && !returnAction) {
    return null;
  }

  const restaurantName = currentMeal?.restaurant?.name || 'Unknown Venue';
  const year = currentMeal?.year || (currentMeal?.date ? currentMeal.date.slice(0, 4) : '');
  const attribution = year ? `(${restaurantName}, ${year})` : `(${restaurantName})`;

  const rootClasses = [
    'meal-comment-bar-root',
    returnAction ? 'has-return-action' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const containerClasses = [
    'meal-comment-bar-container',
    returnAction ? 'has-return-action' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClasses} role="complementary" aria-label="Random dining memory">
      <div className={containerClasses}>
        {returnAction && (
          <button
            type="button"
            className="comment-bar-return-btn"
            onClick={returnAction.onReturn}
            title={returnAction.label}
            aria-label={returnAction.label}
          >
            <ArrowLeft size={14} className="return-btn-icon" aria-hidden="true" />
            <span className="return-btn-text">{returnAction.label}</span>
          </button>
        )}

        {currentMeal && (
          <button
            type="button"
            className="meal-comment-clickable"
            onClick={() => onSelectMeal && onSelectMeal(currentMeal.id)}
            title={`View meal from ${currentMeal.formattedDate || 'archive'} at ${restaurantName}`}
          >
            <Quote size={15} className="comment-quote-icon" aria-hidden="true" />
            <span className="comment-quote-text">
              “{currentMeal.comment.trim()}”
            </span>
            <span className="comment-attribution">
              {attribution}
            </span>
          </button>
        )}

        {currentMeal && (
          <button
            type="button"
            className="comment-refresh-btn"
            onClick={(e) => {
              e.stopPropagation();
              setManualRefresh((prev) => prev + 1);
            }}
            title="Show another random memory"
            aria-label="Show another random memory"
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
