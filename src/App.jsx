import React, { useEffect, useState, useMemo } from 'react';
import { loadMealsData } from './services/mealsDataService.js';
import MealsHeader from './components/MealsHeader/MealsHeader.jsx';
import MealsFilterSidebar from './components/MealsFilterSidebar/MealsFilterSidebar.jsx';
import MealsMobileFilterSheet from './components/MealsMobileFilterSheet/MealsMobileFilterSheet.jsx';
import MealsActiveFilterChips from './components/MealsActiveFilterChips/MealsActiveFilterChips.jsx';
import MealsResultsToolbar from './components/MealsResultsToolbar/MealsResultsToolbar.jsx';
import MealGridCard from './components/MealGridCard/MealGridCard.jsx';
import MealDetailPage from './components/MealDetailPage/MealDetailPage.jsx';
import Pagination from './components/Pagination/Pagination.jsx';
import {
  DEFAULT_MEALS_FILTER_STATE,
  filterMeals,
  computeFacetCounts,
  sortMeals,
  countActiveFilters,
} from './utils/mealsFilter.js';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import './App.css';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [meals, setMeals] = useState([]);
  const [mealsById, setMealsById] = useState(new Map());

  // Navigation / Route state
  const [activeMealId, setActiveMealId] = useState(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const match = path.match(/\/meals\/([0-9]+)/);
    if (match && match[1]) return parseInt(match[1], 10);
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('meal');
    return qId ? parseInt(qId, 10) : null;
  });

  // Filter State (with optional initialisation from URL query params)
  const [filterState, setFilterState] = useState(() => {
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

  // Mobile Filter Sheet Drawer open/close state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Sort & Pagination state
  const [sortOption, setSortOption] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);

  // Ingest data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadMealsData();
      setMeals(data.meals);
      setMealsById(data.mealsById);
    } catch (err) {
      console.error('Failed to load Meals data:', err);
      setError(err.message || 'Error connecting to published Google Sheets feeds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for browser back / forward navigation
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/\/meals\/([0-9]+)/);
      if (match && match[1]) {
        setActiveMealId(parseInt(match[1], 10));
      } else {
        const params = new URLSearchParams(window.location.search);
        const qId = params.get('meal');
        setActiveMealId(qId ? parseInt(qId, 10) : null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Compute dynamic facet counts based on current filters
  const facetCounts = useMemo(() => {
    return computeFacetCounts(meals, filterState);
  }, [meals, filterState]);

  // Filter meals using pure multi-field engine
  const filteredMeals = useMemo(() => {
    return filterMeals(meals, filterState);
  }, [meals, filterState]);

  // Sort filtered meals
  const sortedMeals = useMemo(() => {
    return sortMeals(filteredMeals, sortOption);
  }, [filteredMeals, sortOption]);

  // Pagination calculation
  const totalFilteredCount = sortedMeals.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedMeals = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedMeals.slice(startIndex, startIndex + pageSize);
  }, [sortedMeals, safeCurrentPage, pageSize]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    return countActiveFilters(filterState);
  }, [filterState]);

  // Filter Update Handlers (Resetting pagination to page 1 on every filter change)
  const handleUpdateFilter = (key, value) => {
    setFilterState((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setFilterState(DEFAULT_MEALS_FILTER_STATE);
    setCurrentPage(1);
  };

  const handleApplyMobileFilters = (newDraftFilters) => {
    setFilterState(newDraftFilters);
    setCurrentPage(1);
  };

  const handleSearchChange = (query) => {
    handleUpdateFilter('search', query);
  };

  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Detail Navigation Handlers
  const handleOpenMeal = (mealId) => {
    setActiveMealId(mealId);
    window.history.pushState(null, '', `/meals/${mealId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToChronicle = () => {
    setActiveMealId(null);
    window.history.pushState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeMeal = activeMealId ? mealsById.get(activeMealId) || null : null;

  return (
    <div className="meals-app-layout">
      {/* Primary Header */}
      <MealsHeader
        activeNav="chronicle"
        onSelectNav={() => {
          if (activeMealId) handleBackToChronicle();
        }}
      />

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
            <button type="button" className="retry-btn" onClick={fetchData}>
              <RefreshCw size={16} />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : activeMealId ? (
          /* Meal Detail View */
          <MealDetailPage meal={activeMeal} onBack={handleBackToChronicle} />
        ) : (
          /* Meal Chronicle Browse View with Desktop Sidebar */
          <div className="chronicle-view">
            <div className="chronicle-layout">
              {/* Desktop Filter Sidebar */}
              <div className="desktop-sidebar-column">
                <MealsFilterSidebar
                  filterState={filterState}
                  onUpdateFilter={handleUpdateFilter}
                  onClearFilters={handleClearAllFilters}
                  counts={facetCounts}
                />
              </div>

              {/* Main Feed Column */}
              <div className="chronicle-main-col">
                {/* Active Filter Chips */}
                <MealsActiveFilterChips
                  filterState={filterState}
                  onRemoveFilter={handleUpdateFilter}
                  onClearFilters={handleClearAllFilters}
                />

                {/* Results Toolbar with Search and Mobile Filter Trigger */}
                <MealsResultsToolbar
                  totalCount={meals.length}
                  filteredCount={totalFilteredCount}
                  searchQuery={filterState.search}
                  onSearchChange={handleSearchChange}
                  sortOption={sortOption}
                  onSortChange={handleSortChange}
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange}
                  activeFilterCount={activeFiltersCount}
                  onOpenMobileFilters={() => setIsMobileFilterOpen(true)}
                />

                {paginatedMeals.length > 0 ? (
                  <>
                    <div className="meals-grid">
                      {paginatedMeals.map((meal) => (
                        <MealGridCard
                          key={meal.id}
                          meal={meal}
                          onSelectMeal={handleOpenMeal}
                        />
                      ))}
                    </div>

                    <div className="meals-pagination-container">
                      <Pagination
                        currentPage={safeCurrentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalItems={totalFilteredCount}
                        onPageChange={(p) => {
                          setCurrentPage(p);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onPageSizeChange={handlePageSizeChange}
                      />
                    </div>
                  </>
                ) : (
                  <div className="meals-empty-search">
                    <p>No dining records match your current filter selections.</p>
                    <button
                      type="button"
                      className="btn-clear-search"
                      onClick={handleClearAllFilters}
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Filter Sheet Drawer */}
            <MealsMobileFilterSheet
              isOpen={isMobileFilterOpen}
              onClose={() => setIsMobileFilterOpen(false)}
              filterState={filterState}
              onApplyFilters={handleApplyMobileFilters}
              onClearFilters={handleClearAllFilters}
              counts={facetCounts}
            />
          </div>
        )}
      </main>
    </div>
  );
}
