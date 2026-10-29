import React, { useState, useEffect } from 'react';
import {
  X,
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
} from '../../utils/restaurantsFilter.js';
import './RestaurantsMobileFilterSheet.css';

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
              <div className="sheet-options-list">
                {availableCountries.map((c) => {
                  const isChecked = (draft.countries || []).includes(c);
                  const count = counts.countryCounts?.[c] || 0;
                  return (
                    <label key={c} className="sheet-option-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('countries', c)}
                      />
                      <span className="option-name">{c}</span>
                      {count > 0 && <span className="option-count">({count})</span>}
                    </label>
                  );
                })}
              </div>
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
              <div className="sheet-options-list">
                {availableCities.map((city) => {
                  const isChecked = (draft.cities || []).includes(city);
                  const count = counts.cityCounts?.[city] || 0;
                  return (
                    <label key={city} className="sheet-option-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('cities', city)}
                      />
                      <span className="option-name">{city}</span>
                      {count > 0 && <span className="option-count">({count})</span>}
                    </label>
                  );
                })}
              </div>
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
              <div className="sheet-options-list">
                {availableCuisines.map((t) => {
                  const isChecked = (draft.cuisines || []).includes(t);
                  const count = counts.cuisineCounts?.[t] || 0;
                  return (
                    <label key={t} className="sheet-option-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('cuisines', t)}
                      />
                      <span className="option-name">{t}</span>
                      {count > 0 && <span className="option-count">({count})</span>}
                    </label>
                  );
                })}
              </div>
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
              <div className="sheet-options-list">
                {availablePeople.map((p) => {
                  const isChecked = (draft.people || []).includes(p.id);
                  return (
                    <label key={p.id} className="sheet-option-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleArray('people', p.id)}
                      />
                      <span className="option-name">{p.name}</span>
                      {p.count > 0 && <span className="option-count">({p.count})</span>}
                    </label>
                  );
                })}
              </div>
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
