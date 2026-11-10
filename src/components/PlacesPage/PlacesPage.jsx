import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import * as THREE from 'three';
import {
  Globe,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { loadMealsData } from '../../services/mealsDataService.js';
import { createPlacesGlobe } from '../../places/placesGlobe.module.js';
import geo from '../../journey/film-geo.json';
import {
  precomputePlacesSpatialIndex,
  filterPlacesMeals,
  aggregatePlacesPoints,
  calculatePlacesFacetCounts,
} from '../../utils/placesGlobeData.js';
import '../MealsFilterSidebar/MealsFilterSidebar.css';
import './PlacesPage.css';

// Canonical decades matching Chronicle
const CANONICAL_DECADES = ['2020s', '2010s', '2000s', '1990s'];

// Top N slider steps matching PLACES_GLOBE_HANDOVER.md
const TOP_N_STEPS = [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 0];

// Human-readable labels for the level toggle and list title
const MODE_LABELS = {
  country: 'Countries',
  city: 'Cities',
  area: 'London areas',
  rest: 'Restaurants',
};

// Trail suffix labels in the breadcrumb
const MODE_TRAIL_LABELS = {
  country: 'countries',
  city: 'cities',
  area: 'London areas',
  rest: 'restaurants',
};

export default function PlacesPage() {
  // 1. Data loading state
  const [mealsData, setMealsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Filter states
  const [filters, setFilters] = useState({
    country: '', // country ID as string
    city: '', // city ID as string
    area: '', // londonId as string
    types: [], // array of restaurant typeGroup strings
    from: 1994,
    to: 2026,
    decades: [], // array of decade strings
    people: [], // array of person ID strings
  });

  // Collapsible section open/close state (matching Chronicle)
  const [openSections, setOpenSections] = useState({
    country: true,
    city: false,
    types: false,
    years: false,
    people: false,
  });

  // In-facet search inputs (matching Chronicle)
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');

  // Expand "show all" vs "show top 6" within facets
  const [expandedFacets, setExpandedFacets] = useState({});

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const toggleExpanded = (facetKey) => {
    setExpandedFacets((prev) => ({ ...prev, [facetKey]: !prev[facetKey] }));
  };

  // 3. Drill-down and view level state
  const [mode, setMode] = useState('country'); // 'country' | 'city' | 'area' | 'rest'
  const [topNIndex, setTopNIndex] = useState(3); // default index 3 => 20
  const topN = TOP_N_STEPS[topNIndex];
  const [selectedRestId, setSelectedRestId] = useState(null);

  // Mobile filter drawer open/close
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Load raw data on mount
  useEffect(() => {
    let isMounted = true;
    loadMealsData()
      .then((data) => {
        if (!isMounted) return;
        setMealsData(data);
        if (data.meals && data.meals.length > 0) {
          const years = data.meals
            .map((m) => m.year)
            .filter((y) => typeof y === 'number' && y > 1900);
          if (years.length > 0) {
            const min = Math.min(...years);
            const max = Math.max(...years);
            setFilters((prev) => ({
              ...prev,
              from: min,
              to: max,
            }));
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error loading meals data in PlacesPage:', err);
        setError('Failed to load places data. Please try again.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Precompute spatial index
  const spatialIndex = useMemo(() => {
    return precomputePlacesSpatialIndex(mealsData);
  }, [mealsData]);

  const { londonCityId } = spatialIndex;
  const isLondonSelected =
    filters.city !== '' && String(filters.city) === String(londonCityId);

  // Min / Max years from dataset
  const { minYear, maxYear } = useMemo(() => {
    if (!mealsData?.meals) return { minYear: 1994, maxYear: 2026 };
    const years = mealsData.meals
      .map((m) => m.year)
      .filter((y) => typeof y === 'number' && y > 1900);
    return {
      minYear: years.length ? Math.min(...years) : 1994,
      maxYear: years.length ? Math.max(...years) : 2026,
    };
  }, [mealsData]);

  // Dynamic Facet Counts (Chronicle style: ordered by most number)
  const facetCounts = useMemo(() => {
    if (!mealsData?.meals) {
      return {
        countryCounts: {},
        cityCounts: {},
        typeCounts: {},
        decadeCounts: {},
        peopleCounts: {},
      };
    }
    return calculatePlacesFacetCounts(mealsData.meals, filters);
  }, [mealsData, filters]);

  // Country facet items
  const countryFacet = useMemo(() => {
    if (!mealsData?.countriesById) return { entries: [], visibleEntries: [], hasMore: false };
    const selected = filters.country ? [String(filters.country)] : [];
    const countsMap = facetCounts.countryCounts || {};
    const q = countrySearch.trim().toLowerCase();

    const entries = Array.from(mealsData.countriesById.entries())
      .map(([id, country]) => ({
        id: String(id),
        name: country.name || `Country ${id}`,
        count: countsMap[id] || 0,
      }))
      .filter((c) => {
        const matches = c.name.toLowerCase().includes(q);
        const hasCount = c.count > 0 || selected.includes(c.id);
        return matches && hasCount;
      })
      .sort((a, b) => {
        const aSel = selected.includes(a.id);
        const bSel = selected.includes(b.id);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

    const isExpanded = expandedFacets.country;
    return {
      entries,
      visibleEntries: isExpanded ? entries : entries.slice(0, 6),
      hasMore: entries.length > 6,
    };
  }, [mealsData, facetCounts.countryCounts, countrySearch, filters.country, expandedFacets.country]);

  // City facet items (scoped to country if selected)
  const cityFacet = useMemo(() => {
    if (!mealsData?.citiesById) return { entries: [], visibleEntries: [], hasMore: false };
    const selected = filters.city ? [String(filters.city)] : [];
    const countsMap = facetCounts.cityCounts || {};
    const q = citySearch.trim().toLowerCase();
    const countryFilter = filters.country ? parseInt(filters.country, 10) : null;

    const entries = Array.from(mealsData.citiesById.entries())
      .filter(([id, city]) => {
        if (countryFilter != null) {
          const cId = city.countryId || city.country?.id;
          if (cId !== countryFilter) return false;
        }
        return true;
      })
      .map(([id, city]) => {
        const cName =
          city.country?.name ||
          (city.countryId ? mealsData.countriesById?.get(city.countryId)?.name : '');
        return {
          id: String(id),
          name: city.name || `City ${id}`,
          countryName: cName,
          countryId: city.countryId || city.country?.id,
          count: countsMap[id] || 0,
        };
      })
      .filter((c) => {
        const matches =
          c.name.toLowerCase().includes(q) ||
          (c.countryName && c.countryName.toLowerCase().includes(q));
        const hasCount = c.count > 0 || selected.includes(c.id);
        return matches && hasCount;
      })
      .sort((a, b) => {
        const aSel = selected.includes(a.id);
        const bSel = selected.includes(b.id);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

    const isExpanded = expandedFacets.city;
    return {
      entries,
      visibleEntries: isExpanded ? entries : entries.slice(0, 6),
      hasMore: entries.length > 6,
    };
  }, [mealsData, facetCounts.cityCounts, citySearch, filters.city, filters.country, expandedFacets.city]);

  // Restaurant type facet items
  const typeFacet = useMemo(() => {
    const countsMap = facetCounts.typeCounts || {};
    const selected = filters.types || [];
    const q = typeSearch.trim().toLowerCase();

    // Gather all distinct typeGroups across meals
    const allTypes = new Set(Object.keys(countsMap));
    if (mealsData?.restaurants) {
      for (const r of mealsData.restaurants) {
        const tg = r.typeGroup || r.type?.typeGroup || r.type?.name;
        if (tg) allTypes.add(tg);
      }
    }

    const entries = Array.from(allTypes)
      .map((name) => ({
        name,
        count: countsMap[name] || 0,
      }))
      .filter((t) => {
        const matches = t.name.toLowerCase().includes(q);
        const hasCount = t.count > 0 || selected.includes(t.name);
        return matches && hasCount;
      })
      .sort((a, b) => {
        const aSel = selected.includes(a.name);
        const bSel = selected.includes(b.name);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

    const isExpanded = expandedFacets.types;
    return {
      entries,
      visibleEntries: isExpanded ? entries : entries.slice(0, 6),
      hasMore: entries.length > 6,
    };
  }, [mealsData, facetCounts.typeCounts, typeSearch, filters.types, expandedFacets.types]);

  // People facet items
  const peopleFacet = useMemo(() => {
    if (!mealsData?.publicPeopleById) return { entries: [], visibleEntries: [], hasMore: false };
    const countsMap = facetCounts.peopleCounts || {};
    const selected = (filters.people || []).map((p) => String(p));
    const q = peopleSearch.trim().toLowerCase();

    const entries = Array.from(mealsData.publicPeopleById.entries())
      .filter(([id, person]) => {
        const name = (person.publicName || '').trim();
        if (!name || name === 'Hidden name' || name.includes('Just Me') || /\d{3}/.test(name)) {
          return false;
        }
        return true;
      })
      .map(([id, person]) => ({
        id: String(id),
        name: person.publicName,
        count: countsMap[id] || 0,
      }))
      .filter((p) => {
        const matches = p.name.toLowerCase().includes(q);
        const hasCount = p.count > 0 || selected.includes(p.id);
        return matches && hasCount;
      })
      .sort((a, b) => {
        const aSel = selected.includes(a.id);
        const bSel = selected.includes(b.id);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

    const isExpanded = expandedFacets.people;
    return {
      entries,
      visibleEntries: isExpanded ? entries : entries.slice(0, 6),
      hasMore: entries.length > 6,
    };
  }, [mealsData, facetCounts.peopleCounts, peopleSearch, filters.people, expandedFacets.people]);

  // 4. Filter meals and aggregate points for the globe and list
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

  const maxMealsInTop = useMemo(() => {
    if (!topPoints.length) return 1;
    return topPoints[0].n || 1;
  }, [topPoints]);

  // 5. Globe component lifecycle
  const globeContainerRef = useRef(null);
  const globeInstanceRef = useRef(null);
  const isUpdatingRef = useRef(false);

  // Drill down handler (when a tower, label, or list row is clicked)
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
        setOpenSections((prev) => ({ ...prev, city: true }));
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

  // Update points on Globe when data or selection changes
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe.highlight(selectedRestId);

    const shouldFit = !isUpdatingRef.current;
    isUpdatingRef.current = false;
    globe.update(topPoints, { fit: shouldFit });
  }, [topPoints, selectedRestId]);

  // Back up logic matching PLACES_GLOBE_HANDOVER.md
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
      types: [],
      from: minYear,
      to: maxYear,
      decades: [],
      people: [],
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
      (filters.types && filters.types.length > 0) ||
      (filters.decades && filters.decades.length > 0) ||
      filters.from > minYear ||
      filters.to < maxYear ||
      (filters.people && filters.people.length > 0)
    );
  }, [filters, minYear, maxYear]);

  // Count active filter groups for badges
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.country !== '') count++;
    if (filters.city !== '') count++;
    if (filters.area !== '') count++;
    if (filters.types && filters.types.length > 0) count += filters.types.length;
    if (filters.decades && filters.decades.length > 0) count += filters.decades.length;
    if (filters.from > minYear || filters.to < maxYear) count++;
    if (filters.people && filters.people.length > 0) count += filters.people.length;
    return count;
  }, [filters, minYear, maxYear]);

  // Breadcrumb Trail
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
      const countryObj = mealsData?.countriesById?.get(parseInt(filters.country, 10));
      const countryName = countryObj?.name || 'Country';
      trail.push({
        name: countryName,
        onClick: () => {
          setFilters((prev) => ({ ...prev, city: '', area: '' }));
          setSelectedRestId(null);
          setMode('city');
        },
      });
    }

    if (filters.city !== '') {
      const cityObj = mealsData?.citiesById?.get(parseInt(filters.city, 10));
      const cityName = cityObj?.name || 'City';
      const isLondon = String(filters.city) === String(londonCityId);
      trail.push({
        name: cityName,
        onClick: () => {
          setFilters((prev) => ({ ...prev, area: '' }));
          setSelectedRestId(null);
          setMode(isLondon ? 'area' : 'rest');
        },
      });
    }

    if (filters.area !== '') {
      const areaObj = mealsData?.londonAreasById?.get(parseInt(filters.area, 10));
      const areaName = areaObj?.name || 'Area';
      trail.push({
        name: areaName,
        onClick: () => {
          setSelectedRestId(null);
          setMode('rest');
        },
      });
    }

    return trail;
  }, [filters, mealsData, londonCityId]);

  // Segment mode switch handler
  const handleToggleMode = (newMode) => {
    if (newMode === mode) return;
    setSelectedRestId(null);
    setMode(newMode);
  };

  // Checkbox handlers for facet lists
  const handleToggleCountry = (countryId) => {
    if (filters.country === countryId) {
      setFilters((prev) => ({ ...prev, country: '', city: '', area: '' }));
      setSelectedRestId(null);
      setMode('country');
    } else {
      setFilters((prev) => ({ ...prev, country: countryId, city: '', area: '' }));
      setSelectedRestId(null);
      setMode('city');
      setOpenSections((prev) => ({ ...prev, city: true }));
    }
  };

  const handleToggleCity = (cityId, countryId) => {
    if (filters.city === cityId) {
      setFilters((prev) => ({ ...prev, city: '', area: '' }));
      setSelectedRestId(null);
      setMode('city');
    } else {
      const isLondon = String(cityId) === String(londonCityId);
      setFilters((prev) => ({
        ...prev,
        city: cityId,
        country: countryId != null ? String(countryId) : prev.country,
        area: '',
      }));
      setSelectedRestId(null);
      setMode(isLondon ? 'area' : 'rest');
    }
  };

  const handleToggleType = (typeName) => {
    const current = filters.types || [];
    const updated = current.includes(typeName)
      ? current.filter((x) => x !== typeName)
      : [...current, typeName];
    setFilters((prev) => ({ ...prev, types: updated }));
    setSelectedRestId(null);
  };

  const handleToggleDecade = (decade) => {
    const current = filters.decades || [];
    const updated = current.includes(decade)
      ? current.filter((x) => x !== decade)
      : [...current, decade];
    setFilters((prev) => ({ ...prev, decades: updated }));
    setSelectedRestId(null);
  };

  const handleTogglePerson = (personId) => {
    const current = filters.people || [];
    const updated = current.includes(personId)
      ? current.filter((x) => x !== personId)
      : [...current, personId];
    setFilters((prev) => ({ ...prev, people: updated }));
    setSelectedRestId(null);
  };

  if (loading) {
    return (
      <div className="places-loading-view" aria-live="polite">
        <div className="places-loading-spinner" />
        <p className="places-loading-text">Loading 3D Places...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="places-error-view" role="alert">
        <p className="places-error-text">{error}</p>
        <button
          type="button"
          className="places-retry-btn"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // Common Sidebar Component
  const renderSidebarContent = (isMobile = false) => (
    <>
      {!isMobile && (
        <div className="sidebar-header">
          <h2 className="sidebar-title">Filters</h2>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-clear-all"
              onClick={handleClearFilters}
              title="Clear all active filters"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* 1. Country Facet */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('country')}
        >
          <span className="section-title">
            Country {filters.country && <span className="places-active-pill">1</span>}
          </span>
          {openSections.country ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.country && (
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
              {countryFacet.visibleEntries.map((country) => {
                const isSelected = String(filters.country) === country.id;
                return (
                  <label key={country.id} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleCountry(country.id)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{country.name}</span>
                    </div>
                    <span className="facet-count-badge">
                      {country.count.toLocaleString('en-GB')}
                    </span>
                  </label>
                );
              })}
            </div>

            {countryFacet.hasMore && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => toggleExpanded('country')}
              >
                {expandedFacets.country
                  ? 'Show less'
                  : `Show all (${countryFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. City Facet */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('city')}
        >
          <span className="section-title">
            City {filters.city && <span className="places-active-pill">1</span>}
          </span>
          {openSections.city ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.city && (
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
              {cityFacet.visibleEntries.map((city) => {
                const isSelected = String(filters.city) === city.id;
                const showCountry = !filters.country && city.countryName;
                return (
                  <label key={city.id} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleCity(city.id, city.countryId)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">
                        {city.name}
                        {showCountry && <small className="places-facet-sub"> · {city.countryName}</small>}
                      </span>
                    </div>
                    <span className="facet-count-badge">
                      {city.count.toLocaleString('en-GB')}
                    </span>
                  </label>
                );
              })}
            </div>

            {cityFacet.hasMore && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => toggleExpanded('city')}
              >
                {expandedFacets.city
                  ? 'Show less'
                  : `Show all (${cityFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Restaurant Type Facet */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('types')}
        >
          <span className="section-title">
            Restaurant Type{' '}
            {filters.types.length > 0 && (
              <span className="places-active-pill">{filters.types.length}</span>
            )}
          </span>
          {openSections.types ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.types && (
          <div className="facet-content-block">
            {typeFacet.entries.length > 5 && (
              <div className="facet-search-box">
                <Search size={13} className="facet-search-icon" />
                <input
                  type="text"
                  placeholder="Filter restaurant types..."
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  className="facet-search-input"
                />
                {typeSearch && (
                  <button
                    type="button"
                    onClick={() => setTypeSearch('')}
                    className="facet-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="checkbox-list">
              {typeFacet.visibleEntries.map((t) => {
                const isSelected = filters.types.includes(t.name);
                return (
                  <label key={t.name} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleType(t.name)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{t.name}</span>
                    </div>
                    <span className="facet-count-badge">
                      {t.count.toLocaleString('en-GB')}
                    </span>
                  </label>
                );
              })}
            </div>

            {typeFacet.hasMore && (
              <button
                type="button"
                className="btn-show-more"
                onClick={() => toggleExpanded('types')}
              >
                {expandedFacets.types
                  ? 'Show less'
                  : `Show all (${typeFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Years & Decades Facet */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('years')}
        >
          <span className="section-title">
            Years{' '}
            {(filters.decades.length > 0 || filters.from > minYear || filters.to < maxYear) && (
              <span className="places-active-pill">
                {filters.decades.length > 0 ? filters.decades.length : '1'}
              </span>
            )}
          </span>
          {openSections.years ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openSections.years && (
          <div className="facet-content-block">
            {/* Decades Checkboxes */}
            <div className="checkbox-list">
              {CANONICAL_DECADES.map((decade) => {
                const count = facetCounts.decadeCounts?.[decade] || 0;
                const isSelected = filters.decades.includes(decade);
                if (count === 0 && !isSelected) return null;

                return (
                  <label key={decade} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleDecade(decade)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{decade}</span>
                    </div>
                    <span className="facet-count-badge">
                      {count.toLocaleString('en-GB')}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Fine-grained Year Range Selects */}
            <div className="places-years-range-container">
              <span className="places-years-range-title">Year Range</span>
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
                  className="places-year-select"
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
                  className="places-year-select"
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
          </div>
        )}
      </div>

      {/* 5. Person Facet */}
      <div className="filter-group-section">
        <button
          type="button"
          className="section-header-btn"
          onClick={() => toggleSection('people')}
        >
          <span className="section-title">
            Person{' '}
            {filters.people.length > 0 && (
              <span className="places-active-pill">{filters.people.length}</span>
            )}
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
              {peopleFacet.visibleEntries.map((p) => {
                const isSelected = filters.people.includes(p.id);
                return (
                  <label key={p.id} className="checkbox-row">
                    <div className="checkbox-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTogglePerson(p.id)}
                        className="checkbox-native"
                      />
                      <span className="checkbox-visual">
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="checkbox-label">{p.name}</span>
                    </div>
                    <span className="facet-count-badge">
                      {p.count.toLocaleString('en-GB')}
                    </span>
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
                {expandedFacets.people
                  ? 'Show less'
                  : `Show all (${peopleFacet.entries.length})`}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="places-page-layout">
      {/* ==============================================================
          1. Left Filter Sidebar (Chronicle Style)
          ============================================================== */}
      <aside className="meals-filter-sidebar places-filter-sidebar">
        {renderSidebarContent()}
      </aside>

      {/* ==============================================================
          2. Main Area (Right): KPIs, Controls, Globe & Ranked List
          ============================================================== */}
      <main className="places-main-area">
        {/* Mobile Filter Sheet Trigger Button */}
        <div className="places-mobile-toolbar">
          <button
            type="button"
            className="places-mobile-filter-btn"
            onClick={() => setIsMobileFilterOpen(true)}
            aria-label="Open filter options"
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="places-mobile-filter-badge">{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {/* 4 Compact KPIs Strip */}
        <div className="places-kpis-strip" role="region" aria-label="Key Performance Indicators">
          <div className="places-kpi-item">
            <span className="places-kpi-val">{kpis.meals.toLocaleString('en-GB')}</span>
            <span className="places-kpi-lbl">
              {kpis.meals === 1 ? 'Meal' : 'Meals'}
            </span>
          </div>

          <div className="places-kpi-divider" aria-hidden="true" />

          <div className="places-kpi-item">
            <span className="places-kpi-val">{kpis.countries.toLocaleString('en-GB')}</span>
            <span className="places-kpi-lbl">
              {kpis.countries === 1 ? 'Country' : 'Countries'}
            </span>
          </div>

          <div className="places-kpi-divider" aria-hidden="true" />

          <div className="places-kpi-item">
            <span className="places-kpi-val">{kpis.cities.toLocaleString('en-GB')}</span>
            <span className="places-kpi-lbl">
              {kpis.cities === 1 ? 'City' : 'Cities'}
            </span>
          </div>

          <div className="places-kpi-divider" aria-hidden="true" />

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
              <span>{MODE_LABELS[mode]}</span>
              {allPoints.length > topPoints.length && (
                <span className="places-ranked-subcount">
                  top {topPoints.length} of {allPoints.length}
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
                      title={`${item.name} (${item.n.toLocaleString('en-GB')} meals)`}
                    >
                      <span className="places-ranked-rank">{idx + 1}</span>
                      <span className="places-ranked-name">
                        {item.name}
                        {showSubtitle && (
                          <small className="places-ranked-sub">· {item.sub}</small>
                        )}
                      </span>
                      <span className="places-ranked-count">
                        {item.n.toLocaleString('en-GB')}
                      </span>
                      <span
                        className="places-ranked-bar"
                        style={{ width: `${barWidth}%` }}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}

              {topPoints.length === 0 && (
                <li className="places-ranked-empty">
                  No meals found for the current filters.
                </li>
              )}
            </ul>

            {/* Note regarding meals without coordinates or unassigned London areas */}
            {(noCoordMeals > 0 || (mode === 'area' && noAreaMeals > 0)) && (
              <div className="places-ranked-note">
                {noCoordMeals > 0 && (
                  <div>
                    {noCoordMeals.toLocaleString('en-GB')}{' '}
                    {noCoordMeals === 1 ? 'meal has' : 'meals have'} no coordinates and
                    are not drawn.
                  </div>
                )}
                {mode === 'area' && noAreaMeals > 0 && (
                  <div>
                    {noAreaMeals.toLocaleString('en-GB')} London{' '}
                    {noAreaMeals === 1 ? 'meal has' : 'meals have'} no area assigned.
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div
          className="places-mobile-drawer-backdrop"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            className="places-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Filter Options"
          >
            <div className="places-mobile-drawer-header">
              <h2 className="places-mobile-drawer-title">Filters</h2>
              <button
                type="button"
                className="places-mobile-drawer-close"
                onClick={() => setIsMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            <div className="places-mobile-drawer-body">
              {renderSidebarContent(true)}
            </div>
            <div className="places-mobile-drawer-footer">
              <button
                type="button"
                className="places-mobile-drawer-clear"
                onClick={handleClearFilters}
              >
                Reset
              </button>
              <button
                type="button"
                className="places-mobile-drawer-apply"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                Done ({kpis.meals.toLocaleString('en-GB')})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}