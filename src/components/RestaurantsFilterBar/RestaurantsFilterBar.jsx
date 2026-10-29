import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  ChevronDown,
  Filter,
  Check,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CANONICAL_VISIT_BANDS,
  CANONICAL_MEAL_RATINGS,
  CANONICAL_DECADES,
  countActiveRestaurantFilters,
  formatRatingLabel,
} from '../../utils/restaurantsFilter.js';
import './RestaurantsFilterBar.css';

/**
 * Generic Filter Popover Component
 */
function FilterPopover({
  label,
  activeCount,
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
        <div className="filter-popover-panel">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Filter list with optional search and dynamic counts
 */
function CheckboxFilterList({
  options = [],
  selectedValues = [],
  counts = {},
  onToggleValue,
  searchable = false,
  searchPlaceholder = 'Search options...',
}) {
  const [query, setQuery] = useState('');

  const filteredOptions = searchable && query.trim()
    ? options.filter((opt) => opt.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className="checkbox-filter-list-wrapper">
      {searchable && options.length > 7 && (
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
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      <div className="popover-options-scroll">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt) => {
            const count = counts[opt] || 0;
            const isSelected = selectedValues.includes(opt);
            return (
              <label key={opt} className={`popover-option-item ${isSelected ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleValue(opt)}
                />
                <span className="popover-option-label">{opt}</span>
                {count > 0 && <span className="popover-option-count">({count.toLocaleString()})</span>}
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

export default function RestaurantsFilterBar({
  filterState,
  onUpdateFilter,
  onClearFilters,
  counts = {},
  publicPeopleById = new Map(),
  sortOption = 'recent_desc',
  onSortChange,
  totalCount = 0,
  filteredCount = 0,
  pageSize = 18,
  onPageSizeChange,
  onOpenMobileFilters,
}) {
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const closeDropdown = () => setOpenDropdown(null);

  // Toggle helpers for multi-select arrays
  const handleToggleArrayItem = (key, item) => {
    const current = filterState[key] || [];
    const updated = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    onUpdateFilter(key, updated);
  };

  // Extract available options from dynamic counts or canonical lists
  const availableCountries = Object.keys(counts.countryCounts || {}).sort((a, b) =>
    a.localeCompare(b)
  );

  const availableCities = Object.keys(counts.cityCounts || {}).sort((a, b) =>
    a.localeCompare(b)
  );

  const availableCuisines = Object.keys(counts.cuisineCounts || {}).sort((a, b) =>
    a.localeCompare(b)
  );

  const availableAvgRatings = CANONICAL_MEAL_RATINGS.filter(
    (r) => (counts.avgRatingCounts?.[r] || 0) > 0 || (filterState.avgRatings || []).includes(r)
  );

  const availableMealRatings = CANONICAL_MEAL_RATINGS.filter(
    (r) => (counts.mealRatingCounts?.[r] || 0) > 0 || (filterState.mealRatings || []).includes(r)
  );

  const availableDecades = CANONICAL_DECADES;

  // People options resolved from publicPeopleById and dynamic counts
  const availablePeople = Array.from(publicPeopleById.values())
    .map((p) => ({
      id: p.peopleId,
      name: p.publicName,
      count: counts.peopleCounts?.[p.peopleId] || 0,
    }))
    .filter((p) => p.count > 0 || (filterState.people || []).includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalActiveFilters = countActiveRestaurantFilters(filterState);

  // Active filter chip generator
  const chips = [];
  if (filterState.search) {
    chips.push({
      key: 'search',
      label: `Search: "${filterState.search}"`,
      onRemove: () => onUpdateFilter('search', ''),
    });
  }
  (filterState.countries || []).forEach((c) => {
    chips.push({
      key: `country_${c}`,
      label: `Country: ${c}`,
      onRemove: () => handleToggleArrayItem('countries', c),
    });
  });
  (filterState.cities || []).forEach((c) => {
    chips.push({
      key: `city_${c}`,
      label: `City: ${c}`,
      onRemove: () => handleToggleArrayItem('cities', c),
    });
  });
  (filterState.cuisines || []).forEach((c) => {
    chips.push({
      key: `cuisine_${c}`,
      label: `Cuisine: ${c}`,
      onRemove: () => handleToggleArrayItem('cuisines', c),
    });
  });
  (filterState.visitBands || []).forEach((b) => {
    chips.push({
      key: `band_${b}`,
      label: `Meals: ${b}`,
      onRemove: () => handleToggleArrayItem('visitBands', b),
    });
  });
  (filterState.avgRatings || []).forEach((r) => {
    chips.push({
      key: `avgRating_${r}`,
      label: `Avg Rating: ${formatRatingLabel(r)}`,
      onRemove: () => handleToggleArrayItem('avgRatings', r),
    });
  });
  (filterState.mealRatings || []).forEach((r) => {
    chips.push({
      key: `mealRating_${r}`,
      label: `Meal Rating: ${formatRatingLabel(r)}`,
      onRemove: () => handleToggleArrayItem('mealRatings', r),
    });
  });
  (filterState.decades || []).forEach((d) => {
    chips.push({
      key: `decade_${d}`,
      label: `Decade: ${d}`,
      onRemove: () => handleToggleArrayItem('decades', d),
    });
  });
  (filterState.people || []).forEach((pId) => {
    const person = publicPeopleById.get(pId);
    const pName = person?.publicName || `Person #${pId}`;
    chips.push({
      key: `person_${pId}`,
      label: `Companion: ${pName}`,
      onRemove: () => handleToggleArrayItem('people', pId),
    });
  });
  if (filterState.isBusiness) {
    chips.push({
      key: 'isBusiness',
      label: 'Business Meals Only',
      onRemove: () => onUpdateFilter('isBusiness', false),
    });
  }
  if (filterState.isArsenalMatch) {
    chips.push({
      key: 'isArsenalMatch',
      label: 'Arsenal Matchdays Only',
      onRemove: () => onUpdateFilter('isArsenalMatch', false),
    });
  }

  return (
    <div className="restaurants-filter-bar-root">
      {/* 1. Main Search Row */}
      <div className="restaurants-search-row">
        <div className="restaurants-search-field">
          <Search size={18} className="search-field-icon" />
          <input
            type="text"
            className="restaurants-search-input"
            placeholder="Search restaurants, meals, dishes, comments..."
            value={filterState.search || ''}
            onChange={(e) => onUpdateFilter('search', e.target.value)}
          />
          {filterState.search && (
            <button
              type="button"
              className="search-field-clear"
              onClick={() => onUpdateFilter('search', '')}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Mobile Filter Button */}
        <button
          type="button"
          className="restaurants-mobile-filter-trigger"
          onClick={onOpenMobileFilters}
        >
          <Filter size={16} />
          <span>Filters</span>
          {totalActiveFilters > 0 && (
            <span className="mobile-filter-badge">{totalActiveFilters}</span>
          )}
        </button>
      </div>

      {/* 2. Desktop Horizontal Filters Strip */}
      <div className="restaurants-dropdowns-row">
        {/* Country */}
        <FilterPopover
          label="Country"
          activeCount={(filterState.countries || []).length}
          isOpen={openDropdown === 'country'}
          onToggle={() => toggleDropdown('country')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={availableCountries}
            selectedValues={filterState.countries || []}
            counts={counts.countryCounts || {}}
            onToggleValue={(v) => handleToggleArrayItem('countries', v)}
            searchable={true}
            searchPlaceholder="Search countries..."
          />
        </FilterPopover>

        {/* City */}
        <FilterPopover
          label="City"
          activeCount={(filterState.cities || []).length}
          isOpen={openDropdown === 'city'}
          onToggle={() => toggleDropdown('city')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={availableCities}
            selectedValues={filterState.cities || []}
            counts={counts.cityCounts || {}}
            onToggleValue={(v) => handleToggleArrayItem('cities', v)}
            searchable={true}
            searchPlaceholder="Search cities..."
          />
        </FilterPopover>

        {/* Cuisine / Type */}
        <FilterPopover
          label="Cuisine"
          activeCount={(filterState.cuisines || []).length}
          isOpen={openDropdown === 'cuisine'}
          onToggle={() => toggleDropdown('cuisine')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={availableCuisines}
            selectedValues={filterState.cuisines || []}
            counts={counts.cuisineCounts || {}}
            onToggleValue={(v) => handleToggleArrayItem('cuisines', v)}
            searchable={true}
            searchPlaceholder="Search cuisines..."
          />
        </FilterPopover>

        {/* Meal Count Bands */}
        <FilterPopover
          label="Meals"
          activeCount={(filterState.visitBands || []).length}
          isOpen={openDropdown === 'visits'}
          onToggle={() => toggleDropdown('visits')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={CANONICAL_VISIT_BANDS}
            selectedValues={filterState.visitBands || []}
            counts={counts.visitBandCounts || {}}
            onToggleValue={(v) => handleToggleArrayItem('visitBands', v)}
          />
        </FilterPopover>

        {/* Avg Restaurant Rating */}
        <FilterPopover
          label="Avg Rating"
          activeCount={(filterState.avgRatings || []).length}
          isOpen={openDropdown === 'avgRating'}
          onToggle={() => toggleDropdown('avgRating')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={availableAvgRatings}
            selectedValues={filterState.avgRatings || []}
            counts={counts.avgRatingCounts || {}}
            onToggleValue={(v) => handleToggleArrayItem('avgRatings', v)}
          />
        </FilterPopover>

        {/* Meal Rating */}
        <FilterPopover
          label="Meal Rating"
          activeCount={(filterState.mealRatings || []).length}
          isOpen={openDropdown === 'mealRating'}
          onToggle={() => toggleDropdown('mealRating')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={availableMealRatings}
            selectedValues={filterState.mealRatings || []}
            counts={counts.mealRatingCounts || {}}
            onToggleValue={(v) => handleToggleArrayItem('mealRatings', v)}
          />
        </FilterPopover>

        {/* Year / Decade */}
        <FilterPopover
          label="Decade"
          activeCount={(filterState.decades || []).length}
          isOpen={openDropdown === 'decades'}
          onToggle={() => toggleDropdown('decades')}
          onClose={closeDropdown}
        >
          <CheckboxFilterList
            options={availableDecades}
            selectedValues={filterState.decades || []}
            counts={counts.decadeCounts || {}}
            onToggleValue={(v) => handleToggleArrayItem('decades', v)}
          />
        </FilterPopover>

        {/* Dining Companion */}
        <FilterPopover
          label="Companion"
          activeCount={(filterState.people || []).length}
          isOpen={openDropdown === 'companion'}
          onToggle={() => toggleDropdown('companion')}
          onClose={closeDropdown}
        >
          <div className="checkbox-filter-list-wrapper">
            <div className="popover-options-scroll">
              {availablePeople.length > 0 ? (
                availablePeople.map((p) => {
                  const isSelected = (filterState.people || []).includes(p.id);
                  return (
                    <label key={p.id} className={`popover-option-item ${isSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleArrayItem('people', p.id)}
                      />
                      <span className="popover-option-label">{p.name}</span>
                      {p.count > 0 && <span className="popover-option-count">({p.count})</span>}
                    </label>
                  );
                })
              ) : (
                <div className="popover-no-results">No public companions found</div>
              )}
            </div>
          </div>
        </FilterPopover>

        {/* More Filters (Business, Arsenal) */}
        <FilterPopover
          label="More Filters"
          activeCount={(filterState.isBusiness ? 1 : 0) + (filterState.isArsenalMatch ? 1 : 0)}
          isOpen={openDropdown === 'more'}
          onToggle={() => toggleDropdown('more')}
          onClose={closeDropdown}
        >
          <div className="popover-options-scroll">
            <label className={`popover-option-item ${filterState.isBusiness ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={filterState.isBusiness}
                onChange={(e) => onUpdateFilter('isBusiness', e.target.checked)}
              />
              <span className="popover-option-label">Business Meals Only</span>
              {counts.businessCount > 0 && (
                <span className="popover-option-count">({counts.businessCount})</span>
              )}
            </label>
            <label className={`popover-option-item ${filterState.isArsenalMatch ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={filterState.isArsenalMatch}
                onChange={(e) => onUpdateFilter('isArsenalMatch', e.target.checked)}
              />
              <span className="popover-option-label">Arsenal Matchday Meals</span>
              {counts.arsenalCount > 0 && (
                <span className="popover-option-count">({counts.arsenalCount})</span>
              )}
            </label>
          </div>
        </FilterPopover>
      </div>

      {/* 3. Active Chips Row */}
      {chips.length > 0 && (
        <div className="restaurants-active-chips-strip">
          <div className="chips-list">
            {chips.map((chip) => (
              <span key={chip.key} className="filter-chip">
                <span className="chip-label">{chip.label}</span>
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
            <button
              type="button"
              className="chips-clear-all-btn"
              onClick={onClearFilters}
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* 4. Results Toolbar (Summary & Sort) */}
      <div className="restaurants-table-toolbar">
        <div className="restaurants-result-stats">
          <span className="result-stats-count">{filteredCount.toLocaleString()}</span>
          <span className="result-stats-text">
            {filteredCount === 1 ? 'restaurant' : 'restaurants'}
            {filteredCount !== totalCount && ` (filtered from ${totalCount.toLocaleString()})`}
          </span>
        </div>

        <div className="restaurants-toolbar-controls">
          <div className="restaurants-sort-wrapper">
            <label htmlFor="restaurant-sort-select" className="sort-label">
              <ArrowUpDown size={14} />
              <span>Sort:</span>
            </label>
            <select
              id="restaurant-sort-select"
              className="sort-select"
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="visits_desc">Most meals</option>
              <option value="visits_asc">Fewest meals</option>
              <option value="recent_desc">Most recently visited</option>
              <option value="recent_asc">Oldest most recent visit</option>
              <option value="name_asc">Restaurant A–Z</option>
              <option value="name_desc">Restaurant Z–A</option>
              <option value="first_asc">Oldest first visit</option>
              <option value="first_desc">Most recent first visit</option>
              <option value="rating_best">Best average rating</option>
              <option value="rating_worst">Worst average rating</option>
            </select>
          </div>

          <div className="restaurants-page-size-wrapper">
            <label htmlFor="restaurant-pagesize-select" className="sort-label">
              Show:
            </label>
            <select
              id="restaurant-pagesize-select"
              className="pagesize-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
