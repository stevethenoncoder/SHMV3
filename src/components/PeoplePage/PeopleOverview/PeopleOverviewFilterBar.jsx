import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export default function PeopleOverviewFilterBar({
  filters,
  onUpdateFilter,
  onClearFilters,
  countries = [],
  restaurantTypes = [],
}) {
  const hasActiveFilters = Boolean(
    filters.search || filters.country || filters.decade || filters.restaurantType
  );

  return (
    <div className="people-filter-bar" role="search" aria-label="People Overview Filters">
      {/* Search Input */}
      <div className="people-search-box">
        <Search size={16} className="people-search-icon" />
        <input
          type="text"
          className="people-search-input"
          placeholder="Search dining companions or venues..."
          value={filters.search}
          onChange={(e) => onUpdateFilter('search', e.target.value)}
        />
        {filters.search && (
          <button
            type="button"
            className="people-search-clear"
            onClick={() => onUpdateFilter('search', '')}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Country Filter */}
      <select
        className="people-filter-select"
        value={filters.country}
        onChange={(e) => onUpdateFilter('country', e.target.value)}
        aria-label="Filter by Country"
      >
        <option value="">All Countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Decade Filter */}
      <select
        className="people-filter-select"
        value={filters.decade}
        onChange={(e) => onUpdateFilter('decade', e.target.value)}
        aria-label="Filter by Decade"
      >
        <option value="">All Decades</option>
        <option value="2020s">2020s</option>
        <option value="2010s">2010s</option>
        <option value="2000s">2000s</option>
        <option value="1990s">1990s</option>
      </select>

      {/* Restaurant Type Filter */}
      <select
        className="people-filter-select"
        value={filters.restaurantType}
        onChange={(e) => onUpdateFilter('restaurantType', e.target.value)}
        aria-label="Filter by Restaurant Type"
      >
        <option value="">All Restaurant Types</option>
        {restaurantTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Clear All Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          className="people-filter-clear-btn"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
