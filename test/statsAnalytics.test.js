import test from 'node:test';
import assert from 'node:assert';
import {
  calculateMedian,
  getDecade,
  matchesDateFilter,
  filterStatsDataset,
  buildRestaurantFirstVisitsMap,
  calculateHeadlineKpis,
  buildMealsTimeline,
  buildNewVsRepeatSeries,
  buildRatingDistribution,
  buildSentimentSummary,
  buildDiningHeatmap,
  buildTopRestaurantTypes,
  buildTopRestaurants,
  buildTopCountriesWithCities,
  buildValueRatingScatter,
  buildStatsInsights,
  buildRatingSentimentMatrix,
  buildSpendByDay,
  calculateStatsFacetCounts,
  CANONICAL_MEAL_RATINGS,
  getMondayBasedDayIndex,
} from '../src/utils/statsAnalytics.js';

test('1. Median Calculation handles odd, even, and empty arrays correctly', () => {
  assert.strictEqual(calculateMedian([]), null);
  assert.strictEqual(calculateMedian([45]), 45);
  // Odd length: [10, 20, 30] -> 20
  assert.strictEqual(calculateMedian([30, 10, 20]), 20);
  // Even length: [10, 20, 30, 40] -> 25
  assert.strictEqual(calculateMedian([40, 10, 30, 20]), 25);
  // Ignores null, NaN, strings
  assert.strictEqual(calculateMedian([10, null, 20, NaN, 30]), 20);
});

test('2. Authoritative RatingMeal ordering preserves exact 1 to 8 hierarchy', () => {
  assert.strictEqual(CANONICAL_MEAL_RATINGS.length, 8);
  assert.strictEqual(CANONICAL_MEAL_RATINGS[0].text, 'The Dogs');
  assert.strictEqual(CANONICAL_MEAL_RATINGS[0].id, 1);
  assert.strictEqual(CANONICAL_MEAL_RATINGS[1].text, 'Exceptional');
  assert.strictEqual(CANONICAL_MEAL_RATINGS[2].text, 'Very Good');
  assert.strictEqual(CANONICAL_MEAL_RATINGS[3].text, 'Fine');
  assert.strictEqual(CANONICAL_MEAL_RATINGS[4].text, "OK but wouldn't recommend");
  assert.strictEqual(CANONICAL_MEAL_RATINGS[5].text, 'Very Bad');
  assert.strictEqual(CANONICAL_MEAL_RATINGS[6].text, 'Never Again');
  assert.strictEqual(CANONICAL_MEAL_RATINGS[7].text, 'The Worst in the World');
  assert.strictEqual(CANONICAL_MEAL_RATINGS[7].id, 8);
});

test('3. New vs Repeat restaurant logic: filtering to a later year does NOT classify old restaurants as new', () => {
  // Scenario:
  // Restaurant 1 was first visited in 2020.
  // In 2026, the user visited Restaurant 1 (repeat) and Restaurant 2 (first time ever).
  const mockMeals = [
    {
      id: 101,
      date: '2020-05-15',
      year: 2020,
      timestamp: new Date('2020-05-15').getTime(),
      restaurant: { id: 1, name: 'Chez Janou' },
    },
    {
      id: 102,
      date: '2026-02-10',
      year: 2026,
      timestamp: new Date('2026-02-10').getTime(),
      restaurant: { id: 1, name: 'Chez Janou' }, // REPEAT visit! First was 2020!
    },
    {
      id: 103,
      date: '2026-04-12',
      year: 2026,
      timestamp: new Date('2026-04-12').getTime(),
      restaurant: { id: 2, name: 'New Tokyo Diner' }, // NEW restaurant! First visit is 2026!
    },
  ];

  const firstVisits = buildRestaurantFirstVisitsMap(mockMeals);

  // Filter only 2026 meals
  const filter2026 = { dateMode: 'year', year: 2026 };
  const meals2026 = filterStatsDataset(mockMeals, filter2026);
  assert.strictEqual(meals2026.length, 2);

  const kpis = calculateHeadlineKpis(meals2026, mockMeals, filter2026, firstVisits);

  assert.strictEqual(kpis.mealsCount, 2, 'Two meals in 2026');
  assert.strictEqual(kpis.uniqueRestaurantsCount, 2, 'Two unique restaurants in 2026');
  assert.strictEqual(kpis.newRestaurantsCount, 1, 'Only New Tokyo Diner is a New Restaurant in 2026!');
  assert.strictEqual(kpis.repeatMealsCount, 1, 'One meal was a repeat visit (Chez Janou)');
  assert.strictEqual(kpis.repeatVisitRate, 50, 'Repeat visit rate is 50%');
});

