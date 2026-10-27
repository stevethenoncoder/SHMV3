import React from 'react';
import { X } from 'lucide-react';
import './MealsActiveFilterChips.css';

export default function MealsActiveFilterChips({
  filterState,
  onRemoveFilter,
  onClearFilters,
}) {
  const chips = [];

  // Search
  if (filterState.search && filterState.search.trim()) {
    chips.push({
      id: 'search',
      label: `"${filterState.search}"`,
      onRemove: () => onRemoveFilter('search', ''),
    });
  }

  // Decades
  (filterState.decades || []).forEach((decade) => {
    chips.push({
      id: `decade-${decade}`,
      label: `Decade: ${decade}`,
      onRemove: () =>
        onRemoveFilter(
          'decades',
          filterState.decades.filter((x) => x !== decade)
        ),
    });
  });

  // Ratings
  (filterState.ratings || []).forEach((rating) => {
    chips.push({
      id: `rating-${rating}`,
      label: `Rating: ${rating}`,
      onRemove: () =>
        onRemoveFilter(
          'ratings',
          filterState.ratings.filter((x) => x !== rating)
        ),
    });
  });

  // Countries
  (filterState.countries || []).forEach((country) => {
    chips.push({
      id: `country-${country}`,
      label: `Country: ${country}`,
      onRemove: () =>
        onRemoveFilter(
          'countries',
          filterState.countries.filter((x) => x !== country)
        ),
    });
  });

  // Cities
  (filterState.cities || []).forEach((city) => {
    chips.push({
      id: `city-${city}`,
      label: `City: ${city}`,
      onRemove: () =>
        onRemoveFilter(
          'cities',
          filterState.cities.filter((x) => x !== city)
        ),
    });
  });

  // Cuisines
  (filterState.cuisines || []).forEach((cuisine) => {
    chips.push({
      id: `cuisine-${cuisine}`,
      label: `Cuisine: ${cuisine}`,
      onRemove: () =>
        onRemoveFilter(
          'cuisines',
          filterState.cuisines.filter((x) => x !== cuisine)
        ),
    });
  });

  // Ingredients
  (filterState.ingredients || []).forEach((ingredient) => {
    chips.push({
      id: `ingredient-${ingredient}`,
      label: `Ingredient: ${ingredient}`,
      onRemove: () =>
        onRemoveFilter(
          'ingredients',
          filterState.ingredients.filter((x) => x !== ingredient)
        ),
    });
  });

  // Food Types / Styles
  (filterState.foodTypes || []).forEach((style) => {
    chips.push({
      id: `foodType-${style}`,
      label: `Style: ${style}`,
      onRemove: () =>
        onRemoveFilter(
          'foodTypes',
          filterState.foodTypes.filter((x) => x !== style)
        ),
    });
  });

  // People / Dining Companions
  (filterState.people || []).forEach((person) => {
    chips.push({
      id: `people-${person}`,
      label: person,
      onRemove: () =>
        onRemoveFilter(
          'people',
          filterState.people.filter((x) => x !== person)
        ),
    });
  });

  // Toggles
  if (filterState.hasPhoto) {
    chips.push({
      id: 'hasPhoto',
      label: 'With Photos',
      onRemove: () => onRemoveFilter('hasPhoto', false),
    });
  }
  if (filterState.isArsenalMatch) {
    chips.push({
      id: 'isArsenalMatch',
      label: 'Arsenal Matchday',
      onRemove: () => onRemoveFilter('isArsenalMatch', false),
    });
  }
  if (filterState.isBusiness) {
    chips.push({
      id: 'isBusiness',
      label: 'Business Dining',
      onRemove: () => onRemoveFilter('isBusiness', false),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="meals-active-chips-bar" aria-label="Active filters">
      <div className="chips-list">
        {chips.map((chip) => (
          <span key={chip.id} className="active-chip">
            <span className="chip-text">{chip.label}</span>
            <button
              type="button"
              className="chip-remove-btn"
              onClick={chip.onRemove}
              title={`Remove ${chip.label}`}
              aria-label={`Remove ${chip.label}`}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        className="chips-clear-all-btn"
        onClick={onClearFilters}
        title="Clear all filters"
      >
        Clear all
      </button>
    </div>
  );
}
