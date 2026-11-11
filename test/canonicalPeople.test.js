import test from 'node:test';
import assert from 'node:assert';
import { transformMealsData } from '../src/services/mealsDataService.js';
import { buildFilmSummary } from '../src/utils/journeySummary.js';
import { matchesFilters, computeFacetCounts } from '../src/utils/mealsFilter.js';
import { calculateHeadlineKpis, calculateStatsFacetCounts } from '../src/utils/statsAnalytics.js';

test('Canonical People Model: Lou Oram (364) and Lou Holland (744) resolution', () => {
  const rawPeoplePublic = [
    {
      People_ID: '364',
      'Public?': 'Y',
      Public_Name: 'Lou Oram',
      People_ID_Current: '744',
      People_Name_Current: 'Lou Holland',
    },
    {
      People_ID: '744',
      'Public?': 'Y',
      Public_Name: 'Lou Holland',
      People_ID_Current: '744',
      People_Name_Current: 'Lou Holland',
    },
    {
      People_ID: '500',
      'Public?': 'N',
      Public_Name: 'Hidden name',
      People_ID_Current: '500',
      People_Name_Current: 'Hidden name',
    },
    {
      People_ID: '600',
      'Public?': 'Y',
      Public_Name: 'John Smith',
      People_ID_Current: '600',
      People_Name_Current: 'John Smith',
    },
  ];

  const rawMeals = [
    { Meal_ID: '1', Rest_ID: '10', Date_Visited: '15/05/2021', Meal_Rating: 'Exceptional' },
    { Meal_ID: '2', Rest_ID: '10', Date_Visited: '20/06/2022', Meal_Rating: 'Very Good' },
    { Meal_ID: '3', Rest_ID: '10', Date_Visited: '25/07/2023', Meal_Rating: 'The Dogs' },
    { Meal_ID: '4', Rest_ID: '10', Date_Visited: '30/08/2023', Meal_Rating: 'Fine' },
  ];

  const rawRest = [
    { Rest_ID: '10', Rest: 'The River Cafe', City_ID: '1' },
  ];

  const rawMealsPeople = [
    // Meal 1: historical ID 364
    { Meal_ID: '1', People_ID: '364' },
    // Meal 2: canonical ID 744
    { Meal_ID: '2', People_ID: '744' },
    // Meal 3: BOTH historical 364 AND canonical 744 (should deduplicate!)
    { Meal_ID: '3', People_ID: '364' },
    { Meal_ID: '3', People_ID: '744' },
    // Meal 4: Private companion 500 and Public John Smith 600
    { Meal_ID: '4', People_ID: '500' },
    { Meal_ID: '4', People_ID: '600' },
  ];

  const data = transformMealsData({
    rawMeals,
    rawRest,
    rawMealsPeople,
    rawPeoplePublic,
  });

  // 1. publicPeopleById assertions
  assert.strictEqual(data.publicPeopleById.has(364), false, 'Historical ID 364 must NOT exist as separate key in publicPeopleById');
  assert.strictEqual(data.publicPeopleById.has(744), true, 'Canonical ID 744 must exist in publicPeopleById');
  assert.strictEqual(data.publicPeopleById.has(500), false, 'Private ID 500 must NOT exist in publicPeopleById');
  assert.strictEqual(data.publicPeopleById.has(600), true, 'Public person 600 must exist');

  const lou = data.publicPeopleById.get(744);
  assert.strictEqual(lou.publicName, 'Lou Holland', 'Canonical name must be Lou Holland');
  assert.strictEqual(lou.peopleId, 744, 'Canonical ID must be 744');
  assert.deepStrictEqual(lou.historicalIds.sort(), [364, 744], 'Historical IDs must record [364, 744]');

  // 2. Meal 1 (historical ID 364) assertions
  const meal1 = data.mealsById.get(1);
  assert.strictEqual(meal1.companions.length, 1, 'Meal 1 must have 1 companion');
  assert.strictEqual(meal1.companions[0].peopleId, 744, 'Meal 1 companion must resolve to canonical ID 744');
  assert.strictEqual(meal1.companions[0].publicName, 'Lou Holland', 'Meal 1 companion must display Lou Holland');
  assert.deepStrictEqual(meal1.allPeopleIds, [744], 'Meal 1 allPeopleIds must contain canonical ID 744');

  // 3. Meal 2 (canonical ID 744) assertions
  const meal2 = data.mealsById.get(2);
  assert.strictEqual(meal2.companions.length, 1, 'Meal 2 must have 1 companion');
  assert.strictEqual(meal2.companions[0].peopleId, 744, 'Meal 2 companion must have canonical ID 744');
  assert.strictEqual(meal2.companions[0].publicName, 'Lou Holland', 'Meal 2 companion must display Lou Holland');

  // 4. Meal 3 (BOTH 364 and 744) assertions - Deduplication Rule
  const meal3 = data.mealsById.get(3);
  assert.strictEqual(meal3.companions.length, 1, 'Meal 3 must deduplicate to exactly 1 companion');
  assert.strictEqual(meal3.companions[0].peopleId, 744, 'Meal 3 companion must be 744');
  assert.strictEqual(meal3.companions[0].publicName, 'Lou Holland', 'Meal 3 companion must be Lou Holland');
  assert.deepStrictEqual(meal3.allPeopleIds, [744], 'Meal 3 allPeopleIds must contain 744 once, not duplicated');

  // 5. Meal 4 (Private 500 + Public 600) assertions - Privacy Rule
  const meal4 = data.mealsById.get(4);
  assert.strictEqual(meal4.companions.length, 1, 'Private companion 500 must NOT appear in public companions');
  assert.strictEqual(meal4.companions[0].peopleId, 600, 'Public companion 600 must appear');
  assert.strictEqual(meal4.companions[0].publicName, 'John Smith');
  assert.deepStrictEqual(meal4.allPeopleIds.sort(), [500, 600], 'allPeopleIds must include 500 for internal aggregates');

  // 6. Chronicle / Filter test
  // Filtering for Lou Holland
  const louFilter = { people: ['Lou Holland'] };
  assert.strictEqual(matchesFilters(meal1, louFilter), true, 'Meal 1 must match Lou Holland filter');
  assert.strictEqual(matchesFilters(meal2, louFilter), true, 'Meal 2 must match Lou Holland filter');
  assert.strictEqual(matchesFilters(meal3, louFilter), true, 'Meal 3 must match Lou Holland filter');
  assert.strictEqual(matchesFilters(meal4, louFilter), false, 'Meal 4 must not match Lou Holland filter');

  // Filtering for Lou Oram should not match anything (Lou Oram is not a current identity)
  const oramFilter = { people: ['Lou Oram'] };
  assert.strictEqual(matchesFilters(meal1, oramFilter), false);
  assert.strictEqual(matchesFilters(meal2, oramFilter), false);
  assert.strictEqual(matchesFilters(meal3, oramFilter), false);

  // Facet counts
  const facetCounts = computeFacetCounts(data.meals, { people: [] });
  assert.strictEqual(facetCounts.peopleCounts['Lou Holland'], 3, 'Lou Holland must have exactly 3 meals counted');
  assert.strictEqual(facetCounts.peopleCounts['Lou Oram'], undefined, 'Lou Oram must not appear in facet counts');
  assert.strictEqual(facetCounts.peopleCounts['John Smith'], 1);
  assert.strictEqual(facetCounts.peopleCounts['Hidden name'], undefined, 'Hidden name must not appear in facet counts');

  // 7. Stats Analytics test
  const kpis = calculateHeadlineKpis(data.meals);
  // Unique people should be Lou Holland and John Smith = 2
  assert.strictEqual(kpis.peopleCount, 2, 'peopleCount must count distinct public companions (Lou Holland and John Smith)');

  // 8. Journey Summary resolution
  // If targetPersonId is historical ID 364, it must resolve to Lou Holland
  const summaryFrom364 = buildFilmSummary(data, 364);
  assert.ok(summaryFrom364, 'Summary from historical ID 364 must succeed');
  assert.strictEqual(summaryFrom364.name, 'Lou', 'Short name must be Lou');
  assert.strictEqual(summaryFrom364.full, 'Lou Holland', 'Full name must resolve to Lou Holland');
  const totalMeals364 = summaryFrom364.years.reduce((sum, [, count]) => sum + count, 0);
  assert.strictEqual(totalMeals364, 3, 'Total meals with Lou Holland must be 3');

  // If targetPersonId is canonical ID 744
  const summaryFrom744 = buildFilmSummary(data, 744);
  assert.ok(summaryFrom744, 'Summary from canonical ID 744 must succeed');
  assert.strictEqual(summaryFrom744.full, 'Lou Holland');
  const totalMeals744 = summaryFrom744.years.reduce((sum, [, count]) => sum + count, 0);
  assert.strictEqual(totalMeals744, 3);
});

