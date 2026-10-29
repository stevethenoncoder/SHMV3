import {
  DEFAULT_RESTAURANTS_FILTER_STATE,
  filterRestaurants,
  computeRestaurantFacetCounts,
  sortRestaurants,
  getVisitBand,
  getDecade,
  countActiveRestaurantFilters,
  hasActiveMealFilters,
} from '../src/utils/restaurantsFilter.js';

const mockRestaurants = [
  {
    id: 1,
    name: 'Le Chateaubriand',
    type: { name: 'French' },
    city: { name: 'Paris', country: { name: 'France' } },
    address: '129 Avenue Parmentier',
    mealCount: 3,
    averageRatingNumeric: 2.33,
    averageRatingText: 'Exceptional',
    firstVisit: { date: '2015-05-10', year: 2015, timestamp: 1431200000000 },
    latestVisit: { date: '2024-06-15', year: 2024, timestamp: 1718400000000 },
    meals: [
      {
        id: 1001,
        year: 2024,
        date: '2024-06-15',
        timestamp: 1718400000000,
        rating: 'Exceptional',
        ratingId: 2,
        comment: 'Superb tasting menu',
        mains: [{ food: { name: 'Squid & Pork', category: 'Seafood' } }],
        companions: [{ peopleId: 50, publicName: 'Jane Doe' }],
        isBusiness: false,
        arsenal: null,
      },
      {
        id: 1002,
        year: 2018,
        date: '2018-09-12',
        timestamp: 1536700000000,
        rating: 'Very Good',
        ratingId: 3,
        comment: 'Great wine pairing',
        mains: [{ food: { name: 'Duck Breast', category: 'Meat' } }],
        companions: [{ peopleId: 50, publicName: 'Jane Doe' }, { peopleId: 51, publicName: 'John Smith' }],
        isBusiness: true,
        arsenal: null,
      },
      {
        id: 1003,
        year: 2015,
        date: '2015-05-10',
        timestamp: 1431200000000,
        rating: 'Exceptional',
        ratingId: 2,
        comment: 'Incredible first visit',
        mains: [{ food: { name: 'Veal Sweetbreads', category: 'Meat' } }],
        companions: [],
        isBusiness: false,
        arsenal: null,
      },
    ],
  },
  {
    id: 2,
    name: 'Hawksmoor Seven Dials',
    type: { name: 'Steakhouse' },
    city: { name: 'London', country: { name: 'United Kingdom' } },
    address: '11 Langley St',
    mealCount: 2,
    averageRatingNumeric: 2.0,
    averageRatingText: 'Exceptional',
    firstVisit: { date: '2012-03-01', year: 2012, timestamp: 1330500000000 },
    latestVisit: { date: '2023-11-20', year: 2023, timestamp: 1700400000000 },
    meals: [
      {
        id: 2001,
        year: 2023,
        date: '2023-11-20',
        timestamp: 1700400000000,
        rating: 'The Dogs',
        ratingId: 1,
        comment: 'Prime rib perfection',
        mains: [{ food: { name: 'Bone-in Prime Rib', category: 'Beef' } }],
        companions: [{ peopleId: 51, publicName: 'John Smith' }],
        isBusiness: false,
        arsenal: { isMatchday: true, opponent: 'Chelsea' },
      },
      {
        id: 2002,
        year: 2012,
        date: '2012-03-01',
        timestamp: 1330500000000,
        rating: 'Very Good',
        ratingId: 3,
        comment: 'Solid steak',
        mains: [{ food: { name: 'Ribeye', category: 'Beef' } }],
        companions: [],
        isBusiness: true,
        arsenal: null,
      },
    ],
  },
  {
    id: 3,
    name: 'Bouchon Lyonnais',
    type: { name: 'French' },
    city: { name: 'Lyon', country: { name: 'France' } },
    address: 'Rue Merciere',
    mealCount: 1,
    averageRatingNumeric: 4.0,
    averageRatingText: 'Fine',
    firstVisit: { date: '2018-07-22', year: 2018, timestamp: 1532200000000 },
    latestVisit: { date: '2018-07-22', year: 2018, timestamp: 1532200000000 },
    meals: [
      {
        id: 3001,
        year: 2018,
        date: '2018-07-22',
        timestamp: 1532200000000,
        rating: 'Fine',
        ratingId: 4,
        comment: 'Traditional quenelle',
        mains: [{ food: { name: 'Pike Quenelle', category: 'Fish' } }],
        companions: [],
        isBusiness: false,
        arsenal: null,
      },
    ],
  },
  {
    id: 4,
    name: 'The Crown',
    type: { name: 'Pub' },
    city: { name: 'London', country: { name: 'United Kingdom' } },
    address: 'High St',
    mealCount: 1,
    averageRatingNumeric: 6.0,
    averageRatingText: 'Very Bad',
    firstVisit: { date: '1998-04-10', year: 1998, timestamp: 892200000000 },
    latestVisit: { date: '1998-04-10', year: 1998, timestamp: 892200000000 },
    meals: [
      {
        id: 4001,
        year: 1998,
        date: '1998-04-10',
        timestamp: 892200000000,
        rating: 'Very Bad',
        ratingId: 6,
        comment: 'Awful cold burger',
        mains: [{ food: { name: 'Burger', category: 'Beef' } }],
        companions: [],
        isBusiness: false,
        arsenal: null,
      },
    ],
  },
];

