/**
 * Pure filtering, dynamic faceting, and sorting engine for the Meals dataset.
 */

export const CANONICAL_DECADES = ['2020s', '2010s', '2000s', '1990s'];

export const CANONICAL_RATINGS = [
  'The Dogs',
  'Exceptional',
  'Very Good',
  'Fine',
  "OK but wouldn't recommend",
  'Never Again',
  'Very Bad',
  'The Worst in the World',
];

/**
 * Formats a rating text for compact lozenge / badge display.
 * Replaces verbose "OK but wouldn't recommend" with "OK".
 */
export function formatRatingLabel(rating) {
  if (!rating) return '';
  if (rating.toLowerCase().includes('ok but')) return 'OK';
  return rating;
}

export const RATING_RANK = {
  'the dogs': 9,
  exceptional: 8,
  superb: 7,
  'very good': 6,
  good: 5,
  fine: 4,
  ok: 3,
  "ok but wouldn't recommend": 2,
  bad: 1,
  'very bad': 0,
  'never again': -1,
  'the worst in the world': -2,
};

export const DEFAULT_MEALS_FILTER_STATE = {
  search: '',
  decades: [],
  ratings: [],
  countries: [],
  cities: [],
  cuisines: [],
  ingredients: [],
  foodTypes: [],
  people: [],
  hasPhoto: false,
  isBusiness: false,
  isArsenalMatch: false,
};

/**
 * Returns the 4-digit decade string (e.g. '2020s') from a year number.
 */
export function getDecade(year) {
  if (!year || typeof year !== 'number') return null;
  if (year >= 2020) return '2020s';
  if (year >= 2010) return '2010s';
  if (year >= 2000) return '2000s';
  if (year >= 1990) return '1990s';
  return null;
}

/**
 * Counts how many individual filter conditions are actively selected.
 */
export function countActiveFilters(filterState) {
  let count = 0;
  if (filterState.search && filterState.search.trim()) count++;
  count += (filterState.decades || []).length;
  count += (filterState.ratings || []).length;
  count += (filterState.countries || []).length;
  count += (filterState.cities || []).length;
  count += (filterState.cuisines || []).length;
  count += (filterState.ingredients || []).length;
  count += (filterState.foodTypes || []).length;
  count += (filterState.people || []).length;
  if (filterState.hasPhoto) count++;
  if (filterState.isBusiness) count++;
  if (filterState.isArsenalMatch) count++;
  return count;
}

/**
 * Checks if a meal satisfies all active filters (optionally excluding one facet group).
 */
