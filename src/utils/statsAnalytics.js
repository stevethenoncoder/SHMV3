/**
 * Pure analytical calculation engine for the SHMV3 Stats / KPI Dashboard.
 *
 * All functions are pure, deterministic, and operate directly on the
 * loaded meals and restaurants datasets.
 */

export const CANONICAL_MEAL_RATINGS = [
  { id: 1, text: 'The Dogs', shortText: 'The Dogs', displayLabel: 'The Dogs', color: '#10b981' },
  { id: 2, text: 'Exceptional', shortText: 'Exceptional', displayLabel: 'Exceptional', color: '#059669' },
  { id: 3, text: 'Very Good', shortText: 'Very Good', displayLabel: 'Very Good', color: '#0284c7' },
  { id: 4, text: 'Fine', shortText: 'Fine', displayLabel: 'Fine', color: '#38bdf8' },
  { id: 5, text: "OK but wouldn't recommend", shortText: 'OK', displayLabel: 'Okay', color: '#f59e0b' },
  { id: 6, text: 'Very Bad', shortText: 'Very Bad', displayLabel: 'Very Bad', color: '#f97316' },
  { id: 7, text: 'Never Again', shortText: 'Never Again', displayLabel: 'Never Again', color: '#ef4444' },
  { id: 8, text: 'The Worst in the World', shortText: 'The Worst', displayLabel: 'The worst', color: '#b91c1c' },
];

export const CANONICAL_SENTIMENTS = [
  { key: 'Positive', label: 'Positive', color: '#10b981' },
  { key: 'Neutral', label: 'Neutral', color: '#64748b' },
  { key: 'Negative', label: 'Negative', color: '#ef4444' },
  { key: 'No Comment', label: 'No Comment', color: '#94a3b8' },
];

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const DEFAULT_STATS_FILTER_STATE = {
  dateMode: 'all', // 'all' | 'this_year' | 'year' | 'decade' | 'custom'
  year: null,
  decade: null,
  startDate: '',
  endDate: '',
  countries: [],
  cities: [],
  restaurantTypes: [],
  restaurantId: null,
  restaurantName: '',
  ratings: [],
  sentiments: [],
  personName: null,
  isBusinessOnly: false,
  isArsenalOnly: false,
};

/**
 * Returns decade string for a given year (e.g. 2024 -> '2020s')
 */
export function getDecade(year) {
  if (!year || isNaN(year)) return null;
  const dec = Math.floor(year / 10) * 10;
  return `${dec}s`;
}

/**
 * Normalises rating text to match canonical RatingMeal text
 */
export function normalizeRatingText(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  for (const r of CANONICAL_MEAL_RATINGS) {
    if (r.text.toLowerCase() === lower || r.shortText.toLowerCase() === lower) {
      return r.text;
    }
  }
  return text;
}

/**
 * Gets canonical rating entry from ratingId (1 to 8)
 */
export function getRatingById(id) {
  if (!id || isNaN(id)) return null;
  return CANONICAL_MEAL_RATINGS.find((r) => r.id === id) || null;
}

/**
 * Calculates median value from an array of numbers.
 * Ignores null, undefined, and NaN.
 */
export function calculateMedian(numbers) {
  if (!numbers || !Array.isArray(numbers)) return null;
  const valid = numbers.filter((n) => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 1) {
    return valid[mid];
  }
  return (valid[mid - 1] + valid[mid]) / 2;
}

/**
 * Counts active filters in a stats filter state
 */
export function countActiveStatsFilters(filters) {
  if (!filters) return 0;
  let count = 0;
  if (filters.dateMode !== 'all') count++;
  count += (filters.countries || []).length;
  count += (filters.cities || []).length;
  count += (filters.restaurantTypes || []).length;
  if (filters.restaurantId) count++;
  count += (filters.ratings || []).length;
  count += (filters.sentiments || []).length;
  if (filters.personName) count++;
  if (filters.isBusinessOnly) count++;
  if (filters.isArsenalOnly) count++;
  return count;
}

/**
 * Maps JS getDay() (0=Sun, 1=Mon, ..., 6=Sat) to Monday-based index (0=Mon, ..., 6=Sun)
 */
