import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Filter, X, ChevronRight, RotateCcw } from 'lucide-react';
import { createPlacesGlobe } from '../../places/placesGlobe.module.js';
import geo from '../../journey/film-geo.json';
import {
  precomputePlacesSpatialIndex,
  filterPlacesMeals,
  aggregatePlacesPoints,
} from '../../utils/placesGlobeData.js';
import './PlacesPage.css';

const TOP_N_STEPS = [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 0];
const DEFAULT_TOP_N_INDEX = 3; // 20

const MODE_LABELS = {
  country: 'Countries',
  city: 'Cities',
  area: 'London areas',
  rest: 'Restaurants',
};

const MODE_TRAIL_LABELS = {
  country: 'countries',
  city: 'cities',
  area: 'areas',
  rest: 'restaurants',
};

export default function PlacesPage({ mealsData }) {
  // 1. Precompute spatial positions once for dataset
  const spatialIndex = useMemo(() => {
    return precomputePlacesSpatialIndex(mealsData);
  }, [mealsData]);

  const londonCityId = spatialIndex.londonCityId;

  // Determine global year range
  const { minYear, maxYear } = useMemo(() => {
    if (!mealsData?.meals?.length) return { minYear: 1994, maxYear: new Date().getFullYear() };
    let min = 9999;
    let max = 0;
    for (const m of mealsData.meals) {
      if (m.year) {
        if (m.year < min) min = m.year;
        if (m.year > max) max = m.year;
      }
    }
    return { minYear: min, maxYear: max };
  }, [mealsData]);

  // 2. Filter states
  const [filters, setFilters] = useState({
    country: '',
    city: '',
    area: '',
    type: '',
    from: minYear,
    to: maxYear,
    person: '',
  });

  // Keep from/to in sync if min/max change on initial load
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      from: minYear,
      to: maxYear,
    }));
  }, [minYear, maxYear]);

  // View state: level mode ('country' | 'city' | 'area' | 'rest')
  const [mode, setMode] = useState('country');
  // Top N slider index (0..12)
  const [topNIndex, setTopNIndex] = useState(DEFAULT_TOP_N_INDEX);
  // Selected restaurant ID (highlighted)
  const [selectedRestId, setSelectedRestId] = useState(null);
  // Mobile filter drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const topN = TOP_N_STEPS[topNIndex];

  // Helper: check if London is currently selected
  const isLondonSelected = useMemo(() => {
    if (filters.city === '' || londonCityId == null) return false;
    return parseInt(filters.city, 10) === londonCityId;
  }, [filters.city, londonCityId]);

  // 3. Option lists for filters
  const countriesList = useMemo(() => {
    if (!mealsData?.countriesById) return [];
    return Array.from(mealsData.countriesById.values())
      .filter((c) => c.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mealsData]);

  const citiesList = useMemo(() => {
    if (!mealsData?.citiesById) return [];
    const list = Array.from(mealsData.citiesById.values());
    const targetCountryId = filters.country !== '' ? parseInt(filters.country, 10) : null;
    return list
      .filter((c) => {
        if (!c.name) return false;
        if (targetCountryId != null) {
          const cCountryId = c.countryId || c.country?.id;
          return cCountryId === targetCountryId;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mealsData, filters.country]);

  const restaurantTypesList = useMemo(() => {
    if (!mealsData?.restaurants) return [];
    const set = new Set();
    for (const r of mealsData.restaurants) {
      const tg = r.typeGroup || r.type?.typeGroup || r.type?.name;
      if (tg) set.add(tg);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [mealsData]);

  const peopleList = useMemo(() => {
    if (!mealsData?.meals || !mealsData?.publicPeopleById) return [];
    // Count meals per person
    const counts = new Map();
    for (const m of mealsData.meals) {
      for (const pId of m.allPeopleIds || []) {
        counts.set(pId, (counts.get(pId) || 0) + 1);
      }
    }
    const list = [];
    for (const [id, person] of mealsData.publicPeopleById.entries()) {
      const name = (person.publicName || '').trim();
      if (!name || name === 'Hidden name' || name.includes('Just Me') || /\d{3}/.test(name)) {
        continue;
      }
      const count = counts.get(id) || 0;
      if (count > 0) {
        list.push({ id, name, count });
      }
    }
    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [mealsData]);

  // 4. Filter meals and aggregate points
  const filteredMeals = useMemo(() => {
    if (!mealsData?.meals) return [];
    return filterPlacesMeals(mealsData.meals, filters, londonCityId);
  }, [mealsData, filters, londonCityId]);

  const aggregatedData = useMemo(() => {
    if (!mealsData) {
      return {
        allPoints: [],
        topPoints: [],
        kpis: { meals: 0, countries: 0, cities: 0, restaurants: 0 },
        noCoordMeals: 0,
        noAreaMeals: 0,
      };
    }
    return aggregatePlacesPoints({
      filteredMeals,
      mode,
      topN,
      spatialIndex,
      mealsData,
    });
  }, [filteredMeals, mode, topN, spatialIndex, mealsData]);

  const { allPoints, topPoints, kpis, noCoordMeals, noAreaMeals } = aggregatedData;

  // Max meal count for progress bars
  const maxMealsInTop = useMemo(() => {
    if (!topPoints.length) return 1;
    return topPoints[0].n || 1;
  }, [topPoints]);

  // 5. Globe component lifecycle
  const globeContainerRef = useRef(null);
  const globeInstanceRef = useRef(null);
  const isUpdatingRef = useRef(false);

  // Drill down handler
  const handleDrill = useCallback(
    (point) => {
      if (!point) return;

      if (mode === 'country') {
        setFilters((prev) => ({
          ...prev,
          country: String(point.key),
          city: '',
          area: '',
        }));
        setSelectedRestId(null);
        setMode('city');
      } else if (mode === 'city') {
        const isLondon = point.key === londonCityId;
        const cityObj = mealsData?.citiesById?.get(point.key);
        const countryId = cityObj?.countryId || cityObj?.country?.id;

        setFilters((prev) => ({
          ...prev,
          city: String(point.key),
          country: countryId != null ? String(countryId) : prev.country,
          area: '',
        }));
        setSelectedRestId(null);
        setMode(isLondon ? 'area' : 'rest');
      } else if (mode === 'area') {
        setFilters((prev) => ({
          ...prev,
          area: String(point.key),
        }));
        setSelectedRestId(null);
        setMode('rest');
      } else {
        // mode === 'rest'
        setSelectedRestId((prev) => (prev === point.id ? null : point.id));
      }
    },
    [mode, londonCityId, mealsData]
  );

  // Mount 3D Globe
  useEffect(() => {
    const container = globeContainerRef.current;
    if (!container) return;

    try {
      const globe = createPlacesGlobe(container, {
        THREE,
        geo,
        onSelect: (pt) => handleDrill(pt),
      });
      globeInstanceRef.current = globe;
    } catch (err) {
      console.warn('Could not initialize PlacesGlobe:', err);
    }

    return () => {
      if (globeInstanceRef.current) {
        try {
          globeInstanceRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying globe:', e);
        }
        globeInstanceRef.current = null;
      }
    };
  }, [handleDrill]);

  // Update Globe whenever points or selection change
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    // Highlight selected restaurant
    globe.highlight(selectedRestId);

    // If only restaurant selection changed, avoid camera fly
    const shouldFit = !isUpdatingRef.current;
    isUpdatingRef.current = false;
    globe.update(topPoints, { fit: shouldFit });
  }, [topPoints, selectedRestId]);

  // Back up logic
  const canUp = useMemo(() => {
    return (
      selectedRestId != null ||
      filters.area !== '' ||
      filters.city !== '' ||
      filters.country !== '' ||
      mode !== 'country'
    );
  }, [selectedRestId, filters, mode]);

  const handleBack = useCallback(() => {
    // 1. If restaurant selected, clear selection
    if (selectedRestId) {
      setSelectedRestId(null);
      isUpdatingRef.current = true;
      return;
    }

    // 2. If area set, clear area and return to area level
    if (filters.area !== '') {
      setFilters((prev) => ({ ...prev, area: '' }));
      setMode('area');
      return;
    }

    // 3. If city set: when on London's restaurants go to area, otherwise clear city and go to city level
    if (filters.city !== '') {
      if (mode === 'rest' && isLondonSelected) {
        setMode('area');
        return;
      }
      setFilters((prev) => ({ ...prev, city: '', area: '' }));
      setMode('city');
      return;
    }

    // 4. If only country set: on restaurant go to city, otherwise clear country and go to country level
    if (filters.country !== '') {
      if (mode === 'rest') {
        setMode('city');
        return;
      }
      setFilters((prev) => ({ ...prev, country: '', city: '', area: '' }));
      setMode('country');
      return;
    }

    // 5. With no place filters, any level other than country goes to country
    if (mode !== 'country') {
      setMode('country');
    }
  }, [selectedRestId, filters, mode, isLondonSelected]);

  // Esc key listener
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        const tag = (e.target?.tagName || '').toUpperCase();
        if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
          if (canUp) {
            e.preventDefault();
            handleBack();
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canUp, handleBack]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      country: '',
      city: '',
      area: '',
      type: '',
      from: minYear,
      to: maxYear,
      person: '',
    });
    setSelectedRestId(null);
    setMode('country');
  }, [minYear, maxYear]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.country !== '' ||
      filters.city !== '' ||
      filters.area !== '' ||
      filters.type !== '' ||
      filters.person !== '' ||
      filters.from !== minYear ||
      filters.to !== maxYear
    );
  }, [filters, minYear, maxYear]);

  // Direct level toggle click
  const handleToggleMode = (newMode) => {
    setSelectedRestId(null);
    if (newMode === 'area') {
      setFilters((prev) => ({ ...prev, area: '' }));
    }
    setMode(newMode);
  };

  // Breadcrumb Trail calculation
  const breadcrumbTrail = useMemo(() => {
    const trail = [
      {
        name: 'World',
        onClick: () => {
          setFilters((prev) => ({ ...prev, country: '', city: '', area: '' }));
          setSelectedRestId(null);
          setMode('country');
        },
      },
    ];

    if (filters.country !== '') {
      const c = mealsData?.countriesById?.get(parseInt(filters.country, 10));
      trail.push({
        name: c?.name || 'Country',
        onClick: () => {
          setFilters((prev) => ({ ...prev, city: '', area: '' }));
          setSelectedRestId(null);
          setMode('city');
        },
      });
    }

    if (filters.city !== '') {
      const city = mealsData?.citiesById?.get(parseInt(filters.city, 10));
      trail.push({
        name: city?.name || 'City',
        onClick: () => {
          setSelectedRestId(null);
          setFilters((prev) => ({ ...prev, area: '' }));
          setMode(isLondonSelected ? 'area' : 'rest');
        },
      });
    }

    if (filters.area !== '') {
      const aName = mealsData?.londonAreasById?.get(parseInt(filters.area, 10));
      trail.push({
        name: aName || 'Area',
        onClick: () => {},
      });
    }

    return trail;
  }, [filters, mealsData, isLondonSelected]);

  return (
    <div className="places-page-layout">
      {/* 1. Left Filter Sidebar (Chronicle Style) */}
      <aside className={`places-sidebar ${mobileFilterOpen ? 'mobile-open' : ''}`}>
        <div className="places-sidebar-inner">
          <div className="places-sidebar-header">
            <h2 className="places-sidebar-title">Filters</h2>
            {hasActiveFilters && (
              <button
                type="button"
                className="places-btn-clear"
                onClick={handleClearFilters}
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              className="places-mobile-close-btn"
              onClick={() => setMobileFilterOpen(false)}
              aria-label="Close filters"
            >
              <X size={20} />
            </button>
          </div>

          <div className="places-filter-group">
            <label htmlFor="places-country-select">Country</label>
            <select
              id="places-country-select"
              value={filters.country}
              onChange={(e) => {
                const val = e.target.value;
                setFilters((prev) => ({
                  ...prev,
                  country: val,
                  city: '',
                  area: '',
                }));
                setSelectedRestId(null);
                if (mode === 'area') setMode('city');
              }}
            >
              <option value="">All countries</option>
              {countriesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="places-filter-group">
            <label htmlFor="places-city-select">City</label>
            <select
              id="places-city-select"
              value={filters.city}
              onChange={(e) => {
                const val = e.target.value;
                const cityObj = val ? mealsData?.citiesById?.get(parseInt(val, 10)) : null;
                const cCountryId = cityObj?.countryId || cityObj?.country?.id;

                setFilters((prev) => ({
                  ...prev,
                  city: val,
                  country: cCountryId != null ? String(cCountryId) : prev.country,
                  area: '',
                }));
                setSelectedRestId(null);
                if (mode === 'area' && val !== String(londonCityId)) {
                  setMode('city');
                }
              }}
            >
              <option value="">All cities</option>
              {citiesList.map((ci) => {
                const country = mealsData?.countriesById?.get(ci.countryId || ci.country?.id);
                const label =
                  filters.country === '' && country?.name
                    ? `${ci.name}, ${country.name}`
                    : ci.name;
                return (
                  <option key={ci.id} value={ci.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="places-filter-group">
            <label htmlFor="places-type-select">Restaurant type</label>
            <select
              id="places-type-select"
              value={filters.type}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, type: e.target.value }));
                setSelectedRestId(null);
              }}
            >
              <option value="">All types</option>
              {restaurantTypesList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="places-filter-group">
            <label>Years</label>
            <div className="places-years-row">
              <select
                id="places-year-from"
                value={filters.from}
                aria-label="From year"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setFilters((prev) => ({
                    ...prev,
                    from: val,
                    to: val > prev.to ? val : prev.to,
                  }));
                }}
              >
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  )
                )}
              </select>
              <span className="places-years-dash">–</span>
              <select
                id="places-year-to"
                value={filters.to}
                aria-label="To year"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setFilters((prev) => ({
                    ...prev,
                    to: val,
                    from: val < prev.from ? val : prev.from,
                  }));
                }}
              >
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="places-filter-group">
            <label htmlFor="places-person-select">Person</label>
            <select
              id="places-person-select"
              value={filters.person}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, person: e.target.value }));
                setSelectedRestId(null);
              }}
            >
              <option value="">Everyone (all meals)</option>
              {peopleList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.count.toLocaleString('en-GB')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="places-main-area">
        {/* Mobile Filter Trigger Toolbar */}
        <div className="places-mobile-toolbar">
          <button
            type="button"
            className="places-mobile-filter-trigger"
            onClick={() => setMobileFilterOpen(true)}
          >
            <Filter size={16} />
            <span>Filters</span>
            {hasActiveFilters && <span className="places-active-filter-dot" />}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="places-mobile-clear-btn"
              onClick={handleClearFilters}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Top: 4 Compact KPIs Strip */}
        <div className="places-kpis-strip" aria-label="Places Key Statistics">
          <div className="places-kpi-item">
            <span className="places-kpi-val">{kpis.meals.toLocaleString('en-GB')}</span>
            <span className="places-kpi-lbl">{kpis.meals === 1 ? 'Meal' : 'Meals'}</span>
          </div>
          <div className="places-kpi-divider" />
          <div className="places-kpi-item">
            <span className="places-kpi-val">{kpis.countries.toLocaleString('en-GB')}</span>
            <span className="places-kpi-lbl">
              {kpis.countries === 1 ? 'Country' : 'Countries'}
            </span>
          </div>
          <div className="places-kpi-divider" />
          <div className="places-kpi-item">
            <span className="places-kpi-val">{kpis.cities.toLocaleString('en-GB')}</span>
            <span className="places-kpi-lbl">{kpis.cities === 1 ? 'City' : 'Cities'}</span>
          </div>
          <div className="places-kpi-divider" />
          <div className="places-kpi-item">
            <span className="places-kpi-val">{kpis.restaurants.toLocaleString('en-GB')}</span>
            <span className="places-kpi-lbl">
              {kpis.restaurants === 1 ? 'Restaurant' : 'Restaurants'}
            </span>
          </div>
        </div>

        {/* Slim Controls Row */}
        <div className="places-control-row">
          {/* Level Toggle */}
          <div className="places-seg-group" role="group" aria-label="Level View Mode">
            <button
              type="button"
              className={`places-seg-btn ${mode === 'country' ? 'active' : ''}`}
              onClick={() => handleToggleMode('country')}
              aria-pressed={mode === 'country'}
            >
              Countries
            </button>
            <button
              type="button"
              className={`places-seg-btn ${mode === 'city' ? 'active' : ''}`}
              onClick={() => handleToggleMode('city')}
              aria-pressed={mode === 'city'}
            >
              Cities
            </button>
            {isLondonSelected && (
              <button
                type="button"
                className={`places-seg-btn ${mode === 'area' ? 'active' : ''}`}
                onClick={() => handleToggleMode('area')}
                aria-pressed={mode === 'area'}
              >
                London areas
              </button>
            )}
            <button
              type="button"
              className={`places-seg-btn ${mode === 'rest' ? 'active' : ''}`}
              onClick={() => handleToggleMode('rest')}
              aria-pressed={mode === 'rest'}
            >
              Restaurants
            </button>
          </div>

          {/* Top N Slider */}
          <div className="places-topn-control">
            <label htmlFor="places-topn-slider">Show</label>
            <input
              id="places-topn-slider"
              type="range"
              min="0"
              max={TOP_N_STEPS.length - 1}
              step="1"
              value={topNIndex}
              onChange={(e) => setTopNIndex(parseInt(e.target.value, 10))}
            />
            <output htmlFor="places-topn-slider" className="places-topn-output">
              {topN ? `Top ${topN}` : 'All'}
            </output>
          </div>

          {/* Clear Filters (Desktop) */}
          {hasActiveFilters && (
            <button
              type="button"
              className="places-desktop-clear-btn"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Middle Stage: Globe in Center, Ranked List on Right */}
        <div className="places-stage-grid">
          {/* 3D Globe Viewport */}
          <div className="places-globe-panel">
            {/* Breadcrumb Trail & Back in Top-Left */}
            <nav className="places-crumbs" aria-label="Navigation Breadcrumb">
              {canUp && (
                <button
                  type="button"
                  className="places-crumb-back"
                  onClick={handleBack}
                  aria-label="Go up a level"
                >
                  ‹ Back
                </button>
              )}
              {breadcrumbTrail.map((crumb, idx) => {
                const isLast = idx === breadcrumbTrail.length - 1;
                return (
                  <React.Fragment key={crumb.name + idx}>
                    {idx > 0 && <span className="places-crumb-sep">›</span>}
                    {isLast ? (
                      <span className="places-crumb-here">
                        {crumb.name} · {MODE_TRAIL_LABELS[mode]}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="places-crumb-link"
                        onClick={crumb.onClick}
                      >
                        {crumb.name}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Three.js Canvas Container */}
            <div
              id="places-globe-mount"
              ref={globeContainerRef}
              className="places-globe-container"
              aria-label="3D globe showing meals by place as towers. Drag to look around, scroll or pinch to zoom."
            />

            {/* Interaction Hint */}
            <div className="places-globe-hint">
              Drag to turn · scroll or pinch to zoom · click a tower to drill in · Esc or Back to go up
            </div>
          </div>

          {/* Ranked List Sidebar */}
          <aside className="places-ranked-panel">
            <h3 className="places-ranked-title">
              {MODE_LABELS[mode]}
              {allPoints.length > topPoints.length && (
                <span className="places-ranked-subcount">
                  {' '}· top {topPoints.length} of {allPoints.length}
                </span>
              )}
            </h3>

            <ul className="places-ranked-list" aria-label="Ranked places list">
              {topPoints.map((item, idx) => {
                const isSelected = selectedRestId === item.id;
                const barWidth = Math.max(3, (item.n / maxMealsInTop) * 100);
                const showSubtitle =
                  item.sub &&
                  (mode === 'rest' ? filters.city === '' : filters.country === '');

                return (
                  <li key={item.id} className="places-ranked-item">
                    <button
                      type="button"
                      className={`places-ranked-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleDrill(item)}
                    >
                      <span className="places-ranked-rank">{idx + 1}</span>
                      <span className="places-ranked-name">
                        {item.name}
                        {showSubtitle && (
                          <small className="places-ranked-sub">{item.sub}</small>
                        )}
                      </span>
                      <span className="places-ranked-count">
                        {item.n.toLocaleString('en-GB')}
                      </span>
                      <span
                        className="places-ranked-bar"
                        style={{ width: `${barWidth}%` }}
                      />
                    </button>
                  </li>
                );
              })}
              {topPoints.length === 0 && (
                <li className="places-ranked-empty">No places match the active filters.</li>
              )}
            </ul>

            {/* Coordinate / Area Exclusion Notes */}
            {(noCoordMeals > 0 || noAreaMeals > 0) && (
              <div className="places-ranked-note">
                {noCoordMeals > 0 &&
                  `${noCoordMeals.toLocaleString('en-GB')} meals are in places with no map position, so they are not shown. `}
                {noAreaMeals > 0 &&
                  `${noAreaMeals.toLocaleString('en-GB')} London meals have no area set.`}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
