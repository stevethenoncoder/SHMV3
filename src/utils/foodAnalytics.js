/**
 * Food Analytics and Aggregation Utilities
 * Powers the Food & Dish Intelligence page
 */

import { stripAccents } from './restaurantsFilter.js';

export const DEFAULT_FOOD_FILTER_STATE = {
  search: '',
  countries: [],
  cities: [],
  restaurants: [],
  dishes: [],
  foodTypes: [],
  ingredients: [],
  categories: [],
};

/**
 * Filter meals based on Food page filter criteria
 */
export function filterMealsForFood(meals = [], filterState = DEFAULT_FOOD_FILTER_STATE) {
  const {
    search = '',
    countries = [],
    cities = [],
    restaurants = [],
    dishes = [],
    foodTypes = [],
    ingredients = [],
    categories = [],
  } = filterState;

  const q = stripAccents(search.trim());

  return meals.filter((meal) => {
    // 1. Country filter
    if (countries.length > 0) {
      const c = meal.restaurant?.city?.country?.name;
      if (!c || !countries.includes(c)) return false;
    }

    // 2. City filter
    if (cities.length > 0) {
      const city = meal.restaurant?.city?.name;
      if (!city || !cities.includes(city)) return false;
    }

    // 3. Restaurant filter
    if (restaurants.length > 0) {
      const r = meal.restaurant?.name;
      if (!r || !restaurants.includes(r)) return false;
    }

    const mains = meal.mains || [];

    // 4. Dish filter
    if (dishes.length > 0) {
      const hasDish = mains.some((m) => {
        const name = m.food?.name?.trim();
        return name && dishes.includes(name);
      });
      if (!hasDish) return false;
    }

    // 5. Food Type filter
    if (foodTypes.length > 0) {
      const hasType = mains.some((m) => {
        const ft = m.food?.foodType?.name?.trim() || m.food?.category?.trim();
        return ft && foodTypes.includes(ft);
      });
      if (!hasType) return false;
    }

    // 6. Ingredient filter
    if (ingredients.length > 0) {
      const hasIng = mains.some((m) => {
        const ing = m.food?.ingredient?.name?.trim();
        return ing && ingredients.includes(ing);
      });
      if (!hasIng) return false;
    }

    // 7. Ingredient Category filter
    if (categories.length > 0) {
      const hasCat = mains.some((m) => {
        const cat = m.food?.ingredient?.category?.trim();
        return cat && categories.includes(cat);
      });
      if (!hasCat) return false;
    }

    // 8. Search query
    if (q) {
      // Check meal level fields
      const restName = stripAccents(meal.restaurant?.name || '');
      const cityName = stripAccents(meal.restaurant?.city?.name || '');
      const countryName = stripAccents(meal.restaurant?.city?.country?.name || '');
      const comment = stripAccents(meal.comment || '');

      if (
        restName.includes(q) ||
        cityName.includes(q) ||
        countryName.includes(q) ||
        comment.includes(q)
      ) {
        return true;
      }

      // Check mains / dishes
      const hasMatchingDish = mains.some((m) => {
        const dishName = stripAccents(m.food?.name || '');
        const foodType = stripAccents(m.food?.foodType?.name || '');
        const ingredient = stripAccents(m.food?.ingredient?.name || '');
        const category = stripAccents(m.food?.ingredient?.category || '');
        const dishComment = stripAccents(m.comment || '');

        return (
          dishName.includes(q) ||
          foodType.includes(q) ||
          ingredient.includes(q) ||
          category.includes(q) ||
          dishComment.includes(q)
        );
      });

      if (!hasMatchingDish) return false;
    }

    return true;
  });
}

/**
 * Compute dynamic facet counts for Food page filter dropdowns (cascading across active filters)
 */
