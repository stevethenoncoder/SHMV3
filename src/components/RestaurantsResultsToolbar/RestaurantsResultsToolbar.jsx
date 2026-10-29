import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import './RestaurantsResultsToolbar.css';

export default function RestaurantsResultsToolbar({
  totalCount,
  filteredCount,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  pageSize,
  onPageSizeChange,
  activeFilterCount,
  onOpenMobileFilters,
}) {
  return (
    <div className="restaurants-results-toolbar">
      {/* 1. Search Bar */}
      <div className="toolbar-search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search restaurants by name, city, cuisine..."
          value={searchQuery || ''}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
          aria-label="Search restaurants"
        />
        {searchQuery && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search query"
          >
            ×
          </button>
        )}
      </div>

      {/* 2. Middle Row: Results Count & Controls */}
      <div className="toolbar-controls-row">
        {/* Results Counter */}
        <div className="toolbar-counter">
          {filteredCount === totalCount ? (
            <span>
              All <strong>{totalCount.toLocaleString()}</strong> restaurants
            </span>
          ) : (
            <span>
              Showing <strong>{filteredCount.toLocaleString()}</strong> of{' '}
              {totalCount.toLocaleString()} restaurants
            </span>
          )}
        </div>

        <div className="toolbar-actions-right">
          {/* Mobile Filter Button */}
          <button
            type="button"
            className="mobile-filters-trigger"
            onClick={onOpenMobileFilters}
            aria-label="Open mobile filter sheet"
          >
            <Filter size={15} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="mobile-filter-badge">{activeFilterCount}</span>
            )}
          </button>

          {/* Sort Selector */}
          <div className="toolbar-control-group sort-group">
            <label htmlFor="restaurant-sort-select" className="control-label">
              <ArrowUpDown size={14} />
              <span className="desktop-only-text">Sort:</span>
            </label>
            <select
              id="restaurant-sort-select"
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
              className="control-select"
            >
              <option value="recent_desc">Most recently visited</option>
              <option value="visits_desc">Most visited</option>
              <option value="name_asc">Name (A–Z)</option>
              <option value="first_desc">First visited (newest)</option>
              <option value="first_asc">First visited (oldest)</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="toolbar-control-group page-size-group">
            <span className="desktop-only-text control-label">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
              className="control-select"
              aria-label="Restaurants per page"
            >
              <option value="18">18</option>
              <option value="36">36</option>
              <option value="72">72</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
