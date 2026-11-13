import React, { useState, useMemo } from 'react';
import PeopleOverviewFilterBar from './PeopleOverviewFilterBar.jsx';
import PeopleKpiGrid from './PeopleKpiGrid.jsx';
import PeopleThroughTimeChart from './PeopleThroughTimeChart.jsx';
import DiningCircleNetwork from './DiningCircleNetwork.jsx';
import RecurringGroupsSection from './RecurringGroupsSection.jsx';
import CompanionFrequencyDistribution from './CompanionFrequencyDistribution.jsx';
import NamesThroughTimeTable from './NamesThroughTimeTable.jsx';
import {
  filterPeopleMeals,
  calculatePeopleFacetCounts,
  calculatePeopleOverviewKpis,
  buildPeopleThroughTimeSeries,
  buildDiningCircleNetwork,
  mineRecurringGroups,
  buildCompanionFrequencyDistribution,
  extractNamesThroughTime,
} from '../../../utils/peopleAnalytics.js';

export default function PeopleOverview({
  meals = [],
  publicPeopleById = new Map(),
  rawPeoplePublic = [],
  onSelectPerson,
}) {
  // 1. Overview Filter State (multi-select arrays per spec)
  const [filters, setFilters] = useState({
    search: '',
    countries: [],
    cities: [],
    restaurantTypes: [],
    ratings: [],
    decades: [],
  });

  const handleUpdateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      countries: [],
      cities: [],
      restaurantTypes: [],
      ratings: [],
      decades: [],
    });
  };

  // 2. Precompute Master Lists for Filter Dropdowns
  const { allCountries, allCities, allTypes, allRatings, allDecades } = useMemo(() => {
    const cSet = new Set();
    const citySet = new Set();
    const tSet = new Set();
    const rSet = new Set();

    for (const m of meals) {
      const countryName = m.restaurant?.city?.country?.name;
      if (countryName) cSet.add(countryName);

      const cityName = m.restaurant?.city?.name;
      if (cityName) citySet.add(cityName);

      const typeGroup =
        m.restaurant?.type?.typeGroup ||
        m.restaurant?.typeGroup ||
        m.restaurant?.type?.name;
      if (typeGroup) tSet.add(typeGroup);

      if (m.rating && m.rating !== 'Unrated') {
        rSet.add(m.rating);
      }
    }

    return {
      allCountries: Array.from(cSet).sort(),
      allCities: Array.from(citySet).sort(),
      allTypes: Array.from(tSet).sort(),
      allRatings: Array.from(rSet).sort(),
      allDecades: ['2020s', '2010s', '2000s', '1990s', 'Pre-1990'],
    };
  }, [meals]);

  // 3. Dynamic Cascading Facet Counts
  const facetCounts = useMemo(() => {
    return calculatePeopleFacetCounts(meals, filters);
  }, [meals, filters]);

  // 4. Filtered Meals
  const filteredMeals = useMemo(() => {
    return filterPeopleMeals(meals, filters);
  }, [meals, filters]);

  // 5. Headline KPIs
  const kpis = useMemo(() => {
    return calculatePeopleOverviewKpis(filteredMeals, meals, publicPeopleById);
  }, [filteredMeals, meals, publicPeopleById]);

  // 6. People Through Time
  const timeSeries = useMemo(() => {
    return buildPeopleThroughTimeSeries(filteredMeals, meals);
  }, [filteredMeals, meals]);

  // 7. Dining Circle Network
  const network = useMemo(() => {
    return buildDiningCircleNetwork(filteredMeals, publicPeopleById, { topN: 24, minShared: 2 });
  }, [filteredMeals, publicPeopleById]);

  // 8. Recurring Groups (Strictly Top 8 Groups: 3 Feature + 5 Supporting)
  const recurringGroups = useMemo(() => {
    return mineRecurringGroups(filteredMeals, { limit: 8, threshold: 0.75 });
  }, [filteredMeals]);

  // 9. Frequency Distribution
  const freqBands = useMemo(() => {
    return buildCompanionFrequencyDistribution(filteredMeals);
  }, [filteredMeals]);

  // 10. Names Through Time (Unified identities)
  const namesThroughTime = useMemo(() => {
    return extractNamesThroughTime(rawPeoplePublic, meals);
  }, [rawPeoplePublic, meals]);

  return (
    <div className="people-overview-root">
      {/* 1. Global Filter Bar */}
      <PeopleOverviewFilterBar
        filters={filters}
        onUpdateFilter={handleUpdateFilter}
        onClearFilters={handleClearFilters}
        facetCounts={facetCounts}
        allCountries={allCountries}
        allCities={allCities}
        allTypes={allTypes}
        allRatings={allRatings}
        allDecades={allDecades}
      />

      {/* 2. Opening KPI Strip */}
      <PeopleKpiGrid kpis={kpis} onSelectPerson={onSelectPerson} />

      {/* 3. People Through Time Chart */}
      <PeopleThroughTimeChart series={timeSeries} />

      {/* 4. Dining Circle / Social Network */}
      <DiningCircleNetwork network={network} onSelectPerson={onSelectPerson} />

      {/* 5. Recurring Groups / Regular Table */}
      <RecurringGroupsSection groups={recurringGroups} onSelectPerson={onSelectPerson} />

      {/* 6. Frequency Distribution Bands */}
      <CompanionFrequencyDistribution bands={freqBands} />

      {/* 7. Names Through Time */}
      <NamesThroughTimeTable names={namesThroughTime} onSelectPerson={onSelectPerson} />
    </div>
  );
}
