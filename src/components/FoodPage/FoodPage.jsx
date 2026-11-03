import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UtensilsCrossed,
  Layers,
  Leaf,
  PieChart,
  Search,
  X,
  ChevronDown,
  Building2,
  MapPin,
  Globe,
  ExternalLink,
  Tag,
  Apple,
  Check,
} from 'lucide-react';
import {
  DEFAULT_FOOD_FILTER_STATE,
  filterMealsForFood,
  computeFoodFacetCounts,
  aggregateFoodCharts,
} from '../../utils/foodAnalytics.js';
import { stripAccents } from '../../utils/restaurantsFilter.js';
import './FoodPage.css';

/**
 * Filter Dropdown Popover with Accent-Insensitive Search, Popular/A-Z Sort, and Meal Counts
 */
function FoodFilterPopover({
  label,
  icon: Icon,
  options = [],
  selectedValues = [],
  counts = {},
  onToggleValue,
  isOpen,
  onToggle,
  onClose,
  searchPlaceholder = 'Search...',
}) {
  const popoverRef = useRef(null);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('count_desc'); // 'count_desc' (Popular) or 'name_asc' (A-Z)

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Normalize options into { id, label, count }
  const normalizedItems = useMemo(() => {
    return options.map((opt) => {
      const id = typeof opt === 'object' && opt.id !== undefined ? opt.id : opt;
      const label = typeof opt === 'object' && opt.name ? opt.name : String(opt);
      const count = counts[label] !== undefined ? counts[label] : counts[id] || 0;
      return { id, label, count };
    });
  }, [options, counts]);

  // Search filter
  const filteredItems = useMemo(() => {
    const q = stripAccents(query.trim());
    if (!q) return normalizedItems;
    return normalizedItems.filter((item) => stripAccents(item.label).includes(q));
  }, [normalizedItems, query]);

  // Sort: pinned selected first, then sortMode
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aSel = selectedValues.includes(a.label) || selectedValues.includes(a.id);
      const bSel = selectedValues.includes(b.label) || selectedValues.includes(b.id);
      if (aSel !== bSel) return aSel ? -1 : 1;

      if (sortMode === 'count_desc') {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      }
      return a.label.localeCompare(b.label);
    });
  }, [filteredItems, selectedValues, sortMode]);

  const activeCount = selectedValues.length;

  return (
    <div className="food-filter-dropdown" ref={popoverRef}>
      <button
        type="button"
        className={`food-filter-btn ${activeCount > 0 ? 'active' : ''} ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        {Icon && <Icon size={14} className="food-filter-btn-icon" />}
        <span>{label}</span>
        {activeCount > 0 && <span className="food-filter-badge">{activeCount}</span>}
        <ChevronDown size={14} className="dropdown-chevron" />
      </button>

      {isOpen && (
        <div className="food-popover-panel">
          <div className="food-popover-toolbar">
            <div className="food-popover-search">
              <Search size={13} className="food-search-icon" />
              <input
                type="text"
                className="food-popover-search-input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className="food-search-clear-btn"
                  onClick={() => setQuery('')}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="food-popover-sort">
              <span className="sort-label">Order:</span>
              <div className="food-sort-pills">
                <button
                  type="button"
                  className={`food-sort-pill ${sortMode === 'count_desc' ? 'active' : ''}`}
                  onClick={() => setSortMode('count_desc')}
                  title="Sort by Most Popular (Count high to low)"
                >
                  Popular
                </button>
                <button
                  type="button"
                  className={`food-sort-pill ${sortMode === 'name_asc' ? 'active' : ''}`}
                  onClick={() => setSortMode('name_asc')}
                  title="Sort Alphabetically (A to Z)"
                >
                  A–Z
                </button>
              </div>
            </div>
          </div>

          <div className="food-popover-scroll">
            {sortedItems.length > 0 ? (
              sortedItems.map((item) => {
                const isSelected =
                  selectedValues.includes(item.label) || selectedValues.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`food-option-row ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleValue(item.label)}
                    />
                    <span className="option-name">{item.label}</span>
                    {item.count > 0 && (
                      <span className="option-count">({item.count.toLocaleString()})</span>
                    )}
                  </label>
                );
              })
            ) : (
              <div className="food-popover-no-results">No options match</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable Horizontal Bar Chart Card for Food Metrics
 */
function FoodHorizontalBarChart({
  chartKey,
  title,
  subtitle,
  icon: Icon,
  items = [],
  selectedItems = [],
  maxCount = 1,
  totalMeals = 1,
  themeClass = 'theme-dishes',
  onItemClick,
  onCountClick,
  isTall = false,
  showThumbnails = false,
  thumbnailType = 'dish', // 'dish' or 'ingredient'
  headerCustomToggle = null,
}) {
  const [viewLimit, setViewLimit] = useState(isTall ? 25 : 10); // 10/25/50 or 'all'
  const [cardSearch, setCardSearch] = useState('');

  // Update viewLimit when switching between compact and tall modes
  useEffect(() => {
    setViewLimit(isTall ? 25 : 10);
  }, [isTall, chartKey]);

  // Filter items by local search if user wants to filter in-card
  const filteredItems = useMemo(() => {
    const q = stripAccents(cardSearch.trim());
    if (!q) return items;
    return items.filter((it) => stripAccents(it.name).includes(q));
  }, [items, cardSearch]);

  const visibleItems = useMemo(() => {
    if (viewLimit === 'all') return filteredItems;
    return filteredItems.slice(0, viewLimit);
  }, [filteredItems, viewLimit]);

  const limitOptions = isTall ? [25, 50, 'all'] : [10, 25, 'all'];

  return (
    <div className={`food-chart-card ${themeClass} ${isTall ? 'is-tall' : ''}`}>
      <div className="food-card-header">
        <div className="food-card-title-group">
          {headerCustomToggle ? (
            <div className="custom-toggle-wrap">
              {headerCustomToggle}
              <p className="food-card-subtitle">{subtitle}</p>
            </div>
          ) : (
            <>
              <div className="food-card-icon-wrap">
                {Icon && <Icon size={18} />}
              </div>
              <div>
                <h3 className="food-card-title">{title}</h3>
                <p className="food-card-subtitle">{subtitle}</p>
              </div>
            </>
          )}
        </div>

        <div className="food-card-controls">
          <div className="limit-selector">
            {limitOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`limit-btn ${viewLimit === opt ? 'active' : ''}`}
                onClick={() => setViewLimit(opt)}
              >
                {opt === 'all' ? 'All' : `Top ${opt}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* In-Card Quick Search if items > 15 */}
      {items.length > 15 && (
        <div className="card-quick-search-row">
          <Search size={12} className="card-search-icon" />
          <input
            type="text"
            className="card-search-input"
            placeholder={`Filter ${title.toLowerCase()}...`}
            value={cardSearch}
            onChange={(e) => setCardSearch(e.target.value)}
          />
          {cardSearch && (
            <button
              type="button"
              className="card-search-clear"
              onClick={() => setCardSearch('')}
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {/* Bars List */}
      <div className="food-bars-scroll">
        {visibleItems.length > 0 ? (
          visibleItems.map((item, idx) => {
            const isSelected = selectedItems.includes(item.name);
            const barWidth = Math.max((item.count / maxCount) * 100, 2);
            const mealPct = item.percentage.toFixed(1);

            return (
              <div
                key={item.name}
                className={`food-bar-row ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onItemClick && onItemClick(chartKey, item.name)}
                title={`Click to filter by "${item.name}"`}
              >
                <div className="bar-label-area">
                  <span className="bar-rank">#{idx + 1}</span>

                  {/* Thumbnail Photo / Icon */}
                  {showThumbnails && (
                    <div className={`bar-thumb-wrap thumb-${thumbnailType}`}>
                      {thumbnailType === 'dish' && item.photo ? (
                        <img
                          src={item.photo}
                          alt={item.name}
                          className="food-bar-thumb"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : thumbnailType === 'ingredient' && item.icon ? (
                        <img
                          src={item.icon}
                          alt={item.name}
                          className="food-bar-thumb"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <span
                        className="food-bar-thumb-fallback"
                        style={{
                          display:
                            (thumbnailType === 'dish' && item.photo) ||
                            (thumbnailType === 'ingredient' && item.icon)
                              ? 'none'
                              : 'flex',
                        }}
                      >
                        {thumbnailType === 'dish' ? (
                          <UtensilsCrossed size={12} className="thumb-icon-fallback" />
                        ) : (
                          <Leaf size={12} className="thumb-icon-fallback" />
                        )}
                      </span>
                    </div>
                  )}

                  <span className="bar-item-name" title={item.name}>
                    {item.name}
                  </span>
                  {isSelected && <Check size={12} className="bar-selected-icon" />}
                </div>

                <div className="bar-track-area">
                  <div
                    className="bar-fill"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="bar-meta-area">
                  {/* Clickable meal count button navigating to Chronicle with active filters */}
                  <button
                    type="button"
                    className="bar-count-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCountClick && onCountClick(chartKey, item.name);
                    }}
                    title={`View ${item.count.toLocaleString()} meals in Chronicle with current filters`}
                  >
                    <strong>{item.count.toLocaleString()}</strong>{' '}
                    <span>{item.count === 1 ? 'meal' : 'meals'}</span>
                    <ExternalLink size={10} className="count-ext-icon" />
                  </button>
                  <span className="bar-pct-pill">{mealPct}%</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="food-bars-empty">No matching records found</div>
        )}
      </div>
    </div>
  );
}