test('4. Day of week and Month index mapping for Heatmap is strictly Monday-based', () => {
  // Sunday (0 in JS) -> 6 in Mon-based
  assert.strictEqual(getMondayBasedDayIndex(0), 6);
  // Monday (1 in JS) -> 0 in Mon-based
  assert.strictEqual(getMondayBasedDayIndex(1), 0);
  // Saturday (6 in JS) -> 5 in Mon-based
  assert.strictEqual(getMondayBasedDayIndex(6), 5);

  const mockHeatmapMeals = [
    // 2026-01-05 was a Monday
    { id: 1, date: '2026-01-05', year: 2026 },
    // 2026-01-10 was a Saturday
    { id: 2, date: '2026-01-10', year: 2026 },
  ];

  const heatmap = buildDiningHeatmap(mockHeatmapMeals);
  assert.strictEqual(heatmap.grid[0][0], 1, '1 meal on Monday in Jan');
  assert.strictEqual(heatmap.grid[0][5], 1, '1 meal on Saturday in Jan');
  assert.strictEqual(heatmap.monthTotals[0], 2, '2 meals total in Jan');
});

test('5. Global filtering supports cascading geography, restaurant type, and sentiment', () => {
  const mockDataset = [
    {
      id: 1,
      date: '2024-03-01',
      year: 2024,
      restaurant: {
        id: 10,
        name: 'Bistro Paris',
        country: { name: 'France' },
        city: { name: 'Paris' },
        type: { name: 'French' },
      },
      rating: 'Exceptional',
      ratingId: 2,
      sentimentCategory: 'Positive',
      sentiment: 'Delighted',
      isBusiness: false,
    },
    {
      id: 2,
      date: '2024-06-15',
      year: 2024,
      restaurant: {
        id: 20,
        name: 'The Crown',
        country: { name: 'United Kingdom' },
        city: { name: 'London' },
        type: { name: 'Pub' },
      },
      rating: 'Very Good',
      ratingId: 3,
      sentimentCategory: 'Neutral',
      sentiment: 'Content',
      isBusiness: true,
    },
  ];

  // Country filter
  const frenchOnly = filterStatsDataset(mockDataset, {
    dateMode: 'all',
    countries: ['France'],
  });
  assert.strictEqual(frenchOnly.length, 1);
  assert.strictEqual(frenchOnly[0].restaurant.name, 'Bistro Paris');

  // Business filter
  const businessOnly = filterStatsDataset(mockDataset, {
    dateMode: 'all',
    isBusinessOnly: true,
  });
  assert.strictEqual(businessOnly.length, 1);
  assert.strictEqual(businessOnly[0].restaurant.name, 'The Crown');

  // Sentiment filter
  const positiveOnly = filterStatsDataset(mockDataset, {
    dateMode: 'all',
    sentiments: ['Positive'],
  });
  assert.strictEqual(positiveOnly.length, 1);
  assert.strictEqual(positiveOnly[0].sentiment, 'Delighted');
});

