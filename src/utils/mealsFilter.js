/**
 * Pure filtering, dynamic faceting, and sorting engine for the Meals dataset.
 */

export function stripAccents(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

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
  restaurantId: null,
  restaurantName: '',
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
  if (filterState.restaurantId) count++;
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
  // 1. Search (matches restaurant, comment, city, country, or dish metadata - accent-insensitive)
  if (excludeFacetKey !== 'search' && filterState.search && filterState.search.trim()) {
    const q = stripAccents(filterState.search.trim());
    const restName = stripAccents(meal.restaurant?.name || '');
    const comment = stripAccents(meal.comment || '');
    const city = stripAccents(meal.restaurant?.city?.name || '');
    const country = stripAccents(meal.restaurant?.city?.country?.name || '');

    let matchDish = false;
    if (meal.mains && meal.mains.length > 0) {
      for (const m of meal.mains) {
        const dishName = stripAccents(m.food?.name || '');
        const ingName = stripAccents(m.food?.ingredient?.name || '');
        const style = stripAccents(m.food?.foodType?.name || '');
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

  // 1b. Specific Restaurant Filter (Exact Match)
  if (excludeFacetKey !== 'restaurantId' && filterState.restaurantId) {
    if (meal.restaurant?.id !== filterState.restaurantId) {
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

/**
 * Normalizes text to a clean URL slug (e.g. 'Lisbon' -> 'lisbon', 'Lou Holland' -> 'lou-holland').
 */
export function slugify(text) {
  if (!text) return '';
  return stripAccents(String(text).trim())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds a shareable Chronicle URL using the Hybrid strategy:
 * - Single clean criterion: /chronicle/lisbon or /chronicle/france
 * - Multiple or complex criteria: /chronicle?city=Lisbon&rating=Exceptional
 * - Full origin included if provided (e.g. https://meals.stevieholland.co.uk)
 */
export function buildChronicleShareUrl(filterState = {}, origin = '') {
  if (!filterState) return `${origin}/chronicle`;

  // Analyze active criteria
  const activeEntries = [];

  const search = (filterState.search || '').trim();
  if (search) activeEntries.push({ key: 'search', count: 1, val: search });

  const cities = (filterState.cities || []).filter(Boolean);
  if (cities.length) activeEntries.push({ key: 'cities', count: cities.length, val: cities });

  const countries = (filterState.countries || []).filter(Boolean);
  if (countries.length) activeEntries.push({ key: 'countries', count: countries.length, val: countries });

  const cuisines = (filterState.cuisines || []).filter(Boolean);
  if (cuisines.length) activeEntries.push({ key: 'cuisines', count: cuisines.length, val: cuisines });

  const people = (filterState.people || []).filter(Boolean);
  if (people.length) activeEntries.push({ key: 'people', count: people.length, val: people });

  const ratings = (filterState.ratings || []).filter(Boolean);
  if (ratings.length) activeEntries.push({ key: 'ratings', count: ratings.length, val: ratings });

  const decades = (filterState.decades || []).filter(Boolean);
  if (decades.length) activeEntries.push({ key: 'decades', count: decades.length, val: decades });

  if (filterState.hasPhoto) activeEntries.push({ key: 'hasPhoto', count: 1, val: true });
  if (filterState.isBusiness) activeEntries.push({ key: 'isBusiness', count: 1, val: true });
  if (filterState.isArsenalMatch) activeEntries.push({ key: 'isArsenalMatch', count: 1, val: true });

  const restName = filterState.restaurantName || '';
  if (restName) activeEntries.push({ key: 'restaurant', count: 1, val: restName });

  // 1. Zero active filters -> simple /chronicle
  if (activeEntries.length === 0) {
    return `${origin}/chronicle`;
  }

  // 2. Exactly one active filter with single item -> clean slug
  if (activeEntries.length === 1 && activeEntries[0].count === 1) {
    const single = activeEntries[0];
    let slug = '';
    if (single.key === 'cities') slug = slugify(single.val[0]);
    else if (single.key === 'countries') slug = slugify(single.val[0]);
    else if (single.key === 'cuisines') slug = slugify(single.val[0]);
    else if (single.key === 'people') slug = slugify(single.val[0]);
    else if (single.key === 'ratings') slug = slugify(single.val[0]);
    else if (single.key === 'decades') slug = single.val[0];
    else if (single.key === 'search') slug = slugify(single.val);

    if (slug) {
      return `${origin}/chronicle/${slug}`;
    }
  }

  // 3. Multi-criteria or multi-value -> Query parameters
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (cities.length) params.set('city', cities.join(','));
  if (countries.length) params.set('country', countries.join(','));
  if (cuisines.length) params.set('cuisine', cuisines.join(','));
  if (people.length) params.set('people', people.join(','));
  if (ratings.length) params.set('rating', ratings.join(','));
  if (decades.length) params.set('decade', decades.join(','));
  if (filterState.hasPhoto) params.set('photos', '1');
  if (filterState.isBusiness) params.set('business', '1');
  if (filterState.isArsenalMatch) params.set('arsenal', '1');
  if (restName) params.set('restaurant', restName);

  const query = params.toString();
  return `${origin}/chronicle${query ? `?${query}` : ''}`;
}

/**
 * Resolves a clean slug (e.g. 'lisbon', 'france', 'lou-holland')
 * against the dataset into the corresponding filter field.
 */
export function resolveChronicleSlug(slug, mealsData = null) {
  if (!slug) return null;
  const clean = slugify(slug);
  if (!clean) return null;

  // 1. Check for decade e.g. 2020s, 2010s
  if (/^\d{4}s$/.test(clean)) {
    return { key: 'decades', value: [clean] };
  }

  // 2. Check canonical ratings
  const matchedRating = CANONICAL_RATINGS.find((r) => slugify(r) === clean);
  if (matchedRating) {
    return { key: 'ratings', value: [matchedRating] };
  }

  // 3. Check against dataset if available
  if (mealsData) {
    // Check cities
    if (mealsData.citiesById) {
      for (const city of mealsData.citiesById.values()) {
        if (city?.name && slugify(city.name) === clean) {
          return { key: 'cities', value: [city.name] };
        }
      }
    } else if (Array.isArray(mealsData.meals)) {
      for (const m of mealsData.meals) {
        const cName = m.restaurant?.city?.name;
        if (cName && slugify(cName) === clean) {
          return { key: 'cities', value: [cName] };
        }
      }
    }

    // Check countries
    if (mealsData.countriesById) {
      for (const country of mealsData.countriesById.values()) {
        if (country?.name && slugify(country.name) === clean) {
          return { key: 'countries', value: [country.name] };
        }
      }
    } else if (Array.isArray(mealsData.meals)) {
      for (const m of mealsData.meals) {
        const cName = m.restaurant?.city?.country?.name;
        if (cName && slugify(cName) === clean) {
          return { key: 'countries', value: [cName] };
        }
      }
    }

    // Check cuisines / restaurant types
    if (mealsData.typesById) {
      for (const t of mealsData.typesById.values()) {
        const group = t?.typeGroup || t?.name;
        if (group && slugify(group) === clean) {
          return { key: 'cuisines', value: [group] };
        }
      }
    } else if (Array.isArray(mealsData.meals)) {
      for (const m of mealsData.meals) {
        const tName = m.restaurant?.type?.typeGroup || m.restaurant?.type?.name;
        if (tName && slugify(tName) === clean) {
          return { key: 'cuisines', value: [tName] };
        }
      }
    }

    // Check people
    if (Array.isArray(mealsData.meals)) {
      for (const m of mealsData.meals) {
        if (m.companions && m.companions.length > 0) {
          for (const c of m.companions) {
            const pName = c.publicName || c.name;
            if (pName && slugify(pName) === clean) {
              return { key: 'people', value: [pName] };
            }
          }
        }
      }
    }
  }

  // 4. Default / Fallback: text search query
  return { key: 'search', value: clean.replace(/-/g, ' ') };
}

/**
 * Parses both the pathname slug and/or search query parameters into a partial filter state.
 */
export function parseChronicleUrl(pathname = '', search = '', mealsData = null) {
  const result = {};

  // 1. Parse query parameters
  if (search) {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const q = params.get('q') || params.get('search');
    if (q) result.search = q.trim();

    const cityParam = params.get('city') || params.get('cities');
    if (cityParam) result.cities = cityParam.split(',').map((s) => s.trim()).filter(Boolean);

    const countryParam = params.get('country') || params.get('countries');
    if (countryParam) result.countries = countryParam.split(',').map((s) => s.trim()).filter(Boolean);

    const cuisineParam = params.get('cuisine') || params.get('cuisines') || params.get('type') || params.get('types');
    if (cuisineParam) result.cuisines = cuisineParam.split(',').map((s) => s.trim()).filter(Boolean);

    const peopleParam = params.get('people') || params.get('person');
    if (peopleParam) result.people = peopleParam.split(',').map((s) => s.trim()).filter(Boolean);

    const ratingParam = params.get('rating') || params.get('ratings');
    if (ratingParam) result.ratings = ratingParam.split(',').map((s) => s.trim()).filter(Boolean);

    const decadeParam = params.get('decade') || params.get('decades');
    if (decadeParam) result.decades = decadeParam.split(',').map((s) => s.trim()).filter(Boolean);

    const restParam = params.get('restaurant');
    if (restParam) {
      const restId = parseInt(restParam, 10);
      if (!isNaN(restId)) result.restaurantId = restId;
      else result.restaurantName = restParam;
    }

    if (params.get('photos') === '1' || params.get('withPhotos') === 'true' || params.get('hasPhoto') === 'true') {
      result.hasPhoto = true;
    }
    if (params.get('business') === '1' || params.get('isBusiness') === 'true') {
      result.isBusiness = true;
    }
    if (params.get('arsenal') === '1' || params.get('isArsenalMatch') === 'true') {
      result.isArsenalMatch = true;
    }
  }

  // 2. Parse path slug (e.g. /chronicle/lisbon)
  if (pathname && pathname.includes('/chronicle/')) {
    const segments = pathname.replace(/^.*\/chronicle\//, '').split('/');
    const slug = segments[0] ? decodeURIComponent(segments[0]).trim() : '';
    if (slug) {
      const resolved = resolveChronicleSlug(slug, mealsData);
      if (resolved) {
        if (Array.isArray(resolved.value)) {
          result[resolved.key] = [...(result[resolved.key] || []), ...resolved.value];
        } else {
          result[resolved.key] = resolved.value;
        }
      }
    }
  }

  return result;
}
