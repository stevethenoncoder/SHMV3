import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  Star,
  Camera,
  Repeat,
  X,
} from 'lucide-react';
import {
  CANONICAL_VISIT_BANDS,
  CANONICAL_RESTAURANT_RATINGS,
} from '../../utils/restaurantsFilter.js';
import './RestaurantsFilterSidebar.css';

function getRatingDotColor(rating) {
  const r = (rating || '').toLowerCase();
  if (r.includes('exceptional') || r.includes('the dogs')) return '#f59e0b';
  if (r.includes('very good') || r.includes('superb')) return '#10b981';
  if (r.includes('fine') || r.includes('good')) return '#3b82f6';
  if (r.includes("wouldn't recommend") || r.includes('ok')) return '#94a3b8';
  return '#ef4444';
}

export default function RestaurantsFilterSidebar({
  filterState,
  onUpdateFilter,
  onClearFilters,
  counts = {},
}) {
  const [openSections, setOpenSections] = useState({
    toggles: true,
    visitBands: true,
    countries: true,
    cities: false,
    cuisines: false,
    ratings: false,
  });

  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [cuisineSearch, setCuisineSearch] = useState('');

  const [expandedFacets, setExpandedFacets] = useState({});

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const toggleExpanded = (facetKey) => {
    setExpandedFacets((prev) => ({ ...prev, [facetKey]: !prev[facetKey] }));
  };

  const handleToggleArray = (key, item) => {
    const current = filterState[key] || [];
    const updated = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    onUpdateFilter(key, updated);
  };

  const getFacetItems = (countsMap = {}, searchTerm = '', facetKey = '') => {
    const selected = filterState[facetKey] || [];
    const entries = Object.entries(countsMap)
      .filter(([name, count]) => {
        if (!name || name === 'null' || name === 'undefined') return false;
        const matchesQuery = name.toLowerCase().includes(searchTerm.toLowerCase());
        const hasCount = count > 0 || selected.includes(name);
        return matchesQuery && hasCount;
      })
      .sort((a, b) => {
        const aSel = selected.includes(a[0]);
        const bSel = selected.includes(b[0]);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });

    const isExpanded = expandedFacets[facetKey];
    const visibleEntries = isExpanded ? entries : entries.slice(0, 6);
    return {
      entries,
      visibleEntries,
      hasMore: entries.length > 6,
    };
  };

  const countryFacet = getFacetItems(counts.countryCounts, countrySearch, 'countries');
  const cityFacet = getFacetItems(counts.cityCounts, citySearch, 'cities');
  const cuisineFacet = getFacetItems(counts.cuisineCounts, cuisineSearch, 'cuisines');

  return (
    <aside className="restaurants-filter-sidebar">
      {/* Sticky Header */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">Filters</h2>
        <button
          type="button"
          className="btn-clear-all"
          onClick={onClearFilters}
          title="Clear all active filters"
        >
          Clear all
        </button>
      </div>

      {/* 1. Quick Toggles: With Photos */}
      <div className="filter-group-section">
        <div className="toggle-list">
          <label className="filter-toggle-row">
            <span className="toggle-left">
              <Camera size={14} className="toggle-icon photo" />
              <span className="toggle-label">With Photos</span>
            </span>
            <div className="toggle-right">
              {counts.photoCount !== undefined && (
                <span className="facet-count-badge">{counts.photoCount}</span>
              )}
              <input
                type="checkbox"
                checked={Boolean(filterState.hasPhoto)}
                onChange={(e) => onUpdateFilter('hasPhoto', e.target.checked)}
                className="toggle-checkbox-native"
              />
            </div>
          </label>
        </div>
      </div>

      {/* 2. Visit Frequency Bands */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('visitBands')}
        >
          <span className="section-title">
            Visit Frequency
            {(filterState.visitBands || []).length > 0 && ` (${filterState.visitBands.length})`}
          </span>
          {openSections.visitBands ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.visitBands && (
          <div className="facet-content-block">
            <div className="checkbox-list">
              {CANONICAL_VISIT_BANDS.map((band) => {
                const count = (counts.visitBandCounts && counts.visitBandCounts[band]) || 0;
                const isSelected = (filterState.visitBands || []).includes(band);
                return (
                  <label key={band} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleArray('visitBands', band)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{band}</span>
                    </div>
                    <span className="facet-count-badge">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Country */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('countries')}
        >
          <span className="section-title">
            Country
            {(filterState.countries || []).length > 0 && ` (${filterState.countries.length})`}
          </span>
          {openSections.countries ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.countries && (
          <div className="facet-content-block">
            {countryFacet.entries.length > 5 && (
              <div className="facet-search-box">
                <Search size={13} className="facet-search-icon" />
                <input
                  type="text"
                  placeholder="Filter countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="facet-search-input"
                />
                {countrySearch && (
                  <button
                    type="button"
                    onClick={() => setCountrySearch('')}
                    className="facet-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="checkbox-list">
              {countryFacet.visibleEntries.map(([country, count]) => {
                const isSelected = (filterState.countries || []).includes(country);
                return (
                  <label key={country} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleArray('countries', country)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{country}</span>
                    </div>
                    <span className="facet-count-badge">{count}</span>
                  </label>
                );
              })}
            </div>

            {countryFacet.hasMore && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => toggleExpanded('countries')}
              >
                {expandedFacets['countries'] ? 'Show less' : `Show all (${countryFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. City (Dynamic: Narrowed by Country) */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('cities')}
        >
          <span className="section-title">
            City
            {(filterState.cities || []).length > 0 && ` (${filterState.cities.length})`}
          </span>
          {openSections.cities ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.cities && (
          <div className="facet-content-block">
            {cityFacet.entries.length > 5 && (
              <div className="facet-search-box">
                <Search size={13} className="facet-search-icon" />
                <input
                  type="text"
                  placeholder="Filter cities..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="facet-search-input"
                />
                {citySearch && (
                  <button
                    type="button"
                    onClick={() => setCitySearch('')}
                    className="facet-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="checkbox-list">
              {cityFacet.visibleEntries.map(([city, count]) => {
                const isSelected = (filterState.cities || []).includes(city);
                return (
                  <label key={city} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleArray('cities', city)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{city}</span>
                    </div>
                    <span className="facet-count-badge">{count}</span>
                  </label>
                );
              })}
            </div>

            {cityFacet.hasMore && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => toggleExpanded('cities')}
              >
                {expandedFacets['cities'] ? 'Show less' : `Show all (${cityFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Cuisine / Restaurant Type */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('cuisines')}
        >
          <span className="section-title">
            Cuisine / Type
            {(filterState.cuisines || []).length > 0 && ` (${filterState.cuisines.length})`}
          </span>
          {openSections.cuisines ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.cuisines && (
          <div className="facet-content-block">
            {cuisineFacet.entries.length > 5 && (
              <div className="facet-search-box">
                <Search size={13} className="facet-search-icon" />
                <input
                  type="text"
                  placeholder="Filter cuisines..."
                  value={cuisineSearch}
                  onChange={(e) => setCuisineSearch(e.target.value)}
                  className="facet-search-input"
                />
                {cuisineSearch && (
                  <button
                    type="button"
                    onClick={() => setCuisineSearch('')}
                    className="facet-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="checkbox-list">
              {cuisineFacet.visibleEntries.map(([cuisine, count]) => {
                const isSelected = (filterState.cuisines || []).includes(cuisine);
                return (
                  <label key={cuisine} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleArray('cuisines', cuisine)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{cuisine}</span>
                    </div>
                    <span className="facet-count-badge">{count}</span>
                  </label>
                );
              })}
            </div>

            {cuisineFacet.hasMore && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => toggleExpanded('cuisines')}
              >
                {expandedFacets['cuisines'] ? 'Show less' : `Show all (${cuisineFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 6. Has Meal Rating */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('ratings')}
        >
          <span className="section-title">
            Has Meal Rating
            {(filterState.ratings || []).length > 0 && ` (${filterState.ratings.length})`}
          </span>
          {openSections.ratings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.ratings && (
          <div className="facet-content-block">
            <div className="checkbox-list">
              {CANONICAL_RESTAURANT_RATINGS.map((rating) => {
                const count = (counts.ratingCounts && counts.ratingCounts[rating]) || 0;
                const isSelected = (filterState.ratings || []).includes(rating);
                return (
                  <label key={rating} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleArray('ratings', rating)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span
                        className="rating-dot"
                        style={{ backgroundColor: getRatingDotColor(rating) }}
                      />
                      <span className="checkbox-label">{rating}</span>
                    </div>
                    <span className="facet-count-badge">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
