import React, { useEffect, useState, useMemo } from 'react';
import { loadMealsData } from './services/mealsDataService.js';
import MealsHeader from './components/MealsHeader/MealsHeader.jsx';
import MealsFilterSidebar from './components/MealsFilterSidebar/MealsFilterSidebar.jsx';
import MealsMobileFilterSheet from './components/MealsMobileFilterSheet/MealsMobileFilterSheet.jsx';
import MealsActiveFilterChips from './components/MealsActiveFilterChips/MealsActiveFilterChips.jsx';
import MealsResultsToolbar from './components/MealsResultsToolbar/MealsResultsToolbar.jsx';
import MealGridCard from './components/MealGridCard/MealGridCard.jsx';
import MealDetailPage from './components/MealDetailPage/MealDetailPage.jsx';
import MealCommentBar from './components/MealCommentBar/MealCommentBar.jsx';

import RestaurantKpiStrip from './components/RestaurantKpiStrip/RestaurantKpiStrip.jsx';
import RestaurantsFilterBar from './components/RestaurantsFilterBar/RestaurantsFilterBar.jsx';
import RestaurantsDirectory from './components/RestaurantsDirectory/RestaurantsDirectory.jsx';
import RestaurantsMobileFilterSheet from './components/RestaurantsMobileFilterSheet/RestaurantsMobileFilterSheet.jsx';
import RestaurantDetailPage from './components/RestaurantDetailPage/RestaurantDetailPage.jsx';

import Pagination from './components/Pagination/Pagination.jsx';
import {
  DEFAULT_MEALS_FILTER_STATE,
  filterMeals,
  computeFacetCounts,
  sortMeals,
  countActiveFilters,
} from './utils/mealsFilter.js';

import {
  DEFAULT_RESTAURANTS_FILTER_STATE,
  filterRestaurants,
  computeRestaurantFacetCounts,
  sortRestaurants,
  countActiveRestaurantFilters,
} from './utils/restaurantsFilter.js';

