/**
 * Pure filtering, dynamic faceting, and sorting engine for the Restaurants dataset.
 * Supports unified Restaurant-level and Meal-level filtering with Meal retention semantics.
 */

export const CANONICAL_VISIT_BANDS = ['1 meal', '2–4 meals', '5–9 meals', '10+ meals'];

export const CANONICAL_MEAL_RATINGS = [
  'The Dogs',
  'Exceptional',
  'Very Good',
  'Fine',
  "OK but wouldn't recommend",
  'Very Bad',
  'Never Again',
  'The Worst in the World',
];

export const CANONICAL_DECADES = ['2020s', '2010s', '2000s', '1990s'];

/**
 * Formats a rating text for compact lozenge / badge display.
 * Replaces verbose "OK but wouldn't recommend" with "OK".
 */
export function formatRatingLabel(rating) {
  if (!rating) return '';
  if (rating.toLowerCase().includes('ok but')) return 'OK';
  return rating;
}

export const DEFAULT_RESTAURANTS_FILTER_STATE = {
  search: '',
  // Restaurant-level filters
  countries: [],
  cities: [],
  cuisines: [],
  visitBands: [],
  avgRatings: [],
  // Meal-level filters
  mealRatings: [],
  decades: [],
  people: [], // array of numeric public People_ID
  foodCategory: [], // array of food category names
  isBusiness: false,
  isArsenalMatch: false,
};

/**
 * Maps a numeric visit count to a canonical visit frequency band.
 */
export function getVisitBand(count) {
  if (typeof count !== 'number' || count <= 0) return null;
  if (count === 1) return '1 meal';
  if (count >= 2 && count <= 4) return '2–4 meals';
  if (count >= 5 && count <= 9) return '5–9 meals';
  return '10+ meals';
}

/**
 * Maps a numeric year to a decade string.
 */
export function getDecade(year) {
  if (!year || typeof year !== 'number') return null;
  if (year >= 2020) return '2020s';
  if (year >= 2010) return '2010s';
  if (year >= 2000) return '2000s';
  if (year >= 1990) return '1990s';
  return 'Pre-1990s';
}

/**
 * Checks whether any meal-level filters are active.
 */
export function hasActiveMealFilters(filterState) {
  if (!filterState) return false;
  return Boolean(
    (filterState.mealRatings && filterState.mealRatings.length > 0) ||
      (filterState.decades && filterState.decades.length > 0) ||
      (filterState.people && filterState.people.length > 0) ||
      (filterState.foodCategory && filterState.foodCategory.length > 0) ||
      filterState.isBusiness ||
      filterState.isArsenalMatch
  );
}

/**
 * Counts how many individual filter conditions are actively selected.
 */
export function countActiveRestaurantFilters(filterState) {
  if (!filterState) return 0;
  let count = 0;
  if (filterState.search && filterState.search.trim()) count++;
  count += (filterState.countries || []).length;
  count += (filterState.cities || []).length;
  count += (filterState.cuisines || []).length;
  count += (filterState.visitBands || []).length;
  count += (filterState.avgRatings || []).length;
  count += (filterState.mealRatings || []).length;
  count += (filterState.decades || []).length;
  count += (filterState.people || []).length;
  count += (filterState.foodCategory || []).length;
  if (filterState.isBusiness) count++;
  if (filterState.isArsenalMatch) count++;
  return count;
}

/**
 * Checks if search text matches restaurant-level properties.
 */
export function restaurantMatchesSearch(restaurant, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  const name = (restaurant.name || '').toLowerCase();
  const city = (restaurant.city?.name || '').toLowerCase();
  const country = (restaurant.city?.country?.name || '').toLowerCase();
  const cuisine = (restaurant.type?.name || '').toLowerCase();
  const address = (restaurant.address || '').toLowerCase();
  const gAddress = (restaurant.googleAddress || '').toLowerCase();

  return (
    name.includes(q) ||
    city.includes(q) ||
    country.includes(q) ||
    cuisine.includes(q) ||
    address.includes(q) ||
    gAddress.includes(q)
  );
}

/**
 * Checks if search text matches meal-level properties.
 */
export function mealMatchesSearch(meal, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (meal.comment && meal.comment.toLowerCase().includes(q)) return true;

  for (const d of meal.mains || []) {
    if (d.food?.name && d.food.name.toLowerCase().includes(q)) return true;
    if (d.food?.category && d.food.category.toLowerCase().includes(q)) return true;
    if (d.food?.ingredient?.name && d.food.ingredient.name.toLowerCase().includes(q)) return true;
    if (d.food?.foodType?.name && d.food.foodType.name.toLowerCase().includes(q)) return true;
  }

  for (const c of meal.companions || []) {
    if (c.publicName && c.publicName.toLowerCase().includes(q)) return true;
  }

  return false;
}

