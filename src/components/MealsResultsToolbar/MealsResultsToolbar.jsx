import React from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import './MealsResultsToolbar.css';

export default function MealsResultsToolbar({
  totalCount,
  filteredCount,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  pageSize,
  onPageSizeChange,
}) {
  return (
    <div className="meals-toolbar">
      {/* Top Row: Search and Controls */}
      <div className="toolbar-main-row">
        {/* Search Box */}
        <div className="meals-search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="meals-search-input"
            placeholder="Search by restaurant, dish, city, country, or note..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Right Controls: Sort & Page Size */}
        <div className="toolbar-controls-right">
          {/* Per Page Selector */}
          <div className="control-group">
            <span className="control-label">Show</span>
            <div className="select-wrap">
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="toolbar-select"
              >
                <option value={9}>9</option>
                <option value={18}>18</option>
                <option value={27}>27</option>
                <option value={36}>36</option>
              </select>
              <ChevronDown size={13} className="select-arrow" />
            </div>
          </div>

          {/* Sort Selector */}
          <div className="control-group">
            <span className="control-label">Sort</span>
            <div className="select-wrap">
              <select
                value={sortOption}
                onChange={(e) => onSortChange(e.target.value)}
                className="toolbar-select sort-select"
              >
                <option value="date_desc">Date (newest first)</option>
                <option value="date_asc">Date (earliest first)</option>
                <option value="rating_desc">Rating (highest first)</option>
                <option value="spend_desc">Spend (£ highest)</option>
                <option value="spend_asc">Spend (£ lowest)</option>
                <option value="name_asc">Restaurant (A → Z)</option>
              </select>
              <ChevronDown size={13} className="select-arrow" />
            </div>
          </div>
        </div>
      </div>

      {/* Counter Row */}
      <div className="toolbar-count-row">
        <h2 className="display-count">
          Displaying {filteredCount} {filteredCount === 1 ? 'Meal' : 'Meals'}
          {searchQuery && (
            <span className="search-filter-indicator">
              {' '}matching &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </h2>
      </div>
    </div>
  );
}