test('Places Globe & Restaurants Filter: integration with canonical ID', async () => {
  const { filterPlacesMeals, calculatePlacesFacetCounts } = await import('../src/utils/placesGlobeData.js');
  const { filterRestaurants } = await import('../src/utils/restaurantsFilter.js');

  const rawPeoplePublic = [
    { People_ID: '364', 'Public?': 'Y', Public_Name: 'Lou Oram', People_ID_Current: '744', People_Name_Current: 'Lou Holland' },
    { People_ID: '744', 'Public?': 'Y', Public_Name: 'Lou Holland', People_ID_Current: '744', People_Name_Current: 'Lou Holland' },
  ];
  const rawMeals = [
    { Meal_ID: '1', Rest_ID: '10', Date_Visited: '15/05/2021', Meal_Rating: 'Exceptional' },
    { Meal_ID: '2', Rest_ID: '20', Date_Visited: '20/06/2022', Meal_Rating: 'Very Good' },
  ];
  const rawRest = [
    { Rest_ID: '10', Rest: 'The River Cafe', City_ID: '1' },
    { Rest_ID: '20', Rest: 'Brat', City_ID: '1' },
  ];
  const rawMealsPeople = [
    { Meal_ID: '1', People_ID: '364' },
    { Meal_ID: '2', People_ID: '744' },
  ];

  const data = transformMealsData({ rawMeals, rawRest, rawMealsPeople, rawPeoplePublic });

  // 1. Places Globe filter by canonical person ID 744
  const filteredPlacesMeals = filterPlacesMeals(data.meals, { people: ['744'] });
  assert.strictEqual(filteredPlacesMeals.length, 2, 'Both meals (historical 364 and canonical 744) match person 744');

  // Places facet counts for people
  const placesFacets = calculatePlacesFacetCounts(data.meals, { people: [] });
  assert.strictEqual(placesFacets.peopleCounts[744], 2, 'Places facet count for 744 must be 2');
  assert.strictEqual(placesFacets.peopleCounts[364], undefined, 'Places facet count for 364 must not exist');

  // 2. Restaurants Filter by canonical person ID 744
  const filteredRestaurants = filterRestaurants(data.restaurants, { people: [744] });
  assert.strictEqual(filteredRestaurants.length, 2, 'Both restaurants visited with Lou Holland must match');
});

