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

import MobileBottomNav from './components/MobileBottomNav/MobileBottomNav.jsx';
import MealsMobileHeaderToolbar from './components/MealsMobileHeaderToolbar/MealsMobileHeaderToolbar.jsx';
import MealsMobileCard from './components/MealsMobileCard/MealsMobileCard.jsx';
import MealsMobileMap from './components/MealsMobileMap/MealsMobileMap.jsx';
import MealsMobileSortSheet from './components/MealsMobileSortSheet/MealsMobileSortSheet.jsx';
import MealsMobileSingleFilterSheet from './components/MealsMobileSingleFilterSheet/MealsMobileSingleFilterSheet.jsx';

import RestaurantKpiStrip from './components/RestaurantKpiStrip/RestaurantKpiStrip.jsx';
import RestaurantsFilterBar from './components/RestaurantsFilterBar/RestaurantsFilterBar.jsx';
import RestaurantsDirectory from './components/RestaurantsDirectory/RestaurantsDirectory.jsx';
import RestaurantsMap from './components/RestaurantsMap/RestaurantsMap.jsx';
import RestaurantsMobileFilterSheet from './components/RestaurantsMobileFilterSheet/RestaurantsMobileFilterSheet.jsx';
import RestaurantDetailPage from './components/RestaurantDetailPage/RestaurantDetailPage.jsx';
import OverviewPage from './components/OverviewPage/OverviewPage.jsx';
import RelationshipsPage from './components/RelationshipsPage/RelationshipsPage.jsx';
import StatsPage from './components/StatsPage/StatsPage.jsx';
import SentimentPage from './components/SentimentPage/SentimentPage.jsx';
import FoodPage from './components/FoodPage/FoodPage.jsx';

const MyJourneyPage = React.lazy(() => import('./components/MyJourneyPage/MyJourneyPage.jsx'));
const PlacesPage = React.lazy(() => import('./components/PlacesPage/PlacesPage.jsx'));
const PeoplePage = React.lazy(() => import('./components/PeoplePage/PeoplePage.jsx'));