export function getMondayBasedDayIndex(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Determines whether a meal's visit date matches the active date filter
 */
export function matchesDateFilter(meal, filterState, maxDataYear = 2026) {
  const { dateMode, year, decade, startDate, endDate } = filterState;

  if (dateMode === 'all') return true;

  if (dateMode === 'this_year') {
    return meal.year === maxDataYear;
  }

  if (dateMode === 'year' && year) {
    return meal.year === parseInt(year, 10);
  }

  if (dateMode === 'decade' && decade) {
    return getDecade(meal.year) === decade;
  }

  if (dateMode === 'custom') {
    if (!meal.date) return false;
    if (startDate && meal.date < startDate) return false;
    if (endDate && meal.date > endDate) return false;
    return true;
  }

  return true;
}

/**
 * Filters the meals dataset based on the global filter bar selections.
 * Multiple values within a facet use OR semantics; different facets use AND semantics.
 */
export function filterStatsDataset(meals = [], filterState = DEFAULT_STATS_FILTER_STATE) {
  if (!meals || meals.length === 0) return [];

  // Determine max recorded year for 'this_year'
  let maxYear = 2026;
  for (const m of meals) {
    if (m.year && m.year > maxYear) maxYear = m.year;
  }

  const countrySet = new Set(filterState.countries || []);
  const citySet = new Set(filterState.cities || []);
  const typeSet = new Set(filterState.restaurantTypes || []);
  const ratingSet = new Set((filterState.ratings || []).map((r) => r.toLowerCase()));
  const sentimentSet = new Set((filterState.sentiments || []).map((s) => s.toLowerCase()));

  return meals.filter((meal) => {
    // 1. Date Filter
    if (!matchesDateFilter(meal, filterState, maxYear)) {
      return false;
    }

    // 2. Geography: Country (OR)
    if (countrySet.size > 0) {
      const cName = meal.restaurant?.city?.country?.name || meal.restaurant?.country?.name;
      if (!cName || !countrySet.has(cName)) return false;
    }

    // 3. Geography: City (OR)
    if (citySet.size > 0) {
      const cityName = meal.restaurant?.city?.name;
      if (!cityName || !citySet.has(cityName)) return false;
    }

    // 4. Restaurant Type / Cuisine (OR)
    if (typeSet.size > 0) {
      const tName = meal.restaurant?.type?.name;
      if (!tName || !typeSet.has(tName)) return false;
    }

    // 5. Specific Restaurant (Exact)
    if (filterState.restaurantId) {
      if (meal.restaurant?.id !== filterState.restaurantId) return false;
    }

    // 6. Meal Rating (OR)
    if (ratingSet.size > 0) {
      const rText = meal.rating?.toLowerCase() || '';
      if (!ratingSet.has(rText)) return false;
    }

    // 7. Sentiment / Sentiment_High (OR)
    if (sentimentSet.size > 0) {
      const cat = (meal.sentimentCategory || meal.sentiment || '').toLowerCase();
      if (!sentimentSet.has(cat)) return false;
    }

    // 8. Public Person / Companion
    if (filterState.personName) {
      const targetName = filterState.personName.toLowerCase();
      const hasPerson = (meal.companions || []).some(
        (c) => (c.publicName || c.name || '').toLowerCase() === targetName
      );
      if (!hasPerson) return false;
    }

    // 9. Business meals only
    if (filterState.isBusinessOnly && !meal.isBusiness) {
      return false;
    }

    // 10. Arsenal matchday only
    if (filterState.isArsenalOnly && (!meal.arsenal || !meal.arsenal.isMatchday)) {
      return false;
    }

    return true;
  });
}

/**
 * Pre-computes first recorded visit metadata for each restaurant across all time.
 */
export function buildRestaurantFirstVisitsMap(allMeals = []) {
  const firstVisits = new Map();

  // Sort ascending by timestamp to find the true first visit
  const chronoSorted = [...allMeals].filter((m) => m.restaurant?.id && m.timestamp).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  for (const meal of chronoSorted) {
    const restId = meal.restaurant.id;
    if (!firstVisits.has(restId)) {
      firstVisits.set(restId, {
        mealId: meal.id,
        date: meal.date,
        year: meal.year,
        timestamp: meal.timestamp,
      });
    }
  }

  return firstVisits;
}

/**
 * Calculates 7-9 headline KPIs from the filtered dataset.
 */
export function calculateHeadlineKpis(
  filteredMeals = [],
  allMeals = [],
  filterState = DEFAULT_STATS_FILTER_STATE,
  precomputedFirstVisits = null
) {
  const firstVisitsMap =
    precomputedFirstVisits || buildRestaurantFirstVisitsMap(allMeals.length > 0 ? allMeals : filteredMeals);

  const mealsCount = filteredMeals.length;

  // 1. Unique Restaurants in filtered set
  const uniqueRestIds = new Set();
  const cities = new Set();
  const countries = new Set();
  const values = [];
  const uniquePeople = new Set();
  let totalSpend = 0;
  let ratingSum = 0;
  let ratedCount = 0;
  let positiveCount = 0;
  let sentimentTotal = 0;
  let repeatMealsCount = 0;

  for (const meal of filteredMeals) {
    const restId = meal.restaurant?.id;
    if (restId) {
      uniqueRestIds.add(restId);
      const first = firstVisitsMap.get(restId);
      // If meal is NOT the very first visit to that restaurant, it's a repeat visit!
      if (first && first.mealId !== meal.id) {
        repeatMealsCount++;
      }
    }

    if (meal.restaurant?.city?.name) {
      cities.add(meal.restaurant.city.name);
    }
    const cName = meal.restaurant?.city?.country?.name || meal.restaurant?.country?.name;
    if (cName) {
      countries.add(cName);
    }

    if (typeof meal.valueGBP === 'number' && !isNaN(meal.valueGBP) && meal.valueGBP > 0) {
      values.push(meal.valueGBP);
      totalSpend += meal.valueGBP;
    }

    if (Array.isArray(meal.companions)) {
      for (const comp of meal.companions) {
        if (comp.publicName) {
          uniquePeople.add(comp.publicName);
        }
      }
    }

    if (meal.ratingId && meal.ratingId >= 1 && meal.ratingId <= 8) {
      ratingSum += meal.ratingId;
      ratedCount++;
    }

    const sentCat = meal.sentimentCategory || meal.sentiment;
    if (sentCat && sentCat !== 'No Comment') {
      sentimentTotal++;
      if (sentCat.toLowerCase() === 'positive') {
        positiveCount++;
      }
    }
  }

  // 2. New Restaurants: Restaurants whose *first ever visit* across all time falls into the filtered date range!
  let newRestaurantsCount = 0;
  uniqueRestIds.forEach((restId) => {
    const first = firstVisitsMap.get(restId);
    if (!first) return;

    if (filterState.dateMode === 'all') {
      newRestaurantsCount++;
    } else if (filterState.dateMode === 'year' && filterState.year) {
      if (first.year === parseInt(filterState.year, 10)) newRestaurantsCount++;
    } else if (filterState.dateMode === 'this_year') {
      // Find max data year
      let maxYear = 2026;
      for (const m of allMeals) {
        if (m.year && m.year > maxYear) maxYear = m.year;
      }
      if (first.year === maxYear) newRestaurantsCount++;
    } else if (filterState.dateMode === 'decade' && filterState.decade) {
      if (getDecade(first.year) === filterState.decade) newRestaurantsCount++;
    } else if (filterState.dateMode === 'custom') {
      if (first.date && (!filterState.startDate || first.date >= filterState.startDate) &&
          (!filterState.endDate || first.date <= filterState.endDate)) {
        newRestaurantsCount++;
      }
    } else {
      newRestaurantsCount++;
    }
  });

  // 3. Repeat Visit Rate (%)
  const repeatVisitRate = mealsCount > 0 ? (repeatMealsCount / mealsCount) * 100 : 0;

  // 4. Average Rating
  const avgRatingNum = ratedCount > 0 ? ratingSum / ratedCount : null;
  let avgRatingText = null;
  if (avgRatingNum !== null) {
    const roundedId = Math.min(8, Math.max(1, Math.round(avgRatingNum)));
    const match = CANONICAL_MEAL_RATINGS.find((r) => r.id === roundedId);
    avgRatingText = match ? match.text : null;
  }

  // 5. Median Meal Value
  const medianValue = calculateMedian(values);

  // 6. Sentiment KPI
  const positiveShare = sentimentTotal > 0 ? (positiveCount / sentimentTotal) * 100 : null;

  // 7. Secondary Comparison (e.g. Single Year comparison vs previous year)
  let comparison = null;
  if (filterState.dateMode === 'year' && filterState.year) {
    const targetYr = parseInt(filterState.year, 10);
    const prevYr = targetYr - 1;
    const prevYrMeals = allMeals.filter((m) => m.year === prevYr);
    if (prevYrMeals.length > 0) {
      const diff = mealsCount - prevYrMeals.length;
      const pct = Math.round((diff / prevYrMeals.length) * 100);
      const sign = pct >= 0 ? '+' : '';
      comparison = {
        prevYear: prevYr,
        prevCount: prevYrMeals.length,
        diff,
        text: `${sign}${pct}% vs ${prevYr}`,
      };
    }
  }

  return {
    mealsCount,
    uniqueRestaurantsCount: uniqueRestIds.size,
    newRestaurantsCount,
    repeatMealsCount,
    repeatVisitRate: Math.round(repeatVisitRate * 10) / 10,
    averageRatingNumeric: avgRatingNum ? Math.round(avgRatingNum * 10) / 10 : null,
    averageRatingText: avgRatingText,
    ratedMealsCount: ratedCount,
    medianMealValue: medianValue !== null ? Math.round(medianValue) : null,
    recordedValuesCount: values.length,
    positiveShare: positiveShare !== null ? Math.round(positiveShare) : null,
    sentimentTotal,
    citiesCount: cities.size,
    countriesCount: countries.size,
    totalSpend: Math.round(totalSpend),
    peopleCount: uniquePeople.size,
    comparison,
  };
}

/**
 * Builds time-series series data for the Meals Over Time hero chart.
 * Uses monthly granularity for single year / short range, annual for multi-year.
 */
export function buildMealsTimeline(filteredMeals = [], filterState = DEFAULT_STATS_FILTER_STATE) {
  const isSingleYear =
    (filterState.dateMode === 'year' && filterState.year) || filterState.dateMode === 'this_year';

  if (isSingleYear) {
    // 12 months for the selected year
    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      key: i + 1,
      label: MONTH_NAMES[i],
      count: 0,
      uniqueRestaurants: new Set(),
    }));

    for (const meal of filteredMeals) {
      if (meal.date) {
        const parts = meal.date.split('-');
        if (parts.length >= 2) {
          const mIdx = parseInt(parts[1], 10) - 1;
          if (mIdx >= 0 && mIdx < 12) {
            monthsData[mIdx].count++;
            if (meal.restaurant?.id) {
              monthsData[mIdx].uniqueRestaurants.add(meal.restaurant.id);
            }
          }
        }
      }
    }

    const periods = monthsData.map((m) => ({
      key: m.key,
      label: m.label,
      count: m.count,
      uniqueCount: m.uniqueRestaurants.size,
    }));

    const maxCount = Math.max(...periods.map((p) => p.count), 1);
    return { granularity: 'month', periods, maxCount, total: filteredMeals.length };
  }

  // Multi-year / All Time aggregation
  const yearCounts = new Map();
  const yearUniqueRests = new Map();

  for (const meal of filteredMeals) {
    const yr = meal.year;
    if (yr) {
      yearCounts.set(yr, (yearCounts.get(yr) || 0) + 1);
      if (!yearUniqueRests.has(yr)) {
        yearUniqueRests.set(yr, new Set());
      }
      if (meal.restaurant?.id) {
        yearUniqueRests.get(yr).add(meal.restaurant.id);
      }
    }
  }

  const sortedYears = Array.from(yearCounts.keys()).sort((a, b) => a - b);
  if (sortedYears.length === 0) {
    return { granularity: 'year', periods: [], maxCount: 1, total: 0 };
  }

  // Fill in any gaps between min and max year
  const minYear = sortedYears[0];
  const maxYear = sortedYears[sortedYears.length - 1];
  const periods = [];

  for (let y = minYear; y <= maxYear; y++) {
    const count = yearCounts.get(y) || 0;
    const unique = yearUniqueRests.has(y) ? yearUniqueRests.get(y).size : 0;
    periods.push({
      key: y,
      label: String(y),
      count,
      uniqueCount: unique,
    });
  }

  const maxCount = Math.max(...periods.map((p) => p.count), 1);
  return { granularity: 'year', periods, maxCount, total: filteredMeals.length };
}