export function computeFoodFacetCounts(meals = [], filterState = DEFAULT_FOOD_FILTER_STATE) {
  const countryCounts = {};
  const cityCounts = {};
  const restaurantCounts = {};
  const foodTypeCounts = {};
  const ingredientCounts = {};
  const dishCounts = {};
  const categoryCounts = {};

  // For Countries: filter by all active filters except country
  const mealsForCountries = filterMealsForFood(meals, { ...filterState, countries: [] });
  mealsForCountries.forEach((m) => {
    const c = m.restaurant?.city?.country?.name;
    if (c) countryCounts[c] = (countryCounts[c] || 0) + 1;
  });

  // For Cities: filter by all active filters except city
  const mealsForCities = filterMealsForFood(meals, { ...filterState, cities: [] });
  mealsForCities.forEach((m) => {
    const city = m.restaurant?.city?.name;
    if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
  });

  // For Restaurants: filter by all active filters except restaurant
  const mealsForRestaurants = filterMealsForFood(meals, { ...filterState, restaurants: [] });
  mealsForRestaurants.forEach((m) => {
    const rest = m.restaurant?.name;
    if (rest) restaurantCounts[rest] = (restaurantCounts[rest] || 0) + 1;
  });

  // For Food Types: filter by all active filters except foodTypes
  const mealsForFoodTypes = filterMealsForFood(meals, { ...filterState, foodTypes: [] });
  mealsForFoodTypes.forEach((m) => {
    const seen = new Set();
    (m.mains || []).forEach((main) => {
      const ft = main.food?.foodType?.name?.trim() || main.food?.category?.trim();
      if (ft && !seen.has(ft)) {
        seen.add(ft);
        foodTypeCounts[ft] = (foodTypeCounts[ft] || 0) + 1;
      }
    });
  });

  // For Ingredients: filter by all active filters except ingredients
  const mealsForIngredients = filterMealsForFood(meals, { ...filterState, ingredients: [] });
  mealsForIngredients.forEach((m) => {
    const seen = new Set();
    (m.mains || []).forEach((main) => {
      const ing = main.food?.ingredient?.name?.trim();
      if (ing && !seen.has(ing)) {
        seen.add(ing);
        ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 1;
      }
    });
  });

  // For Dishes: filter by all active filters except dishes
  const mealsForDishes = filterMealsForFood(meals, { ...filterState, dishes: [] });
  mealsForDishes.forEach((m) => {
    const seen = new Set();
    (m.mains || []).forEach((main) => {
      const dish = main.food?.name?.trim();
      if (dish && !seen.has(dish)) {
        seen.add(dish);
        dishCounts[dish] = (dishCounts[dish] || 0) + 1;
      }
    });
  });

  // For Categories: filter by all active filters except categories
  const mealsForCategories = filterMealsForFood(meals, { ...filterState, categories: [] });
  mealsForCategories.forEach((m) => {
    const seen = new Set();
    (m.mains || []).forEach((main) => {
      const cat = main.food?.ingredient?.category?.trim();
      if (cat && !seen.has(cat)) {
        seen.add(cat);
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    });
  });

  return {
    countryCounts,
    cityCounts,
    restaurantCounts,
    foodTypeCounts,
    ingredientCounts,
    dishCounts,
    categoryCounts,
  };
}

/**
 * Aggregate the 4 horizontal bar charts for Food Intelligence
 * 1. Dishes (Food)
 * 2. Food Type
 * 3. Ingredient
 * 4. Ingredient Category
 *
 * Each counts the distinct number of meals featuring that item.
 */
export function aggregateFoodCharts(filteredMeals = []) {
  const dishMeals = new Map(); // dishName -> Set of mealIds
  const dishPhotos = new Map(); // dishName -> Array of photo URLs
  const foodTypeMeals = new Map(); // foodTypeName -> Set of mealIds
  const ingredientMeals = new Map(); // ingredientName -> Set of mealIds
  const ingredientIcons = new Map(); // ingredientName -> icon URL
  const categoryMeals = new Map(); // categoryName -> Set of mealIds

  filteredMeals.forEach((meal) => {
    const mealId = meal.id;
    const mains = meal.mains || [];
    const mealPhotos = (meal.photos || [])
      .map((p) => (typeof p === 'string' ? p : p?.url))
      .filter(Boolean);

    mains.forEach((m) => {
      const food = m.food;
      if (!food) return;

      // 1. Dish name
      const dishName = food.name?.trim();
      if (dishName) {
        if (!dishMeals.has(dishName)) {
          dishMeals.set(dishName, new Set());
          dishPhotos.set(dishName, []);
        }
        dishMeals.get(dishName).add(mealId);

        if (mealPhotos.length > 0) {
          const list = dishPhotos.get(dishName);
          mealPhotos.forEach((url) => {
            if (!list.includes(url)) list.push(url);
          });
        }
      }

      // 2. Food Type
      const ftName = food.foodType?.name?.trim() || food.category?.trim();
      if (ftName) {
        if (!foodTypeMeals.has(ftName)) foodTypeMeals.set(ftName, new Set());
        foodTypeMeals.get(ftName).add(mealId);
      }

      // 3. Ingredient
      const ingName = food.ingredient?.name?.trim();
      if (ingName) {
        if (!ingredientMeals.has(ingName)) ingredientMeals.set(ingName, new Set());
        ingredientMeals.get(ingName).add(mealId);
        if (food.ingredient?.icon && !ingredientIcons.has(ingName)) {
          ingredientIcons.set(ingName, food.ingredient.icon);
        }
      }

      // 4. Ingredient Category
      const catName = food.ingredient?.category?.trim();
      if (catName) {
        if (!categoryMeals.has(catName)) categoryMeals.set(catName, new Set());
        categoryMeals.get(catName).add(mealId);
      }
    });
  });

  const totalMeals = filteredMeals.length;

  const dishes = Array.from(dishMeals.entries())
    .map(([name, mealSet]) => {
      const count = mealSet.size;
      const percentage = totalMeals > 0 ? (count / totalMeals) * 100 : 0;
      const photos = dishPhotos.get(name) || [];
      const photo = photos.length > 0 ? photos[Math.floor(Math.random() * photos.length)] : null;
      return { name, count, percentage, photo, photoCount: photos.length };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const foodTypes = Array.from(foodTypeMeals.entries())
    .map(([name, mealSet]) => {
      const count = mealSet.size;
      const percentage = totalMeals > 0 ? (count / totalMeals) * 100 : 0;
      return { name, count, percentage };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const ingredients = Array.from(ingredientMeals.entries())
    .map(([name, mealSet]) => {
      const count = mealSet.size;
      const percentage = totalMeals > 0 ? (count / totalMeals) * 100 : 0;
      const icon = ingredientIcons.get(name) || null;
      return { name, count, percentage, icon };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const ingredientCategories = Array.from(categoryMeals.entries())
    .map(([name, mealSet]) => {
      const count = mealSet.size;
      const percentage = totalMeals > 0 ? (count / totalMeals) * 100 : 0;
      return { name, count, percentage };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const maxDishCount = dishes.length > 0 ? dishes[0].count : 1;
  const maxFoodTypeCount = foodTypes.length > 0 ? foodTypes[0].count : 1;
  const maxIngredientCount = ingredients.length > 0 ? ingredients[0].count : 1;
  const maxCategoryCount = ingredientCategories.length > 0 ? ingredientCategories[0].count : 1;

  return {
    totalMeals,
    dishes,
    foodTypes,
    ingredients,
    ingredientCategories,
    maxDishCount,
    maxFoodTypeCount,
    maxIngredientCount,
    maxCategoryCount,
    uniqueDishesCount: dishes.length,
    uniqueFoodTypesCount: foodTypes.length,
    uniqueIngredientsCount: ingredients.length,
    uniqueCategoriesCount: ingredientCategories.length,
  };
}