import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import './App.css';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [meals, setMeals] = useState([]);
  const [mealsById, setMealsById] = useState(new Map());
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsById, setRestaurantsById] = useState(new Map());
  const [publicPeopleById, setPublicPeopleById] = useState(new Map());

  // Section Navigation: 'chronicle' | 'restaurants'
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window === 'undefined') return 'chronicle';
    const path = window.location.pathname;
    if (path.startsWith('/restaurants')) return 'restaurants';
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'restaurants' || params.get('restaurant')) return 'restaurants';
    return 'chronicle';
  });

  // Active Detail ID states
  const [activeMealId, setActiveMealId] = useState(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const match = path.match(/\/meals\/([0-9]+)/);
    if (match && match[1]) return parseInt(match[1], 10);
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('meal');
    return qId ? parseInt(qId, 10) : null;
  });

  const [activeRestaurantId, setActiveRestaurantId] = useState(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const match = path.match(/\/restaurants\/([0-9]+)/);
    if (match && match[1]) return parseInt(match[1], 10);
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('restaurant');
    return qId ? parseInt(qId, 10) : null;
  });

  // --- MEALS FILTER & PAGINATION STATE ---
  const [mealsFilterState, setMealsFilterState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_MEALS_FILTER_STATE;
    const params = new URLSearchParams(window.location.search);
    const initial = { ...DEFAULT_MEALS_FILTER_STATE };
    if (params.get('search')) initial.search = params.get('search');
    if (params.get('country')) initial.countries = [params.get('country')];
    if (params.get('city')) initial.cities = [params.get('city')];
    if (params.get('rating')) initial.ratings = [params.get('rating')];
    if (params.get('decade')) initial.decades = [params.get('decade')];
    if (params.get('hasPhoto') === 'true') initial.hasPhoto = true;
    if (params.get('isArsenalMatch') === 'true') initial.isArsenalMatch = true;
    if (params.get('isBusiness') === 'true') initial.isBusiness = true;
    return initial;
  });

  const [isMobileMealsFilterOpen, setIsMobileMealsFilterOpen] = useState(false);
  const [mealsSortOption, setMealsSortOption] = useState('date_desc');
  const [mealsCurrentPage, setMealsCurrentPage] = useState(1);
  const [mealsPageSize, setMealsPageSize] = useState(18);

  // --- RESTAURANTS FILTER & PAGINATION STATE ---
  const [restaurantFilterState, setRestaurantFilterState] = useState(
    DEFAULT_RESTAURANTS_FILTER_STATE
  );
  const [isMobileRestaurantFilterOpen, setIsMobileRestaurantFilterOpen] = useState(false);
  const [restaurantSortOption, setRestaurantSortOption] = useState('visits_desc');
  const [restaurantCurrentPage, setRestaurantCurrentPage] = useState(1);
  const [restaurantPageSize, setRestaurantPageSize] = useState(18);

  // Ingest data once
  const fetchData = async (bypassCache = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadMealsData({ bypassCache });
      setMeals(data.meals);
      setMealsById(data.mealsById);
      setRestaurants(data.restaurants);
      setRestaurantsById(data.restaurantsById);
      setPublicPeopleById(data.publicPeopleById || new Map());
    } catch (err) {
      console.error('Failed to load Meals data:', err);
      setError(err.message || 'Error connecting to published Google Sheets feeds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Browser back / forward popstate listener
    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      // 1. Match /meals/:id
      const mealMatch = path.match(/\/meals\/([0-9]+)/);
      if (mealMatch && mealMatch[1]) {
        setActiveSection('chronicle');
        setActiveMealId(parseInt(mealMatch[1], 10));
        setActiveRestaurantId(null);
        return;
      }

      // 2. Match /restaurants/:id
      const restMatch = path.match(/\/restaurants\/([0-9]+)/);
      if (restMatch && restMatch[1]) {
        setActiveSection('restaurants');
        setActiveRestaurantId(parseInt(restMatch[1], 10));
        setActiveMealId(null);
        return;
      }

      // 3. Match /restaurants browse
      if (path.startsWith('/restaurants') || params.get('section') === 'restaurants') {
        setActiveSection('restaurants');
        setActiveRestaurantId(null);
        setActiveMealId(null);
        return;
      }

      // 4. Default /meals or /
      const qMealId = params.get('meal');
      const qRestId = params.get('restaurant');
      if (qMealId) {
        setActiveSection('chronicle');
        setActiveMealId(parseInt(qMealId, 10));
        setActiveRestaurantId(null);
      } else if (qRestId) {
        setActiveSection('restaurants');
        setActiveRestaurantId(parseInt(qRestId, 10));
        setActiveMealId(null);
      } else {
        setActiveSection('chronicle');
        setActiveMealId(null);
        setActiveRestaurantId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- COMPUTED MEALS DERIVATIONS ---
  const mealFacetCounts = useMemo(() => {
    return computeFacetCounts(meals, mealsFilterState);
  }, [meals, mealsFilterState]);

  const filteredMeals = useMemo(() => {
    return filterMeals(meals, mealsFilterState);
  }, [meals, mealsFilterState]);

  const sortedMeals = useMemo(() => {
    return sortMeals(filteredMeals, mealsSortOption);
  }, [filteredMeals, mealsSortOption]);

  const totalFilteredMealsCount = sortedMeals.length;
  const totalMealsPages = Math.ceil(totalFilteredMealsCount / mealsPageSize) || 1;
  const safeMealsCurrentPage = Math.min(Math.max(1, mealsCurrentPage), totalMealsPages);

  const paginatedMeals = useMemo(() => {
    const startIndex = (safeMealsCurrentPage - 1) * mealsPageSize;
    return sortedMeals.slice(startIndex, startIndex + mealsPageSize);
  }, [sortedMeals, safeMealsCurrentPage, mealsPageSize]);

  const activeMealsFiltersCount = useMemo(() => {
    return countActiveFilters(mealsFilterState);
  }, [mealsFilterState]);

  // --- COMPUTED RESTAURANTS DERIVATIONS ---
  const restaurantFacetCounts = useMemo(() => {
    return computeRestaurantFacetCounts(restaurants, restaurantFilterState);
  }, [restaurants, restaurantFilterState]);

  const filteredRestaurants = useMemo(() => {
    return filterRestaurants(restaurants, restaurantFilterState);
  }, [restaurants, restaurantFilterState]);

  const sortedRestaurants = useMemo(() => {
    return sortRestaurants(filteredRestaurants, restaurantSortOption);
  }, [filteredRestaurants, restaurantSortOption]);

  const totalFilteredRestaurantsCount = sortedRestaurants.length;
  const totalRestaurantPages =
    Math.ceil(totalFilteredRestaurantsCount / restaurantPageSize) || 1;
  const safeRestaurantCurrentPage = Math.min(
    Math.max(1, restaurantCurrentPage),
    totalRestaurantPages
  );

  const paginatedRestaurants = useMemo(() => {
    const startIndex = (safeRestaurantCurrentPage - 1) * restaurantPageSize;
    return sortedRestaurants.slice(startIndex, startIndex + restaurantPageSize);
  }, [sortedRestaurants, safeRestaurantCurrentPage, restaurantPageSize]);

  const activeRestaurantFiltersCount = useMemo(() => {
    return countActiveRestaurantFilters(restaurantFilterState);
  }, [restaurantFilterState]);

  // Compute headline KPIs for Restaurants
  const restaurantKpiData = useMemo(() => {
    if (!restaurants || restaurants.length === 0) {
      return { restaurantCount: 0, countryCount: 0, cityCount: 0, yearsSpan: 0 };
    }
    const countrySet = new Set();
    const citySet = new Set();
    for (const r of restaurants) {
      if (r.city?.country?.name) countrySet.add(r.city.country.name);
      if (r.city?.name) citySet.add(r.city.name);
    }
    const yearSet = new Set();
    for (const m of meals) {
      if (m.year) yearSet.add(m.year);
    }
    return {
      restaurantCount: restaurants.length,
      countryCount: countrySet.size,
      cityCount: citySet.size,
      yearsSpan: yearSet.size,
    };
  }, [restaurants, meals]);

  // --- NAVIGATION ACTION HANDLERS ---
  const handleSelectNav = (section) => {
    setActiveSection(section);
    setActiveMealId(null);
    setActiveRestaurantId(null);
    const targetUrl = section === 'restaurants' ? '/restaurants' : '/';
    window.history.pushState(null, '', targetUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMeal = (mealId) => {
    setActiveMealId(mealId);
    setActiveRestaurantId(null);
    window.history.pushState(null, '', `/meals/${mealId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToChronicle = () => {
    setActiveMealId(null);
    window.history.pushState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRestaurant = (restaurantId) => {
    setActiveSection('restaurants');
    setActiveMealId(null);
    setActiveRestaurantId(restaurantId);
    window.history.pushState(null, '', `/restaurants/${restaurantId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToRestaurants = () => {
    setActiveRestaurantId(null);
    window.history.pushState(null, '', '/restaurants');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- MEALS FILTER ACTION HANDLERS ---
  const handleUpdateMealFilter = (key, value) => {
    setMealsFilterState((prev) => ({ ...prev, [key]: value }));
    setMealsCurrentPage(1);
  };

  const handleAddMealFilter = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'search') {
      setMealsFilterState((prev) => ({ ...prev, search: value }));
    } else if (key === 'isArsenalMatch' || key === 'isBusiness' || key === 'hasPhoto') {
      setMealsFilterState((prev) => ({ ...prev, [key]: true }));
    } else {
      // Array filters: decades, ratings, countries, cities, cuisines, ingredients, foodTypes, people
      setMealsFilterState((prev) => {
        const current = prev[key] || [];
        if (current.includes(value)) return prev;
        return { ...prev, [key]: [...current, value] };
      });
    }
    setMealsCurrentPage(1);
  };

  const handleClearAllMealFilters = () => {
    setMealsFilterState(DEFAULT_MEALS_FILTER_STATE);
    setMealsCurrentPage(1);
  };

  const handleApplyMobileMealFilters = (newDraftFilters) => {
    setMealsFilterState(newDraftFilters);
    setMealsCurrentPage(1);
  };

  // --- RESTAURANT FILTER ACTION HANDLERS ---
  const handleUpdateRestaurantFilter = (key, value) => {
    setRestaurantFilterState((prev) => ({ ...prev, [key]: value }));
    setRestaurantCurrentPage(1);
  };

  const handleClearAllRestaurantFilters = () => {
    setRestaurantFilterState(DEFAULT_RESTAURANTS_FILTER_STATE);
    setRestaurantCurrentPage(1);
  };

  const handleApplyMobileRestaurantFilters = (newDraftFilters) => {
    setRestaurantFilterState(newDraftFilters);
    setRestaurantCurrentPage(1);
  };

  // Active detail objects
  const activeMeal = activeMealId ? mealsById.get(activeMealId) || null : null;
  const activeRestaurant = activeRestaurantId
    ? restaurantsById.get(activeRestaurantId) || null
    : null;

  // Composite trigger that changes on every action across the website
  const actionTrigger = useMemo(() => {
    return [
      activeSection,
      activeMealId,
      activeRestaurantId,
      mealsCurrentPage,
      restaurantCurrentPage,
      mealsPageSize,
      restaurantPageSize,
      mealsSortOption,
      restaurantSortOption,
      JSON.stringify(mealsFilterState),
      JSON.stringify(restaurantFilterState),
    ].join('|');
  }, [
    activeSection,
    activeMealId,
    activeRestaurantId,
    mealsCurrentPage,
    restaurantCurrentPage,
    mealsPageSize,
    restaurantPageSize,
    mealsSortOption,
    restaurantSortOption,
    mealsFilterState,
    restaurantFilterState,
  ]);

  return (
    <div className="meals-app-layout">
      {/* Primary Header */}
      <MealsHeader
        activeNav={activeSection}
        onSelectNav={handleSelectNav}
        mealCount={meals.length}
        restaurantCount={restaurants.length}
      />

      {/* Random Meal Memory Banner directly underneath Header */}
      {!loading && !error && meals.length > 0 && (
        <MealCommentBar
          meals={meals}
          actionTrigger={actionTrigger}
          onSelectMeal={handleOpenMeal}
        />
      )}

      {/* Main Content Area */}
      <main className="meals-main-content">
        {loading ? (
          <div className="meals-state-container loading-state">
            <Loader2 size={36} className="state-spinner" />
            <h2 className="state-title">Loading 32 Years of Dining History...</h2>
            <p className="state-subtext">
              Ingesting and joining live published records from Google Sheets.
            </p>
          </div>
        ) : error ? (
          <div className="meals-state-container error-state">
            <AlertCircle size={40} className="state-error-icon" />
            <h2 className="state-title">Unable to Load Meals Data</h2>
            <p className="state-subtext">{error}</p>
            <button type="button" className="retry-btn" onClick={() => fetchData(true)}>
              <RefreshCw size={16} />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : activeMealId ? (
          /* 1. Meal Detail View */
          <MealDetailPage
            meal={activeMeal}
            onBack={handleBackToChronicle}
            onSelectRestaurant={handleOpenRestaurant}
          />
        ) : activeSection === 'restaurants' && activeRestaurantId ? (
          /* 2. Restaurant Detail View */
          <RestaurantDetailPage
            restaurant={activeRestaurant}
            onBack={handleBackToRestaurants}
            onSelectMeal={handleOpenMeal}
          />
        ) : activeSection === 'restaurants' ? (
          /* 3. Restaurants Browse View (Redesigned Flat Directory) */
          <div className="restaurants-page-view">
            {/* 1. KPI Headline Strip */}
            <RestaurantKpiStrip
              restaurantCount={restaurantKpiData.restaurantCount}
              countryCount={restaurantKpiData.countryCount}
              cityCount={restaurantKpiData.cityCount}
              yearsSpan={restaurantKpiData.yearsSpan}
            />

            {/* 2. Horizontal Filter Bar & Toolbar */}
            <RestaurantsFilterBar
              filterState={restaurantFilterState}
              onUpdateFilter={handleUpdateRestaurantFilter}
              onClearFilters={handleClearAllRestaurantFilters}
              counts={restaurantFacetCounts}
              publicPeopleById={publicPeopleById}
              sortOption={restaurantSortOption}
              onSortChange={(s) => {
                setRestaurantSortOption(s);
                setRestaurantCurrentPage(1);
              }}
              totalCount={restaurants.length}
              filteredCount={totalFilteredRestaurantsCount}
              pageSize={restaurantPageSize}
              onPageSizeChange={(sz) => {
                setRestaurantPageSize(sz);
                setRestaurantCurrentPage(1);
              }}
              onOpenMobileFilters={() => setIsMobileRestaurantFilterOpen(true)}
            />

            {/* 3. Flat Restaurant Directory & Expanded Meal Rows */}
            <RestaurantsDirectory
              restaurants={paginatedRestaurants}
              sortOption={restaurantSortOption}
              onSortChange={(s) => {
                setRestaurantSortOption(s);
                setRestaurantCurrentPage(1);
              }}
              onSelectMeal={handleOpenMeal}
              onSelectRestaurant={handleOpenRestaurant}
              onClearFilters={handleClearAllRestaurantFilters}
            />

            {/* 4. Pagination */}
            {totalFilteredRestaurantsCount > 0 && (
              <div className="meals-pagination-container">
                <Pagination
                  currentPage={safeRestaurantCurrentPage}
                  totalPages={totalRestaurantPages}
                  pageSize={restaurantPageSize}
                  totalItems={totalFilteredRestaurantsCount}
                  onPageChange={(p) => {
                    setRestaurantCurrentPage(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onPageSizeChange={(sz) => {
                    setRestaurantPageSize(sz);
                    setRestaurantCurrentPage(1);
                  }}
                />
              </div>
            )}

            {/* 5. Mobile Filter Sheet */}
            <RestaurantsMobileFilterSheet
              isOpen={isMobileRestaurantFilterOpen}
              onClose={() => setIsMobileRestaurantFilterOpen(false)}
              filterState={restaurantFilterState}
              onApplyFilters={handleApplyMobileRestaurantFilters}
              onClearFilters={handleClearAllRestaurantFilters}
              counts={restaurantFacetCounts}
              publicPeopleById={publicPeopleById}
            />
          </div>
        ) : (
          /* 4. Meal Chronicle Browse View */
          <div className="chronicle-view">
            <div className="chronicle-layout">
              {/* Desktop Filter Sidebar */}
              <div className="desktop-sidebar-column">
                <MealsFilterSidebar
                  filterState={mealsFilterState}
                  onUpdateFilter={handleUpdateMealFilter}
                  onClearFilters={handleClearAllMealFilters}
                  counts={mealFacetCounts}
                />
              </div>

              {/* Main Feed Column */}
              <div className="chronicle-main-col">
                <MealsActiveFilterChips
                  filterState={mealsFilterState}
                  onRemoveFilter={handleUpdateMealFilter}
                  onClearFilters={handleClearAllMealFilters}
                />

                <MealsResultsToolbar
                  totalCount={meals.length}
                  filteredCount={totalFilteredMealsCount}
                  searchQuery={mealsFilterState.search}
                  onSearchChange={(q) => handleUpdateMealFilter('search', q)}
                  sortOption={mealsSortOption}
                  onSortChange={(s) => {
                    setMealsSortOption(s);
                    setMealsCurrentPage(1);
                  }}
                  pageSize={mealsPageSize}
                  onPageSizeChange={(sz) => {
                    setMealsPageSize(sz);
                    setMealsCurrentPage(1);
                  }}
                  activeFilterCount={activeMealsFiltersCount}
                  onOpenMobileFilters={() => setIsMobileMealsFilterOpen(true)}
                />

                {paginatedMeals.length > 0 ? (
                  <>
                    <div className="meals-grid">
                      {paginatedMeals.map((meal) => (
                        <MealGridCard
                          key={meal.id}
                          meal={meal}
                          onSelectMeal={handleOpenMeal}
                          onAddFilter={handleAddMealFilter}
                        />
                      ))}
                    </div>

                    <div className="meals-pagination-container">
                      <Pagination
                        currentPage={safeMealsCurrentPage}
                        totalPages={totalMealsPages}
                        pageSize={mealsPageSize}
                        totalItems={totalFilteredMealsCount}
                        onPageChange={(p) => {
                          setMealsCurrentPage(p);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onPageSizeChange={(sz) => {
                          setMealsPageSize(sz);
                          setMealsCurrentPage(1);
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="meals-empty-search">
                    <p>No dining records match your current filter selections.</p>
                    <button
                      type="button"
                      className="btn-clear-search"
                      onClick={handleClearAllMealFilters}
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Filter Sheet Drawer for Meals */}
            <MealsMobileFilterSheet
              isOpen={isMobileMealsFilterOpen}
              onClose={() => setIsMobileMealsFilterOpen(false)}
              filterState={mealsFilterState}
              onApplyFilters={handleApplyMobileMealFilters}
              onClearFilters={handleClearAllMealFilters}
              counts={mealFacetCounts}
            />
          </div>
        )}
      </main>
    </div>
  );
}
