import {
  DEFAULT_MEALS_FILTER_STATE,
  matchesFilters,
  filterMeals,
  computeFacetCounts,
  sortMeals,
  countActiveFilters,
  getDecade,
} from '../src/utils/mealsFilter.js';

// Sample mock data representing realistic Meals records
const mockMeals = [
  {
    id: 1,
    year: 2024,
    timestamp: 1718000000000,
    rating: 'Exceptional',
    valueGBP: 85,
    comment: 'Superb anniversary meal in Paris',
    isBusiness: false,
    photos: [{ id: 101, url: 'https://example.com/photo1.jpg' }],
    restaurant: {
      name: 'Le Chateaubriand',
      type: { name: 'French' },
      city: { name: 'Paris', country: { name: 'France' } },
    },
    mains: [
      { food: { name: 'Roast Duck', ingredient: { name: 'Duck' }, foodType: { name: 'Roast' } } },
    ],
    arsenal: null,
  },
  {
    id: 2,
    year: 2023,
    timestamp: 1686000000000,
    rating: 'Very Good',
    valueGBP: 40,
    comment: 'Great steak dinner after Arsenal match',
    isBusiness: false,
    photos: [{ id: 102, url: 'https://example.com/photo2.jpg' }],
    restaurant: {
      name: 'Hawksmoor',
      type: { name: 'Steakhouse' },
      city: { name: 'London', country: { name: 'United Kingdom' } },
    },
    mains: [
      { food: { name: 'Ribeye Steak', ingredient: { name: 'Beef' }, foodType: { name: 'Steak' } } },
    ],
    arsenal: { isMatchday: true, opponent: 'Chelsea', arsenalScore: 3, opponentScore: 1 },
  },
  {
    id: 3,
    year: 2018,
    timestamp: 1528000000000,
    rating: 'Fine',
    valueGBP: 25,
    comment: 'Quick business lunch in Lyon',
    isBusiness: true,
    photos: [],
    restaurant: {
      name: 'Bouchon Lyonnais',
      type: { name: 'French' },
      city: { name: 'Lyon', country: { name: 'France' } },
    },
    mains: [
      { food: { name: 'Beef Stew', ingredient: { name: 'Beef' }, foodType: { name: 'Stew' } } },
    ],
    arsenal: null,
  },
  {
    id: 4,
    year: 1998,
    timestamp: 900000000000,
    rating: 'The Dogs',
    valueGBP: 15,
    comment: 'Classic 90s pub meal',
    isBusiness: false,
    photos: [],
    restaurant: {
      name: 'The Crown',
      type: { name: 'Pub' },
      city: { name: 'London', country: { name: 'United Kingdom' } },
    },
    mains: [
      { food: { name: 'Fish and Chips', ingredient: { name: 'Cod' }, foodType: { name: 'Fried' } } },
    ],
    arsenal: { isMatchday: true, opponent: 'Spurs', arsenalScore: 2, opponentScore: 0 },
  },
  {
    id: 5,
    year: 2021,
    timestamp: 1624000000000,
    rating: 'OK but wouldn\'t recommend',
    valueGBP: 30,
    comment: 'Average pasta in Rome',
    isBusiness: false,
    photos: [{ id: 103, url: 'https://example.com/photo3.jpg' }],
    restaurant: {
      name: 'Trattoria Roma',
      type: { name: 'Italian' },
      city: { name: 'Rome', country: { name: 'Italy' } },
    },
    mains: [
      { food: { name: 'Spaghetti Carbonara', ingredient: { name: 'Pork' }, foodType: { name: 'Pasta' } } },
    ],
    arsenal: null,
  },
  {
    id: 6,
    year: 2005,
    timestamp: 1120000000000,
    rating: 'Very Good',
    valueGBP: null,
    comment: 'Meal with missing restaurant record',
    isBusiness: false,
    photos: [],
    restaurant: null, // Test orphan restaurant handling!
    mains: [],
    arsenal: null,
  },
];

console.log('Running Meals Filter Test Suite...\n');

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

// 1. One filter works
const test1 = filterMeals(mockMeals, { ...DEFAULT_MEALS_FILTER_STATE, countries: ['France'] });
assert(test1.length === 2 && test1.every((m) => m.restaurant?.city?.country?.name === 'France'), '1. One filter works (Country = France returns 2)');

// 2. Two different filter groups combine correctly (AND)
const test2 = filterMeals(mockMeals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  countries: ['France'],
  ratings: ['Exceptional'],
});
assert(test2.length === 1 && test2[0].id === 1, '2. Two filter groups combine (France AND Exceptional returns 1)');

// 3. Multiple values within one group behave correctly (OR)
const test3 = filterMeals(mockMeals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  countries: ['France', 'Italy'],
});
assert(test3.length === 3 && test3.map((m) => m.id).sort().join(',') === '1,3,5', '3. Multiple values within group work as OR (France OR Italy returns 3)');

// 4. Search combines with filters
const test4 = filterMeals(mockMeals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  countries: ['France'],
  search: 'Duck',
});
assert(test4.length === 1 && test4[0].id === 1, '4. Search combines with filters (France + search "Duck" returns 1)');

// 5. Clearing a filter restores results
const state5 = { ...DEFAULT_MEALS_FILTER_STATE, countries: ['France'] };
const test5Before = filterMeals(mockMeals, state5);
state5.countries = [];
const test5After = filterMeals(mockMeals, state5);
assert(test5Before.length === 2 && test5After.length === 6, '5. Clearing filter restores full result set');

// 6. Clear all restores full result set
const state6 = {
  ...DEFAULT_MEALS_FILTER_STATE,
  countries: ['France'],
  ratings: ['Exceptional'],
  hasPhoto: true,
  search: 'Paris',
};
const test6Cleared = filterMeals(mockMeals, DEFAULT_MEALS_FILTER_STATE);
assert(test6Cleared.length === 6, '6. Clear all restores full 6 items');

// 7. Dynamic counts respond to active filters
const countsFrance = computeFacetCounts(mockMeals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  countries: ['France'],
});
assert(
  countsFrance.cityCounts['Paris'] === 1 &&
  countsFrance.cityCounts['Lyon'] === 1 &&
  countsFrance.cityCounts['London'] === undefined &&
  countsFrance.cityCounts['Rome'] === undefined,
  '7. Dynamic counts: Selecting France restricts city facet counts to Paris and Lyon only'
);

// 8. Missing values do not create invalid facets or crash
assert(
  !countsFrance.countryCounts['null'] &&
  !countsFrance.countryCounts['undefined'] &&
  countsFrance.countryCounts[''] === undefined,
  '8. Missing/null values do not appear in facet counts'
);

// 9. Sorting occurs before pagination
const sortedDesc = sortMeals(mockMeals, 'date_desc');
assert(sortedDesc[0].id === 1 && sortedDesc[sortedDesc.length - 1].id === 4, '9. Sorting date_desc puts 2024 first and 1998 last');

// 10. Boolean toggles: Arsenal Matchday & Photos
const testArsenal = filterMeals(mockMeals, { ...DEFAULT_MEALS_FILTER_STATE, isArsenalMatch: true });
assert(testArsenal.length === 2 && testArsenal.every((m) => m.arsenal?.isMatchday), '10a. Arsenal matchday filter returns only matchday meals (2)');

const testPhotos = filterMeals(mockMeals, { ...DEFAULT_MEALS_FILTER_STATE, hasPhoto: true });
assert(testPhotos.length === 3 && testPhotos.every((m) => m.photos.length > 0), '10b. Photo filter returns only meals with photos (3)');

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