export default function FoodPage({ meals = [], restaurants = [], onNavigateToChronicle }) {
  const [filterState, setFilterState] = useState(DEFAULT_FOOD_FILTER_STATE);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [rightViewMode, setRightViewMode] = useState('dishes'); // 'dishes' | 'ingredients'

  const toggleDropdown = (name) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };
  const closeDropdown = () => setOpenDropdown(null);

  // Toggle multi-select items in filter state
  const handleToggleArray = (key, val) => {
    setFilterState((prev) => {
      const list = prev[key] || [];
      const updated = list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
      return { ...prev, [key]: updated };
    });
  };

  const handleClearAll = () => {
    setFilterState(DEFAULT_FOOD_FILTER_STATE);
  };

  // Filter meals according to active filters
  const filteredMeals = useMemo(() => {
    return filterMealsForFood(meals, filterState);
  }, [meals, filterState]);

  // Compute dynamic counts for all dropdowns
  const facetCounts = useMemo(() => {
    return computeFoodFacetCounts(meals, filterState);
  }, [meals, filterState]);

  // Aggregate the 4 horizontal bar charts
  const charts = useMemo(() => {
    return aggregateFoodCharts(filteredMeals);
  }, [filteredMeals]);

  // Extract available unique options
  const availableCountries = useMemo(() => {
    const set = new Set();
    meals.forEach((m) => {
      const c = m.restaurant?.city?.country?.name;
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meals]);

  const availableCities = useMemo(() => {
    const set = new Set();
    meals.forEach((m) => {
      const city = m.restaurant?.city?.name;
      if (city) set.add(city);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meals]);

  const availableRestaurants = useMemo(() => {
    const set = new Set();
    meals.forEach((m) => {
      const rest = m.restaurant?.name;
      if (rest) set.add(rest);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meals]);

  const availableFoodTypes = useMemo(() => {
    const set = new Set();
    meals.forEach((m) => {
      (m.mains || []).forEach((main) => {
        const ft = main.food?.foodType?.name?.trim() || main.food?.category?.trim();
        if (ft) set.add(ft);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meals]);

  const availableIngredients = useMemo(() => {
    const set = new Set();
    meals.forEach((m) => {
      (m.mains || []).forEach((main) => {
        const ing = main.food?.ingredient?.name?.trim();
        if (ing) set.add(ing);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meals]);

  const availableDishes = useMemo(() => {
    const set = new Set();
    meals.forEach((m) => {
      (m.mains || []).forEach((main) => {
        const dish = main.food?.name?.trim();
        if (dish) set.add(dish);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meals]);

  const availableCategories = useMemo(() => {
    const set = new Set();
    meals.forEach((m) => {
      (m.mains || []).forEach((main) => {
        const cat = main.food?.ingredient?.category?.trim();
        if (cat) set.add(cat);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meals]);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (filterState.search) {
      chips.push({
        key: 'search',
        label: `Search: "${filterState.search}"`,
        onRemove: () => setFilterState((prev) => ({ ...prev, search: '' })),
      });
    }
    filterState.countries.forEach((c) => {
      chips.push({
        key: `country_${c}`,
        label: `Country: ${c}`,
        onRemove: () => handleToggleArray('countries', c),
      });
    });
    filterState.cities.forEach((city) => {
      chips.push({
        key: `city_${city}`,
        label: `City: ${city}`,
        onRemove: () => handleToggleArray('cities', city),
      });
    });
    filterState.restaurants.forEach((r) => {
      chips.push({
        key: `rest_${r}`,
        label: `Restaurant: ${r}`,
        onRemove: () => handleToggleArray('restaurants', r),
      });
    });
    filterState.foodTypes.forEach((ft) => {
      chips.push({
        key: `foodType_${ft}`,
        label: `Food Type: ${ft}`,
        onRemove: () => handleToggleArray('foodTypes', ft),
      });
    });
    filterState.ingredients.forEach((ing) => {
      chips.push({
        key: `ingredient_${ing}`,
        label: `Ingredient: ${ing}`,
        onRemove: () => handleToggleArray('ingredients', ing),
      });
    });
    filterState.dishes.forEach((d) => {
      chips.push({
        key: `dish_${d}`,
        label: `Dish: ${d}`,
        onRemove: () => handleToggleArray('dishes', d),
      });
    });
    filterState.categories.forEach((cat) => {
      chips.push({
        key: `category_${cat}`,
        label: `Category: ${cat}`,
        onRemove: () => handleToggleArray('categories', cat),
      });
    });
    return chips;
  }, [filterState]);

  // When clicking on a dish, food type, ingredient, or category in the chart:
  // Push it into the specific filter at the top!
  const handleBarItemClick = (chartKey, name) => {
    if (chartKey === 'dish') {
      handleToggleArray('dishes', name);
    } else if (chartKey === 'foodType') {
      handleToggleArray('foodTypes', name);
    } else if (chartKey === 'ingredient') {
      handleToggleArray('ingredients', name);
    } else if (chartKey === 'category') {
      handleToggleArray('categories', name);
    }
  };

  // When clicking on the "256 meals" badge:
  // Click through to Chronicle with current filter set sent through!
  const handleMealCountClick = (chartKey, name) => {
    if (!onNavigateToChronicle) return;

    // Build Chronicle filter payload
    const chronicleFilters = {
      countries: filterState.countries.length > 0 ? filterState.countries : [],
      cities: filterState.cities.length > 0 ? filterState.cities : [],
      foodTypes: filterState.foodTypes.length > 0 ? [...filterState.foodTypes] : [],
      ingredients: filterState.ingredients.length > 0 ? [...filterState.ingredients] : [],
      search: filterState.search || '',
    };

    // If single restaurant selected
    if (filterState.restaurants.length === 1) {
      chronicleFilters.restaurantName = filterState.restaurants[0];
    } else if (filterState.restaurants.length > 1) {
      chronicleFilters.search = filterState.restaurants.join(' OR ');
    }

    // Attach specific row selection
    if (chartKey === 'dish') {
      chronicleFilters.search = chronicleFilters.search
        ? `${chronicleFilters.search} ${name}`
        : name;
    } else if (chartKey === 'foodType') {
      if (!chronicleFilters.foodTypes.includes(name)) {
        chronicleFilters.foodTypes.push(name);
      }
    } else if (chartKey === 'ingredient') {
      if (!chronicleFilters.ingredients.includes(name)) {
        chronicleFilters.ingredients.push(name);
      }
    } else if (chartKey === 'category') {
      chronicleFilters.search = chronicleFilters.search
        ? `${chronicleFilters.search} ${name}`
        : name;
    }

    onNavigateToChronicle(chronicleFilters);
  };

  return (
    <div className="food-page-root">
      {/* 1. Header Banner */}
      <header className="food-page-header">
        <div className="food-header-content">
          <div className="food-hero-badge">
            <UtensilsCrossed size={14} />
            <span>Culinary Archive Intelligence</span>
          </div>
          <h1 className="food-page-title">Food & Dishes</h1>
          <p className="food-page-subtitle">
            Explore {charts.uniqueDishesCount.toLocaleString()} dishes, {charts.uniqueFoodTypesCount.toLocaleString()} culinary styles, {charts.uniqueIngredientsCount.toLocaleString()} ingredients, and {charts.uniqueCategoriesCount} categories across dining history.
          </p>
        </div>
      </header>

      {/* 2. Search & Standard Filter Bar */}
      <section className="food-filter-toolbar-section">
        <div className="food-main-search-bar">
          <div className="food-search-input-wrap">
            <Search size={18} className="main-search-icon" />
            <input
              type="text"
              className="food-main-search-input"
              placeholder="Search dishes, styles, ingredients, categories, restaurants..."
              value={filterState.search}
              onChange={(e) => setFilterState((prev) => ({ ...prev, search: e.target.value }))}
            />
            {filterState.search && (
              <button
                type="button"
                className="main-search-clear-btn"
                onClick={() => setFilterState((prev) => ({ ...prev, search: '' }))}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns Row: Country, City, Restaurant + Food Type, Ingredient, Dish, Category */}
        <div className="food-dropdowns-row">
          <FoodFilterPopover
            label="Country"
            icon={Globe}
            options={availableCountries}
            selectedValues={filterState.countries}
            counts={facetCounts.countryCounts}
            onToggleValue={(v) => handleToggleArray('countries', v)}
            isOpen={openDropdown === 'country'}
            onToggle={() => toggleDropdown('country')}
            onClose={closeDropdown}
            searchPlaceholder="Search countries..."
          />

          <FoodFilterPopover
            label="City"
            icon={MapPin}
            options={availableCities}
            selectedValues={filterState.cities}
            counts={facetCounts.cityCounts}
            onToggleValue={(v) => handleToggleArray('cities', v)}
            isOpen={openDropdown === 'city'}
            onToggle={() => toggleDropdown('city')}
            onClose={closeDropdown}
            searchPlaceholder="Search cities..."
          />

          <FoodFilterPopover
            label="Restaurant"
            icon={Building2}
            options={availableRestaurants}
            selectedValues={filterState.restaurants}
            counts={facetCounts.restaurantCounts}
            onToggleValue={(v) => handleToggleArray('restaurants', v)}
            isOpen={openDropdown === 'restaurant'}
            onToggle={() => toggleDropdown('restaurant')}
            onClose={closeDropdown}
            searchPlaceholder="Search restaurants..."
          />

          <FoodFilterPopover
            label="Food Type"
            icon={Layers}
            options={availableFoodTypes}
            selectedValues={filterState.foodTypes}
            counts={facetCounts.foodTypeCounts}
            onToggleValue={(v) => handleToggleArray('foodTypes', v)}
            isOpen={openDropdown === 'foodType'}
            onToggle={() => toggleDropdown('foodType')}
            onClose={closeDropdown}
            searchPlaceholder="Search food types..."
          />

          <FoodFilterPopover
            label="Ingredient"
            icon={Leaf}
            options={availableIngredients}
            selectedValues={filterState.ingredients}
            counts={facetCounts.ingredientCounts}
            onToggleValue={(v) => handleToggleArray('ingredients', v)}
            isOpen={openDropdown === 'ingredient'}
            onToggle={() => toggleDropdown('ingredient')}
            onClose={closeDropdown}
            searchPlaceholder="Search ingredients..."
          />

          <FoodFilterPopover
            label="Dish"
            icon={UtensilsCrossed}
            options={availableDishes}
            selectedValues={filterState.dishes}
            counts={facetCounts.dishCounts}
            onToggleValue={(v) => handleToggleArray('dishes', v)}
            isOpen={openDropdown === 'dish'}
            onToggle={() => toggleDropdown('dish')}
            onClose={closeDropdown}
            searchPlaceholder="Search dishes..."
          />

          <FoodFilterPopover
            label="Category"
            icon={PieChart}
            options={availableCategories}
            selectedValues={filterState.categories}
            counts={facetCounts.categoryCounts}
            onToggleValue={(v) => handleToggleArray('categories', v)}
            isOpen={openDropdown === 'category'}
            onToggle={() => toggleDropdown('category')}
            onClose={closeDropdown}
            searchPlaceholder="Search categories..."
          />
        </div>

        {/* Active Chips Row */}
        {activeChips.length > 0 && (
          <div className="food-active-chips-strip">
            <div className="chips-list">
              {activeChips.map((chip) => (
                <span key={chip.key} className="food-filter-chip">
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    className="chip-remove-btn"
                    onClick={chip.onRemove}
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            <button
              type="button"
              className="food-clear-all-btn"
              onClick={handleClearAll}
              title="Clear all active filters"
            >
              Clear all filters ({activeChips.length})
            </button>
          </div>
        )}

        {/* Filter Results Summary Counter */}
        <div className="food-results-meta">
          <span>
            Showing statistics for <strong>{filteredMeals.length.toLocaleString()}</strong> of{' '}
            {meals.length.toLocaleString()} total meals
          </span>
        </div>
      </section>

      {/* 3. Layout:
          Left column:
            1. Food Types & Styles (top)
            2. Ingredient Categories (underneath)
          Right column:
            Dishes and Ingredients View Toggle (runs all the way down, ~2x height)
      */}
      <section className="food-two-column-layout">
        {/* Left Column: Food Types (top) & Ingredient Categories (underneath) */}
        <div className="food-side-column food-column-left">
          {/* Chart 1: Food Types & Styles (Top Left) */}
          <FoodHorizontalBarChart
            chartKey="foodType"
            title="Food Types & Styles"
            subtitle={`${charts.uniqueFoodTypesCount.toLocaleString()} distinct culinary styles`}
            icon={Layers}
            items={charts.foodTypes}
            selectedItems={filterState.foodTypes}
            maxCount={charts.maxFoodTypeCount}
            totalMeals={charts.totalMeals}
            themeClass="theme-types"
            onItemClick={handleBarItemClick}
            onCountClick={handleMealCountClick}
          />

          {/* Chart 2: Ingredient Categories (Bottom Left) */}
          <FoodHorizontalBarChart
            chartKey="category"
            title="Ingredient Categories"
            subtitle={`${charts.uniqueCategoriesCount.toLocaleString()} broad ingredient classifications`}
            icon={PieChart}
            items={charts.ingredientCategories}
            selectedItems={filterState.categories}
            maxCount={charts.maxCategoryCount}
            totalMeals={charts.totalMeals}
            themeClass="theme-categories"
            onItemClick={handleBarItemClick}
            onCountClick={handleMealCountClick}
          />
        </div>

        {/* Right Column: Toggle between Dishes and Ingredients (runs all the way down) */}
        <div className="food-side-column food-column-right">
          {rightViewMode === 'dishes' ? (
            <FoodHorizontalBarChart
              key="dishes-tall"
              chartKey="dish"
              title="Dishes & Food Items"
              subtitle={`${charts.uniqueDishesCount.toLocaleString()} dishes ordered across meals`}
              icon={UtensilsCrossed}
              items={charts.dishes}
              selectedItems={filterState.dishes}
              maxCount={charts.maxDishCount}
              totalMeals={charts.totalMeals}
              themeClass="theme-dishes"
              onItemClick={handleBarItemClick}
              onCountClick={handleMealCountClick}
              isTall={true}
              showThumbnails={true}
              thumbnailType="dish"
              headerCustomToggle={
                <div className="food-view-switch-tabs">
                  <button
                    type="button"
                    className={`view-tab-btn active dishes`}
                    onClick={() => setRightViewMode('dishes')}
                    title="View Dishes & Food Items"
                  >
                    <UtensilsCrossed size={15} />
                    <span>Dishes</span>
                    <span className="view-tab-count">
                      {charts.uniqueDishesCount.toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="view-tab-btn"
                    onClick={() => setRightViewMode('ingredients')}
                    title="Switch to Ingredients view"
                  >
                    <Leaf size={15} />
                    <span>Ingredients</span>
                    <span className="view-tab-count">
                      {charts.uniqueIngredientsCount.toLocaleString()}
                    </span>
                  </button>
                </div>
              }
            />
          ) : (
            <FoodHorizontalBarChart
              key="ingredients-tall"
              chartKey="ingredient"
              title="Ingredients"
              subtitle={`${charts.uniqueIngredientsCount.toLocaleString()} primary culinary ingredients`}
              icon={Leaf}
              items={charts.ingredients}
              selectedItems={filterState.ingredients}
              maxCount={charts.maxIngredientCount}
              totalMeals={charts.totalMeals}
              themeClass="theme-ingredients"
              onItemClick={handleBarItemClick}
              onCountClick={handleMealCountClick}
              isTall={true}
              showThumbnails={true}
              thumbnailType="ingredient"
              headerCustomToggle={
                <div className="food-view-switch-tabs">
                  <button
                    type="button"
                    className="view-tab-btn"
                    onClick={() => setRightViewMode('dishes')}
                    title="Switch to Dishes view"
                  >
                    <UtensilsCrossed size={15} />
                    <span>Dishes</span>
                    <span className="view-tab-count">
                      {charts.uniqueDishesCount.toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`view-tab-btn active ingredients`}
                    onClick={() => setRightViewMode('ingredients')}
                    title="View Ingredients"
                  >
                    <Leaf size={15} />
                    <span>Ingredients</span>
                    <span className="view-tab-count">
                      {charts.uniqueIngredientsCount.toLocaleString()}
                    </span>
                  </button>
                </div>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
