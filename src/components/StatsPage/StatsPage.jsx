import React, { useState, useMemo, useCallback } from 'react';
import StatsFilterSidebar from './StatsFilterSidebar/StatsFilterSidebar.jsx';
import StatsKpiStrip from './StatsKpiStrip/StatsKpiStrip.jsx';
import MealsOverTimeNewRepeatHero from './MealsOverTimeNewRepeatHero/MealsOverTimeNewRepeatHero.jsx';
import RatingSentimentMatrixChart from './RatingSentimentMatrixChart/RatingSentimentMatrixChart.jsx';
import SpendByDayChart from './SpendByDayChart/SpendByDayChart.jsx';
import DiningCalendarHeatmap from './DiningCalendarHeatmap/DiningCalendarHeatmap.jsx';
import RestaurantTypeChart from './RestaurantTypeChart/RestaurantTypeChart.jsx';
import TopRestaurantsChart from './TopRestaurantsChart/TopRestaurantsChart.jsx';
import RatingValueScatter from './RatingValueScatter/RatingValueScatter.jsx';
import StatsInsights from './StatsInsights/StatsInsights.jsx';

import {
  DEFAULT_STATS_FILTER_STATE,
  filterStatsDataset,
  buildRestaurantFirstVisitsMap,
  calculateHeadlineKpis,
  buildNewVsRepeatSeries,
  buildRatingSentimentMatrix,
  buildSpendByDay,
  buildDiningHeatmap,
  buildTopRestaurantTypes,
  buildTopRestaurants,
  buildValueRatingScatter,
  buildStatsInsights,
  calculateStatsFacetCounts,
} from '../../utils/statsAnalytics.js';
import { BarChart3, SlidersHorizontal } from 'lucide-react';
import './StatsPage.css';