console.log('Running Restaurants Filter Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

// 1. Meal band helper
assert(getVisitBand(1) === '1 meal', '1a. 1 meal band');
assert(getVisitBand(3) === '2–4 meals', '1b. 2-4 meals band');
assert(getVisitBand(7) === '5–9 meals', '1c. 5-9 meals band');
assert(getVisitBand(15) === '10+ meals', '1d. 10+ meals band');

// 2. Search filtering
const searchResult = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  search: 'chateaubriand',
});
assert(searchResult.length === 1 && searchResult[0].id === 1, '2. Search by name finds Le Chateaubriand');

// 2b. Search by dish name across meals
const dishSearchResult = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  search: 'Prime Rib',
});
assert(dishSearchResult.length === 1 && dishSearchResult[0].id === 2, '2b. Search by dish name matches Hawksmoor');

// 3. Country filter
const franceResult = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  countries: ['France'],
});
assert(franceResult.length === 2 && franceResult.every((r) => r.city.country.name === 'France'), '3. Country = France returns 2 restaurants');

// 4. City dynamic facet
const franceFacetCounts = computeRestaurantFacetCounts(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  countries: ['France'],
});
assert(
  franceFacetCounts.cityCounts['Paris'] === 1 &&
  franceFacetCounts.cityCounts['Lyon'] === 1 &&
  franceFacetCounts.cityCounts['London'] === undefined,
  '4. Selecting France narrows city facet to Paris and Lyon only'
);

// 5. Cuisine filter
const frenchResult = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  cuisines: ['French'],
});
assert(frenchResult.length === 2 && frenchResult.every((r) => r.type.name === 'French'), '5. Cuisine = French returns 2 restaurants');

// 6. Visit frequency bands
const repeatBand = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  visitBands: ['2–4 visits'],
});
assert(repeatBand.length === 2, '6. Visit band 2-4 visits returns 2 restaurants (Le Chateaubriand & Hawksmoor)');

// 7. Restaurant Average Rating filter
const exceptionalAvg = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  avgRatings: ['Exceptional'],
});
assert(exceptionalAvg.length === 2 && exceptionalAvg.every((r) => r.averageRatingText === 'Exceptional'), '7. Avg Rating Exceptional finds Le Chateaubriand and Hawksmoor');

