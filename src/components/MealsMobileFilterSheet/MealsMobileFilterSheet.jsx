import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Camera,
  Shield,
  Briefcase,
  Search,
  Filter,
} from 'lucide-react';
import {
  CANONICAL_DECADES,
  CANONICAL_RATINGS,
  countActiveFilters,
} from '../../utils/mealsFilter.js';
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
}) {
  if (!isOpen) return null;

  // Local draft state for mobile
  const [draft, setDraft] = useState({ ...filterState });

  useEffect(() => {
    setDraft({ ...filterState });
  }, [filterState, isOpen]);

  const [openSections, setOpenSections] = useState({
    decades: true,
    ratings: true,
    toggles: true,
    countries: false,
    cities: false,
    cuisines: false,
    ingredients: false,
    foodTypes: false,
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

  const activeDraftCount = countActiveFilters(draft);

  return (
    <div className="mobile-filter-backdrop" onClick={onClose}>
      <div
        className="mobile-filter-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter meals"
      >
        {/* Header */}
        <div className="sheet-header">
          <div className="sheet-title-left">
            <Filter size={18} className="sheet-icon" />
            <h2 className="sheet-title">Filter Meals</h2>
            {activeDraftCount > 0 && (
              <span className="sheet-active-badge">{activeDraftCount}</span>
            )}
          </div>
          <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="sheet-body">
          {/* Quick Toggles */}
          <div className="sheet-group">
            <h3 className="sheet-group-heading">Quick Filters</h3>
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

          {/* Decades */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('decades')}
            >
              <span>Decade</span>
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

          {/* Ratings */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('ratings')}
            >
              <span>Meal Rating</span>
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

          {/* Country */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('countries')}
            >
              <span>Country</span>
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

          {/* City */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('cities')}
            >
              <span>City</span>
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

          {/* Cuisines */}
          <div className="sheet-group">
            <button
              type="button"
              className="sheet-section-btn"
              onClick={() => toggleSection('cuisines')}
            >
              <span>Cuisine / Type</span>
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