/**
 * Builds New vs Repeat restaurant activity series.
 */
export function buildNewVsRepeatSeries(
  filteredMeals = [],
  allMeals = [],
  filterState = DEFAULT_STATS_FILTER_STATE,
  precomputedFirstVisits = null
) {
  const firstVisits =
    precomputedFirstVisits || buildRestaurantFirstVisitsMap(allMeals.length > 0 ? allMeals : filteredMeals);

  const isSingleYear =
    (filterState.dateMode === 'year' && filterState.year) || filterState.dateMode === 'this_year';

  if (isSingleYear) {
    const months = Array.from({ length: 12 }, (_, i) => ({
      key: i + 1,
      label: MONTH_NAMES[i],
      newCount: 0,
      repeatCount: 0,
    }));

    for (const meal of filteredMeals) {
      if (meal.date && meal.restaurant?.id) {
        const parts = meal.date.split('-');
        if (parts.length >= 2) {
          const mIdx = parseInt(parts[1], 10) - 1;
          if (mIdx >= 0 && mIdx < 12) {
            const first = firstVisits.get(meal.restaurant.id);
            if (first && first.mealId === meal.id) {
              months[mIdx].newCount++;
            } else {
              months[mIdx].repeatCount++;
            }
          }
        }
      }
    }

    const periods = months.map((m) => {
      const total = m.newCount + m.repeatCount;
      const explorationRate = total > 0 ? Math.round((m.newCount / total) * 100) : 0;
      return {
        key: m.key,
        label: m.label,
        newCount: m.newCount,
        repeatCount: m.repeatCount,
        total,
        explorationRate,
      };
    });

    const maxTotal = Math.max(...periods.map((p) => p.total), 1);
    return { granularity: 'month', periods, maxTotal };
  }

  // By Year
  const yearBuckets = new Map();
  for (const meal of filteredMeals) {
    const yr = meal.year;
    if (yr && meal.restaurant?.id) {
      if (!yearBuckets.has(yr)) {
        yearBuckets.set(yr, { newCount: 0, repeatCount: 0 });
      }
      const bucket = yearBuckets.get(yr);
      const first = firstVisits.get(meal.restaurant.id);
      if (first && first.mealId === meal.id) {
        bucket.newCount++;
      } else {
        bucket.repeatCount++;
      }
    }
  }

  const sortedYears = Array.from(yearBuckets.keys()).sort((a, b) => a - b);
  if (sortedYears.length === 0) {
    return { granularity: 'year', periods: [], maxTotal: 1 };
  }

  const minYear = sortedYears[0];
  const maxYear = sortedYears[sortedYears.length - 1];
  const periods = [];

  for (let y = minYear; y <= maxYear; y++) {
    const bucket = yearBuckets.get(y) || { newCount: 0, repeatCount: 0 };
    const total = bucket.newCount + bucket.repeatCount;
    const explorationRate = total > 0 ? Math.round((bucket.newCount / total) * 100) : 0;
    periods.push({
      key: y,
      label: String(y),
      newCount: bucket.newCount,
      repeatCount: bucket.repeatCount,
      total,
      explorationRate,
    });
  }

  const maxTotal = Math.max(...periods.map((p) => p.total), 1);
  return { granularity: 'year', periods, maxTotal };
}

