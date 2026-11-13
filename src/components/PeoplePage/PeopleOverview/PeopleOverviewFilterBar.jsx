import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { stripAccents, formatRatingLabel } from '../../../utils/restaurantsFilter.js';

/**
 * Generic Filter Popover Component with Click-Outside Listener
 */
function FilterPopover({
  label,
  activeCount = 0,
  isOpen,
  onToggle,
  onClose,
  children,
}) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  return (
    <div className="filter-dropdown-container" ref={popoverRef}>
      <button
        type="button"
        className={`filter-dropdown-btn ${activeCount > 0 ? 'active' : ''} ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
        <ChevronDown size={14} className="dropdown-chevron" />
      </button>

      {isOpen && (
        <div className="filter-popover-panel" role="dialog">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Checkbox filter list supporting:
 * - Search within facet
 * - Sorting by Most Popular (highest count) vs Alphabetical (A-Z)
 * - Dynamic meal count badges
 * - Quick Select All and Clear controls
 */
function CheckboxFilterList({
  options = [],
  selectedValues = [],
  counts = {},
  onToggleValue,
  onSelectAll,
  onClear,
  searchable = false,
  sortable = false,
  defaultSortMode = 'count_desc',
  searchPlaceholder = 'Search options...',
  formatLabel,
}) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState(defaultSortMode);

  // Normalize options into { id, label, displayLabel, count }
  const normalizedItems = useMemo(() => {
    return options.map((opt) => {
      const id = opt && typeof opt === 'object' ? (opt.id !== undefined ? opt.id : opt.name) : opt;
      const rawLabel = opt && typeof opt === 'object' ? (opt.name || opt.label || String(id)) : String(opt);
      const displayLabel = formatLabel ? formatLabel(rawLabel) : rawLabel;
      const count = counts[id] || 0;
      return { id, label: rawLabel, displayLabel, count };
    });
  }, [options, counts, formatLabel]);

  // Accent-insensitive search
  const filteredItems = useMemo(() => {
    const q = stripAccents(query.trim());
    if (!q) return normalizedItems;
    return normalizedItems.filter((item) =>
      stripAccents(item.label).includes(q) || stripAccents(item.displayLabel).includes(q)
    );
  }, [normalizedItems, query]);

  // Sort items: selected items pinned to top, then sorted by chosen sortMode
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aSel = selectedValues.includes(a.id);
      const bSel = selectedValues.includes(b.id);
      if (aSel !== bSel) return aSel ? -1 : 1;

      if (sortMode === 'count_desc') {
        if (b.count !== a.count) return b.count - a.count;
        return a.displayLabel.localeCompare(b.displayLabel);
      }
      return a.displayLabel.localeCompare(b.displayLabel);
    });
  }, [filteredItems, selectedValues, sortMode]);

  const showToolbar = searchable || sortable;

  return (
    <div className="checkbox-filter-list-wrapper">
      {showToolbar && (
        <div className="popover-toolbar">
          {searchable && (
            <div className="popover-search-container">
              <Search size={13} className="popover-search-icon" />
              <input
                type="text"
                className="popover-search-input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className="popover-search-clear"
                  onClick={() => setQuery('')}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="popover-controls-row">
            {sortable && (
              <div className="popover-sort-bar">
                <span className="popover-sort-label">Order:</span>
                <div className="popover-sort-pills">
                  <button
                    type="button"
                    className={`popover-sort-btn ${sortMode === 'count_desc' ? 'active' : ''}`}
                    onClick={() => setSortMode('count_desc')}
                    title="Sort by meal count"
                  >
                    Popular
                  </button>
                  <button
                    type="button"
                    className={`popover-sort-btn ${sortMode === 'name_asc' ? 'active' : ''}`}
                    onClick={() => setSortMode('name_asc')}
                    title="Sort alphabetically (A-Z)"
                  >
                    A–Z
                  </button>
                </div>
              </div>
            )}

            <div className="popover-quick-actions">
              {onSelectAll && filteredItems.length > 0 && (
                <button
                  type="button"
                  className="popover-action-link"
                  onClick={() => onSelectAll(filteredItems.map((i) => i.id))}
                >
                  Select all
                </button>
              )}
              {onClear && selectedValues.length > 0 && (
                <button
                  type="button"
                  className="popover-action-link clear"
                  onClick={onClear}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="popover-options-scroll">
        {sortedItems.length > 0 ? (
          sortedItems.map((item) => {
            const isSelected = selectedValues.includes(item.id);
            return (
              <label
                key={item.id}
                className={`popover-option-item ${isSelected ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleValue(item.id)}
                />
                <span className="popover-option-label">{item.displayLabel}</span>
                <span className="popover-option-count">
                  ({(item.count || 0).toLocaleString('en-GB')})
                </span>
              </label>
            );
          })
        ) : (
          <div className="popover-no-results">No options match</div>
        )}
      </div>
    </div>
  );
}

