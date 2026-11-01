import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import {
  CANONICAL_MEAL_RATINGS,
  CANONICAL_SENTIMENTS,
} from '../../../utils/statsAnalytics.js';
import './StatsFilterBar.css';

export default function StatsMobileFilterSheet({
  isOpen,
  onClose,
  filterState,
  onUpdateFilter,
  onResetFilters,
  years = [],
  decades = [],
  countries = [],
  cities = [],
  restaurantTypes = [],
  restaurants = [],
  people = [],
}) {
  if (!isOpen) return null;

  return (
    <div className="stats-mobile-modal-overlay" onClick={onClose}>
      <div
        className="stats-mobile-modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-sheet-header">
          <h2 className="mobile-sheet-title">Stats Filters</h2>
          <button
            type="button"
            className="mobile-sheet-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mobile-sheet-body">
          {/* Time / Period */}
          <div className="mobile-filter-group">
            <label className="mobile-group-label">Time / Period</label>
            <select
              className="stats-select mobile-select"
              value={
                filterState.dateMode === 'year'
                  ? `year:${filterState.year}`
                  : filterState.dateMode === 'decade'
                  ? `decade:${filterState.decade}`
                  : filterState.dateMode
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') {
                  onUpdateFilter({ dateMode: 'all', year: null, decade: null });
                } else if (val === 'this_year') {
                  onUpdateFilter({ dateMode: 'this_year', year: null, decade: null });
                } else if (val.startsWith('year:')) {
                  onUpdateFilter({ dateMode: 'year', year: parseInt(val.replace('year:', ''), 10) });
                } else if (val.startsWith('decade:')) {
                  onUpdateFilter({ dateMode: 'decade', decade: val.replace('decade:', '') });
                }
              }}
            >
              <option value="all">All Time</option>
              <option value="this_year">This Year ({years[0] || '2026'})</option>
              <optgroup label="Specific Year">
                {years.map((y) => (
                  <option key={y} value={`year:${y}`}>
                    {y}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Decades">
                {decades.map((d) => (
                  <option key={d} value={`decade:${d}`}>
                    {d}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Country */}
          <div className="mobile-filter-group">
            <label className="mobile-group-label">Country</label>
            <select
              className="stats-select mobile-select"
              value={filterState.countries[0] || ''}
              onChange={(e) =>
                onUpdateFilter({
                  countries: e.target.value ? [e.target.value] : [],
                  cities: [],
                })
              }
            >
              <option value="">All Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="mobile-filter-group">
            <label className="mobile-group-label">City</label>
            <select
              className="stats-select mobile-select"
              value={filterState.cities[0] || ''}
              onChange={(e) =>
                onUpdateFilter({ cities: e.target.value ? [e.target.value] : [] })
              }
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Restaurant Type */}
          <div className="mobile-filter-group">
            <label className="mobile-group-label">Restaurant Type</label>
            <select
              className="stats-select mobile-select"
              value={filterState.restaurantTypes[0] || ''}
              onChange={(e) =>
                onUpdateFilter({ restaurantTypes: e.target.value ? [e.target.value] : [] })
              }
            >
              <option value="">All Types</option>
              {restaurantTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Rating */}
          <div className="mobile-filter-group">
            <label className="mobile-group-label">Meal Rating</label>
            <select
              className="stats-select mobile-select"
              value={filterState.ratings[0] || ''}
              onChange={(e) =>
                onUpdateFilter({ ratings: e.target.value ? [e.target.value] : [] })
              }
            >
              <option value="">All Ratings</option>
              {CANONICAL_MEAL_RATINGS.map((r) => (
                <option key={r.id} value={r.text}>
                  {r.text}
                </option>
              ))}
            </select>
          </div>

          {/* Sentiment */}
          <div className="mobile-filter-group">
            <label className="mobile-group-label">Sentiment</label>
            <select
              className="stats-select mobile-select"
              value={filterState.sentiments[0] || ''}
              onChange={(e) =>
                onUpdateFilter({ sentiments: e.target.value ? [e.target.value] : [] })
              }
            >
              <option value="">All Sentiments</option>
              {CANONICAL_SENTIMENTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Companion */}
          <div className="mobile-filter-group">
            <label className="mobile-group-label">Dining Companion</label>
            <select
              className="stats-select mobile-select"
              value={filterState.personName || ''}
              onChange={(e) =>
                onUpdateFilter({ personName: e.target.value || null })
              }
            >
              <option value="">All Companions</option>
              {people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="mobile-toggles-row">
            <label className={`stats-checkbox-label ${filterState.isBusinessOnly ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filterState.isBusinessOnly}
                onChange={(e) => onUpdateFilter({ isBusinessOnly: e.target.checked })}
              />
              <span>Business Meals</span>
            </label>

            <label className={`stats-checkbox-label ${filterState.isArsenalOnly ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filterState.isArsenalOnly}
                onChange={(e) => onUpdateFilter({ isArsenalOnly: e.target.checked })}
              />
              <span>Arsenal Matchdays</span>
            </label>
          </div>
        </div>

        <div className="mobile-sheet-footer">
          <button
            type="button"
            className="mobile-reset-btn"
            onClick={() => {
              onResetFilters();
              onClose();
            }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className="mobile-apply-btn"
            onClick={onClose}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
