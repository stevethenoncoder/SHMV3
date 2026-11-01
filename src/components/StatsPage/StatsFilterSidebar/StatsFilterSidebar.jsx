import React, { useState, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Utensils,
  Star,
  Users,
  Briefcase,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  CANONICAL_MEAL_RATINGS,
  getDecade,
} from '../../../utils/statsAnalytics.js';
import './StatsFilterSidebar.css';

export default function StatsFilterSidebar({
  allMeals = [],
  filterState,
  onUpdateFilter,
  onResetFilters,
  counts = {},
}) {
  // Collapsible accordion state for sidebar sections
  const [openSections, setOpenSections] = useState({
    date: true,
    ratings: true,
    countries: true,
    cities: false,
    types: false,
    restaurants: false,
    people: false,
    business: true,
  });

  // Local search inputs
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');

  // Sort states: 'count_desc' | 'name_asc'
  const [sortModes, setSortModes] = useState({
    countries: 'count_desc',
    cities: 'count_desc',
    types: 'count_desc',
    restaurants: 'count_desc',
    people: 'count_desc',
  });

  // Expand "show all" vs "show top 6" within lists
  const [expandedFacets, setExpandedFacets] = useState({});

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpanded = (key) => {
    setExpandedFacets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSort = (facetKey) => {
    setSortModes((prev) => ({
      ...prev,
      [facetKey]: prev[facetKey] === 'count_desc' ? 'name_asc' : 'count_desc',
    }));
  };

  // Helper for array facet toggle (OR semantics within group)
  const handleToggleArray = (facetKey, value) => {
    const current = filterState[facetKey] || [];
    const updated = current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value];
    onUpdateFilter({ [facetKey]: updated });
  };

  // Facet filtering and sorting helper
  const processFacetItems = (
    countsMap = {},
    searchQuery = '',
    sortMode = 'count_desc',
    selectedList = [],
    facetKey = ''
  ) => {
    const q = searchQuery.toLowerCase().trim();
    const entries = Object.entries(countsMap)
      .filter(([rawKey, count]) => {
        if (!rawKey || rawKey === 'null' || rawKey === 'undefined') return false;
        const displayName = rawKey.includes(':::') ? rawKey.split(':::')[1] : rawKey;
        const matches = displayName.toLowerCase().includes(q);
        const isSelected = selectedList.includes(displayName);
        return matches && (count > 0 || isSelected);
      })
      .map(([rawKey, count]) => {
        if (rawKey.includes(':::')) {
          const [idStr, name] = rawKey.split(':::');
          return { id: parseInt(idStr, 10), name, count };
        }
        return { name: rawKey, count };
      })
      .sort((a, b) => {
        const aSel = selectedList.includes(a.name);
        const bSel = selectedList.includes(b.name);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;

        if (sortMode === 'count_desc') {
          if (b.count !== a.count) return b.count - a.count;
          return a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });

    const isExpanded = expandedFacets[facetKey];
    const visible = isExpanded ? entries : entries.slice(0, 6);
    return {
      entries,
      visible,
      hasMore: entries.length > 6,
    };
  };

  // Process list facets
  const countryFacet = useMemo(
    () =>
      processFacetItems(
        counts.countries,
        countrySearch,
        sortModes.countries,
        filterState.countries || [],
        'countries'
      ),
    [counts.countries, countrySearch, sortModes.countries, filterState.countries, expandedFacets]
  );

  const cityFacet = useMemo(
    () =>
      processFacetItems(
        counts.cities,
        citySearch,
        sortModes.cities,
        filterState.cities || [],
        'cities'
      ),
    [counts.cities, citySearch, sortModes.cities, filterState.cities, expandedFacets]
  );

  const typeFacet = useMemo(
    () =>
      processFacetItems(
        counts.types,
        typeSearch,
        sortModes.types,
        filterState.restaurantTypes || [],
        'types'
      ),
    [counts.types, typeSearch, sortModes.types, filterState.restaurantTypes, expandedFacets]
  );

  const restaurantFacet = useMemo(
    () =>
      processFacetItems(
        counts.restaurants,
        restaurantSearch,
        sortModes.restaurants,
        filterState.restaurantName ? [filterState.restaurantName] : [],
        'restaurants'
      ),
    [counts.restaurants, restaurantSearch, sortModes.restaurants, filterState.restaurantName, expandedFacets]
  );

  const peopleFacet = useMemo(
    () =>
      processFacetItems(
        counts.people,
        peopleSearch,
        sortModes.people,
        filterState.personName ? [filterState.personName] : [],
        'people'
      ),
    [counts.people, peopleSearch, sortModes.people, filterState.personName, expandedFacets]
  );

  // Active filter chips list
  const activeChips = useMemo(() => {
    const chips = [];

    if (filterState.dateMode === 'this_year') {
      chips.push({ key: 'this_year', label: 'This Year', onRemove: () => onUpdateFilter({ dateMode: 'all', year: null }) });
    } else if (filterState.dateMode === 'year' && filterState.year) {
      chips.push({ key: 'year', label: `Year: ${filterState.year}`, onRemove: () => onUpdateFilter({ dateMode: 'all', year: null }) });
    } else if (filterState.dateMode === 'decade' && filterState.decade) {
      chips.push({ key: 'decade', label: `Decade: ${filterState.decade}`, onRemove: () => onUpdateFilter({ dateMode: 'all', decade: null }) });
    }

    (filterState.ratings || []).forEach((r) => {
      const match = CANONICAL_MEAL_RATINGS.find((item) => item.text === r);
      chips.push({
        key: `rating-${r}`,
        label: `Rating: ${match?.displayLabel || r}`,
        onRemove: () => handleToggleArray('ratings', r),
      });
    });

    (filterState.countries || []).forEach((c) => {
      chips.push({
        key: `country-${c}`,
        label: `Country: ${c}`,
        onRemove: () => handleToggleArray('countries', c),
      });
    });

    (filterState.cities || []).forEach((city) => {
      chips.push({
        key: `city-${city}`,
        label: `City: ${city}`,
        onRemove: () => handleToggleArray('cities', city),
      });
    });

    (filterState.restaurantTypes || []).forEach((t) => {
      chips.push({
        key: `type-${t}`,
        label: `Type: ${t}`,
        onRemove: () => handleToggleArray('restaurantTypes', t),
      });
    });

    if (filterState.restaurantId) {
      chips.push({
        key: 'restaurant',
        label: `Venue: ${filterState.restaurantName || filterState.restaurantId}`,
        onRemove: () => onUpdateFilter({ restaurantId: null, restaurantName: '' }),
      });
    }

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

    return chips;
  }, [filterState, onUpdateFilter]);

  // Unique sorted years for date section
  const availableYears = useMemo(() => {
    return Object.keys(counts.years || {})
      .map((y) => parseInt(y, 10))
      .sort((a, b) => b - a);
  }, [counts.years]);

  const availableDecades = useMemo(() => {
    return Object.keys(counts.decades || {}).sort().reverse();
  }, [counts.decades]);

  return (
    <aside className="stats-sidebar-root">
      {/* Sidebar Header */}
      <div className="stats-sidebar-header">
        <h2 className="stats-sidebar-title">Filters</h2>
        {activeChips.length > 0 && (
          <button
            type="button"
            className="stats-btn-clear-all"
            onClick={onResetFilters}
            title="Reset all filters to All Time"
          >
            Clear all ({activeChips.length})
          </button>
        )}
      </div>

      {/* Active Chips Strip */}
      {activeChips.length > 0 && (
        <div className="sidebar-active-chips">
          {activeChips.map((chip) => (
            <span key={chip.key} className="sidebar-chip">
              <span>{chip.label}</span>
              <button
                type="button"
                className="chip-del-btn"
                onClick={chip.onRemove}
                title="Remove filter"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 1. Date / Time Filter Section */}
      <div className="stats-accordion-section">
        <button
          type="button"
          className="stats-accordion-btn"
          onClick={() => toggleSection('date')}
        >
          <div className="accordion-btn-left">
            <Calendar size={14} className="section-icon blue" />
            <span>Time / Period</span>
          </div>
          {openSections.date ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.date && (
          <div className="accordion-content">
            <div className="date-radio-options">
              <label
                className={`stats-option-row ${filterState.dateMode === 'all' ? 'is-selected' : ''}`}
                onClick={() => onUpdateFilter({ dateMode: 'all', year: null, decade: null })}
              >
                <input
                  type="radio"
                  name="stats-date"
                  checked={filterState.dateMode === 'all'}
                  onChange={() => {}}
                />
                <span className="option-name">All Time</span>
                <span className="facet-count-badge">{counts.totalMeals || allMeals.length}</span>
              </label>

              <label
                className={`stats-option-row ${filterState.dateMode === 'this_year' ? 'is-selected' : ''}`}
                onClick={() => onUpdateFilter({ dateMode: 'this_year', year: null, decade: null })}
              >
                <input
                  type="radio"
                  name="stats-date"
                  checked={filterState.dateMode === 'this_year'}
                  onChange={() => {}}
                />
                <span className="option-name">This Year ({availableYears[0] || '2026'})</span>
                <span className="facet-count-badge">
                  {counts.years?.[availableYears[0]] || 0}
                </span>
              </label>
            </div>

            {/* Decades pills */}
            <div className="facet-sub-header">Decades</div>
            <div className="pills-flex-wrap">
              {availableDecades.map((dec) => {
                const isSelected = filterState.dateMode === 'decade' && filterState.decade === dec;
                const count = counts.decades?.[dec] || 0;
                return (
                  <button
                    key={dec}
                    type="button"
                    className={`stats-filter-pill ${isSelected ? 'active' : ''}`}
                    onClick={() =>
                      onUpdateFilter({
                        dateMode: isSelected ? 'all' : 'decade',
                        decade: isSelected ? null : dec,
                        year: null,
                      })
                    }
                  >
                    <span>{dec}</span>
                    <span className="pill-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Specific Year select */}
            <div className="facet-sub-header">Specific Year</div>
            <select
              className="sidebar-native-select"
              value={filterState.dateMode === 'year' && filterState.year ? filterState.year : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  onUpdateFilter({ dateMode: 'all', year: null });
                } else {
                  onUpdateFilter({ dateMode: 'year', year: parseInt(val, 10), decade: null });
                }
              }}
            >
              <option value="">Select a year...</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} ({counts.years?.[yr] || 0})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Rating Filter Section */}
      <div className="stats-accordion-section">
        <button
          type="button"
          className="stats-accordion-btn"
          onClick={() => toggleSection('ratings')}
        >
          <div className="accordion-btn-left">
            <Star size={14} className="section-icon yellow" />
            <span>Meal Rating</span>
          </div>
          {openSections.ratings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.ratings && (
          <div className="accordion-content">
            <div className="facet-list">
              {CANONICAL_MEAL_RATINGS.map((r) => {
                const count = counts.ratings?.[r.text] || counts.ratings?.[r.shortText] || 0;
                const isChecked = (filterState.ratings || []).includes(r.text);

                return (
                  <label
                    key={r.id}
                    className={`stats-option-row ${isChecked ? 'is-selected' : ''}`}
                    onClick={() => handleToggleArray('ratings', r.text)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                    />
                    <span className="rating-dot" style={{ backgroundColor: r.color }} />
                    <span className="option-name">{r.displayLabel || r.text}</span>
                    <span className="facet-count-badge">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Countries Filter Section */}
      <div className="stats-accordion-section">
        <button
          type="button"
          className="stats-accordion-btn"
          onClick={() => toggleSection('countries')}
        >
          <div className="accordion-btn-left">
            <MapPin size={14} className="section-icon red" />
            <span>Country</span>
          </div>
          {openSections.countries ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.countries && (
          <div className="accordion-content">
            {/* Search & Sort Bar */}
            <div className="facet-search-sort-bar">
              <div className="facet-search-box">
                <Search size={12} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                />
                {countrySearch && (
                  <button type="button" onClick={() => setCountrySearch('')}>
                    <X size={10} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="facet-sort-toggle-btn"
                onClick={() => toggleSort('countries')}
                title={`Sort by: ${sortModes.countries === 'count_desc' ? 'Count' : 'Name A-Z'}`}
              >
                <ArrowUpDown size={12} />
                <span>{sortModes.countries === 'count_desc' ? 'Count' : 'A–Z'}</span>
              </button>
            </div>

            {/* List */}
            <div className="facet-list">
              {countryFacet.visible.map((item) => {
                const isChecked = (filterState.countries || []).includes(item.name);
                return (
                  <label
                    key={item.name}
                    className={`stats-option-row ${isChecked ? 'is-selected' : ''}`}
                    onClick={() => handleToggleArray('countries', item.name)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                    />
                    <span className="option-name">{item.name}</span>
                    <span className="facet-count-badge">{item.count}</span>
                  </label>
                );
              })}
            </div>

            {countryFacet.hasMore && (
              <button
                type="button"
                className="facet-expand-toggle-btn"
                onClick={() => toggleExpanded('countries')}
              >
                {expandedFacets.countries
                  ? 'Show fewer'
                  : `Show all ${countryFacet.entries.length}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Cities Filter Section */}
      <div className="stats-accordion-section">
        <button
          type="button"
          className="stats-accordion-btn"
          onClick={() => toggleSection('cities')}
        >
          <div className="accordion-btn-left">
            <MapPin size={14} className="section-icon emerald" />
            <span>City</span>
          </div>
          {openSections.cities ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.cities && (
          <div className="accordion-content">
            <div className="facet-search-sort-bar">
              <div className="facet-search-box">
                <Search size={12} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                />
                {citySearch && (
                  <button type="button" onClick={() => setCitySearch('')}>
                    <X size={10} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="facet-sort-toggle-btn"
                onClick={() => toggleSort('cities')}
                title={`Sort by: ${sortModes.cities === 'count_desc' ? 'Count' : 'Name A-Z'}`}
              >
                <ArrowUpDown size={12} />
                <span>{sortModes.cities === 'count_desc' ? 'Count' : 'A–Z'}</span>
              </button>
            </div>

            <div className="facet-list">
              {cityFacet.visible.map((item) => {
                const isChecked = (filterState.cities || []).includes(item.name);
                return (
                  <label
                    key={item.name}
                    className={`stats-option-row ${isChecked ? 'is-selected' : ''}`}
                    onClick={() => handleToggleArray('cities', item.name)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                    />
                    <span className="option-name">{item.name}</span>
                    <span className="facet-count-badge">{item.count}</span>
                  </label>
                );
              })}
            </div>

            {cityFacet.hasMore && (
              <button
                type="button"
                className="facet-expand-toggle-btn"
                onClick={() => toggleExpanded('cities')}
              >
                {expandedFacets.cities
                  ? 'Show fewer'
                  : `Show all ${cityFacet.entries.length}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Restaurant Type / Cuisine */}
      <div className="stats-accordion-section">
        <button
          type="button"
          className="stats-accordion-btn"
          onClick={() => toggleSection('types')}
        >
          <div className="accordion-btn-left">
            <Utensils size={14} className="section-icon purple" />
            <span>Restaurant Type</span>
          </div>
          {openSections.types ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.types && (
          <div className="accordion-content">
            <div className="facet-search-sort-bar">
              <div className="facet-search-box">
                <Search size={12} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search types..."
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                />
                {typeSearch && (
                  <button type="button" onClick={() => setTypeSearch('')}>
                    <X size={10} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="facet-sort-toggle-btn"
                onClick={() => toggleSort('types')}
                title={`Sort by: ${sortModes.types === 'count_desc' ? 'Count' : 'Name A-Z'}`}
              >
                <ArrowUpDown size={12} />
                <span>{sortModes.types === 'count_desc' ? 'Count' : 'A–Z'}</span>
              </button>
            </div>

            <div className="facet-list">
              {typeFacet.visible.map((item) => {
                const isChecked = (filterState.restaurantTypes || []).includes(item.name);
                return (
                  <label
                    key={item.name}
                    className={`stats-option-row ${isChecked ? 'is-selected' : ''}`}
                    onClick={() => handleToggleArray('restaurantTypes', item.name)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                    />
                    <span className="option-name">{item.name}</span>
                    <span className="facet-count-badge">{item.count}</span>
                  </label>
                );
              })}
            </div>

            {typeFacet.hasMore && (
              <button
                type="button"
                className="facet-expand-toggle-btn"
                onClick={() => toggleExpanded('types')}
              >
                {expandedFacets.types
                  ? 'Show fewer'
                  : `Show all ${typeFacet.entries.length}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 6. Restaurants Selection */}
      <div className="stats-accordion-section">
        <button
          type="button"
          className="stats-accordion-btn"
          onClick={() => toggleSection('restaurants')}
        >
          <div className="accordion-btn-left">
            <Utensils size={14} className="section-icon indigo" />
            <span>Restaurant</span>
          </div>
          {openSections.restaurants ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.restaurants && (
          <div className="accordion-content">
            <div className="facet-search-sort-bar">
              <div className="facet-search-box">
                <Search size={12} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  value={restaurantSearch}
                  onChange={(e) => setRestaurantSearch(e.target.value)}
                />
                {restaurantSearch && (
                  <button type="button" onClick={() => setRestaurantSearch('')}>
                    <X size={10} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="facet-sort-toggle-btn"
                onClick={() => toggleSort('restaurants')}
                title={`Sort by: ${sortModes.restaurants === 'count_desc' ? 'Count' : 'Name A-Z'}`}
              >
                <ArrowUpDown size={12} />
                <span>{sortModes.restaurants === 'count_desc' ? 'Count' : 'A–Z'}</span>
              </button>
            </div>

            <div className="facet-list">
              {restaurantFacet.visible.map((item) => {
                const isChecked = filterState.restaurantId === item.id || filterState.restaurantName === item.name;
                return (
                  <label
                    key={item.name}
                    className={`stats-option-row ${isChecked ? 'is-selected' : ''}`}
                    onClick={() => {
                      if (isChecked) {
                        onUpdateFilter({ restaurantId: null, restaurantName: '' });
                      } else {
                        onUpdateFilter({ restaurantId: item.id || null, restaurantName: item.name });
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="stats-rest-select"
                      checked={isChecked}
                      onChange={() => {}}
                    />
                    <span className="option-name">{item.name}</span>
                    <span className="facet-count-badge">{item.count}</span>
                  </label>
                );
              })}
            </div>

            {restaurantFacet.hasMore && (
              <button
                type="button"
                className="facet-expand-toggle-btn"
                onClick={() => toggleExpanded('restaurants')}
              >
                {expandedFacets.restaurants
                  ? 'Show fewer'
                  : `Show all ${restaurantFacet.entries.length}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 7. Dining Companion / People */}
      <div className="stats-accordion-section">
        <button
          type="button"
          className="stats-accordion-btn"
          onClick={() => toggleSection('people')}
        >
          <div className="accordion-btn-left">
            <Users size={14} className="section-icon blue" />
            <span>Companion</span>
          </div>
          {openSections.people ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.people && (
          <div className="accordion-content">
            <div className="facet-search-sort-bar">
              <div className="facet-search-box">
                <Search size={12} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search companions..."
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                />
                {peopleSearch && (
                  <button type="button" onClick={() => setPeopleSearch('')}>
                    <X size={10} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="facet-sort-toggle-btn"
                onClick={() => toggleSort('people')}
                title={`Sort by: ${sortModes.people === 'count_desc' ? 'Count' : 'Name A-Z'}`}
              >
                <ArrowUpDown size={12} />
                <span>{sortModes.people === 'count_desc' ? 'Count' : 'A–Z'}</span>
              </button>
            </div>

            <div className="facet-list">
              {peopleFacet.visible.map((item) => {
                const isChecked = filterState.personName === item.name;
                return (
                  <label
                    key={item.name}
                    className={`stats-option-row ${isChecked ? 'is-selected' : ''}`}
                    onClick={() => {
                      onUpdateFilter({ personName: isChecked ? null : item.name });
                    }}
                  >
                    <input
                      type="radio"
                      name="stats-person-select"
                      checked={isChecked}
                      onChange={() => {}}
                    />
                    <span className="option-name">{item.name}</span>
                    <span className="facet-count-badge">{item.count}</span>
                  </label>
                );
              })}
            </div>

            {peopleFacet.hasMore && (
              <button
                type="button"
                className="facet-expand-toggle-btn"
                onClick={() => toggleExpanded('people')}
              >
                {expandedFacets.people
                  ? 'Show fewer'
                  : `Show all ${peopleFacet.entries.length}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 8. Business Meals Toggle */}
      <div className="stats-accordion-section">
        <div className="accordion-content" style={{ paddingTop: 10 }}>
          <label className={`stats-toggle-card ${filterState.isBusinessOnly ? 'active' : ''}`}>
            <div className="toggle-card-left">
              <Briefcase size={14} className="section-icon amber" />
              <span>Business Meals Only</span>
            </div>
            <div className="toggle-card-right">
              <span className="facet-count-badge">{counts.businessCount || 0}</span>
              <input
                type="checkbox"
                checked={Boolean(filterState.isBusinessOnly)}
                onChange={(e) => onUpdateFilter({ isBusinessOnly: e.target.checked })}
              />
            </div>
          </label>
        </div>
      </div>
    </aside>
  );
}