/**
 * Builds rating distribution according to the authoritative RatingMeal order.
 */
export function buildRatingDistribution(filteredMeals = []) {
  const countsByText = new Map();
  for (const r of CANONICAL_MEAL_RATINGS) {
    countsByText.set(r.text.toLowerCase(), 0);
  }

  let totalRated = 0;
  for (const meal of filteredMeals) {
    if (meal.rating) {
      const norm = meal.rating.toLowerCase();
      // Look up canonical rating
      const match = CANONICAL_MEAL_RATINGS.find(
        (r) => r.text.toLowerCase() === norm || r.shortText.toLowerCase() === norm
      );
      if (match) {
        countsByText.set(match.text.toLowerCase(), (countsByText.get(match.text.toLowerCase()) || 0) + 1);
        totalRated++;
      }
    }
  }

  const rows = CANONICAL_MEAL_RATINGS.map((r) => {
    const count = countsByText.get(r.text.toLowerCase()) || 0;
    const percentage = totalRated > 0 ? Math.round((count / totalRated) * 1000) / 10 : 0;
    return {
      id: r.id,
      text: r.text,
      shortText: r.shortText,
      color: r.color,
      count,
      percentage,
    };
  });

  return { rows, totalRated, totalMeals: filteredMeals.length };
}

/**
 * Builds high-level Sentiment Overview data from Sentiment_High and granular terms.
 */
