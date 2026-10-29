import React from 'react';
import { X } from 'lucide-react';
import './RestaurantsActiveFilterChips.css';

export default function RestaurantsActiveFilterChips({
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

  // Visit Bands
  (filterState.visitBands || []).forEach((band) => {
    chips.push({
      id: `visitBand-${band}`,
      label: `Visits: ${band}`,
      onRemove: () =>
        onRemoveFilter(
          'visitBands',
          filterState.visitBands.filter((x) => x !== band)
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

  // Photo Available
  if (filterState.hasPhoto) {
    chips.push({
      id: 'hasPhoto',
      label: 'With Photos',
      onRemove: () => onRemoveFilter('hasPhoto', false),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="restaurants-active-chips-bar" aria-label="Active filters">
      <div className="chips-list">
        {chips.map((chip) => (
          <span key={chip.id} className="active-filter-chip">
            <span className="chip-label">{chip.label}</span>
            <button
              type="button"
              className="chip-remove-btn"
              onClick={chip.onRemove}
              aria-label={`Remove filter ${chip.label}`}
            >
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <button
        type="button"
        className="btn-clear-all-chips"
        onClick={onClearFilters}
      >
        Clear all
      </button>
    </div>
  );
}
