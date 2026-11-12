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
  // 1. Overview Filter State
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    decade: '',
    restaurantType: '',
  });

  const handleUpdateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      country: '',
      decade: '',
      restaurantType: '',
    });
  };

  // 2. Compute Filter Options (Countries & Restaurant Types)
  const { countries, restaurantTypes } = useMemo(() => {
    const cSet = new Set();
    const tSet = new Set();
    for (const m of meals) {
      const countryName = m.restaurant?.city?.country?.name;
      if (countryName) cSet.add(countryName);
      const typeGroup = m.restaurant?.type?.typeGroup || m.restaurant?.type?.name;
      if (typeGroup) tSet.add(typeGroup);
    }
    return {
      countries: Array.from(cSet).sort(),
      restaurantTypes: Array.from(tSet).sort(),
    };
  }, [meals]);

  // 3. Filtered Meals
  const filteredMeals = useMemo(() => {
    return filterPeopleMeals(meals, filters);
  }, [meals, filters]);

  // 4. Headline KPIs
  const kpis = useMemo(() => {
    return calculatePeopleOverviewKpis(filteredMeals, meals, publicPeopleById);
  }, [filteredMeals, meals, publicPeopleById]);

  // 5. People Through Time
  const timeSeries = useMemo(() => {
    return buildPeopleThroughTimeSeries(filteredMeals, meals);
  }, [filteredMeals, meals]);

  // 6. Dining Circle Network
  const network = useMemo(() => {
    return buildDiningCircleNetwork(filteredMeals, publicPeopleById, { topN: 24, minShared: 2 });
  }, [filteredMeals, publicPeopleById]);

  // 7. Recurring Groups (Strictly Top 8 Groups: 3 Feature + 5 Supporting)
  const recurringGroups = useMemo(() => {
    return mineRecurringGroups(filteredMeals, { limit: 8, threshold: 0.75 });
  }, [filteredMeals]);

  // 8. Frequency Distribution
  const freqBands = useMemo(() => {
    return buildCompanionFrequencyDistribution(filteredMeals);
  }, [filteredMeals]);

  // 9. Names Through Time (Unified identities)
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
        countries={countries}
        restaurantTypes={restaurantTypes}
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