export function buildSentimentSummary(filteredMeals = []) {
  const categoryCounts = {
    Positive: 0,
    Neutral: 0,
    Negative: 0,
    'No Comment': 0,
  };

  const granularCounts = new Map();
  let totalWithSentiment = 0;

  for (const meal of filteredMeals) {
    const cat = meal.sentimentCategory || 'No Comment';
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat]++;
    } else {
      categoryCounts.Neutral++;
    }

    if (meal.sentiment && meal.sentiment !== 'No Comment') {
      granularCounts.set(meal.sentiment, (granularCounts.get(meal.sentiment) || 0) + 1);
      totalWithSentiment++;
    }
  }

  const total = filteredMeals.length;

  const categories = CANONICAL_SENTIMENTS.map((s) => {
    const count = categoryCounts[s.key] || 0;
    const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    return {
      key: s.key,
      label: s.label,
      color: s.color,
      count,
      percentage: pct,
    };
  });

  // Top 6 granular emotion moods
  const topGranular = Array.from(granularCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([term, count]) => ({
      term,
      count,
      percentage: totalWithSentiment > 0 ? Math.round((count / totalWithSentiment) * 100) : 0,
    }));

  return {
    categories,
    topGranular,
    total,
    totalWithSentiment,
  };
}

/**
 * Builds 12x7 Month x Day-of-Week dining heatmap.
 */
export function buildDiningHeatmap(filteredMeals = []) {
  // 12 rows (months 0-11: Jan to Dec) x 7 cols (days 0-6: Mon to Sun)
  const grid = Array.from({ length: 12 }, () => Array(7).fill(0));

  let maxCount = 0;
  let totalInHeatmap = 0;

  for (const meal of filteredMeals) {
    if (meal.date) {
      const parts = meal.date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12) {
          const dt = new Date(y, m, d);
          const dayIdx = getMondayBasedDayIndex(dt.getDay());
          grid[m][dayIdx]++;
          totalInHeatmap++;
          if (grid[m][dayIdx] > maxCount) {
            maxCount = grid[m][dayIdx];
          }
        }
      }
    }
  }

  // Row and column summaries
  const monthTotals = grid.map((row) => row.reduce((sum, val) => sum + val, 0));
  const dayTotals = Array.from({ length: 7 }, (_, dayIdx) =>
    grid.reduce((sum, row) => sum + row[dayIdx], 0)
  );

  return {
    grid,
    maxCount: Math.max(maxCount, 1),
    totalInHeatmap,
    monthTotals,
    dayTotals,
    dayNames: DAY_NAMES,
    monthNames: MONTH_NAMES,
  };
}

/**
 * Builds ranked Top N Restaurant Types (cuisines).
 */
export function buildTopRestaurantTypes(filteredMeals = [], limit = 10) {
  const typeCounts = new Map();
  const typeUniqueRests = new Map();

  for (const meal of filteredMeals) {
    const tName = meal.restaurant?.type?.name;
    if (tName) {
      typeCounts.set(tName, (typeCounts.get(tName) || 0) + 1);
      if (!typeUniqueRests.has(tName)) {
        typeUniqueRests.set(tName, new Set());
      }
      if (meal.restaurant?.id) {
        typeUniqueRests.get(tName).add(meal.restaurant.id);
      }
    }
  }

  const total = filteredMeals.length;
  const sorted = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([typeName, count]) => {
      const uniqueCount = typeUniqueRests.get(typeName)?.size || 0;
      const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      return {
        typeName,
        count,
        uniqueCount,
        percentage,
      };
    });

  const maxCount = sorted.length > 0 ? sorted[0].count : 1;
  return { types: sorted, maxCount, total };
}

/**
 * Builds ranked Top N Most Visited Restaurants.
 */
export function buildTopRestaurants(filteredMeals = [], limit = 10) {
  const restCounts = new Map();

  for (const meal of filteredMeals) {
    const rest = meal.restaurant;
    if (rest && rest.id) {
      if (!restCounts.has(rest.id)) {
        restCounts.set(rest.id, {
          id: rest.id,
          name: rest.name,
          cityName: rest.city?.name || '',
          countryName: rest.country?.name || '',
          typeName: rest.type?.name || '',
          visitCount: 0,
        });
      }
      restCounts.get(rest.id).visitCount++;
    }
  }

  const sorted = Array.from(restCounts.values())
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, limit);

  const maxVisits = sorted.length > 0 ? sorted[0].visitCount : 1;
  return { restaurants: sorted, maxVisits, total: filteredMeals.length };
}

/**
 * Builds Top 10 Countries with split by destination city.
 * Used for the Location horizontal bar chart.
 */