export default function PeopleOverviewFilterBar({
  filters,
  onUpdateFilter,
  onClearFilters,
  facetCounts = {},
  allCountries = [],
  allCities = [],
  allTypes = [],
  allRatings = [],
  allDecades = [],
}) {
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const closeDropdown = () => setOpenDropdown(null);

  const handleToggleOption = (key, value) => {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onUpdateFilter(key, next);
  };

  const handleSelectAllFacet = (key, optionIds) => {
    const current = new Set(filters[key] || []);
    for (const id of optionIds) current.add(id);
    onUpdateFilter(key, Array.from(current));
  };

  const handleClearFacet = (key) => {
    onUpdateFilter(key, []);
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    (filters.countries && filters.countries.length > 0) ||
    (filters.cities && filters.cities.length > 0) ||
    (filters.decades && filters.decades.length > 0) ||
    (filters.restaurantTypes && filters.restaurantTypes.length > 0) ||
    (filters.ratings && filters.ratings.length > 0)
  );

  return (
    <div className="people-filter-bar" role="search" aria-label="People Overview Filters">
      {/* Search Input: Strictly Companion Names */}
      <div className="people-search-box">
        <Search size={16} className="people-search-icon" />
        <input
          type="text"
          className="people-search-input"
          placeholder="Search dining companions..."
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

      {/* Popovers Container */}
      <div className="people-filter-dropdowns">
        {/* 1. Countries Filter */}
        <FilterPopover
          label="Countries"
          activeCount={filters.countries?.length || 0}
          isOpen={openDropdown === 'countries'}
          onToggle={() => toggleDropdown('countries')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={allCountries}
            selectedValues={filters.countries || []}
            counts={facetCounts.countryCounts || {}}
            onToggleValue={(val) => handleToggleOption('countries', val)}
            onSelectAll={(ids) => handleSelectAllFacet('countries', ids)}
            onClear={() => handleClearFacet('countries')}
            searchable={true}
            sortable={true}
            defaultSortMode="count_desc"
            searchPlaceholder="Search countries..."
          />
        </FilterPopover>

        {/* 2. Cities Filter */}
        <FilterPopover
          label="Cities"
          activeCount={filters.cities?.length || 0}
          isOpen={openDropdown === 'cities'}
          onToggle={() => toggleDropdown('cities')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={allCities}
            selectedValues={filters.cities || []}
            counts={facetCounts.cityCounts || {}}
            onToggleValue={(val) => handleToggleOption('cities', val)}
            onSelectAll={(ids) => handleSelectAllFacet('cities', ids)}
            onClear={() => handleClearFacet('cities')}
            searchable={true}
            sortable={true}
            defaultSortMode="count_desc"
            searchPlaceholder="Search cities..."
          />
        </FilterPopover>

        {/* 3. Decades Filter */}
        <FilterPopover
          label="Decades"
          activeCount={filters.decades?.length || 0}
          isOpen={openDropdown === 'decades'}
          onToggle={() => toggleDropdown('decades')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={allDecades}
            selectedValues={filters.decades || []}
            counts={facetCounts.decadeCounts || {}}
            onToggleValue={(val) => handleToggleOption('decades', val)}
            onSelectAll={(ids) => handleSelectAllFacet('decades', ids)}
            onClear={() => handleClearFacet('decades')}
            searchable={false}
            sortable={false}
            defaultSortMode="name_asc"
          />
        </FilterPopover>

        {/* 4. Restaurant Types Filter */}
        <FilterPopover
          label="Restaurant Types"
          activeCount={filters.restaurantTypes?.length || 0}
          isOpen={openDropdown === 'restaurantTypes'}
          onToggle={() => toggleDropdown('restaurantTypes')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={allTypes}
            selectedValues={filters.restaurantTypes || []}
            counts={facetCounts.typeCounts || {}}
            onToggleValue={(val) => handleToggleOption('restaurantTypes', val)}
            onSelectAll={(ids) => handleSelectAllFacet('restaurantTypes', ids)}
            onClear={() => handleClearFacet('restaurantTypes')}
            searchable={true}
            sortable={true}
            defaultSortMode="count_desc"
            searchPlaceholder="Search restaurant types..."
          />
        </FilterPopover>

        {/* 5. Meal Rating Filter */}
        <FilterPopover
          label="Meal Rating"
          activeCount={filters.ratings?.length || 0}
          isOpen={openDropdown === 'ratings'}
          onToggle={() => toggleDropdown('ratings')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={allRatings}
            selectedValues={filters.ratings || []}
            counts={facetCounts.ratingCounts || {}}
            onToggleValue={(val) => handleToggleOption('ratings', val)}
            onSelectAll={(ids) => handleSelectAllFacet('ratings', ids)}
            onClear={() => handleClearFacet('ratings')}
            searchable={true}
            sortable={true}
            defaultSortMode="count_desc"
            searchPlaceholder="Search ratings..."
            formatLabel={formatRatingLabel}
          />
        </FilterPopover>

        {/* Clear All Filters Button */}
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
    </div>
  );
}