import Pagination from './components/Pagination/Pagination.jsx';
import {
  DEFAULT_MEALS_FILTER_STATE,
  filterMeals,
  computeFacetCounts,
  sortMeals,
  countActiveFilters,
  CANONICAL_DECADES,
  CANONICAL_RATINGS,
  formatRatingLabel,
  parseChronicleUrl,
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
  const [mealsDataPayload, setMealsDataPayload] = useState(null);

  // Section Navigation: 'overview' | 'chronicle' | 'restaurants' | 'people' | 'relationships' | 'sentiment' | 'stats' | 'journey'
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window === 'undefined') return 'overview';
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (path.startsWith('/people') || params.get('section') === 'people') return 'people';
    if (path.startsWith('/journey') || path.startsWith('/my-journey')) return 'journey';
    if (path.startsWith('/places')) return 'places';
    if (path.startsWith('/overview')) return 'overview';
    if (path.startsWith('/sentiment')) return 'sentiment';
    if (path.startsWith('/food')) return 'food';
    if (path.startsWith('/stats') || params.get('section') === 'stats') return 'stats';
    if (path.startsWith('/relationships') || params.get('section') === 'relationships') {
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '/stats?tab=relationships');
      return 'stats';
    }
    if (path.startsWith('/restaurants')) return 'restaurants';
    if (path.startsWith('/chronicle')) return 'chronicle';
    if (params.get('section') === 'journey' || (params.get('person') && params.get('section') !== 'people')) return 'journey';
    if (params.get('section') === 'places') return 'places';
    if (params.get('section') === 'overview') return 'overview';
    if (params.get('section') === 'sentiment') return 'sentiment';
    if (params.get('section') === 'food') return 'food';
    if (params.get('section') === 'restaurants' || params.get('restaurant')) return 'restaurants';
    if (params.get('section') === 'chronicle' || params.get('meal')) return 'chronicle';
    return 'overview';
  });

  // Track if user jumped to Chronicle with a preselection from another area
  // e.g. { section: 'overview', label: 'Return to Overview' } or { section: 'restaurants', label: 'Return to Restaurants' }
  const [chronicleOrigin, setChronicleOrigin] = useState(null);
  // Track origin when navigating into a Meal Detail overview
  const [mealOrigin, setMealOrigin] = useState(null);

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
    const path = window.location.pathname;
    const search = window.location.search;
    if (
      path.startsWith('/chronicle') ||
      search.includes('city') ||
      search.includes('country') ||
      search.includes('rating') ||
      search.includes('q=') ||
      search.includes('search=')
    ) {
      const parsed = parseChronicleUrl(path, search, null);
      return { ...DEFAULT_MEALS_FILTER_STATE, ...parsed };
    }
    return DEFAULT_MEALS_FILTER_STATE;
  });

  const [isMobileMealsFilterOpen, setIsMobileMealsFilterOpen] = useState(false);
  const [activeMobileFilterKey, setActiveMobileFilterKey] = useState(null);
  const [chronicleViewMode, setChronicleViewMode] = useState('list'); // 'list' | 'map'
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const [mobileFilterInitialSection, setMobileFilterInitialSection] = useState(null);
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
  const [restaurantViewMode, setRestaurantViewMode] = useState('list');

  // Ingest data once
  const fetchData = async (bypassCache = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadMealsData({ bypassCache });
      setMealsDataPayload(data);
      setMeals(data.meals);
      setMealsById(data.mealsById);
      setRestaurants(data.restaurants);
      setRestaurantsById(data.restaurantsById);
      setPublicPeopleById(data.publicPeopleById || new Map());

      // If initial path had /chronicle/:slug or query params, refine against loaded dataset
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const search = window.location.search;
        if (path.startsWith('/chronicle')) {
          const refined = parseChronicleUrl(path, search, data);
          if (Object.keys(refined).length > 0) {
            setMealsFilterState((prev) => ({
              ...prev,
              ...refined,
            }));
          }
        }

        // If initial path had /meals/:id, resolve activeRestaurantId for the unified screen
        const mealMatch = path.match(/\/meals\/([0-9]+)/);
        if (mealMatch && mealMatch[1]) {
          const mId = parseInt(mealMatch[1], 10);
          const m = data.mealsById.get(mId);
          if (m?.restaurant?.id) {
            setActiveRestaurantId(m.restaurant.id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load Meals data:', err);
      setError(err.message || 'Error loading meals archive');
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

      // 0a. Match /people browse
      if (path.startsWith('/people') || params.get('section') === 'people') {
        setActiveSection('people');
        setActiveRestaurantId(null);
        setActiveMealId(null);
        return;
      }

      // 0. Match /journey or /my-journey browse
      if (
        path.startsWith('/journey') ||
        path.startsWith('/my-journey') ||
        params.get('section') === 'journey' ||
        params.get('person')
      ) {
        setActiveSection('journey');
        setActiveRestaurantId(null);
        setActiveMealId(null);
        return;
      }

      // 0b. Match /places browse
      if (path.startsWith('/places') || params.get('section') === 'places') {
        setActiveSection('places');
        setActiveRestaurantId(null);
        setActiveMealId(null);
        return;
      }

      // 1. Match /meals/:id
      const mealMatch = path.match(/\/meals\/([0-9]+)/);
      if (mealMatch && mealMatch[1]) {
        const mId = parseInt(mealMatch[1], 10);
        setActiveSection('chronicle');
        setActiveMealId(mId);
        const m = mealsById.get(mId);
        if (m?.restaurant?.id) {
          setActiveRestaurantId(m.restaurant.id);
        } else {
          setActiveRestaurantId(null);
        }
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

      // 3. Match /sentiment browse
      if (path.startsWith('/sentiment') || params.get('section') === 'sentiment') {
        setActiveSection('sentiment');
        setActiveRestaurantId(null);
        setActiveMealId(null);
        return;
      }

      // 4. Match /stats browse
      if (path.startsWith('/stats') || params.get('section') === 'stats') {
        setActiveSection('stats');
        setActiveRestaurantId(null);
        setActiveMealId(null);
        return;
      }

      // 5. Match /relationships browse (redirect to stats relationships tab)
      if (path.startsWith('/relationships') || params.get('section') === 'relationships') {
        window.history.replaceState(null, '', '/stats?tab=relationships');
        setActiveSection('stats');
        setActiveRestaurantId(null);
        setActiveMealId(null);
        return;
      }

      // 5. Match /restaurants browse
      if (path.startsWith('/restaurants') || params.get('section') === 'restaurants') {
        setActiveSection('restaurants');
        setActiveRestaurantId(null);
        setActiveMealId(null);
        return;
      }

      // 6. Match /chronicle browse
      if (path.startsWith('/chronicle') || params.get('section') === 'chronicle') {
        setActiveSection('chronicle');
        setActiveRestaurantId(null);
        setActiveMealId(null);
        const parsed = parseChronicleUrl(path, window.location.search, mealsDataPayload);
        setMealsFilterState({
          ...DEFAULT_MEALS_FILTER_STATE,
          ...parsed,
        });
        return;
      }

      // 5. Query params or default Overview (/)
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
        setActiveSection('overview');
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

  // Mobile dedicated single filter drawer configuration
  const singleFilterConfig = useMemo(() => {
    if (!activeMobileFilterKey) return null;

    if (activeMobileFilterKey === 'decades') {
      const counts = mealFacetCounts.decadeCounts || {};
      return {
        key: 'decades',
        title: 'Filter by Decade',
        selectedValues: mealsFilterState.decades || [],
        options: CANONICAL_DECADES.map((d) => ({
          value: d,
          label: d,
          count: counts[d] || 0,
        })),
      };
    }

    if (activeMobileFilterKey === 'ratings') {
      const counts = mealFacetCounts.ratingCounts || {};
      return {
        key: 'ratings',
        title: 'Filter by Meal Rating',
        selectedValues: mealsFilterState.ratings || [],
        options: CANONICAL_RATINGS.map((r) => ({
          value: r,
          label: formatRatingLabel(r),
          count: counts[r] || 0,
        })),
      };
    }

    if (activeMobileFilterKey === 'countries') {
      const counts = mealFacetCounts.countryCounts || {};
      const keysSet = new Set([...Object.keys(counts), ...(mealsFilterState.countries || [])]);
      const sortedKeys = Array.from(keysSet).sort((a, b) => {
        const diff = (counts[b] || 0) - (counts[a] || 0);
        return diff !== 0 ? diff : a.localeCompare(b);
      });
      return {
        key: 'countries',
        title: 'Filter by Country',
        selectedValues: mealsFilterState.countries || [],
        options: sortedKeys.map((c) => ({
          value: c,
          label: c,
          count: counts[c] || 0,
        })),
      };
    }

    if (activeMobileFilterKey === 'cities') {
      const counts = mealFacetCounts.cityCounts || {};
      const keysSet = new Set([...Object.keys(counts), ...(mealsFilterState.cities || [])]);
      const sortedKeys = Array.from(keysSet).sort((a, b) => {
        const diff = (counts[b] || 0) - (counts[a] || 0);
        return diff !== 0 ? diff : a.localeCompare(b);
      });
      return {
        key: 'cities',
        title: 'Filter by City',
        selectedValues: mealsFilterState.cities || [],
        options: sortedKeys.map((c) => ({
          value: c,
          label: c,
          count: counts[c] || 0,
        })),
      };
    }

    if (activeMobileFilterKey === 'cuisines') {
      const counts = mealFacetCounts.cuisineCounts || {};
      const keysSet = new Set([...Object.keys(counts), ...(mealsFilterState.cuisines || [])]);
      const sortedKeys = Array.from(keysSet).sort((a, b) => {
        const diff = (counts[b] || 0) - (counts[a] || 0);
        return diff !== 0 ? diff : a.localeCompare(b);
      });
      return {
        key: 'cuisines',
        title: 'Filter by Type',
        selectedValues: mealsFilterState.cuisines || [],
        options: sortedKeys.map((c) => ({
          value: c,
          label: c,
          count: counts[c] || 0,
        })),
      };
    }

    if (activeMobileFilterKey === 'people') {
      const counts = mealFacetCounts.peopleCounts || {};
      const keysSet = new Set([...Object.keys(counts), ...(mealsFilterState.people || [])]);
      const sortedKeys = Array.from(keysSet).sort((a, b) => {
        const diff = (counts[b] || 0) - (counts[a] || 0);
        return diff !== 0 ? diff : a.localeCompare(b);
      });
      return {
        key: 'people',
        title: 'Filter by Companion',
        selectedValues: mealsFilterState.people || [],
        options: sortedKeys.map((p) => ({
          value: p,
          label: p,
          count: counts[p] || 0,
        })),
      };
    }

    return null;
  }, [activeMobileFilterKey, mealsFilterState, mealFacetCounts]);

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
    setChronicleOrigin(null);
    setActiveSection(section);
    setActiveMealId(null);
    setActiveRestaurantId(null);
    let targetUrl = '/';
    if (section === 'chronicle') targetUrl = '/chronicle';
    else if (section === 'restaurants') targetUrl = '/restaurants';
    else if (section === 'people') targetUrl = '/people';
    else if (section === 'sentiment') targetUrl = '/sentiment';
    else if (section === 'food') targetUrl = '/food';
    else if (section === 'stats') targetUrl = '/stats';
    else if (section === 'journey') targetUrl = '/journey';
    else if (section === 'places') targetUrl = '/places';
    window.history.pushState(null, '', targetUrl);
    window.scrollTo(0, 0);
  };

  const handleApplyChronicleFilter = (filterKey, filterValue, metaName) => {
    const origin =
      activeSection === 'people'
        ? { section: 'people', label: 'Return to People' }
        : activeSection === 'stats'
        ? { section: 'stats', label: 'Return to Stats' }
        : activeSection === 'food'
        ? { section: 'food', label: 'Return to Food' }
        : { section: 'overview', label: 'Return to Overview' };
    setChronicleOrigin(origin);
    setActiveSection('chronicle');
    setActiveMealId(null);
    setActiveRestaurantId(null);

    if (typeof filterKey === 'object' && filterKey !== null) {
      // Multi-filter object support (e.g. from Relationships bipartite flow)
      const mergedFilters = {
        ...DEFAULT_MEALS_FILTER_STATE,
        ...filterKey,
      };
      setMealsFilterState(mergedFilters);
      window.history.pushState(null, '', '/chronicle');
    } else if (filterKey === 'restaurantId') {
      setMealsFilterState({
        ...DEFAULT_MEALS_FILTER_STATE,
        restaurantId: filterValue,
        restaurantName: metaName || '',
      });
      window.history.pushState(null, '', `/?restaurant=${filterValue}`);
    } else {
      setMealsFilterState({
        ...DEFAULT_MEALS_FILTER_STATE,
        [filterKey]: Array.isArray(filterValue) ? filterValue : [filterValue],
      });
      window.history.pushState(null, '', '/chronicle');
    }
    setMealsCurrentPage(1);
    window.scrollTo(0, 0);
  };

  const handleOpenMeal = (mealId, origin = null) => {
    if (origin) {
      setMealOrigin(origin);
    } else if (activeSection === 'sentiment') {
      setMealOrigin({ section: 'sentiment', label: 'Back to Sentiment' });
    } else if (activeSection === 'overview') {
      setMealOrigin({ section: 'overview', label: 'Back to Overview' });
    } else if (activeSection === 'restaurants') {
      setMealOrigin({ section: 'restaurants', label: 'Back to Restaurants' });
    } else if (activeSection === 'people') {
      setMealOrigin({ section: 'people', label: 'Back to People' });
    } else if (activeSection === 'places') {
      setMealOrigin({ section: 'places', label: 'Back to Places' });
    } else {
      setMealOrigin({ section: 'chronicle', label: 'Back to Chronicle' });
    }

    const targetMeal = mealsById.get(mealId);
    const restId = targetMeal?.restaurant?.id || null;
    setActiveMealId(mealId);
    setActiveRestaurantId(restId);
    window.history.pushState(null, '', `/meals/${mealId}`);
    window.scrollTo(0, 0);
  };

  const handleBackToChronicle = () => {
    const originSection = mealOrigin?.section || (activeSection === 'restaurants' ? 'restaurants' : 'chronicle');
    setActiveMealId(null);
    setActiveRestaurantId(null);
    if (originSection === 'sentiment') {
      setActiveSection('sentiment');
      window.history.pushState(null, '', '/sentiment');
    } else if (originSection === 'overview') {
      setActiveSection('overview');
      window.history.pushState(null, '', '/');
    } else if (originSection === 'restaurants') {
      setActiveSection('restaurants');
      window.history.pushState(null, '', '/restaurants');
    } else if (originSection === 'people') {
      setActiveSection('people');
      window.history.pushState(null, '', '/people');
    } else if (originSection === 'places') {
      setActiveSection('places');
      window.history.pushState(null, '', '/places');
    } else {
      setActiveSection('chronicle');
      window.history.pushState(null, '', '/chronicle');
    }
    setMealOrigin(null);
    window.scrollTo(0, 0);
  };

  const handleOpenRestaurant = (restaurantId, origin = null) => {
    setActiveMealId(null);
    setMealOrigin(origin);
    setActiveRestaurantId(restaurantId);
    window.history.pushState(null, '', `/restaurants/${restaurantId}`);
    window.scrollTo(0, 0);
  };

  const handleBackToRestaurants = () => {
    setActiveMealId(null);
    setActiveRestaurantId(null);
    setMealOrigin(null);
    setActiveSection('restaurants');
    window.history.pushState(null, '', '/restaurants');
    window.scrollTo(0, 0);
  };

  const handleNavigateToChronicleWithRestaurant = (restaurant) => {
    setChronicleOrigin({ section: 'restaurants', label: 'Return to Restaurants' });
    setActiveSection('chronicle');
    setActiveMealId(null);
    setActiveRestaurantId(null);
    setMealsFilterState({
      ...DEFAULT_MEALS_FILTER_STATE,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });
    setMealsCurrentPage(1);
    window.history.pushState(null, '', `/?restaurant=${restaurant.id}`);
    window.scrollTo(0, 0);
  };

  const handleReturnFromChronicle = () => {
    if (!chronicleOrigin) return;
    const targetSection = chronicleOrigin.section;
    setChronicleOrigin(null);
    setMealsFilterState(DEFAULT_MEALS_FILTER_STATE);
    setMealsCurrentPage(1);
    setActiveMealId(null);
    setActiveRestaurantId(null);
    setActiveSection(targetSection);
    let targetUrl = '/';
    if (targetSection === 'restaurants') targetUrl = '/restaurants';
    else if (targetSection === 'relationships') targetUrl = '/relationships';
    window.history.pushState(null, '', targetUrl);
    window.scrollTo(0, 0);
  };

  // --- MEALS FILTER ACTION HANDLERS ---
  const handleUpdateMealFilter = (key, value) => {
    if (key === 'restaurantId' && !value) {
      setMealsFilterState((prev) => ({ ...prev, restaurantId: null, restaurantName: '' }));
    } else {
      setMealsFilterState((prev) => ({ ...prev, [key]: value }));
    }
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
    setChronicleOrigin(null);
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

  // Sensitive return action: only active when user jumped into Chronicle with a pre-selection
  const returnAction = useMemo(() => {
    if (activeSection !== 'chronicle' || activeMealId !== null || !chronicleOrigin) {
      return null;
    }
    // Only sensitive if there is an active pre-selected filter state
    if (activeMealsFiltersCount === 0) {
      return null;
    }
    return {
      label: chronicleOrigin.label,
      onReturn: handleReturnFromChronicle,
    };
  }, [activeSection, activeMealId, chronicleOrigin, activeMealsFiltersCount]);

  return (
    <div
      className={`meals-app-layout ${activeSection === 'chronicle' ? 'chronicle-active' : ''} ${activeSection === 'journey' ? 'journey-active' : ''} ${activeSection === 'places' ? 'places-active' : ''} ${activeSection === 'people' ? 'people-active' : ''}`}
    >
      {/* Primary Header */}
      <MealsHeader
        activeNav={activeSection}
        onSelectNav={handleSelectNav}
        mealCount={meals.length}
        restaurantCount={restaurants.length}
      />

      {/* Random Meal Memory Banner directly underneath Header */}
      {!loading && !error && meals.length > 0 && activeSection !== 'journey' && (
        <MealCommentBar
          meals={meals}
          actionTrigger={actionTrigger}
          onSelectMeal={handleOpenMeal}
          returnAction={returnAction}
        />
      )}

      {/* Main Content Area */}
      <main className="meals-main-content">
        {loading ? (
          <div className="meals-state-container loading-state">
            <Loader2 size={36} className="state-spinner" />
            <h2 className="state-title">Loading Meals Archive...</h2>
            <p className="state-subtext">
              Preparing dining history and records.
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
        ) : activeRestaurantId || activeMealId ? (
          /* Single Unified Restaurant Detail View */
          <RestaurantDetailPage
            restaurant={
              activeRestaurant ||
              (activeMealId && mealsById.get(activeMealId)?.restaurant?.id
                ? restaurantsById.get(mealsById.get(activeMealId).restaurant.id) ||
                  mealsById.get(activeMealId).restaurant
                : null)
            }
            selectedMealId={activeMealId}
            onBack={activeMealId ? handleBackToChronicle : handleBackToRestaurants}
            backLabel={
              activeMealId
                ? mealOrigin?.label ||
                  (activeSection === 'sentiment'
                    ? 'Back to Sentiment'
                    : activeSection === 'overview'
                    ? 'Back to Overview'
                    : activeSection === 'people'
                    ? 'Back to People'
                    : activeSection === 'places'
                    ? 'Back to Places'
                    : 'Back to Chronicle')
                : 'Back to Restaurants'
            }
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
              viewMode={restaurantViewMode}
              onViewModeChange={setRestaurantViewMode}
            />

            {/* 3. View Switcher: Map View vs Flat Directory Table */}
            {restaurantViewMode === 'map' ? (
              <RestaurantsMap
                restaurants={sortedRestaurants}
                onSelectRestaurantForChronicle={handleNavigateToChronicleWithRestaurant}
              />
            ) : (
              <>
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
              </>
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
        ) : activeSection === 'chronicle' ? (
          /* 4. Meal Chronicle Browse View */
          <div className="chronicle-view">
            {/* Mobile Header Toolbar (visible only on <=768px, sticky with hide-on-scroll) */}
            <MealsMobileHeaderToolbar
              totalCount={meals.length}
              filteredCount={totalFilteredMealsCount}
              searchQuery={mealsFilterState.search}
              onSearchChange={(q) => handleUpdateMealFilter('search', q)}
              onOpenSort={() => setIsMobileSortOpen(true)}
              onOpenFilter={(filterKey) => {
                setActiveMobileFilterKey(filterKey);
              }}
              filterState={mealsFilterState}
              viewMode={chronicleViewMode}
              onToggleViewMode={(mode) => setChronicleViewMode(mode)}
            />

            {/* Mobile Chronicle View (<=768px): List vs Map */}
            <div
              className={`mobile-chronicle-container ${
                chronicleViewMode === 'map' ? 'is-map-view' : ''
              }`}
            >
              {chronicleViewMode === 'map' ? (
                <MealsMobileMap meals={sortedMeals} onSelectMeal={handleOpenMeal} />
              ) : (
                <div className="mobile-meals-list">
                  {paginatedMeals.length > 0 ? (
                    <>
                      {paginatedMeals.map((meal) => (
                        <MealsMobileCard
                          key={meal.id}
                          meal={meal}
                          onSelectMeal={handleOpenMeal}
                          onShowOnMap={() => {
                            setChronicleViewMode('map');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                      ))}

                      {totalFilteredMealsCount > mealsPageSize && (
                        <div className="mobile-pagination-wrapper">
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
                      )}
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
              )}
            </div>

            {/* Desktop Chronicle Layout (min-width: 769px) */}
            <div className="desktop-chronicle-container">
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
                    filterState={mealsFilterState}
                    onOpenMobileFilters={() => {
                      setMobileFilterInitialSection(null);
                      setIsMobileMealsFilterOpen(true);
                    }}
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
            </div>

            {/* Mobile Filter Sheet Drawer for Meals */}
            <MealsMobileFilterSheet
              isOpen={isMobileMealsFilterOpen}
              onClose={() => setIsMobileMealsFilterOpen(false)}
              filterState={mealsFilterState}
              onApplyFilters={handleApplyMobileMealFilters}
              onClearFilters={handleClearAllMealFilters}
              counts={mealFacetCounts}
              initialSection={mobileFilterInitialSection}
            />

            {/* Dedicated Single Filter Sheet matching Screenshot 1 */}
            {singleFilterConfig && (
              <MealsMobileSingleFilterSheet
                isOpen={Boolean(activeMobileFilterKey)}
                onClose={() => setActiveMobileFilterKey(null)}
                filterKey={singleFilterConfig.key}
                title={singleFilterConfig.title}
                selectedValues={singleFilterConfig.selectedValues}
                options={singleFilterConfig.options}
                onApply={(newValues) => {
                  handleUpdateMealFilter(singleFilterConfig.key, newValues);
                }}
              />
            )}

            {/* Mobile Sort Sheet */}
            <MealsMobileSortSheet
              isOpen={isMobileSortOpen}
              onClose={() => setIsMobileSortOpen(false)}
              sortOption={mealsSortOption}
              onSelectSort={(s) => {
                setMealsSortOption(s);
                setMealsCurrentPage(1);
              }}
            />
          </div>
        ) : activeSection === 'people' ? (
          /* People Social Dining History View */
          <React.Suspense
            fallback={
              <div className="meals-loading-center">
                <Loader2 className="spinner-icon" size={36} />
                <p>Loading People...</p>
              </div>
            }
          >
            <PeoplePage
              meals={meals}
              publicPeopleById={publicPeopleById}
              rawPeoplePublic={mealsDataPayload?.rawPeoplePublic || []}
              mealsData={mealsDataPayload}
              onNavigateToJourney={(slug) => {
                setActiveSection('journey');
                window.history.pushState(null, '', `/?person=${slug}`);
              }}
              onNavigateToChronicle={(name) => {
                handleApplyChronicleFilter('people', [name]);
              }}
              onSelectMeal={handleOpenMeal}
              onSelectRestaurant={handleOpenRestaurant}
            />
          </React.Suspense>
        ) : activeSection === 'sentiment' ? (
          /* 6. Sentiment & Comments View */
          <SentimentPage
            meals={meals}
            onSelectMeal={(id) =>
              handleOpenMeal(id, { section: 'sentiment', label: 'Back to Sentiment' })
            }
          />
        ) : activeSection === 'food' ? (
          /* 7. Culinary & Food Intelligence */
          <FoodPage
            meals={meals}
            restaurants={restaurants}
            onNavigateToChronicle={handleApplyChronicleFilter}
          />
        ) : activeSection === 'stats' ? (
          /* 8. Dining Intelligence & Archive KPIs */
          <StatsPage
            meals={meals}
            restaurants={restaurants}
            onApplyChronicleFilter={handleApplyChronicleFilter}
          />
        ) : activeSection === 'journey' ? (
          /* 9. Journeys 3D Meal Film */
          <React.Suspense
            fallback={
              <div className="meals-loading-center">
                <Loader2 className="spinner-icon" size={36} />
                <p>Loading Journeys...</p>
              </div>
            }
          >
            <MyJourneyPage mealsData={mealsDataPayload} />
          </React.Suspense>
        ) : activeSection === 'places' ? (
          /* 10. Places 3D Globe */
          <React.Suspense
            fallback={
              <div className="meals-loading-center">
                <Loader2 className="spinner-icon" size={36} />
                <p>Loading Places...</p>
              </div>
            }
          >
            <PlacesPage mealsData={mealsDataPayload} />
          </React.Suspense>
        ) : (
          /* 7. Overview Landing Page (Default) */
          <OverviewPage
            meals={meals}
            restaurants={restaurants}
            onNavigateToChronicle={() => handleSelectNav('chronicle')}
            onNavigateToRestaurants={() => handleSelectNav('restaurants')}
            onNavigateToMealDetail={handleOpenMeal}
            onNavigateToRestaurantDetail={handleOpenRestaurant}
            onApplyChronicleFilter={handleApplyChronicleFilter}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Fixed 4 Tabs: Chronicle, Restaurants, Food, Stats) */}
      <MobileBottomNav
        activeNav={activeSection}
        onSelectNav={handleSelectNav}
      />
    </div>
  );
}