export function matchesFilters(meal, filterState, excludeFacetKey = null) {
  // 1. Search (matches restaurant, comment, city, country, or dish metadata)
  if (excludeFacetKey !== 'search' && filterState.search && filterState.search.trim()) {
    const q = filterState.search.trim().toLowerCase();
    const restName = (meal.restaurant?.name || '').toLowerCase();
    const comment = (meal.comment || '').toLowerCase();
    const city = (meal.restaurant?.city?.name || '').toLowerCase();
    const country = (meal.restaurant?.city?.country?.name || '').toLowerCase();

    let matchDish = false;
    if (meal.mains && meal.mains.length > 0) {
      for (const m of meal.mains) {
        const dishName = (m.food?.name || '').toLowerCase();
        const ingName = (m.food?.ingredient?.name || '').toLowerCase();
        const style = (m.food?.foodType?.name || '').toLowerCase();
        if (dishName.includes(q) || ingName.includes(q) || style.includes(q)) {
          matchDish = true;
          break;
        }
      }
    }

    if (
      !restName.includes(q) &&
      !comment.includes(q) &&
      !city.includes(q) &&
      !country.includes(q) &&
      !matchDish
    ) {
      return false;
    }
  }

  // 2. Decades (OR within group)
  if (excludeFacetKey !== 'decades' && filterState.decades && filterState.decades.length > 0) {
    const mealDecade = getDecade(meal.year);
    if (!mealDecade || !filterState.decades.includes(mealDecade)) {
      return false;
    }
  }

  // 3. Ratings (OR within group)
  if (excludeFacetKey !== 'ratings' && filterState.ratings && filterState.ratings.length > 0) {
    if (!meal.rating || !filterState.ratings.includes(meal.rating)) {
      return false;
    }
  }

  // 4. Countries (OR within group)
  if (excludeFacetKey !== 'countries' && filterState.countries && filterState.countries.length > 0) {
    const countryName = meal.restaurant?.city?.country?.name;
    if (!countryName || !filterState.countries.includes(countryName)) {
      return false;
    }
  }

  // 5. Cities (OR within group)
  if (excludeFacetKey !== 'cities' && filterState.cities && filterState.cities.length > 0) {
    const cityName = meal.restaurant?.city?.name;
    if (!cityName || !filterState.cities.includes(cityName)) {
      return false;
    }
  }

  // 6. Cuisines / Restaurant Type (OR within group)
  if (excludeFacetKey !== 'cuisines' && filterState.cuisines && filterState.cuisines.length > 0) {
    const cuisine = meal.restaurant?.type?.name;
    if (!cuisine || !filterState.cuisines.includes(cuisine)) {
      return false;
    }
  }

  // 7. Main Ingredients (OR within group)
  if (
    excludeFacetKey !== 'ingredients' &&
    filterState.ingredients &&
    filterState.ingredients.length > 0
  ) {
    const mealIngredients = (meal.mains || []).map((m) => m.food?.ingredient?.name).filter(Boolean);
    const hasMatch = mealIngredients.some((ing) => filterState.ingredients.includes(ing));
    if (!hasMatch) return false;
  }

  // 8. Food Types / Style (OR within group)
  if (
    excludeFacetKey !== 'foodTypes' &&
    filterState.foodTypes &&
    filterState.foodTypes.length > 0
  ) {
    const mealFoodTypes = (meal.mains || []).map((m) => m.food?.foodType?.name).filter(Boolean);
    const hasMatch = mealFoodTypes.some((ft) => filterState.foodTypes.includes(ft));
    if (!hasMatch) return false;
  }

  // 9. Dining Companions / People (OR within group)
  if (excludeFacetKey !== 'people' && filterState.people && filterState.people.length > 0) {
    if (!meal.companions || meal.companions.length === 0) return false;
    const hasMatch = meal.companions.some((c) => filterState.people.includes(c.publicName));
    if (!hasMatch) return false;
  }

  // 10. Photo Available
  if (excludeFacetKey !== 'hasPhoto' && filterState.hasPhoto) {
    if (!meal.photos || meal.photos.length === 0) return false;
  }

  // 11. Business
  if (excludeFacetKey !== 'isBusiness' && filterState.isBusiness) {
    if (!meal.isBusiness) return false;
  }

  // 12. Arsenal Matchday
  if (excludeFacetKey !== 'isArsenalMatch' && filterState.isArsenalMatch) {
    if (!meal.arsenal || !meal.arsenal.isMatchday) return false;
  }

  return true;
}

/**
 * Filters the array of meals using current filter state.
 */
export function filterMeals(meals, filterState) {
  if (!Array.isArray(meals)) return [];
  return meals.filter((meal) => matchesFilters(meal, filterState));
}

/**
 * Computes dynamic facet counts and available options based on currently active filters.
 * Each facet group's counts describe the result set when all other filter groups are active.
 */