export function buildTopCountriesWithCities(filteredMeals = [], limit = 10) {
  const countryMap = new Map();
  let totalMealsWithCountry = 0;

  for (const meal of filteredMeals) {
    const country = meal.restaurant?.city?.country?.name || meal.restaurant?.country?.name;
    if (!country) continue;
    const city = meal.restaurant?.city?.name || 'Unknown City';

    totalMealsWithCountry++;

    if (!countryMap.has(country)) {
      countryMap.set(country, {
        country,
        total: 0,
        cities: new Map(),
      });
    }

    const cEntry = countryMap.get(country);
    cEntry.total++;
    cEntry.cities.set(city, (cEntry.cities.get(city) || 0) + 1);
  }

  // Sort countries by total descending
  const sortedCountries = Array.from(countryMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  const maxCountryTotal = sortedCountries.length > 0 ? sortedCountries[0].total : 1;

  // Harmonious modern palette for city segments
  const CITY_PALETTE = [
    '#0284c7', // Sky Blue
    '#0d9488', // Teal
    '#3b82f6', // Royal Blue
    '#10b981', // Emerald
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#64748b', // Slate
    '#14b8a6', // Light Teal
    '#a855f7', // Purple
  ];

  const countries = sortedCountries.map((c) => {
    // Sort cities by count descending
    const cityList = Array.from(c.cities.entries())
      .map(([name, count]) => ({
        city: name,
        count,
        percentage: Math.round((count / c.total) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);

    // If a country has many small cities, keep top cities and group remainder
    let displayCities = [];
    if (cityList.length > 8) {
      const topCities = cityList.slice(0, 7);
      const otherCities = cityList.slice(7);
      const otherCount = otherCities.reduce((acc, cur) => acc + cur.count, 0);
      displayCities = [
        ...topCities,
        {
          city: `Other cities (${otherCities.length})`,
          count: otherCount,
          percentage: Math.round((otherCount / c.total) * 1000) / 10,
          isOther: true,
        },
      ];
    } else {
      displayCities = cityList;
    }

    const citySegments = displayCities.map((cityObj, idx) => ({
      ...cityObj,
      color: cityObj.isOther ? '#94a3b8' : CITY_PALETTE[idx % CITY_PALETTE.length],
      segmentWidthPct: (cityObj.count / c.total) * 100,
    }));

    return {
      country: c.country,
      total: c.total,
      percentage: totalMealsWithCountry > 0 ? Math.round((c.total / totalMealsWithCountry) * 1000) / 10 : 0,
      relativeWidthPct: Math.max((c.total / maxCountryTotal) * 100, 4),
      cities: citySegments,
      totalCitiesCount: cityList.length,
    };
  });

  return {
    countries,
    maxCountryTotal,
    totalMeals: totalMealsWithCountry,
  };
}

export const BUBBLE_SPEND_BUCKETS = [
  { bucket: 0, label: '£0', rangeLabel: '£0 – £9' },
  { bucket: 10, label: '£10', rangeLabel: '£10 – £19' },
  { bucket: 20, label: '£20', rangeLabel: '£20 – £29' },
  { bucket: 30, label: '£30', rangeLabel: '£30 – £39' },
  { bucket: 40, label: '£40', rangeLabel: '£40 – £49' },
  { bucket: 50, label: '£50', rangeLabel: '£50 – £59' },
  { bucket: 60, label: '£60', rangeLabel: '£60 – £69' },
  { bucket: 70, label: '£70', rangeLabel: '£70 – £79' },
  { bucket: 80, label: '£80', rangeLabel: '£80 – £89' },
  { bucket: 90, label: '£90', rangeLabel: '£90 – £99' },
  { bucket: 100, label: '£100+', rangeLabel: '£100+' },
];

/**
 * Builds bubble and scatter data of Meal Rating (1-8) vs Meal Value (£).
 * Meals are categorized into £0, £10, £20, £30, £40, £50... buckets,
 * with bubble size proportional to the count of meals in that bucket.
 */
export function buildValueRatingScatter(filteredMeals = []) {
  const points = [];
  let maxValue = 0;
  let count = 0;

  // Initialize cells for all (rating, bucket) combinations
  const cellMap = new Map();
  for (const r of CANONICAL_MEAL_RATINGS) {
    for (const b of BUBBLE_SPEND_BUCKETS) {
      const key = `${r.id}_${b.bucket}`;
      cellMap.set(key, {
        ratingId: r.id,
        ratingText: r.text,
        displayLabel: r.displayLabel || (r.id === 5 ? 'Okay' : r.id === 8 ? 'The worst' : r.text),
        ratingColor: r.color,
        bucket: b.bucket,
        bucketLabel: b.label,
        rangeLabel: b.rangeLabel,
        count: 0,
        totalSpend: 0,
        avgSpend: 0,
        restaurants: {},
      });
    }
  }

  for (const meal of filteredMeals) {
    if (
      typeof meal.valueGBP === 'number' &&
      !isNaN(meal.valueGBP) &&
      meal.valueGBP >= 0 &&
      meal.ratingId &&
      meal.ratingId >= 1 &&
      meal.ratingId <= 8
    ) {
      count++;
      if (meal.valueGBP > maxValue) {
        maxValue = meal.valueGBP;
      }
      points.push({
        id: meal.id,
        value: meal.valueGBP,
        ratingId: meal.ratingId,
        ratingText: meal.rating,
        restaurantName: meal.restaurant?.name || 'Unknown Restaurant',
        cityName: meal.restaurant?.city?.name || '',
        formattedDate: meal.formattedDate || meal.date || '',
        year: meal.year,
      });

      // Categorize into buckets: 0, 10, 20, 30, 40, 50... 100+
      const bucket = Math.min(Math.floor(meal.valueGBP / 10) * 10, 100);
      const key = `${meal.ratingId}_${bucket}`;
      const cell = cellMap.get(key);
      if (cell) {
        cell.count++;
        cell.totalSpend += meal.valueGBP;
        const restName = meal.restaurant?.name;
        if (restName) {
          cell.restaurants[restName] = (cell.restaurants[restName] || 0) + 1;
        }
      }
    }
  }

  let maxBubbleCount = 0;
  const bubbles = [];
  for (const cell of cellMap.values()) {
    if (cell.count > 0) {
      cell.avgSpend = Math.round((cell.totalSpend / cell.count) * 10) / 10;
      if (cell.count > maxBubbleCount) {
        maxBubbleCount = cell.count;
      }
      cell.topRestaurants = Object.entries(cell.restaurants)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, visits]) => `${name} (${visits})`);
      bubbles.push(cell);
    }
  }

  // Calculate 95th percentile to scale chart comfortably while retaining outliers
  const sortedValues = [...points].map((p) => p.value).sort((a, b) => a - b);
  const p95Idx = Math.floor(sortedValues.length * 0.95);
  const p95 = sortedValues.length > 0 ? sortedValues[p95Idx] : maxValue;
  const domainMax = Math.max(Math.ceil(p95 / 25) * 25, 50);

  return {
    points,
    bubbles,
    buckets: BUBBLE_SPEND_BUCKETS,
    count,
    maxValue,
    maxBubbleCount: Math.max(maxBubbleCount, 1),
    domainMax,
  };
}

/**
 * Generates 4-6 deterministic factual highlights ("Things Your Data Says").
 */
export function buildStatsInsights(filteredMeals = [], allMeals = [], kpis = {}) {
  const insights = [];
  if (!filteredMeals || filteredMeals.length === 0) return insights;

  // 1. Day of week insight
  const dayCounts = Array(7).fill(0);
  for (const m of filteredMeals) {
    if (m.date) {
      const parts = m.date.split('-');
      if (parts.length === 3) {
        const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        dayCounts[getMondayBasedDayIndex(dt.getDay())]++;
      }
    }
  }
  const topDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (dayCounts[topDayIdx] > 0) {
    const pct = Math.round((dayCounts[topDayIdx] / filteredMeals.length) * 100);
    insights.push({
      id: 'day',
      title: 'Peak Dining Day',
      text: `${fullDayNames[topDayIdx]} is your most common dining day (${dayCounts[topDayIdx].toLocaleString()} meals, ${pct}% of visits).`,
      badge: fullDayNames[topDayIdx],
    });
  }

  // 2. Month insight
  const monthCounts = Array(12).fill(0);
  for (const m of filteredMeals) {
    if (m.date) {
      const parts = m.date.split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) monthCounts[mIdx]++;
      }
    }
  }
  const topMonthIdx = monthCounts.indexOf(Math.max(...monthCounts));
  const fullMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  if (monthCounts[topMonthIdx] > 0) {
    insights.push({
      id: 'month',
      title: 'Busiest Month',
      text: `${fullMonthNames[topMonthIdx]} has historically been your most active dining month (${monthCounts[topMonthIdx].toLocaleString()} meals).`,
      badge: fullMonthNames[topMonthIdx],
    });
  }

  // 3. Single visit rate
  const restCounts = new Map();
  for (const m of filteredMeals) {
    if (m.restaurant?.id) {
      restCounts.set(m.restaurant.id, (restCounts.get(m.restaurant.id) || 0) + 1);
    }
  }
  if (restCounts.size > 0) {
    let singleVisits = 0;
    restCounts.forEach((cnt) => {
      if (cnt === 1) singleVisits++;
    });
    const singlePct = Math.round((singleVisits / restCounts.size) * 100);
    insights.push({
      id: 'single_visit',
      title: 'Discovery Curiosity',
      text: `${singlePct}% of restaurants in this selection (${singleVisits.toLocaleString()} of ${restCounts.size.toLocaleString()}) were visited only once.`,
      badge: `${singlePct}% Single Visits`,
    });
  }

  // 4. Most visited restaurant
  let topRest = null;
  let topRestVisits = 0;
  restCounts.forEach((cnt, rId) => {
    if (cnt > topRestVisits) {
      topRestVisits = cnt;
      topRest = rId;
    }
  });
  if (topRest && topRestVisits > 1) {
    const mealWithRest = filteredMeals.find((m) => m.restaurant?.id === topRest);
    const rName = mealWithRest?.restaurant?.name || 'Top Venue';
    insights.push({
      id: 'top_restaurant',
      title: 'Top Destination',
      text: `${rName} is your most visited restaurant with ${topRestVisits.toLocaleString()} recorded meals.`,
      badge: `${topRestVisits} visits`,
    });
  }

  // 5. Median spend insight
  if (kpis.medianMealValue) {
    insights.push({
      id: 'spend',
      title: 'Typical Spend',
      text: `Your median recorded meal expenditure in this view is £${kpis.medianMealValue.toLocaleString()}.`,
      badge: `£${kpis.medianMealValue}`,
    });
  }

  // 6. Dominant Rating or Sentiment
  if (kpis.averageRatingText) {
    insights.push({
      id: 'rating',
      title: 'Overall Rating Tone',
      text: `Your dining evaluations center on ${kpis.averageRatingText} (mean score ${kpis.averageRatingNumeric}/8).`,
      badge: kpis.averageRatingText,
    });
  }

  return insights.slice(0, 6);
}