/**
 * Evaluates whether a single meal satisfies all active meal-level filters.
 */
export function mealMatchesFilters(meal, filterState, excludeFacetKey = null) {
  // 1. Meal Ratings
  if (
    excludeFacetKey !== 'mealRatings' &&
    filterState.mealRatings &&
    filterState.mealRatings.length > 0
  ) {
    if (!meal.rating || !filterState.mealRatings.includes(meal.rating)) {
      return false;
    }
  }

  // 2. Decades
  if (excludeFacetKey !== 'decades' && filterState.decades && filterState.decades.length > 0) {
    const dec = getDecade(meal.year);
    if (!dec || !filterState.decades.includes(dec)) {
      return false;
    }
  }

  // 3. People (OR semantics: matches if any companion on this meal matches selected public people IDs)
  if (excludeFacetKey !== 'people' && filterState.people && filterState.people.length > 0) {
    const mealPeopleIds = (meal.companions || []).map((p) => p.peopleId);
    const hasMatch = filterState.people.some((id) => mealPeopleIds.includes(id));
    if (!hasMatch) return false;
  }

  // 4. Food Categories
  if (
    excludeFacetKey !== 'foodCategory' &&
    filterState.foodCategory &&
    filterState.foodCategory.length > 0
  ) {
    const mains = meal.mains || [];
    const hasMatch = filterState.foodCategory.some((cat) =>
      mains.some(
        (dish) =>
          dish.food?.category?.toLowerCase() === cat.toLowerCase() ||
          dish.food?.name?.toLowerCase().includes(cat.toLowerCase())
      )
    );
    if (!hasMatch) return false;
  }

  // 5. Business
  if (excludeFacetKey !== 'isBusiness' && filterState.isBusiness) {
    if (!meal.isBusiness) return false;
  }

  // 6. Arsenal Match
  if (excludeFacetKey !== 'isArsenalMatch' && filterState.isArsenalMatch) {
    if (!meal.arsenal?.isMatchday) return false;
  }

  return true;
}

/**
 * Checks whether a restaurant satisfies restaurant-level filters (Country, City, Cuisine, Visits, Avg Rating).
 */
export function restaurantMatchesRestFilters(restaurant, filterState, excludeFacetKey = null) {
  // 1. Countries (OR within group)
  if (
    excludeFacetKey !== 'countries' &&
    filterState.countries &&
    filterState.countries.length > 0
  ) {
    const country = restaurant.city?.country?.name;
    if (!country || !filterState.countries.includes(country)) {
      return false;
    }
  }

  // 2. Cities (OR within group, dynamically narrowed by Country)
  if (excludeFacetKey !== 'cities' && filterState.cities && filterState.cities.length > 0) {
    const city = restaurant.city?.name;
    if (!city || !filterState.cities.includes(city)) {
      return false;
    }
  }

  // 3. Cuisines / Restaurant Type (OR within group)
  if (excludeFacetKey !== 'cuisines' && filterState.cuisines && filterState.cuisines.length > 0) {
    const cuisine = restaurant.type?.name;
    if (!cuisine || !filterState.cuisines.includes(cuisine)) {
      return false;
    }
  }

  // 4. Meal Frequency Bands (OR within group)
  if (
    excludeFacetKey !== 'visitBands' &&
    filterState.visitBands &&
    filterState.visitBands.length > 0
  ) {
    const band = getVisitBand(restaurant.mealCount);
    const matchesBand = filterState.visitBands.some(
      (b) =>
        b === band ||
        b.replace('visit', 'meal') === band ||
        b.replace('visits', 'meals') === band
    );
    if (!matchesBand) {
      return false;
    }
  }

  // 5. Restaurant Average Rating
  if (
    excludeFacetKey !== 'avgRatings' &&
    filterState.avgRatings &&
    filterState.avgRatings.length > 0
  ) {
    const avgText = restaurant.averageRatingText;
    if (!avgText || !filterState.avgRatings.includes(avgText)) {
      return false;
    }
  }

  return true;
}

/**
 * Unified filter engine:
 * Evaluates restaurant-level filters and meal-level filters.
 * Returns { matches: boolean, matchingMeals: Array<Object> }.
 */