test('6. Dynamic insights returns deterministic factual findings', () => {
  const mockDataset = [
    {
      id: 1,
      date: '2024-09-07', // Saturday
      year: 2024,
      restaurant: { id: 10, name: 'The Local Pub', type: { name: 'Pub' } },
      valueGBP: 40,
      ratingId: 3,
      rating: 'Very Good',
    },
    {
      id: 2,
      date: '2024-09-14', // Saturday
      year: 2024,
      restaurant: { id: 10, name: 'The Local Pub', type: { name: 'Pub' } },
      valueGBP: 60,
      ratingId: 3,
      rating: 'Very Good',
    },
  ];

  const kpis = {
    medianMealValue: 50,
    averageRatingText: 'Very Good',
    averageRatingNumeric: 3.0,
  };

  const insights = buildStatsInsights(mockDataset, mockDataset, kpis);
  assert.ok(insights.length >= 3, 'Produces at least 3 factual insights');
  assert.strictEqual(insights[0].id, 'day');
  assert.ok(insights[0].text.includes('Saturday'));
  assert.ok(insights.some((i) => i.id === 'spend' && i.text.includes('£50')));
});

test('7. Rating x Sentiment Matrix aggregates 100% stacked segments correctly', () => {
  const mockMeals = [
    { id: 1, rating: 'Exceptional', sentimentCategory: 'Positive' },
    { id: 2, rating: 'Exceptional', sentimentCategory: 'Positive' },
    { id: 3, rating: 'Exceptional', sentimentCategory: 'Negative' },
    { id: 4, rating: 'Exceptional', sentimentCategory: 'Neutral' },
  ];

  const matrix = buildRatingSentimentMatrix(mockMeals);
  assert.strictEqual(matrix.length, 8);
  const exceptional = matrix.find((m) => m.rating === 'Exceptional');
  assert.ok(exceptional);
  assert.strictEqual(exceptional.total, 4);
  assert.strictEqual(exceptional.positive, 2);
  assert.strictEqual(exceptional.positivePct, 50.0);
  assert.strictEqual(exceptional.negative, 1);
  assert.strictEqual(exceptional.negativePct, 25.0);
  assert.strictEqual(exceptional.neutral, 1);
  assert.strictEqual(exceptional.neutralPct, 25.0);
});

test('8. Spend by Day of Week accumulates Personal vs Business spend correctly', () => {
  const mockMeals = [
    // 2026-02-01 was a Sunday
    { id: 1, date: '2026-02-01', valueGBP: 100, isBusiness: false },
    { id: 2, date: '2026-02-01', valueGBP: 50, isBusiness: true },
    // 2026-02-02 was a Monday
    { id: 3, date: '2026-02-02', valueGBP: 80, isBusiness: true },
  ];

  const spend = buildSpendByDay(mockMeals);
  assert.strictEqual(spend.rows.length, 7);
  // Sunday
  const sunday = spend.rows[0];
  assert.strictEqual(sunday.day, 'Sunday');
  assert.strictEqual(sunday.personal, 100);
  assert.strictEqual(sunday.business, 50);
  assert.strictEqual(sunday.total, 150);
  assert.strictEqual(sunday.personalPct, 67);
  assert.strictEqual(sunday.businessPct, 33);

  // Monday
  const monday = spend.rows[1];
  assert.strictEqual(monday.day, 'Monday');
  assert.strictEqual(monday.personal, 0);
  assert.strictEqual(monday.business, 80);
  assert.strictEqual(monday.total, 80);
});

test('9. calculateStatsFacetCounts computes counts across all filter facets', () => {
  const mockMeals = [
    {
      id: 1,
      year: 2024,
      rating: 'Exceptional',
      restaurant: {
        id: 10,
        name: 'The Argyll',
        city: { name: 'Henley', country: { name: 'United Kingdom' } },
        type: { name: 'Pub' },
      },
      companions: [{ publicName: 'Alice' }],
      isBusiness: true,
    },
  ];

  const counts = calculateStatsFacetCounts(mockMeals);
  assert.strictEqual(counts.totalMeals, 1);
  assert.strictEqual(counts.years[2024], 1);
  assert.strictEqual(counts.ratings['Exceptional'], 1);
  assert.strictEqual(counts.countries['United Kingdom'], 1);
  assert.strictEqual(counts.cities['Henley'], 1);
  assert.strictEqual(counts.types['Pub'], 1);
  assert.strictEqual(counts.people['Alice'], 1);
  assert.strictEqual(counts.businessCount, 1);
});

