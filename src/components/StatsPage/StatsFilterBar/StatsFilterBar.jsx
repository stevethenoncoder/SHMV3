import React, { useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Utensils,
  Star,
  Smile,
  Users,
  Briefcase,
  Shield,
  X,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CANONICAL_MEAL_RATINGS,
  CANONICAL_SENTIMENTS,
  getDecade,
} from '../../../utils/statsAnalytics.js';
import './StatsFilterBar.css';

export default function StatsFilterBar({
  allMeals = [],
  filterState,
  onUpdateFilter,
  onResetFilters,
  onOpenMobileFilters,
}) {
  // Extract facet options from allMeals
  const {
    years,
    decades,
    countries,
    cities,
    restaurantTypes,
    restaurants,
    people,
  } = useMemo(() => {
    const yrSet = new Set();
    const decSet = new Set();
    const countrySet = new Set();
    const cityMap = new Map(); // cityName -> countryName
    const typeSet = new Set();
    const restMap = new Map(); // restId -> restName
    const peopleSet = new Set();

    for (const m of allMeals) {
      if (m.year) {
        yrSet.add(m.year);
        decSet.add(getDecade(m.year));
      }
      const cName = m.restaurant?.city?.country?.name || m.restaurant?.country?.name;
      const cityName = m.restaurant?.city?.name;
      if (cName) countrySet.add(cName);
      if (cityName) cityMap.set(cityName, cName || '');
      const tName = m.restaurant?.type?.name;
      if (tName) typeSet.add(tName);
      if (m.restaurant?.id && m.restaurant?.name) {
        restMap.set(m.restaurant.id, m.restaurant.name);
      }
      for (const comp of m.companions || []) {
        const pName = comp.publicName || comp.name;
        if (pName) peopleSet.add(pName);
      }
    }

    // Cascading: if country is selected, filter cities
    const selectedCountrySet = new Set(filterState.countries || []);
    let filteredCities = Array.from(cityMap.keys());
    if (selectedCountrySet.size > 0) {
      filteredCities = filteredCities.filter((city) =>
        selectedCountrySet.has(cityMap.get(city))
      );
    }

    return {
      years: Array.from(yrSet).sort((a, b) => b - a),
      decades: Array.from(decSet).filter(Boolean).sort().reverse(),
      countries: Array.from(countrySet).sort(),
      cities: filteredCities.sort(),
      restaurantTypes: Array.from(typeSet).sort(),
      restaurants: Array.from(restMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      people: Array.from(peopleSet).sort(),
    };
  }, [allMeals, filterState.countries]);

  // Compute active chips
  const activeChips = useMemo(() => {
    const chips = [];

    if (filterState.dateMode === 'this_year') {
      chips.push({ key: 'dateMode', label: 'Period: This Year', onRemove: () => onUpdateFilter({ dateMode: 'all', year: null }) });
    } else if (filterState.dateMode === 'year' && filterState.year) {
      chips.push({ key: 'year', label: `Year: ${filterState.year}`, onRemove: () => onUpdateFilter({ dateMode: 'all', year: null }) });
    } else if (filterState.dateMode === 'decade' && filterState.decade) {
      chips.push({ key: 'decade', label: `Decade: ${filterState.decade}`, onRemove: () => onUpdateFilter({ dateMode: 'all', decade: null }) });
    } else if (filterState.dateMode === 'custom') {
      const range = `${filterState.startDate || 'start'} to ${filterState.endDate || 'now'}`;
      chips.push({ key: 'customDate', label: `Date: ${range}`, onRemove: () => onUpdateFilter({ dateMode: 'all', startDate: '', endDate: '' }) });
    }

    (filterState.countries || []).forEach((c) => {
      chips.push({
        key: `country-${c}`,
        label: `Country: ${c}`,
        onRemove: () => onUpdateFilter({ countries: filterState.countries.filter((x) => x !== c) }),
      });
    });

    (filterState.cities || []).forEach((city) => {
      chips.push({
        key: `city-${city}`,
        label: `City: ${city}`,
        onRemove: () => onUpdateFilter({ cities: filterState.cities.filter((x) => x !== city) }),
      });
    });

    (filterState.restaurantTypes || []).forEach((t) => {
      chips.push({
        key: `type-${t}`,
        label: `Type: ${t}`,
        onRemove: () => onUpdateFilter({ restaurantTypes: filterState.restaurantTypes.filter((x) => x !== t) }),
      });
    });

    if (filterState.restaurantId) {
      chips.push({
        key: 'restaurant',
        label: `Restaurant: ${filterState.restaurantName || filterState.restaurantId}`,
        onRemove: () => onUpdateFilter({ restaurantId: null, restaurantName: '' }),
      });
    }

    (filterState.ratings || []).forEach((r) => {
      chips.push({
        key: `rating-${r}`,
        label: `Rating: ${r}`,
        onRemove: () => onUpdateFilter({ ratings: filterState.ratings.filter((x) => x !== r) }),
      });
    });

    (filterState.sentiments || []).forEach((s) => {
      chips.push({
        key: `sentiment-${s}`,
        label: `Sentiment: ${s}`,
        onRemove: () => onUpdateFilter({ sentiments: filterState.sentiments.filter((x) => x !== s) }),
      });
    });

    if (filterState.personName) {
      chips.push({
        key: 'person',
        label: `With: ${filterState.personName}`,
        onRemove: () => onUpdateFilter({ personName: null }),
      });
    }

    if (filterState.isBusinessOnly) {
      chips.push({
        key: 'business',
        label: 'Business Only',
        onRemove: () => onUpdateFilter({ isBusinessOnly: false }),
      });
    }

    if (filterState.isArsenalOnly) {
      chips.push({
        key: 'arsenal',
        label: 'Arsenal Matchdays',
        onRemove: () => onUpdateFilter({ isArsenalOnly: false }),
      });
    }

    return chips;
  }, [filterState, onUpdateFilter]);

  return (
    <div className="stats-filter-bar-root">
      {/* 1. Main Controls Toolbar */}
      <div className="stats-controls-row">
        {/* Date Mode Dropdown */}
        <div className="stats-filter-field">
          <label className="field-label" htmlFor="stats-date-select">
            <Calendar size={13} />
            <span>Time</span>
          </label>
          <select
            id="stats-date-select"
            className="stats-select"
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
              } else if (val === 'custom') {
                onUpdateFilter({ dateMode: 'custom' });
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
            <option value="custom">Custom Range...</option>
          </select>
        </div>

        {/* Custom Range Inputs (only when dateMode is 'custom') */}
        {filterState.dateMode === 'custom' && (
          <div className="stats-custom-dates-group">
            <input
              type="date"
              className="stats-date-input"
              value={filterState.startDate || ''}
              onChange={(e) => onUpdateFilter({ startDate: e.target.value })}
              title="Start Date"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              className="stats-date-input"
              value={filterState.endDate || ''}
              onChange={(e) => onUpdateFilter({ endDate: e.target.value })}
              title="End Date"
            />
          </div>
        )}

        {/* Country Filter */}
        <div className="stats-filter-field">
          <label className="field-label" htmlFor="stats-country-select">
            <MapPin size={13} />
            <span>Country</span>
          </label>
          <select
            id="stats-country-select"
            className="stats-select"
            value={filterState.countries[0] || ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateFilter({
                countries: val ? [val] : [],
                cities: [], // reset cities if country changes
              });
            }}
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div className="stats-filter-field">
          <label className="field-label" htmlFor="stats-city-select">
            <MapPin size={13} />
            <span>City</span>
          </label>
          <select
            id="stats-city-select"
            className="stats-select"
            value={filterState.cities[0] || ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateFilter({ cities: val ? [val] : [] });
            }}
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
        <div className="stats-filter-field">
          <label className="field-label" htmlFor="stats-type-select">
            <Utensils size={13} />
            <span>Type / Cuisine</span>
          </label>
          <select
            id="stats-type-select"
            className="stats-select"
            value={filterState.restaurantTypes[0] || ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateFilter({ restaurantTypes: val ? [val] : [] });
            }}
          >
            <option value="">All Types</option>
            {restaurantTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Meal Rating */}
        <div className="stats-filter-field">
          <label className="field-label" htmlFor="stats-rating-select">
            <Star size={13} />
            <span>Rating</span>
          </label>
          <select
            id="stats-rating-select"
            className="stats-select"
            value={filterState.ratings[0] || ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateFilter({ ratings: val ? [val] : [] });
            }}
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
        <div className="stats-filter-field">
          <label className="field-label" htmlFor="stats-sentiment-select">
            <Smile size={13} />
            <span>Sentiment</span>
          </label>
          <select
            id="stats-sentiment-select"
            className="stats-select"
            value={filterState.sentiments[0] || ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateFilter({ sentiments: val ? [val] : [] });
            }}
          >
            <option value="">All Sentiments</option>
            {CANONICAL_SENTIMENTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Companion / Person */}
        <div className="stats-filter-field">
          <label className="field-label" htmlFor="stats-person-select">
            <Users size={13} />
            <span>Person</span>
          </label>
          <select
            id="stats-person-select"
            className="stats-select"
            value={filterState.personName || ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateFilter({ personName: val || null });
            }}
          >
            <option value="">All Companions</option>
            {people.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Checkbox / Toggles */}
        <div className="stats-toggles-col">
          <label className={`stats-checkbox-label ${filterState.isBusinessOnly ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={filterState.isBusinessOnly}
              onChange={(e) => onUpdateFilter({ isBusinessOnly: e.target.checked })}
            />
            <Briefcase size={12} />
            <span>Business</span>
          </label>

          <label className={`stats-checkbox-label ${filterState.isArsenalOnly ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={filterState.isArsenalOnly}
              onChange={(e) => onUpdateFilter({ isArsenalOnly: e.target.checked })}
            />
            <Shield size={12} />
            <span>Arsenal</span>
          </label>
        </div>

        {/* Mobile Filter Button */}
        <button
          type="button"
          className="stats-mobile-filter-btn"
          onClick={onOpenMobileFilters}
        >
          <SlidersHorizontal size={14} />
          <span>Filters ({activeChips.length})</span>
        </button>
      </div>

      {/* 2. Active Filter Chips Row */}
      {activeChips.length > 0 && (
        <div className="stats-active-chips-strip">
          <span className="chips-label">Active Filters:</span>
          <div className="chips-list">
            {activeChips.map((chip) => (
              <span key={chip.key} className="stats-chip">
                <span>{chip.label}</span>
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={chip.onRemove}
                  title="Remove filter"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              className="stats-clear-all-btn"
              onClick={onResetFilters}
            >
              <RotateCcw size={12} />
              <span>Reset to All Time</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