export function evaluateRestaurantWithMatchingMeals(
  restaurant,
  filterState,
  excludeFacetKey = null
) {
  // Check restaurant-level criteria
  if (!restaurantMatchesRestFilters(restaurant, filterState, excludeFacetKey)) {
    return { matches: false, matchingMeals: [] };
  }

  const query = filterState.search?.trim();
  const restMatchesQ = excludeFacetKey === 'search' || !query || restaurantMatchesSearch(restaurant, query);

  const activeMealFilters = hasActiveMealFilters(filterState);
  const rMeals = restaurant.meals || [];

  // If no search query and no meal-level filters: all meals match
  if (!query && !activeMealFilters) {
    return {
      matches: true,
      matchingMeals: [...rMeals].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    };
  }

  // Filter individual meals
  const matchingMeals = [];
  for (const m of rMeals) {
    // Check meal-level criteria
    if (!mealMatchesFilters(m, filterState, excludeFacetKey)) {
      continue;
    }

    // Check search match
    if (query && excludeFacetKey !== 'search') {
      const mealMatchesQ = mealMatchesSearch(m, query);
      if (!restMatchesQ && !mealMatchesQ) {
        continue;
      }
    }

    matchingMeals.push(m);
  }

  // If the restaurant matched the search query at the restaurant level, but no meal-level filters were active,
  // then all of the restaurant's meals should be visible when expanded.
  if (restMatchesQ && !activeMealFilters && matchingMeals.length === 0 && rMeals.length > 0) {
    return {
      matches: true,
      matchingMeals: [...rMeals].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    };
  }

  if (matchingMeals.length === 0) {
    return { matches: false, matchingMeals: [] };
  }

  // Sort matching meals Date descending (fixed rule)
  matchingMeals.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return {
    matches: true,
    matchingMeals,
  };
}

/**
 * Filters the list of restaurants against the active filter state.
 * Attaches `matchingMeals` and `matchingCount` to each retained restaurant.
 */
export function filterRestaurants(restaurants, filterState) {
  if (!Array.isArray(restaurants)) return [];

  const results = [];
  for (const r of restaurants) {
    const { matches, matchingMeals } = evaluateRestaurantWithMatchingMeals(r, filterState);
    if (matches) {
      // Create a shallow copy with matchingMeals attached
      results.push({
        ...r,
        matchingMeals,
        matchingCount: matchingMeals.length,
      });
    }
  }

  return results;
}

/**
 * Computes dynamic facet counts and available options for restaurants.
 */
export function computeRestaurantFacetCounts(restaurants, filterState) {
  if (!Array.isArray(restaurants)) return {};

  const countryCounts = {};
  const cityCounts = {};
  const cuisineCounts = {};
  const visitBandCounts = {};
  const avgRatingCounts = {};
  const mealRatingCounts = {};
  const decadeCounts = {};
  const peopleCounts = {};
  let businessCount = 0;
  let arsenalCount = 0;

  for (const r of restaurants) {
    // 1. Countries
    if (evaluateRestaurantWithMatchingMeals(r, filterState, 'countries').matches) {
      const country = r.city?.country?.name;
      if (country) countryCounts[country] = (countryCounts[country] || 0) + 1;
    }

    // 2. Cities (narrowed by selected country!)
    if (evaluateRestaurantWithMatchingMeals(r, filterState, 'cities').matches) {
      const city = r.city?.name;
      if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
    }

    // 3. Cuisines
    if (evaluateRestaurantWithMatchingMeals(r, filterState, 'cuisines').matches) {
      const cuisine = r.type?.name;
      if (cuisine) cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    }

    // 4. Visit Bands
    if (evaluateRestaurantWithMatchingMeals(r, filterState, 'visitBands').matches) {
      const band = getVisitBand(r.mealCount);
      if (band) visitBandCounts[band] = (visitBandCounts[band] || 0) + 1;
    }

    // 5. Avg Ratings
    if (evaluateRestaurantWithMatchingMeals(r, filterState, 'avgRatings').matches) {
      const avg = r.averageRatingText;
      if (avg) avgRatingCounts[avg] = (avgRatingCounts[avg] || 0) + 1;
    }

    // 6. Meal Ratings (Check matching meals under other filters)
    const mealRatingEval = evaluateRestaurantWithMatchingMeals(r, filterState, 'mealRatings');
    if (mealRatingEval.matches) {
      const seenRatings = new Set();
      for (const m of mealRatingEval.matchingMeals) {
        if (m.rating && !seenRatings.has(m.rating)) {
          seenRatings.add(m.rating);
          mealRatingCounts[m.rating] = (mealRatingCounts[m.rating] || 0) + 1;
        }
      }
    }

    // 7. Decades
    const decadeEval = evaluateRestaurantWithMatchingMeals(r, filterState, 'decades');
    if (decadeEval.matches) {
      const seenDecades = new Set();
      for (const m of decadeEval.matchingMeals) {
        const dec = getDecade(m.year);
        if (dec && !seenDecades.has(dec)) {
          seenDecades.add(dec);
          decadeCounts[dec] = (decadeCounts[dec] || 0) + 1;
        }
      }
    }

    // 8. People (Public companions only)
    const peopleEval = evaluateRestaurantWithMatchingMeals(r, filterState, 'people');
    if (peopleEval.matches) {
      const seenPeople = new Set();
      for (const m of peopleEval.matchingMeals) {
        for (const p of m.companions || []) {
          if (p.peopleId && !seenPeople.has(p.peopleId)) {
            seenPeople.add(p.peopleId);
            peopleCounts[p.peopleId] = (peopleCounts[p.peopleId] || 0) + 1;
          }
        }
      }
    }

    // 9. Business & Arsenal
    if (evaluateRestaurantWithMatchingMeals(r, filterState, 'isBusiness').matches) {
      if ((r.meals || []).some((m) => m.isBusiness)) businessCount++;
    }
    if (evaluateRestaurantWithMatchingMeals(r, filterState, 'isArsenalMatch').matches) {
      if ((r.meals || []).some((m) => m.arsenal?.isMatchday)) arsenalCount++;
    }
  }

  return {
    countryCounts,
    cityCounts,
    cuisineCounts,
    visitBandCounts,
    avgRatingCounts,
    mealRatingCounts,
    decadeCounts,
    peopleCounts,
    businessCount,
    arsenalCount,
  };
}

