import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  Star,
  Camera,
  Shield,
  Briefcase,
  X,
  Users,
} from 'lucide-react';
import { CANONICAL_DECADES, CANONICAL_RATINGS } from '../../utils/mealsFilter.js';
import './MealsFilterSidebar.css';

/**
 * Visual styling helper for qualitative meal ratings in filters.
 */
function getRatingDotColor(rating) {
  const r = (rating || '').toLowerCase();
  if (r.includes('exceptional') || r.includes('the dogs')) return '#f59e0b';
  if (r.includes('very good') || r.includes('superb')) return '#10b981';
  if (r.includes('fine') || r.includes('good')) return '#3b82f6';
  if (r.includes("wouldn't recommend") || r.includes('ok')) return '#94a3b8';
  return '#ef4444';
}

export default function MealsFilterSidebar({
  filterState,
  onUpdateFilter,
  onClearFilters,
  counts = {},
}) {
  // Collapsible section open/close state
  const [openSections, setOpenSections] = useState({
    decades: true,
    ratings: true,
    toggles: true,
    countries: true,
    cities: false,
    people: false,
    cuisines: false,
    ingredients: false,
    foodTypes: false,
  });

  // Local search inputs within facets
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [cuisineSearch, setCuisineSearch] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [foodTypeSearch, setFoodTypeSearch] = useState('');

  // Expand "show all" vs "show top 6" within facets
  const [expandedFacets, setExpandedFacets] = useState({});

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const toggleExpanded = (facetKey) => {
    setExpandedFacets((prev) => ({ ...prev, [facetKey]: !prev[facetKey] }));
  };

  // Multi-select array toggle helper
  const handleToggleArray = (key, item) => {
    const current = filterState[key] || [];
    const updated = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    onUpdateFilter(key, updated);
  };

  // Helper to filter and sort list facets
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
        // Selected items first, then by count desc, then alphabetically
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
  const peopleFacet = getFacetItems(counts.peopleCounts, peopleSearch, 'people');
  const cuisineFacet = getFacetItems(counts.cuisineCounts, cuisineSearch, 'cuisines');
  const ingredientFacet = getFacetItems(counts.ingredientCounts, ingredientSearch, 'ingredients');
  const foodTypeFacet = getFacetItems(counts.foodTypeCounts, foodTypeSearch, 'foodTypes');

  return (
    <aside className="meals-filter-sidebar">
      {/* Sidebar Header */}
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

      {/* 1. Quick Toggles (Photos, Arsenal, Business) */}
      <div className="filter-group-section">
        <div className="toggle-list">
          {/* Photos Only */}
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
              <span className="toggle-switch-visual" />
            </div>
          </label>

          {/* Arsenal Matchday */}
          <label className="filter-toggle-row">
            <span className="toggle-left">
              <Shield size={14} className="toggle-icon afc" />
              <span className="toggle-label">Arsenal Matchday</span>
            </span>
            <div className="toggle-right">
              {counts.arsenalCount !== undefined && (
                <span className="facet-count-badge">{counts.arsenalCount}</span>
              )}
              <input
                type="checkbox"
                checked={Boolean(filterState.isArsenalMatch)}
                onChange={(e) => onUpdateFilter('isArsenalMatch', e.target.checked)}
                className="toggle-checkbox-native"
              />
              <span className="toggle-switch-visual" />
            </div>
          </label>

          {/* Business Dining */}
          <label className="filter-toggle-row">
            <span className="toggle-left">
              <Briefcase size={14} className="toggle-icon biz" />
              <span className="toggle-label">Business Dining</span>
            </span>
            <div className="toggle-right">
              {counts.businessCount !== undefined && (
                <span className="facet-count-badge">{counts.businessCount}</span>
              )}
              <input
                type="checkbox"
                checked={Boolean(filterState.isBusiness)}
                onChange={(e) => onUpdateFilter('isBusiness', e.target.checked)}
                className="toggle-checkbox-native"
              />
              <span className="toggle-switch-visual" />
            </div>
          </label>
        </div>
      </div>

      {/* 2. Decades */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('decades')}
        >
          <span className="section-title">Decade</span>
          {openSections.decades ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.decades && (
          <div className="checkbox-list">
            {CANONICAL_DECADES.map((decade) => {
              const count = counts.decadeCounts?.[decade] || 0;
              const isSelected = (filterState.decades || []).includes(decade);
              if (count === 0 && !isSelected) return null;

              return (
                <label key={decade} className="checkbox-row">
                  <div className="checkbox-left">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleArray('decades', decade)}
                      className="checkbox-native"
                    />
                    <span className="checkbox-visual">
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="checkbox-label">{decade}</span>
                  </div>
                  <span className="facet-count-badge">{count}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Meal Rating (Ordered Best to Worst) */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('ratings')}
        >
          <span className="section-title">Meal Rating</span>
          {openSections.ratings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.ratings && (
          <div className="checkbox-list">
            {CANONICAL_RATINGS.map((rating) => {
              const count = counts.ratingCounts?.[rating] || 0;
              const isSelected = (filterState.ratings || []).includes(rating);
              if (count === 0 && !isSelected) return null;

              const dotColor = getRatingDotColor(rating);

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
                      style={{ backgroundColor: dotColor }}
                      aria-hidden="true"
                    />
                    <span className="checkbox-label">{rating}</span>
                  </div>
                  <span className="facet-count-badge">{count}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Country */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('countries')}
        >
          <span className="section-title">Country</span>
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

      {/* 5. City (Dynamic: Narrowed by Country) */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('cities')}
        >
          <span className="section-title">City</span>
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
              {cityFacet.visibleEntries.length > 0 ? (
                cityFacet.visibleEntries.map(([city, count]) => {
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
                })
              ) : (
                <span className="no-facet-subtext">No cities matching active filters</span>
              )}
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

      {/* 6. Dining Companions (Public Only) */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('people')}
        >
          <span className="section-title">
            Dining Companions
            {(filterState.people || []).length > 0 && ` (${filterState.people.length})`}
          </span>
          {openSections.people ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.people && (
          <div className="facet-content-block">
            {peopleFacet.entries.length > 5 && (
              <div className="facet-search-box">
                <Search size={13} className="facet-search-icon" />
                <input
                  type="text"
                  placeholder="Filter companions..."
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  className="facet-search-input"
                />
                {peopleSearch && (
                  <button
                    type="button"
                    onClick={() => setPeopleSearch('')}
                    className="facet-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="checkbox-list">
              {peopleFacet.visibleEntries.map(([person, count]) => {
                const isSelected = (filterState.people || []).includes(person);
                return (
                  <label key={person} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleArray('people', person)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{person}</span>
                    </div>
                    <span className="facet-count-badge">{count}</span>
                  </label>
                );
              })}
            </div>

            {peopleFacet.hasMore && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => toggleExpanded('people')}
              >
                {expandedFacets['people'] ? 'Show less' : `Show all (${peopleFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 7. Restaurant Type / Cuisine */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('cuisines')}
        >
          <span className="section-title">Cuisine / Type</span>
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

      {/* 7. Key Ingredient */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('ingredients')}
        >
          <span className="section-title">Main Ingredient</span>
          {openSections.ingredients ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.ingredients && (
          <div className="facet-content-block">
            {ingredientFacet.entries.length > 5 && (
              <div className="facet-search-box">
                <Search size={13} className="facet-search-icon" />
                <input
                  type="text"
                  placeholder="Filter ingredients..."
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="facet-search-input"
                />
                {ingredientSearch && (
                  <button
                    type="button"
                    onClick={() => setIngredientSearch('')}
                    className="facet-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="checkbox-list">
              {ingredientFacet.visibleEntries.map(([ingredient, count]) => {
                const isSelected = (filterState.ingredients || []).includes(ingredient);
                return (
                  <label key={ingredient} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleArray('ingredients', ingredient)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{ingredient}</span>
                    </div>
                    <span className="facet-count-badge">{count}</span>
                  </label>
                );
              })}
            </div>

            {ingredientFacet.hasMore && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => toggleExpanded('ingredients')}
              >
                {expandedFacets['ingredients'] ? 'Show less' : `Show all (${ingredientFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 8. Food Type / Dish Style */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('foodTypes')}
        >
          <span className="section-title">Dish Style</span>
          {openSections.foodTypes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.foodTypes && (
          <div className="facet-content-block">
            {foodTypeFacet.entries.length > 5 && (
              <div className="facet-search-box">
                <Search size={13} className="facet-search-icon" />
                <input
                  type="text"
                  placeholder="Filter styles..."
                  value={foodTypeSearch}
                  onChange={(e) => setFoodTypeSearch(e.target.value)}
                  className="facet-search-input"
                />
                {foodTypeSearch && (
                  <button
                    type="button"
                    onClick={() => setFoodTypeSearch('')}
                    className="facet-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="checkbox-list">
              {foodTypeFacet.visibleEntries.map(([style, count]) => {
                const isSelected = (filterState.foodTypes || []).includes(style);
                return (
                  <label key={style} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleArray('foodTypes', style)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{style}</span>
                    </div>
                    <span className="facet-count-badge">{count}</span>
                  </label>
                );
              })}
            </div>

            {foodTypeFacet.hasMore && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => toggleExpanded('foodTypes')}
              >
                {expandedFacets['foodTypes'] ? 'Show less' : `Show all (${foodTypeFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