test('10. Rating vs Meal Value Bubble chart categorizes spend into 10-pound buckets', () => {
  const mockMeals = [
    { id: 1, valueGBP: 8.5, ratingId: 2, rating: 'Exceptional', restaurant: { name: 'Rest A' } },
    { id: 2, valueGBP: 14.0, ratingId: 3, rating: 'Very Good', restaurant: { name: 'Rest B' } },
    { id: 3, valueGBP: 22.0, ratingId: 3, rating: 'Very Good', restaurant: { name: 'Rest B' } },
    { id: 4, valueGBP: 28.5, ratingId: 3, rating: 'Very Good', restaurant: { name: 'Rest C' } },
    { id: 5, valueGBP: 125.0, ratingId: 1, rating: 'The Dogs', restaurant: { name: 'Rest D' } },
  ];

  const data = buildValueRatingScatter(mockMeals);
  assert.strictEqual(data.count, 5);
  assert.strictEqual(data.buckets.length, 11);
  assert.strictEqual(data.bubbles.length, 4);

  // £20 bucket for Very Good has 2 meals
  const vg20 = data.bubbles.find((b) => b.ratingId === 3 && b.bucket === 20);
  assert.ok(vg20);
  assert.strictEqual(vg20.count, 2);
  assert.strictEqual(vg20.totalSpend, 50.5);
  assert.strictEqual(vg20.avgSpend, 25.3);

  // £125 falls into £100+ bucket
  const dogs100 = data.bubbles.find((b) => b.ratingId === 1 && b.bucket === 100);
  assert.ok(dogs100);
  assert.strictEqual(dogs100.count, 1);
});

test('11. buildTopCountriesWithCities calculates top countries with city splits correctly', () => {
  const mockMeals = [
    { id: 1, restaurant: { city: { name: 'Paris', country: { name: 'France' } } } },
    { id: 2, restaurant: { city: { name: 'Paris', country: { name: 'France' } } } },
    { id: 3, restaurant: { city: { name: 'Lyon', country: { name: 'France' } } } },
    { id: 4, restaurant: { city: { name: 'Madrid', country: { name: 'Spain' } } } },
    { id: 5, restaurant: { city: { name: 'Barcelona', country: { name: 'Spain' } } } },
  ];

  const res = buildTopCountriesWithCities(mockMeals, 10);
  assert.strictEqual(res.countries.length, 2);
  assert.strictEqual(res.countries[0].country, 'France');
  assert.strictEqual(res.countries[0].total, 3);
  assert.strictEqual(res.countries[0].cities.length, 2);
  assert.strictEqual(res.countries[0].cities[0].city, 'Paris');
  assert.strictEqual(res.countries[0].cities[0].count, 2);
  assert.strictEqual(res.countries[0].cities[1].city, 'Lyon');
  assert.strictEqual(res.countries[0].cities[1].count, 1);

  assert.strictEqual(res.countries[1].country, 'Spain');
  assert.strictEqual(res.countries[1].total, 2);
});

test('12. calculateHeadlineKpis accumulates totalSpend and peopleCount', () => {
  const mockMeals = [
    {
      id: 1,
      valueGBP: 50,
      companions: [{ publicName: 'Alice' }, { publicName: 'Bob' }],
      restaurant: { id: 1, city: { name: 'London', country: { name: 'UK' } } },
    },
    {
      id: 2,
      valueGBP: 75,
      companions: [{ publicName: 'Alice' }],
      restaurant: { id: 2, city: { name: 'London', country: { name: 'UK' } } },
    },
  ];

  const kpis = calculateHeadlineKpis(mockMeals, mockMeals, { dateMode: 'all' });
  assert.strictEqual(kpis.mealsCount, 2);
  assert.strictEqual(kpis.totalSpend, 125);
  assert.strictEqual(kpis.peopleCount, 2);
});

