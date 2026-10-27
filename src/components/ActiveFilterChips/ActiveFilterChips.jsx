import React from 'react';
import { X } from 'lucide-react';
import { getStatusStyle } from '../../utils/statusColors.js';
import './ActiveFilterChips.css';

export default function ActiveFilterChips({
  filterState,
  onRemoveFilter,
  onClearFilters,
  locationLabelPlural = 'Locations',
}) {
  const chips = [];

  if (filterState.search) {
    chips.push({
      key: 'search',
      label: `"${filterState.search}"`,
      onRemove: () => onRemoveFilter('search', ''),
    });
  }

  if (filterState.favouritesOnly) {
    chips.push({
      key: 'favouritesOnly',
      label: 'Favourites Only',
      onRemove: () => onRemoveFilter('favouritesOnly', false),
    });
  }

  if (filterState.minRating) {
    chips.push({
      key: 'minRating',
      label: `Rating: ${filterState.minRating}.0+`,
      onRemove: () => onRemoveFilter('minRating', null),
    });
  }

  if (filterState.startDate || filterState.endDate) {
    let dateLabel = 'Date: ';
    if (filterState.startDate && filterState.endDate) {
      dateLabel += `${filterState.startDate} to ${filterState.endDate}`;
    } else if (filterState.startDate) {
      dateLabel += `from ${filterState.startDate}`;
    } else {
      dateLabel += `until ${filterState.endDate}`;
    }

    chips.push({
      key: 'dateRange',
      label: dateLabel,
      onRemove: () => {
        onRemoveFilter('startDate', null);
        onRemoveFilter('endDate', null);
      },
    });
  }

  if (filterState.statuses && filterState.statuses.length > 0) {
    if (filterState.statuses.length === 1) {
      const displayStatus = getStatusStyle(filterState.statuses[0]).label;
      chips.push({
        key: 'status-0',
        label: `Status: ${displayStatus}`,
        onRemove: () => onRemoveFilter('statuses', []),
      });
    } else {
      chips.push({
        key: 'statuses-all',
        label: `Status: ${filterState.statuses.length} selected`,
        onRemove: () => onRemoveFilter('statuses', []),
      });
    }
  }

  if (filterState.locations && filterState.locations.length > 0) {
    if (filterState.locations.length === 1) {
      chips.push({
        key: 'location-0',
        label: `${filterState.locations[0]}`,
        onRemove: () => onRemoveFilter('locations', []),
      });
    } else {
      chips.push({
        key: 'locations-all',
        label: `${locationLabelPlural}: ${filterState.locations.length} selected`,
        onRemove: () => onRemoveFilter('locations', []),
      });
    }
  }

  if (filterState.categories && filterState.categories.length > 0) {
    if (filterState.categories.length === 1) {
      chips.push({
        key: 'category-0',
        label: `${filterState.categories[0]}`,
        onRemove: () => onRemoveFilter('categories', []),
      });
    } else {
      chips.push({
        key: 'categories-all',
        label: `Categories: ${filterState.categories.length} selected`,
        onRemove: () => onRemoveFilter('categories', []),
      });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="active-filter-chips">
      {chips.map((chip) => (
        <span key={chip.key} className="active-chip">
          <span>{chip.label}</span>
          <button
            type="button"
            className="chip-remove-btn"
            onClick={chip.onRemove}
            aria-label={`Remove filter ${chip.label}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}

      {chips.length > 1 && (
        <button type="button" className="clear-chips-link" onClick={onClearFilters}>
          Clear all
        </button>
      )}
    </div>
  );
}
