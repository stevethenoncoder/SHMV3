import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Camera,
  Shield,
  Briefcase,
  RotateCcw,
} from 'lucide-react';
import { CANONICAL_DECADES, CANONICAL_RATINGS } from '../../utils/mealsFilter.js';
import './MealsMobileFilterSheet.css';

function getRatingDotColor(rating) {
  const r = (rating || '').toLowerCase();
  if (r.includes('exceptional') || r.includes('the dogs')) return '#f59e0b';
  if (r.includes('very good') || r.includes('superb')) return '#10b981';
  if (r.includes('fine') || r.includes('good')) return '#3b82f6';
  if (r.includes("wouldn't recommend") || r.includes('ok')) return '#94a3b8';
  return '#ef4444';
}

export default function MealsMobileFilterSheet({
  isOpen,
  onClose,
  filterState,
  onApplyFilters,
  onClearFilters,
  counts = {},
  initialSection = null,
}) {
  const [draft, setDraft] = useState({ ...filterState });

  useEffect(() => {
    setDraft({ ...filterState });
  }, [filterState, isOpen]);

  // ALL SECTIONS COLLAPSED BY DEFAULT
  const [openSections, setOpenSections] = useState({
    countries: false,
    cities: false,
    people: false,
    cuisines: false,
    foodTypes: false,
    ratings: false,
    decades: false,
    ingredients: false,
    toggles: true,
  });

  useEffect(() => {
    if (initialSection) {
      setOpenSections({
        countries: initialSection === 'countries',
        cities: initialSection === 'cities',
        people: initialSection === 'people',
        cuisines: initialSection === 'cuisines',
        foodTypes: initialSection === 'foodTypes',
        ratings: initialSection === 'ratings',
        decades: initialSection === 'decades',
        ingredients: initialSection === 'ingredients',
        toggles: false,
      });
    }
  }, [initialSection, isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="meals-mobile-filter-sheet-backdrop" onClick={onClose}>
      <div
        className="meals-mobile-filter-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter Meals"
      >
        {/* Header */}
        <div className="sheet-header">
          <h2 className="sheet-title">Filters</h2>
          <button
            type="button"
            className="btn-sheet-close"
            onClick={onClose}
            aria-label="Close filters sheet"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Filter Sections */}
        <div className="sheet-content">
          {/* Quick Toggles */}
          <div className="sheet-group">
            <div className="sheet-toggle-list">
              <label className="sheet-toggle-row">
                <span className="toggle-label-wrap">
                  <Camera size={15} color="#2563eb" />
                  <span>With Photos</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(draft.hasPhoto)}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, hasPhoto: e.target.checked }))
                  }
                  className="sheet-checkbox-native"
                />
              </label>

              <label className="sheet-toggle-row">
                <span className="toggle-label-wrap">
                  <Shield size={15} color="#dc2626" />
                  <span>Arsenal Matchday</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(draft.isArsenalMatch)}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, isArsenalMatch: e.target.checked }))
                  }
                  className="sheet-checkbox-native"
                />
              </label>

              <label className="sheet-toggle-row">
                <span className="toggle-label-wrap">
                  <Briefcase size={15} color="#475569" />
                  <span>Business Dining</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(draft.isBusiness)}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, isBusiness: e.target.checked }))
                  }
                  className="sheet-checkbox-native"
                />
              </label>
            </div>
          </div>

          {/* 1. Country */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('countries')}
            >
              <span>
                Country
                {(draft.countries || []).length > 0 && ` (${draft.countries.length})`}
              </span>
              {openSections.countries ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.countries && (
              <div className="sheet-checkbox-list">
                {Object.entries(counts.countryCounts || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 15)
                  .map(([country, count]) => {
                    const isSelected = (draft.countries || []).includes(country);
                    return (
                      <label key={country} className="sheet-check-item">
                        <div className="check-left">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleArray('countries', country)}
                          />
                          <span>{country}</span>
                        </div>
                        <span className="count-pill">{count}</span>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 2. City */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('cities')}
            >
              <span>
                City
                {(draft.cities || []).length > 0 && ` (${draft.cities.length})`}
              </span>
              {openSections.cities ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.cities && (
              <div className="sheet-checkbox-list">
                {Object.entries(counts.cityCounts || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 15)
                  .map(([city, count]) => {
                    const isSelected = (draft.cities || []).includes(city);
                    return (
                      <label key={city} className="sheet-check-item">
                        <div className="check-left">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleArray('cities', city)}
                          />
                          <span>{city}</span>
                        </div>
                        <span className="count-pill">{count}</span>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 3. Dining Companion */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('people')}
            >
              <span>
                Dining Companion
                {(draft.people || []).length > 0 && ` (${draft.people.length})`}
              </span>
              {openSections.people ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.people && (
              <div className="sheet-checkbox-list">
                {Object.entries(counts.peopleCounts || {})
                  .filter(([name, count]) => count > 0 || (draft.people || []).includes(name))
                  .sort((a, b) => {
                    const aSel = (draft.people || []).includes(a[0]);
                    const bSel = (draft.people || []).includes(b[0]);
                    if (aSel && !bSel) return -1;
                    if (!aSel && bSel) return 1;
                    if (b[1] !== a[1]) return b[1] - a[1];
                    return a[0].localeCompare(b[0]);
                  })
                  .slice(0, 20)
                  .map(([person, count]) => {
                    const isSelected = (draft.people || []).includes(person);
                    return (
                      <label key={person} className="sheet-check-item">
                        <div className="check-left">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleArray('people', person)}
                          />
                          <span>{person}</span>
                        </div>
                        <span className="count-pill">{count}</span>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 4. Cuisine Type */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('cuisines')}
            >
              <span>
                Cuisine Type
                {(draft.cuisines || []).length > 0 && ` (${draft.cuisines.length})`}
              </span>
              {openSections.cuisines ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.cuisines && (
              <div className="sheet-checkbox-list">
                {Object.entries(counts.cuisineCounts || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 15)
                  .map(([cuisine, count]) => {
                    const isSelected = (draft.cuisines || []).includes(cuisine);
                    return (
                      <label key={cuisine} className="sheet-check-item">
                        <div className="check-left">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleArray('cuisines', cuisine)}
                          />
                          <span>{cuisine}</span>
                        </div>
                        <span className="count-pill">{count}</span>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 5. Dish Style */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('foodTypes')}
            >
              <span>
                Dish Style
                {(draft.foodTypes || []).length > 0 && ` (${draft.foodTypes.length})`}
              </span>
              {openSections.foodTypes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.foodTypes && (
              <div className="sheet-checkbox-list">
                {Object.entries(counts.foodTypeCounts || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 15)
                  .map(([style, count]) => {
                    const isSelected = (draft.foodTypes || []).includes(style);
                    return (
                      <label key={style} className="sheet-check-item">
                        <div className="check-left">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleArray('foodTypes', style)}
                          />
                          <span>{style}</span>
                        </div>
                        <span className="count-pill">{count}</span>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 6. Meal Rating */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('ratings')}
            >
              <span>
                Meal Rating
                {(draft.ratings || []).length > 0 && ` (${draft.ratings.length})`}
              </span>
              {openSections.ratings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.ratings && (
              <div className="sheet-checkbox-list">
                {CANONICAL_RATINGS.map((rating) => {
                  const count = counts.ratingCounts?.[rating] || 0;
                  const isSelected = (draft.ratings || []).includes(rating);
                  return (
                    <label key={rating} className="sheet-check-item">
                      <div className="check-left">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleArray('ratings', rating)}
                        />
                        <span
                          className="rating-dot"
                          style={{ backgroundColor: getRatingDotColor(rating) }}
                        />
                        <span>{rating}</span>
                      </div>
                      <span className="count-pill">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. Decade */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('decades')}
            >
              <span>
                Decade
                {(draft.decades || []).length > 0 && ` (${draft.decades.length})`}
              </span>
              {openSections.decades ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.decades && (
              <div className="sheet-checkbox-list">
                {CANONICAL_DECADES.map((dec) => {
                  const count = counts.decadeCounts?.[dec] || 0;
                  const isSelected = (draft.decades || []).includes(dec);
                  return (
                    <label key={dec} className="sheet-check-item">
                      <div className="check-left">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleArray('decades', dec)}
                        />
                        <span>{dec}</span>
                      </div>
                      <span className="count-pill">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 8. Ingredient */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('ingredients')}
            >
              <span>
                Ingredient
                {(draft.ingredients || []).length > 0 && ` (${draft.ingredients.length})`}
              </span>
              {openSections.ingredients ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openSections.ingredients && (
              <div className="sheet-checkbox-list">
                {Object.entries(counts.ingredientCounts || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 15)
                  .map(([ing, count]) => {
                    const isSelected = (draft.ingredients || []).includes(ing);
                    return (
                      <label key={ing} className="sheet-check-item">
                        <div className="check-left">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleArray('ingredients', ing)}
                          />
                          <span>{ing}</span>
                        </div>
                        <span className="count-pill">{count}</span>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sheet-footer">
          <button type="button" className="btn-sheet-clear" onClick={handleClear}>
            Clear all
          </button>
          <button type="button" className="btn-sheet-apply" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