// 8. Meal Rating filter & retention:
// Jane Doe visited Le Chateaubriand twice (once Exceptional, once Very Good).
// Filtering by Meal Rating = Very Good should retain Le Chateaubriand, but with matchingMeals length = 1!
const veryGoodMealFilter = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  mealRatings: ['Very Good'],
});
assert(veryGoodMealFilter.length === 2, '8a. Meal Rating Very Good retains Le Chateaubriand and Hawksmoor');
const chateauVG = veryGoodMealFilter.find((r) => r.id === 1);
assert(chateauVG && chateauVG.matchingMeals.length === 1 && chateauVG.mealCount === 3, '8b. Le Chateaubriand has 3 historical meals but 1 matching meal');
assert(chateauVG.matchingMeals[0].rating === 'Very Good', '8c. Matching meal is the Very Good one');

// 9. People filter & privacy:
// Jane Doe (ID 50) attended 2 meals at Le Chateaubriand.
const janeFilter = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  people: [50],
});
assert(janeFilter.length === 1 && janeFilter[0].id === 1, '9a. People filter for Jane Doe (ID 50) returns only Le Chateaubriand');
assert(janeFilter[0].matchingMeals.length === 2, '9b. Jane Doe has 2 matching meals');

// 10. Decade filter:
// Le Chateaubriand has visits in 2020s and 2010s.
const decadeFilter = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  decades: ['2020s'],
});
assert(decadeFilter.length === 2, '10a. 2020s returns Le Chateaubriand and Hawksmoor');
const chateau2020s = decadeFilter.find((r) => r.id === 1);
assert(chateau2020s.matchingMeals.length === 1 && chateau2020s.matchingMeals[0].year === 2024, '10b. 2020s retains only 2024 meal for Le Chateaubriand');

// 11. Arsenal matchday filter:
const arsenalFilter = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  isArsenalMatch: true,
});
assert(arsenalFilter.length === 1 && arsenalFilter[0].id === 2, '11. Arsenal match filter returns only Hawksmoor');

// 12. Combined Restaurant + Meal filters:
// Country = France AND Meal Rating = Exceptional
const combinedFilter = filterRestaurants(mockRestaurants, {
  ...DEFAULT_RESTAURANTS_FILTER_STATE,
  countries: ['France'],
  mealRatings: ['Exceptional'],
});
assert(combinedFilter.length === 1 && combinedFilter[0].id === 1, '12. France AND Meal Rating Exceptional returns Le Chateaubriand');
assert(combinedFilter[0].matchingMeals.length === 2, '12b. Returns the 2 Exceptional meals at Le Chateaubriand');

// 13. Sorting: Best rating first (numeric average ASC)
const sortedByBest = sortRestaurants(mockRestaurants, 'rating_best');
assert(sortedByBest[0].id === 2 && sortedByBest[0].averageRatingNumeric === 2.0, '13a. Sort rating_best puts Hawksmoor first (avg 2.0)');
assert(sortedByBest[sortedByBest.length - 1].id === 4, '13b. Sort rating_best puts The Crown last (avg 6.0)');

// 14. Sorting: Worst rating first (numeric average DESC)
const sortedByWorst = sortRestaurants(mockRestaurants, 'rating_worst');
assert(sortedByWorst[0].id === 4 && sortedByWorst[0].averageRatingNumeric === 6.0, '14. Sort rating_worst puts The Crown first (avg 6.0)');

// 15. Sorting: Most recently visited
const sortedByRecent = sortRestaurants(mockRestaurants, 'recent_desc');
assert(sortedByRecent[0].id === 1 && sortedByRecent[0].latestVisit.year === 2024, '15a. Sort recent_desc puts Le Chateaubriand first');

// 15b. Default sort: Most meals first
const sortedDefault = sortRestaurants(mockRestaurants);
assert(sortedDefault[0].id === 1 && sortedDefault[0].mealCount === 3, '15b. Default sort puts most meals first (Le Chateaubriand, 3 meals)');

// 16. Matching meals fixed date descending order:
const matchingMealsOrder = janeFilter[0].matchingMeals;
assert(matchingMealsOrder[0].timestamp >= matchingMealsOrder[1].timestamp, '16. Matching meals are strictly Date descending');

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