test('Fallback handling: legacy feeds without People_ID_Current column', () => {
  const rawPeoplePublic = [
    { People_ID: '364', 'Public?': 'Y', Public_Name: 'Lou Oram' },
    { People_ID: '1015', 'Public?': 'Y', Public_Name: 'Template Row' }, // > 1009 should be ignored
  ];
  const rawMeals = [
    { Meal_ID: '1', Rest_ID: '10', Date_Visited: '15/05/2021', Meal_Rating: 'Exceptional' },
  ];
  const rawRest = [
    { Rest_ID: '10', Rest: 'The River Cafe', City_ID: '1' },
  ];
  const rawMealsPeople = [
    { Meal_ID: '1', People_ID: '364' },
    { Meal_ID: '1', People_ID: '1015' },
  ];

  const data = transformMealsData({ rawMeals, rawRest, rawMealsPeople, rawPeoplePublic });

  // Should gracefully fallback canonicalId to People_ID when People_ID_Current is absent
  assert.strictEqual(data.publicPeopleById.has(364), true);
  assert.strictEqual(data.publicPeopleById.get(364).publicName, 'Lou Oram');
  assert.strictEqual(data.publicPeopleById.has(1015), false, 'Template row > 1009 must be filtered out');

  const meal = data.mealsById.get(1);
  assert.strictEqual(meal.companions.length, 1);
  assert.strictEqual(meal.companions[0].peopleId, 364);
});
