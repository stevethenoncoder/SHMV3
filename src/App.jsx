import React, { useEffect, useState, useMemo } from 'react';
import { loadMealsData } from './services/mealsDataService.js';
import MealsHeader from './components/MealsHeader/MealsHeader.jsx';
import MealsResultsToolbar from './components/MealsResultsToolbar/MealsResultsToolbar.jsx';
import MealGridCard from './components/MealGridCard/MealGridCard.jsx';
import MealDetailPage from './components/MealDetailPage/MealDetailPage.jsx';
import Pagination from './components/Pagination/Pagination.jsx';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import './App.css';

// Qualitative rating rank for sorting
const RATING_RANK = {
  'the dogs': 9,
  exceptional: 8,
  superb: 7,
  'very good': 6,
  good: 5,
  fine: 4,
  ok: 3,
  "ok but wouldn't recommend": 2,
  bad: 1,
  'very bad': 0,
  'never again': -1,
  'the worst in the world': -2,
};

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

  // Search & Sort & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter meals by search query
  const filteredMeals = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return meals;
    }

    const query = searchQuery.trim().toLowerCase();
    return meals.filter((meal) => {
      const restName = (meal.restaurant?.name || '').toLowerCase();
      const city = (meal.restaurant?.city?.name || '').toLowerCase();
      const country = (meal.restaurant?.city?.country?.name || '').toLowerCase();
      const comment = (meal.comment || '').toLowerCase();

      // Check restaurant and location
      if (
        restName.includes(query) ||
        city.includes(query) ||
        country.includes(query) ||
        comment.includes(query)
      ) {
        return true;
      }

      // Check main dishes
      if (meal.mains && meal.mains.length > 0) {
        for (const main of meal.mains) {
          const dishName = (main.food?.name || '').toLowerCase();
          const ingName = (main.food?.ingredient?.name || '').toLowerCase();
          const style = (main.food?.foodType?.name || '').toLowerCase();
          if (dishName.includes(query) || ingName.includes(query) || style.includes(query)) {
            return true;
          }
        }
      }

      return false;
    });
  }, [meals, searchQuery]);

  // Sort filtered meals
  const sortedMeals = useMemo(() => {
    const list = [...filteredMeals];

    switch (sortOption) {
      case 'date_asc':
        return list.sort((a, b) => a.timestamp - b.timestamp);
      case 'date_desc':
        return list.sort((a, b) => b.timestamp - a.timestamp);
      case 'spend_desc':
        return list.sort((a, b) => (b.valueGBP || 0) - (a.valueGBP || 0));
      case 'spend_asc':
        return list.sort((a, b) => (a.valueGBP || 0) - (b.valueGBP || 0));
      case 'name_asc':
        return list.sort((a, b) =>
          (a.restaurant?.name || '').localeCompare(b.restaurant?.name || '')
        );
      case 'rating_desc':
        return list.sort((a, b) => {
          const rankA = RATING_RANK[(a.rating || '').toLowerCase()] ?? -10;
          const rankB = RATING_RANK[(b.rating || '').toLowerCase()] ?? -10;
          if (rankB !== rankA) return rankB - rankA;
          return b.timestamp - a.timestamp;
        });
      default:
        return list;
    }
  }, [filteredMeals, sortOption]);

  // Pagination calculation
  const totalItems = sortedMeals.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedMeals = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedMeals.slice(startIndex, startIndex + pageSize);
  }, [sortedMeals, safeCurrentPage, pageSize]);

  // Handlers
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

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
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
          /* Meal Chronicle Browse View */
          <div className="chronicle-view">
            <MealsResultsToolbar
              totalCount={meals.length}
              filteredCount={sortedMeals.length}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              sortOption={sortOption}
              onSortChange={handleSortChange}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
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
                    totalItems={totalItems}
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
                <p>No dining records match your search &ldquo;{searchQuery}&rdquo;.</p>
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={() => handleSearchChange('')}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
