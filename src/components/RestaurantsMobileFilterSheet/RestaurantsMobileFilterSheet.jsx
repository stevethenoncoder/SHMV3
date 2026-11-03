import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import {
  CANONICAL_VISIT_BANDS,
  CANONICAL_MEAL_RATINGS,
  CANONICAL_DECADES,
  countActiveRestaurantFilters,
  stripAccents,
} from '../../utils/restaurantsFilter.js';
import './RestaurantsMobileFilterSheet.css';

/**
 * Reusable Mobile Facet List with accent-insensitive search, Popular / A-Z order, and dynamic counts
 */
function MobileFacetList({
  options = [],
  selectedValues = [],
  counts = {},
  onToggleValue,
  searchable = true,
  sortable = true,
  searchPlaceholder = 'Search...',
}) {
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('count_desc');

  const normalizedItems = useMemo(() => {
    return options.map((opt) => {
      if (opt && typeof opt === 'object') {
        const id = opt.id !== undefined ? opt.id : opt.name;
        const label = opt.name || opt.label || String(id);
        const count = opt.count !== undefined ? opt.count : (counts[id] || 0);
        return { id, label, count };
      }
      return {
        id: opt,
        label: String(opt),
        count: counts[opt] || 0,
      };
    });
  }, [options, counts]);

  const filteredItems = useMemo(() => {
    const q = stripAccents(query.trim());
    if (!q) return normalizedItems;
    return normalizedItems.filter((item) => stripAccents(item.label).includes(q));
  }, [normalizedItems, query]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aSel = selectedValues.includes(a.id);
      const bSel = selectedValues.includes(b.id);
      if (aSel !== bSel) return aSel ? -1 : 1;

      if (sortMode === 'count_desc') {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      }
      return a.label.localeCompare(b.label);
    });
  }, [filteredItems, selectedValues, sortMode]);

  return (
    <div className="mobile-facet-container">
      {(searchable || sortable) && (
        <div className="mobile-facet-toolbar">
          {searchable && (
            <div className="mobile-facet-search">
              <Search size={14} className="mobile-facet-search-icon" />
              <input
                type="text"
                className="mobile-facet-search-input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className="mobile-facet-search-clear"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
          {sortable && (
            <div className="mobile-facet-sort-bar">
              <span className="mobile-facet-sort-label">Order:</span>
              <div className="mobile-facet-sort-pills">
                <button
                  type="button"
                  className={`mobile-facet-sort-btn ${sortMode === 'count_desc' ? 'active' : ''}`}
                  onClick={() => setSortMode('count_desc')}
                  title="Sort by Most Popular (Highest count first)"
                >
                  Popular
                </button>
                <button
                  type="button"
                  className={`mobile-facet-sort-btn ${sortMode === 'name_asc' ? 'active' : ''}`}
                  onClick={() => setSortMode('name_asc')}
                  title="Sort Alphabetically (A to Z)"
                >
                  A–Z
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="sheet-options-list">
        {sortedItems.length > 0 ? (
          sortedItems.map((item) => {
            const isChecked = selectedValues.includes(item.id);
            return (
              <label key={item.id} className="sheet-option-label">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleValue(item.id)}
                />
                <span className="option-name">{item.label}</span>
                {item.count > 0 && (
                  <span className="option-count">({item.count.toLocaleString()})</span>
                )}
              </label>
            );
          })
        ) : (
          <div className="mobile-facet-no-results">No options match</div>
        )}
      </div>
    </div>
  );
}

export default function RestaurantsMobileFilterSheet({
  isOpen,
  onClose,
  filterState,
  onApplyFilters,
  onClearFilters,
  counts = {},
  publicPeopleById = new Map(),
}) {
  if (!isOpen) return null;

  const [draft, setDraft] = useState({ ...filterState });

  useEffect(() => {
    setDraft({ ...filterState });
  }, [filterState, isOpen]);

  const [openSections, setOpenSections] = useState({
    visitBands: true,
    countries: false,
    cities: false,
    cuisines: false,
    avgRatings: false,
    mealRatings: false,
    decades: false,
    people: false,
    toggles: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleArray = (key, val) => {
    const list = draft[key] || [];
    const updated = list.includes(val)
      ? list.filter((x) => x !== val)
      : [...list, val];
    setDraft((prev) => ({ ...prev, [key]: updated }));
  };

  const handleApply = () => {
    onApplyFilters(draft);
    onClose();
  };

  const handleClear = () => {
    onClearFilters();
    onClose();
  };

  const activeDraftCount = countActiveRestaurantFilters(draft);

  const availableCountries = Object.keys(counts.countryCounts || {}).sort((a, b) =>
    a.localeCompare(b)
  );
  const availableCities = Object.keys(counts.cityCounts || {}).sort((a, b) =>
    a.localeCompare(b)
  );
  const availableCuisines = Object.keys(counts.cuisineCounts || {}).sort((a, b) =>
    a.localeCompare(b)
  );

  const availablePeople = Array.from(publicPeopleById.values())
    .map((p) => ({
      id: p.peopleId,
      name: p.publicName,
      count: counts.peopleCounts?.[p.peopleId] || 0,
    }))
    .filter((p) => p.count > 0 || (draft.people || []).includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mobile-filter-backdrop" onClick={onClose}>
      <div
        className="mobile-filter-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter restaurants"
      >
        {/* Header */}
        <div className="sheet-header">
          <div className="sheet-title-left">
            <Filter size={18} className="sheet-icon" />
            <h2 className="sheet-title">Filter Restaurants</h2>
            {activeDraftCount > 0 && (
              <span className="sheet-active-badge">{activeDraftCount}</span>
            )}
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="sheet-body">
          {/* 1. Visit Bands */}
          <div className="sheet-section">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('visitBands')}
            >
              <span>Meal Count</span>
              {openSections.visitBands ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.visitBands && (
              <div className="sheet-options-list">
                {CANONICAL_VISIT_BANDS.map((band) => {
                  const isChecked = (draft.visitBands || []).includes(band);
                  const count = counts.visitBandCounts?.[band] || 0;
                  return (
                    <label key={band} className="sheet-option-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('visitBands', band)}
                      />
                      <span className="option-name">{band}</span>
                      {count > 0 && <span className="option-count">({count})</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Countries */}
          <div className="sheet-section">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('countries')}
            >
              <span>Countries</span>
              {openSections.countries ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.countries && (
              <MobileFacetList
                options={availableCountries}
                selectedValues={draft.countries || []}
                counts={counts.countryCounts || {}}
                onToggleValue={(c) => handleToggleArray('countries', c)}
                searchPlaceholder="Search countries..."
              />
            )}
          </div>

          {/* 3. Cities */}
          <div className="sheet-section">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('cities')}
            >
              <span>Cities</span>
              {openSections.cities ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.cities && (
              <MobileFacetList
                options={availableCities}
                selectedValues={draft.cities || []}
                counts={counts.cityCounts || {}}
                onToggleValue={(city) => handleToggleArray('cities', city)}
                searchPlaceholder="Search cities..."
              />
            )}
          </div>

          {/* 4. Cuisines */}
          <div className="sheet-section">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('cuisines')}
            >
              <span>Cuisine / Type</span>
              {openSections.cuisines ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.cuisines && (
              <MobileFacetList
                options={availableCuisines}
                selectedValues={draft.cuisines || []}
                counts={counts.cuisineCounts || {}}
                onToggleValue={(t) => handleToggleArray('cuisines', t)}
                searchPlaceholder="Search cuisines..."
              />
            )}
          </div>

          {/* 5. Avg Restaurant Rating */}
          <div className="sheet-section">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('avgRatings')}
            >
              <span>Avg Restaurant Rating</span>
              {openSections.avgRatings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.avgRatings && (
              <div className="sheet-options-list">
                {CANONICAL_MEAL_RATINGS.map((r) => {
                  const isChecked = (draft.avgRatings || []).includes(r);
                  const count = counts.avgRatingCounts?.[r] || 0;
                  return (
                    <label key={r} className="sheet-option-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('avgRatings', r)}
                      />
                      <span className="option-name">{r}</span>
                      {count > 0 && <span className="option-count">({count})</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. Individual Meal Rating */}
          <div className="sheet-section">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('mealRatings')}
            >
              <span>Individual Meal Rating</span>
              {openSections.mealRatings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.mealRatings && (
              <div className="sheet-options-list">
                {CANONICAL_MEAL_RATINGS.map((r) => {
                  const isChecked = (draft.mealRatings || []).includes(r);
                  const count = counts.mealRatingCounts?.[r] || 0;
                  return (
                    <label key={r} className="sheet-option-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('mealRatings', r)}
                      />
                      <span className="option-name">{r}</span>
                      {count > 0 && <span className="option-count">({count})</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. Decade */}
          <div className="sheet-section">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('decades')}
            >
              <span>Decade Visited</span>
              {openSections.decades ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.decades && (
              <div className="sheet-options-list">
                {CANONICAL_DECADES.map((d) => {
                  const isChecked = (draft.decades || []).includes(d);
                  const count = counts.decadeCounts?.[d] || 0;
                  return (
                    <label key={d} className="sheet-option-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('decades', d)}
                      />
                      <span className="option-name">{d}</span>
                      {count > 0 && <span className="option-count">({count})</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 8. People */}
          <div className="sheet-section">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('people')}
            >
              <span>Dining Companion</span>
              {openSections.people ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.people && (
              <MobileFacetList
                options={availablePeople}
                selectedValues={draft.people || []}
                onToggleValue={(pId) => handleToggleArray('people', pId)}
                searchPlaceholder="Search companions..."
              />
            )}
          </div>

          {/* 9. Context Toggles */}
          <div className="sheet-section">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('toggles')}
            >
              <span>Special Contexts</span>
              {openSections.toggles ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.toggles && (
              <div className="sheet-options-list">
                <label className="sheet-option-label">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.isBusiness)}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, isBusiness: e.target.checked }))
                    }
                  />
                  <span className="option-name">Business Meals Only</span>
                </label>
                <label className="sheet-option-label">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.isArsenalMatch)}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, isArsenalMatch: e.target.checked }))
                    }
                  />
                  <span className="option-name">Arsenal Matchdays Only</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sheet-footer">
          <button type="button" className="sheet-btn-clear" onClick={handleClear}>
            Clear all
          </button>
          <button type="button" className="sheet-btn-apply" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