export function computeFacetCounts(meals, filterState) {
  if (!Array.isArray(meals)) return {};

  const decadeCounts = {};
  const ratingCounts = {};
  const countryCounts = {};
  const cityCounts = {};
  const cuisineCounts = {};
  const ingredientCounts = {};
  const foodTypeCounts = {};
  const peopleCounts = {};

  let photoCount = 0;
  let businessCount = 0;
  let arsenalCount = 0;

  // Single pass through meals evaluating membership for each facet group
  for (const meal of meals) {
    // 1. Decades
    if (matchesFilters(meal, filterState, 'decades')) {
      const dec = getDecade(meal.year);
      if (dec) decadeCounts[dec] = (decadeCounts[dec] || 0) + 1;
    }

    // 2. Ratings
    if (matchesFilters(meal, filterState, 'ratings')) {
      if (meal.rating && meal.rating !== 'Unrated') {
        ratingCounts[meal.rating] = (ratingCounts[meal.rating] || 0) + 1;
      }
    }

    // 3. Countries
    if (matchesFilters(meal, filterState, 'countries')) {
      const country = meal.restaurant?.city?.country?.name;
      if (country) countryCounts[country] = (countryCounts[country] || 0) + 1;
    }

    // 4. Cities (narrowed by Country and all other filters!)
    if (matchesFilters(meal, filterState, 'cities')) {
      const city = meal.restaurant?.city?.name;
      if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
    }

    // 5. Cuisines
    if (matchesFilters(meal, filterState, 'cuisines')) {
      const cuisine = meal.restaurant?.type?.name;
      if (cuisine) cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    }

    // 6. Ingredients
    if (matchesFilters(meal, filterState, 'ingredients')) {
      const seenIngs = new Set();
      for (const m of meal.mains || []) {
        const ing = m.food?.ingredient?.name;
        if (ing && !seenIngs.has(ing)) {
          seenIngs.add(ing);
          ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 1;
        }
      }
    }

    // 7. Food Types
    if (matchesFilters(meal, filterState, 'foodTypes')) {
      const seenStyles = new Set();
      for (const m of meal.mains || []) {
        const ft = m.food?.foodType?.name;
        if (ft && !seenStyles.has(ft)) {
          seenStyles.add(ft);
          foodTypeCounts[ft] = (foodTypeCounts[ft] || 0) + 1;
        }
      }
    }

    // 8. People / Dining Companions
    if (matchesFilters(meal, filterState, 'people')) {
      const seenPeople = new Set();
      for (const c of meal.companions || []) {
        const name = c.publicName;
        if (name && !seenPeople.has(name)) {
          seenPeople.add(name);
          peopleCounts[name] = (peopleCounts[name] || 0) + 1;
        }
      }
    }

    // 9. Toggles
    if (matchesFilters(meal, filterState, 'hasPhoto') && meal.photos && meal.photos.length > 0) {
      photoCount++;
    }
    if (matchesFilters(meal, filterState, 'isBusiness') && meal.isBusiness) {
      businessCount++;
    }
    if (
      matchesFilters(meal, filterState, 'isArsenalMatch') &&
      meal.arsenal &&
      meal.arsenal.isMatchday
    ) {
      arsenalCount++;
    }
  }

  return {
    decadeCounts,
    ratingCounts,
    countryCounts,
    cityCounts,
    cuisineCounts,
    ingredientCounts,
    foodTypeCounts,
    peopleCounts,
    photoCount,
    businessCount,
    arsenalCount,
  };
}

/**
 * Sorts an array of meals by specified criteria.
 */
export function sortMeals(meals, sortOption) {
  if (!Array.isArray(meals)) return [];
  const list = [...meals];

  switch (sortOption) {
    case 'date_asc':
      return list.sort((a, b) => a.timestamp - b.timestamp);
    case 'date_desc':
      return list.sort((a, b) => b.timestamp - a.timestamp);
    case 'spend_desc':
      return list.sort((a, b) => (b.valueGBP || 0) - (a.valueGBP || 0));
    case 'spend_asc':
      return list.sort((a, b) => (a.valueGBP || 0) - (b.valueGBP || 0));
    case 'name_asc':
      return list.sort((a, b) =>
        (a.restaurant?.name || '').localeCompare(b.restaurant?.name || '')
      );
    case 'rating_desc':
      return list.sort((a, b) => {
        const rankA = RATING_RANK[(a.rating || '').toLowerCase()] ?? -10;
        const rankB = RATING_RANK[(b.rating || '').toLowerCase()] ?? -10;
        if (rankB !== rankA) return rankB - rankA;
        return b.timestamp - a.timestamp;
      });
    default:
      return list;
  }
}
