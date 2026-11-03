import assert from 'assert';
import {
  DEFAULT_FOOD_FILTER_STATE,
  filterMealsForFood,
  computeFoodFacetCounts,
  aggregateFoodCharts,
} from '../src/utils/foodAnalytics.js';

const mockMeals = [
  {
    id: 1,
    comment: 'Superb beef steak',
    restaurant: {
      name: 'Hawksmoor Seven Dials',
      city: { name: 'London', country: { name: 'England' } },
    },
    photos: [{ id: 101, url: 'https://example.com/beef.jpg' }],
    mains: [
      {
        food: {
          name: 'Fillet of Beef',
          foodType: { name: 'Steak' },
          ingredient: { name: 'Beef', category: 'Meat', icon: 'https://example.com/beef_icon.png' },
        },
      },
      {
        food: {
          name: 'Ribeye Steak',
          foodType: { name: 'Steak' },
          ingredient: { name: 'Beef', category: 'Meat', icon: 'https://example.com/beef_icon.png' },
        },
      },
    ],
  },
  {
    id: 2,
    comment: 'Delicious duck',
    restaurant: {
      name: 'Le Chateaubriand',
      city: { name: 'Paris', country: { name: 'France' } },
    },
    mains: [
      {
        food: {
          name: 'Duck Breast',
          foodType: { name: 'Roast' },
          ingredient: { name: 'Duck', category: 'Poultry' },
        },
      },
    ],
  },
  {
    id: 3,
    comment: 'Woodfired pizza',
    restaurant: {
      name: 'Franco Manca',
      city: { name: 'London', country: { name: 'England' } },
    },
    mains: [
      {
        food: {
          name: 'Margherita Pizza',
          foodType: { name: 'Pizza' },
          ingredient: { name: 'Mozzarella', category: 'Dairy' },
        },
      },
    ],
  },
];

console.log('Running Food Analytics Test Suite...');

// 1. Initial full set
const initial = filterMealsForFood(mockMeals, DEFAULT_FOOD_FILTER_STATE);
assert.strictEqual(initial.length, 3, '1. Initial state returns all 3 meals');

// 2. Filter by Country
const franceMeals = filterMealsForFood(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  countries: ['France'],
});
assert.strictEqual(franceMeals.length, 1, '2a. Filter by country France returns 1 meal');
assert.strictEqual(franceMeals[0].id, 2, '2b. Correct French meal returned');

// 3. Filter by City
const londonMeals = filterMealsForFood(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  cities: ['London'],
});
assert.strictEqual(londonMeals.length, 2, '3. Filter by city London returns 2 meals');

// 4. Filter by Restaurant
const hawksmoorMeals = filterMealsForFood(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  restaurants: ['Hawksmoor Seven Dials'],
});
assert.strictEqual(hawksmoorMeals.length, 1, '4. Filter by restaurant returns 1 meal');

// 5. Filter by Dish
const filletMeals = filterMealsForFood(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  dishes: ['Fillet of Beef'],
});
assert.strictEqual(filletMeals.length, 1, '5a. Filter by dish returns 1 meal');

// 6. Filter by Food Type
const steakMeals = filterMealsForFood(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  foodTypes: ['Steak'],
});
assert.strictEqual(steakMeals.length, 1, '6a. Filter by foodType returns 1 meal');

// 7. Filter by Ingredient
const beefMeals = filterMealsForFood(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  ingredients: ['Beef'],
});
assert.strictEqual(beefMeals.length, 1, '7a. Filter by ingredient returns 1 meal');

// 8. Filter by Category
const poultryMeals = filterMealsForFood(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  categories: ['Poultry'],
});
assert.strictEqual(poultryMeals.length, 1, '8a. Filter by category returns 1 meal');

// 9. Search query (accent-insensitive)
const searchBeef = filterMealsForFood(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  search: 'beef',
});
assert.strictEqual(searchBeef.length, 1, '9a. Search "beef" finds meal 1');

const searchPizza = filterMealsForFood(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  search: 'margherita',
});
assert.strictEqual(searchPizza.length, 1, '9b. Search dish name finds meal 3');

// 10. Facet counts
const facets = computeFoodFacetCounts(mockMeals, {
  ...DEFAULT_FOOD_FILTER_STATE,
  countries: ['England'],
});
assert.strictEqual(facets.countryCounts['England'], 2, '10a. England count is 2');
assert.strictEqual(facets.countryCounts['France'], 1, '10b. France count is 1 (cross-facet)');
assert.strictEqual(facets.cityCounts['London'], 2, '10c. London count is 2');
assert.strictEqual(facets.cityCounts['Paris'], undefined, '10d. Paris count is 0/undefined when England selected');
assert.strictEqual(facets.foodTypeCounts['Steak'], 1, '10e. Steak count is 1');
assert.strictEqual(facets.ingredientCounts['Beef'], 1, '10f. Beef count is 1');

// 11. Aggregation of the 4 horizontal bar charts
const charts = aggregateFoodCharts(mockMeals);
assert.strictEqual(charts.totalMeals, 3, '11a. Total meals is 3');
assert.strictEqual(charts.uniqueDishesCount, 4, '11b. 4 unique dishes');
assert.strictEqual(charts.uniqueFoodTypesCount, 3, '11c. 3 unique food types (Steak, Roast, Pizza)');
assert.strictEqual(charts.uniqueIngredientsCount, 3, '11d. 3 unique ingredients (Beef, Duck, Mozzarella)');
assert.strictEqual(charts.uniqueCategoriesCount, 3, '11e. 3 unique categories (Meat, Poultry, Dairy)');

// Meal 1 had 2 beef dishes, but Beef count should be 1 meal!
const beefIng = charts.ingredients.find((i) => i.name === 'Beef');
assert.strictEqual(beefIng.count, 1, '11f. Beef ingredient meal count is 1 (distinct meal deduplication)');
assert.strictEqual(charts.maxDishCount, 1, '11g. Max dish count is 1');

// 12. Dish photo and Ingredient icon propagation
const filletDish = charts.dishes.find((d) => d.name === 'Fillet of Beef');
assert.strictEqual(filletDish.photo, 'https://example.com/beef.jpg', '12a. Dish has randomized photo from meal');
assert.strictEqual(beefIng.icon, 'https://example.com/beef_icon.png', '12b. Ingredient has icon from ING_ICON field');

console.log('✓ All 20 food analytics tests passed successfully!');
