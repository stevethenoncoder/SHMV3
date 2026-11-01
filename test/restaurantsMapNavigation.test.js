import assert from 'node:assert';
import {
  DEFAULT_MEALS_FILTER_STATE,
  matchesFilters,
  filterMeals,
  countActiveFilters,
} from '../src/utils/mealsFilter.js';

console.log('Running Restaurants Map Navigation & Filter Test Suite...\n');

const mockMeals = [
  {
    id: 1,
    restaurant: { id: 10, name: 'Chez Janou' },
    rating: 'Exceptional',
    year: 2024,
  },
  {
    id: 2,
    restaurant: { id: 10, name: 'Chez Janou' },
    rating: 'Very Good',
    year: 2022,
  },
  {
    id: 3,
    restaurant: { id: 20, name: 'The Argyll Pub' },
    rating: 'Very Good',
    year: 2023,
  },
  {
    id: 4,
    restaurant: { id: 30, name: 'Ratskeller' },
    rating: 'OK',
    year: 2009,
  },
];

// 1. Initial filter state has null restaurantId
assert(DEFAULT_MEALS_FILTER_STATE.restaurantId === null, '1a. Initial restaurantId is null');
assert(DEFAULT_MEALS_FILTER_STATE.restaurantName === '', '1b. Initial restaurantName is empty string');
console.log('  ✓ 1. Initial filter state has null restaurantId');

// 2. Setting restaurantId isolates meals for that restaurant only
const chezJanouMeals = filterMeals(mockMeals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  restaurantId: 10,
  restaurantName: 'Chez Janou',
});
assert(chezJanouMeals.length === 2, `2a. Expected 2 meals for Chez Janou, got ${chezJanouMeals.length}`);
assert(chezJanouMeals.every((m) => m.restaurant.id === 10), '2b. All returned meals belong to restaurant ID 10');
console.log('  ✓ 2. Filtering by restaurantId isolates meals for that restaurant only (2/4)');

// 3. Filtering by another restaurant
const argyllMeals = filterMeals(mockMeals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  restaurantId: 20,
  restaurantName: 'The Argyll Pub',
});
assert(argyllMeals.length === 1 && argyllMeals[0].id === 3, '3. Argyll Pub matches only meal #3');
console.log('  ✓ 3. Filtering by another restaurant matches exact restaurant ID');

// 4. countActiveFilters accounts for restaurantId
const activeCount = countActiveFilters({
  ...DEFAULT_MEALS_FILTER_STATE,
  restaurantId: 10,
  restaurantName: 'Chez Janou',
});
assert(activeCount === 1, `4. Active filters count is 1 (got ${activeCount})`);
console.log('  ✓ 4. countActiveFilters accounts for active restaurantId');

// 5. Clearing restaurantId restores all records
const clearedMeals = filterMeals(mockMeals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  restaurantId: null,
  restaurantName: '',
});
assert(clearedMeals.length === 4, `5. Clearing restaurant filter restores all 4 meals (got ${clearedMeals.length})`);
console.log('  ✓ 5. Clearing restaurant filter restores all records');

console.log('\nResults: 5/5 checks passed successfully.');