/**
 * Builds 100% stacked Rating & Sentiment Matrix (matching reference image 2).
 * Shows how positive, neutral, negative, and no comment divide within each rating tier.
 */
export function buildRatingSentimentMatrix(filteredMeals = []) {
  const rows = CANONICAL_MEAL_RATINGS.map((r) => ({
    id: r.id,
    rating: r.text,
    displayLabel: r.displayLabel || (r.id === 5 ? 'Okay' : r.id === 8 ? 'The worst' : r.text),
    shortText: r.shortText,
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    noComment: 0,
    positivePct: 0,
    neutralPct: 0,
    negativePct: 0,
    noCommentPct: 0,
  }));

  for (const meal of filteredMeals) {
    if (!meal.rating) continue;
    const rNorm = meal.rating.toLowerCase();
    const row = rows.find(
      (r) => r.rating.toLowerCase() === rNorm || r.shortText.toLowerCase() === rNorm
    );
    if (!row) continue;

    const s = meal.sentimentCategory || 'No Comment';
    if (s === 'Positive') row.positive++;
    else if (s === 'Negative') row.negative++;
    else if (s === 'Neutral') row.neutral++;
    else row.noComment++;
    row.total++;
  }

  for (const r of rows) {
    if (r.total > 0) {
      r.positivePct = Math.round((r.positive / r.total) * 1000) / 10;
      r.neutralPct = Math.round((r.neutral / r.total) * 1000) / 10;
      r.negativePct = Math.round((r.negative / r.total) * 1000) / 10;
      r.noCommentPct = Math.round((r.noComment / r.total) * 1000) / 10;
    }
  }

  return rows;
}