/**
 * Sorts an array of restaurants according to the chosen sort option.
 *
 * Supported options:
 * - 'recent_desc': Most recently visited (default)
 * - 'recent_asc': Oldest most recent visit
 * - 'first_desc': Most recent first visit
 * - 'first_asc': Oldest first visit
 * - 'name_asc': Restaurant A–Z
 * - 'name_desc': Restaurant Z–A
 * - 'visits_desc': Most visited
 * - 'visits_asc': Fewest visited
 * - 'rating_best': Best average rating (1.00 is best, 8.00 is worst)
 * - 'rating_worst': Worst average rating (8.00 is worst, 1.00 is best)
 */
export function sortRestaurants(restaurants, sortOption) {
  if (!Array.isArray(restaurants)) return [];
  const list = [...restaurants];

  switch (sortOption) {
    case 'visits_desc':
    default:
      return list.sort((a, b) => {
        if (b.mealCount !== a.mealCount) return (b.mealCount || 0) - (a.mealCount || 0);
        const timeA = a.latestVisit?.timestamp || 0;
        const timeB = b.latestVisit?.timestamp || 0;
        return timeB - timeA;
      });

    case 'visits_asc':
      return list.sort((a, b) => {
        if (a.mealCount !== b.mealCount) return (a.mealCount || 0) - (b.mealCount || 0);
        const timeA = a.latestVisit?.timestamp || 0;
        const timeB = b.latestVisit?.timestamp || 0;
        return timeA - timeB;
      });

    case 'recent_desc':
      return list.sort((a, b) => {
        const timeA = a.latestVisit?.timestamp || 0;
        const timeB = b.latestVisit?.timestamp || 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.mealCount || 0) - (a.mealCount || 0);
      });
      return list.sort((a, b) => {
        if (a.mealCount !== b.mealCount) return (a.mealCount || 0) - (b.mealCount || 0);
        const timeA = a.latestVisit?.timestamp || 0;
        const timeB = b.latestVisit?.timestamp || 0;
        return timeA - timeB;
      });

    case 'rating_best':
      return list.sort((a, b) => {
        const rA = a.averageRatingNumeric !== null ? a.averageRatingNumeric : 999;
        const rB = b.averageRatingNumeric !== null ? b.averageRatingNumeric : 999;
        if (rA !== rB) return rA - rB; // Lower ID (1) is best
        return (b.mealCount || 0) - (a.mealCount || 0);
      });

    case 'rating_worst':
      return list.sort((a, b) => {
        const rA = a.averageRatingNumeric !== null ? a.averageRatingNumeric : -999;
        const rB = b.averageRatingNumeric !== null ? b.averageRatingNumeric : -999;
        if (rB !== rA) return rB - rA; // Higher ID (8) is worst
        return (b.mealCount || 0) - (a.mealCount || 0);
      });
  }
}