export default function StatsPage({
  meals = [],
  restaurants = [],
  onApplyChronicleFilter,
}) {
  const [filterState, setFilterState] = useState(DEFAULT_STATS_FILTER_STATE);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // 1. Precompute first historical visits across all meals once
  const firstVisitsMap = useMemo(() => {
    return buildRestaurantFirstVisitsMap(meals);
  }, [meals]);

  // 2. Filter dataset according to global filter state
  const filteredMeals = useMemo(() => {
    return filterStatsDataset(meals, filterState);
  }, [meals, filterState]);

  // 3. Dynamic facet counts for the left sidebar
  const statsFacetCounts = useMemo(() => {
    return calculateStatsFacetCounts(meals, filterState);
  }, [meals, filterState]);

  // 4. Compute derived analytical representations
  const kpis = useMemo(() => {
    return calculateHeadlineKpis(filteredMeals, meals, filterState, firstVisitsMap);
  }, [filteredMeals, meals, filterState, firstVisitsMap]);

  // Hero chart: Meals Over Time (New vs Repeat)
  const newVsRepeat = useMemo(() => {
    return buildNewVsRepeatSeries(filteredMeals, meals, filterState, firstVisitsMap);
  }, [filteredMeals, meals, filterState, firstVisitsMap]);

  // Combined Rating & Sentiment 100% Stacked Chart (Image 2)
  const ratingSentimentMatrix = useMemo(() => {
    return buildRatingSentimentMatrix(filteredMeals);
  }, [filteredMeals]);

  // Spend by Day of Week: Personal vs Business (Image 1)
  const spendByDay = useMemo(() => {
    return buildSpendByDay(filteredMeals);
  }, [filteredMeals]);

  // Dining Calendar Heatmap (12 months x 7 days)
  const diningHeatmap = useMemo(() => {
    return buildDiningHeatmap(filteredMeals);
  }, [filteredMeals]);

  // Top 10 Restaurant Types / Cuisines
  const topTypes = useMemo(() => {
    return buildTopRestaurantTypes(filteredMeals, 10);
  }, [filteredMeals]);

  // Top 10 Most Visited Destinations
  const topRestaurants = useMemo(() => {
    return buildTopRestaurants(filteredMeals, 10);
  }, [filteredMeals]);

  // Rating vs Meal Value Scatter
  const valueScatter = useMemo(() => {
    return buildValueRatingScatter(filteredMeals);
  }, [filteredMeals]);

  // Dynamic "Things Your Data Says"
  const insights = useMemo(() => {
    return buildStatsInsights(filteredMeals, meals, kpis);
  }, [filteredMeals, meals, kpis]);

  // Filter handlers
  const handleUpdateFilter = useCallback((updates) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilterState(DEFAULT_STATS_FILTER_STATE);
  }, []);

  // Cross-chart interactive filters
  const handleToggleRating = useCallback((ratingText) => {
    setFilterState((prev) => {
      const current = prev.ratings || [];
      const exists = current.includes(ratingText);
      return {
        ...prev,
        ratings: exists
          ? current.filter((r) => r !== ratingText)
          : [...current, ratingText],
      };
    });
  }, []);

  const handleToggleType = useCallback((typeName) => {
    setFilterState((prev) => {
      const current = prev.restaurantTypes || [];
      const exists = current.includes(typeName);
      return {
        ...prev,
        restaurantTypes: exists
          ? current.filter((t) => t !== typeName)
          : [...current, typeName],
      };
    });
  }, []);

  const handleSelectRestaurant = useCallback((restId, restName) => {
    setFilterState((prev) => ({
      ...prev,
      restaurantId: prev.restaurantId === restId ? null : restId,
      restaurantName: prev.restaurantId === restId ? '' : restName,
    }));
  }, []);

  return (
    <div className="stats-dashboard-root">
      {/* Mobile Filters Trigger Bar (< 1024px) */}
      <div className="stats-mobile-bar">
        <button
          type="button"
          className="stats-mobile-toggle-btn"
          onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
        >
          <SlidersHorizontal size={14} />
          <span>Filters ({filteredMeals.length.toLocaleString()} matching meals)</span>
        </button>
      </div>

      <div className="stats-page-layout">
        {/* Left Sticky Filter Sidebar */}
        <StatsFilterSidebar
          allMeals={meals}
          filterState={filterState}
          onUpdateFilter={handleUpdateFilter}
          onResetFilters={handleResetFilters}
          counts={statsFacetCounts}
        />

        {/* Right Main Analytics Content Column */}
        <main className="stats-main-content">
          {/* Page Header */}
          <div className="stats-dashboard-header">
            <div className="stats-header-titles">
              <div className="stats-header-badge">
                <BarChart3 size={15} />
                <span>Analytical Dashboard</span>
              </div>
              <h1 className="stats-page-main-title">Dining Intelligence & Archive KPIs</h1>
              <p className="stats-page-subtitle">
                What does your dining history tell you? Discover patterns across discoveries, time, evaluations, and spend.
              </p>
            </div>
          </div>

          {/* 1. Headline KPI Cards at the Top */}
          <StatsKpiStrip kpis={kpis} />

          {/* 2. Hero Graph across the Top: Meals Over Time (New vs Repeat) */}
          <MealsOverTimeNewRepeatHero
            series={newVsRepeat}
            onSelectPeriod={handleUpdateFilter}
          />

          {/* 3. Balanced 2-Column Analytical Grid */}
          <div className="stats-analytical-grid">
            {/* Column 1: Combined Rating & Sentiment 100% Stacked Chart (Image 2) */}
            <RatingSentimentMatrixChart
              matrixData={ratingSentimentMatrix}
              activeRatings={filterState.ratings}
              onToggleRating={handleToggleRating}
            />

            {/* Column 2: Spend by Day of Week: Personal vs Business (Image 1) */}
            <SpendByDayChart spendData={spendByDay} />

            {/* Column 3: Dining Calendar Heatmap (12 months x 7 days) */}
            <DiningCalendarHeatmap heatmap={diningHeatmap} />

            {/* Column 4: Rating vs Meal Value Bubble Chart */}
            <RatingValueScatter
              scatterData={valueScatter}
              onToggleRating={handleToggleRating}
            />

            {/* Column 5: Top Restaurant Types / Cuisines */}
            <RestaurantTypeChart
              typeData={topTypes}
              activeTypes={filterState.restaurantTypes}
              onToggleType={handleToggleType}
            />

            {/* Column 6: Top Most Visited Destinations */}
            <TopRestaurantsChart
              restaurantData={topRestaurants}
              activeRestaurantId={filterState.restaurantId}
              onSelectRestaurant={handleSelectRestaurant}
            />
          </div>

          {/* 4. Bottom Card: Dynamic "Things Your Data Says" */}
          <StatsInsights insights={insights} />
        </main>
      </div>

      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div
          className="stats-mobile-drawer-backdrop"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="stats-mobile-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-sheet-top">
              <h3>Filters</h3>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="drawer-sheet-content">
              <StatsFilterSidebar
                allMeals={meals}
                filterState={filterState}
                onUpdateFilter={handleUpdateFilter}
                onResetFilters={handleResetFilters}
                counts={statsFacetCounts}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