export const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Builds Spend by Day of Week: Personal vs Business (matching reference image 1).
 */
export function buildSpendByDay(filteredMeals = []) {
  const rows = FULL_DAY_NAMES.map((day) => ({
    day,
    personal: 0,
    business: 0,
    total: 0,
    personalPct: 0,
    businessPct: 0,
    personalMeals: 0,
    businessMeals: 0,
  }));

  let maxTotal = 0;
  let overallSpend = 0;

  for (const meal of filteredMeals) {
    if (
      meal.date &&
      typeof meal.valueGBP === 'number' &&
      !isNaN(meal.valueGBP) &&
      meal.valueGBP > 0
    ) {
      const parts = meal.date.split('-');
      if (parts.length === 3) {
        const dt = new Date(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10)
        );
        const dayIdx = dt.getDay(); // 0 is Sunday
        const isBiz = Boolean(meal.isBusiness);

        if (isBiz) {
          rows[dayIdx].business += meal.valueGBP;
          rows[dayIdx].businessMeals++;
        } else {
          rows[dayIdx].personal += meal.valueGBP;
          rows[dayIdx].personalMeals++;
        }
        rows[dayIdx].total += meal.valueGBP;
        overallSpend += meal.valueGBP;
      }
    }
  }

  for (const r of rows) {
    if (r.total > maxTotal) maxTotal = r.total;
    if (r.total > 0) {
      r.personalPct = Math.round((r.personal / r.total) * 100);
      r.businessPct = Math.round((r.business / r.total) * 100);
    }
  }

  return {
    rows,
    maxTotal: Math.max(maxTotal, 1),
    overallSpend: Math.round(overallSpend),
  };
}

/**
 * Computes dynamic facet counts for all sidebar filters.
 */
export function calculateStatsFacetCounts(allMeals = [], filterState = DEFAULT_STATS_FILTER_STATE) {
  const counts = {
    decades: {},
    years: {},
    ratings: {},
    countries: {},
    cities: {},
    types: {},
    restaurants: {},
    people: {},
    businessCount: 0,
    totalMeals: 0,
  };

  for (const meal of allMeals) {
    counts.totalMeals++;

    if (meal.year) {
      counts.years[meal.year] = (counts.years[meal.year] || 0) + 1;
      const dec = getDecade(meal.year);
      if (dec) counts.decades[dec] = (counts.decades[dec] || 0) + 1;
    }

    if (meal.rating) {
      counts.ratings[meal.rating] = (counts.ratings[meal.rating] || 0) + 1;
    }

    const cName = meal.restaurant?.city?.country?.name || meal.restaurant?.country?.name;
    if (cName) {
      counts.countries[cName] = (counts.countries[cName] || 0) + 1;
    }

    const cityName = meal.restaurant?.city?.name;
    if (cityName) {
      counts.cities[cityName] = (counts.cities[cityName] || 0) + 1;
    }

    const tName = meal.restaurant?.type?.name;
    if (tName) {
      counts.types[tName] = (counts.types[tName] || 0) + 1;
    }

    if (meal.restaurant?.id && meal.restaurant?.name) {
      const restKey = `${meal.restaurant.id}:::${meal.restaurant.name}`;
      counts.restaurants[restKey] = (counts.restaurants[restKey] || 0) + 1;
    }

    for (const comp of meal.companions || []) {
      const pName = comp.publicName || comp.name;
      if (pName) {
        counts.people[pName] = (counts.people[pName] || 0) + 1;
      }
    }

    if (meal.isBusiness) {
      counts.businessCount++;
    }
  }

  return counts;
}
