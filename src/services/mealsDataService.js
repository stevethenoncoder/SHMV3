import { fetchCsvFeed, clearCsvCache } from '../data/fetchFeeds.js';
import { RATING_RANK } from '../utils/mealsFilter.js';

const BASE_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS5zY2-4h1TBiHM1bgJ4NiFiBgngiFNAozE-NWNStZOmSW8BT7UuYBBut9WhpJeKutRaUk3DkDZFNlH/pub?output=csv&gid=';

export const MEALS_FEED_URLS = {
  Meals: `${BASE_URL}489348868`,
  Rest: `${BASE_URL}0`,
  City: `${BASE_URL}763089517`,
  Country: `${BASE_URL}172877059`,
  Type: `${BASE_URL}61815367`,
  Meals_Main: `${BASE_URL}786291206`,
  Food: `${BASE_URL}377846928`,
  Ingredient: `${BASE_URL}1459651357`,
  FoodType: `${BASE_URL}1922827128`,
  FoodCat: `${BASE_URL}249100290`,
  Meals_Photo: `${BASE_URL}153241932`,
  Meals_People: `${BASE_URL}668079142`,
  People_Public: `${BASE_URL}2108210132`,
  RatingMeal: `${BASE_URL}1413438668`,
};

const INVALID_GNAME_LITERALS = new Set(['no results found', 'not looked up']);

/**
 * Concurrently fetches an array of feed URLs with a bounded concurrency pool
 * so we do not exceed browser connection limits to Google Docs.
 */
async function fetchFeedsWithConcurrency(urls, concurrency = 4, bypassCache = false) {
  const results = new Array(urls.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (nextIndex < urls.length) {
      const idx = nextIndex++;
      results[idx] = await fetchCsvFeed(urls[idx], { bypassCache });
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Loads all 11 required Meals worksheets with bounded concurrency,
 * cleans formula spill rows, normalises data types,
 * constructs efficient ID lookups, and assembles enriched Meal objects.
 *
 * @param {Object} [options]
 * @param {boolean} [options.bypassCache=false]
 * @returns {Promise<{
 *   meals: Array<Object>,
 *   mealsById: Map<number, Object>,
 *   restaurantsById: Map<number, Object>,
 *   citiesById: Map<number, Object>,
 *   countriesById: Map<number, Object>,
 *   counts: Object
 * }>}
 */
export async function loadMealsData(options = {}) {
  const { bypassCache = false } = options;
  if (bypassCache) {
    clearCsvCache();
  }

  const feedUrlList = [
    MEALS_FEED_URLS.Meals,
    MEALS_FEED_URLS.Rest,
    MEALS_FEED_URLS.City,
    MEALS_FEED_URLS.Country,
    MEALS_FEED_URLS.Type,
    MEALS_FEED_URLS.Meals_Main,
    MEALS_FEED_URLS.Food,
    MEALS_FEED_URLS.Ingredient,
    MEALS_FEED_URLS.FoodType,
    MEALS_FEED_URLS.FoodCat,
    MEALS_FEED_URLS.Meals_Photo,
    MEALS_FEED_URLS.Meals_People,
    MEALS_FEED_URLS.People_Public,
    MEALS_FEED_URLS.RatingMeal,
  ];

  const [
    rawMeals,
    rawRest,
    rawCity,
    rawCountry,
    rawType,
    rawMain,
    rawFood,
    rawIngredient,
    rawFoodType,
    rawFoodCat,
    rawPhoto,
    rawMealsPeople,
    rawPeoplePublic,
    rawRatingMeal,
  ] = await fetchFeedsWithConcurrency(feedUrlList, 4, bypassCache);

  // 1. Countries Lookup
  const countriesById = new Map();
  for (const row of rawCountry) {
    const id = parseInt(row.Country_ID, 10);
    if (!isNaN(id)) {
      countriesById.set(id, {
        id,
        name: row.Country_Text?.trim() || '',
        latitude: parseFloat(row.CountryLong) || null,
        longitude: parseFloat(row.CountryLang) || null,
        isoCode: row.ISOCode?.trim() || '',
      });
    }
  }

  // 2. Cities Lookup
  const citiesById = new Map();
  for (const row of rawCity) {
    const id = parseInt(row.City_ID, 10);
    if (!isNaN(id)) {
      const countryId = parseInt(row.Country_ID, 10);
      const country = countriesById.get(countryId) || null;
      citiesById.set(id, {
        id,
        name: row.City_Text?.trim() || '',
        countryId,
        country,
      });
    }
  }

  // 3. Restaurant Types Lookup
  const restaurantTypesById = new Map();
  for (const row of rawType) {
    const id = parseInt(row.Type_ID, 10);
    if (!isNaN(id)) {
      restaurantTypesById.set(id, {
        id,
        name: row.Type?.trim() || '',
        typeIcon: row.TypeIcon?.trim() || row.typeIcon?.trim() || null,
        typeGroup: row.TypeGroup?.trim() || null,
      });
    }
  }

  // 4. Food Types (styles) Lookup
  const foodTypesById = new Map();
  for (const row of rawFoodType) {
    const id = parseInt(row.Food_Type_ID, 10);
    if (!isNaN(id)) {
      foodTypesById.set(id, {
        id,
        name: row.FoodType?.trim() || '',
      });
    }
  }

  // 5. Ingredients Lookup
  const ingredientsById = new Map();
  for (const row of rawIngredient) {
    const id = parseInt(row.Ingredient_ID, 10);
    if (!isNaN(id)) {
      ingredientsById.set(id, {
        id,
        name: row.Food_Ingredient?.trim() || '',
        category: row.Ingredient_Category?.trim() || '',
      });
    }
  }

  // 6. Food Master Lookup
  const foodsById = new Map();
  for (const row of rawFood) {
    const id = parseInt(row.Food_ID, 10);
    if (!isNaN(id)) {
      const ingId = parseInt(row.Ingredient_ID, 10);
      const ftId = parseInt(row.Food_Type_ID, 10);
      foodsById.set(id, {
        id,
        name: row.Food_Text?.trim() || '',
        category: row.Food_Category?.trim() || '',
        ingredient: ingredientsById.get(ingId) || null,
        foodType: foodTypesById.get(ftId) || null,
      });
    }
  }

  // 7. Restaurants Lookup (Dropping 776 trailing formula/empty rows)
  const restaurantsById = new Map();
  for (const row of rawRest) {
    if (!row.Rest_ID || row.Rest_ID.trim() === '') continue;
    const id = parseInt(row.Rest_ID, 10);
    if (isNaN(id)) continue;

    const cityId = parseInt(row.City_ID, 10);
    const typeId = parseInt(row.Type_ID, 10);

    const lat = parseFloat(row['Rest X Cords']);
    const lng = parseFloat(row['Rest Y Cords']);

    let googleName = row.GName2?.trim() || null;
    if (googleName) {
      const lower = googleName.toLowerCase();
      if (INVALID_GNAME_LITERALS.has(lower) || lower.startsWith('error occurred:')) {
        googleName = null;
      }
    }

    const googleRating = parseFloat(row.GRating2);
    const website =
      row.GURL2 && row.GURL2.trim().startsWith('http') ? row.GURL2.trim() : null;
    const mapUrl =
      row.GMap2 && row.GMap2.trim().startsWith('http') ? row.GMap2.trim() : null;

    restaurantsById.set(id, {
      id,
      name: row.Rest_Name?.trim() || 'Unnamed Restaurant',
      address: row.Rest_Address?.trim() || null,
      city: citiesById.get(cityId) || null,
      type: restaurantTypesById.get(typeId) || null,
      typeIcon: restaurantTypesById.get(typeId)?.typeIcon || null,
      latitude: !isNaN(lat) ? lat : null,
      longitude: !isNaN(lng) ? lng : null,
      googleName,
      googleType: row.GType2?.trim() || null,
      googleAddress: row.GAddress2?.trim() || null,
      googleRating: !isNaN(googleRating) && googleRating > 0 ? googleRating : null,
      website,
      mapUrl,
    });
  }

  // 8. Main Dish Occurrences by Meal_ID
  const mainDishesByMealId = new Map();
  let totalMainsLoaded = 0;
  let resolvedFoodsCount = 0;
  let unresolvedFoodsCount = 0;

  for (const row of rawMain) {
    if (!row.Meals_Main_ID) continue;
    const id = parseInt(row.Meals_Main_ID, 10);
    const mealId = parseInt(row.Meal_ID, 10);
    const foodId = parseInt(row.Food_ID, 10);
    if (isNaN(id) || isNaN(mealId)) continue;

    totalMainsLoaded++;
    const food = foodsById.get(foodId) || null;
    if (food) {
      resolvedFoodsCount++;
    } else {
      unresolvedFoodsCount++;
    }

    const dish = {
      id,
      mealId,
      rating: row.Main_Rating?.trim() || null,
      comment: row.Comment?.trim() || null,
      food,
    };

    if (!mainDishesByMealId.has(mealId)) {
      mainDishesByMealId.set(mealId, []);
    }
    mainDishesByMealId.get(mealId).push(dish);
  }

  // 9. Photos by Meal_ID (Filtering 201 formula spill rows ending in "/.jpg")
  const photosByMealId = new Map();
  let totalValidPhotos = 0;

  for (const row of rawPhoto) {
    if (!row.Photo_ID || !row.Meal_ID || !row.PhotoName) continue;
    const id = parseInt(row.Photo_ID, 10);
    const mealId = parseInt(row.Meal_ID, 10);
    const photoName = row.PhotoName.trim();
    const photoUrl = row.Photo?.trim() || '';

    if (isNaN(id) || isNaN(mealId) || !photoName || photoUrl.endsWith('/.jpg')) continue;

    totalValidPhotos++;
    const photo = {
      id,
      mealId,
      url: photoUrl,
      comment: row.Photo_Comment?.trim() || null,
      name: photoName,
    };

    if (!photosByMealId.has(mealId)) {
      photosByMealId.set(mealId, []);
    }
    photosByMealId.get(mealId).push(photo);
  }

  // 10. Public People Lookup (Strict Privacy Enforcement)
  // Only records where Public? === 'Y', Public_Name is non-blank and not "Hidden name"
  const publicPeopleById = new Map();
  for (const row of rawPeoplePublic) {
    const id = parseInt(row.People_ID, 10);
    // Row filtering: ignore trailing empty template rows (People_ID > 1009)
    if (isNaN(id) || id > 1009) continue;

    const isPublic = (row['Public?'] || '').trim().toUpperCase() === 'Y';
    const publicName = (row.Public_Name || '').trim();

    // Must never fall back to raw People table; must never expose "Hidden name"
    if (isPublic && publicName && publicName.toLowerCase() !== 'hidden name') {
      publicPeopleById.set(id, {
        peopleId: id,
        publicName,
      });
    }
  }

  // 11. Meals_People Junction (Deduplicating runtime (Meal_ID, People_ID) pairs)
  const publicCompanionsByMealId = new Map();
  const seenMealPeoplePairs = new Set();
  let totalMealsPeopleLoaded = 0;
  let duplicateRelationshipsRemoved = 0;
  let totalPublicRelationships = 0;

  for (const row of rawMealsPeople) {
    if (!row.Meal_ID || !row.People_ID) continue;
    const mealId = parseInt(row.Meal_ID, 10);
    const peopleId = parseInt(row.People_ID, 10);
    if (isNaN(mealId) || isNaN(peopleId)) continue;

    totalMealsPeopleLoaded++;
    const pairKey = `${mealId}_${peopleId}`;
    if (seenMealPeoplePairs.has(pairKey)) {
      duplicateRelationshipsRemoved++;
      continue;
    }
    seenMealPeoplePairs.add(pairKey);

    const publicPerson = publicPeopleById.get(peopleId);
    if (publicPerson) {
      totalPublicRelationships++;
      if (!publicCompanionsByMealId.has(mealId)) {
        publicCompanionsByMealId.set(mealId, []);
      }
      publicCompanionsByMealId.get(mealId).push({
        peopleId: publicPerson.peopleId,
        publicName: publicPerson.publicName,
      });
    }
  }

  // 11. RatingMeal Lookup (Canonical Meal Ratings 1-8)
  const ratingMealById = new Map();
  const ratingMealByText = new Map();
  for (const row of rawRatingMeal) {
    const id = parseInt(row.Rating_Meal_ID, 10);
    const text = row.Rating_Meal_Text?.trim();
    if (!isNaN(id) && text) {
      const entry = { id, text };
      ratingMealById.set(id, entry);
      ratingMealByText.set(text.toLowerCase(), entry);
    }
  }

  // 12. Enriched Meals
  const enrichedMeals = [];
  const mealsById = new Map();
  let resolvedRestCount = 0;
  let unresolvedRestCount = 0;
  let mealsWithPhotosCount = 0;

  for (const row of rawMeals) {
    if (!row.Meal_ID) continue;
    const id = parseInt(row.Meal_ID, 10);
    if (isNaN(id)) continue;

    const restId = parseInt(row.Rest_ID, 10);
    const restaurant = restaurantsById.get(restId) || null;
    if (restaurant) {
      resolvedRestCount++;
    } else {
      unresolvedRestCount++;
    }

    // Normalise Date DD/MM/YYYY
    let isoDate = null;
    let formattedDate = row.Date_Visited?.trim() || '';
    let timestamp = 0;
    if (row.Date_Visited) {
      const parts = row.Date_Visited.trim().split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) {
          timestamp = dt.getTime();
          isoDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          formattedDate = dt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
      }
    }

    // Normalise GBP Value
    let valueGBP = null;
    if (row.Meal_Value) {
      const cleanStr = row.Meal_Value.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleanStr);
      if (!isNaN(num)) valueGBP = num;
    }

    // Normalise Boolean-like Fields
    const businessStr = (row.Business || '').trim().toLowerCase();
    const isBusiness = businessStr === 'yes' || businessStr === 'true';

    // Normalise Arsenal Match Metadata
    const afcGameStr = (row.AFC_Game || '').trim().toLowerCase();
    const isArsenalMatch = afcGameStr === 'yes' || afcGameStr === 'true';
    let arsenal = null;
    if (isArsenalMatch) {
      const aScore = parseFloat(row.AFC_Score);
      const opScore = parseFloat(row.AFC_Op_Score);
      arsenal = {
        isMatchday: true,
        opponent: row.AFC_Opponent?.trim() || null,
        arsenalScore: !isNaN(aScore) ? aScore : null,
        opponentScore: !isNaN(opScore) ? opScore : null,
        comment: row.AFC_Comment?.trim() || null,
      };
    }

    const mains = mainDishesByMealId.get(id) || [];
    const photos = photosByMealId.get(id) || [];
    const companions = publicCompanionsByMealId.get(id) || [];
    if (photos.length > 0) mealsWithPhotosCount++;

    const ratingText = row.Meal_Rating?.trim() || 'Unrated';
    const ratingEntry = ratingMealByText.get(ratingText.toLowerCase()) || null;
    const ratingId = ratingEntry ? ratingEntry.id : null;

    const meal = {
      id,
      date: isoDate,
      formattedDate,
      timestamp,
      year: parseInt(row.Year, 10) || (isoDate ? parseInt(isoDate.slice(0, 4), 10) : null),
      rating: ratingText,
      ratingId,
      valueGBP,
      comment: row.Comment?.trim() || null,
      sentiment: row.Sentiment?.trim() || null,
      sentimentCategory: row.Sentiment_High?.trim() || null,
      isBusiness,
      arsenal,
      restaurant,
      typeIcon: restaurant?.type?.typeIcon || null,
      mains,
      photos,
      hasPhoto: photos.length > 0,
      companions,
    };

    enrichedMeals.push(meal);
    mealsById.set(id, meal);
  }

  // Default ordering: newest first
  enrichedMeals.sort((a, b) => b.timestamp - a.timestamp);

  // 13. Enrich Restaurants with Dining History
  const mealsByRestaurantId = new Map();
  for (const meal of enrichedMeals) {
    if (meal.restaurant && meal.restaurant.id) {
      const restId = meal.restaurant.id;
      if (!mealsByRestaurantId.has(restId)) {
        mealsByRestaurantId.set(restId, []);
      }
      mealsByRestaurantId.get(restId).push(meal);
    }
  }

  const enrichedRestaurants = [];
  let restaurantsWithMealsCount = 0;
  let zeroMealRestaurantsCount = 0;
  let repeatVisitRestaurantsCount = 0;
  let maxVisitsRecorded = 0;
  let maxVisitedRestaurant = null;

  for (const [restId, rest] of restaurantsById.entries()) {
    const rMeals = mealsByRestaurantId.get(restId) || [];
    const mealCount = rMeals.length;

    if (mealCount > 0) {
      restaurantsWithMealsCount++;
      if (mealCount > 1) repeatVisitRestaurantsCount++;
      if (mealCount > maxVisitsRecorded) {
        maxVisitsRecorded = mealCount;
        maxVisitedRestaurant = { id: restId, name: rest.name, count: mealCount };
      }
    } else {
      zeroMealRestaurantsCount++;
    }

    // Sort visits chronologically newest first (rMeals from enrichedMeals is already newest first)
    const latestMeal = rMeals[0] || null;
    const firstMeal = rMeals[rMeals.length - 1] || null;

    const yearsSet = new Set();
    const ratingDistribution = {};
    const photosList = [];
    const mainDishesMap = new Map();

    for (const m of rMeals) {
      if (m.year) yearsSet.add(m.year);

      if (m.rating && m.rating !== 'Unrated') {
        ratingDistribution[m.rating] = (ratingDistribution[m.rating] || 0) + 1;
      }

      for (const p of m.photos || []) {
        photosList.push({
          ...p,
          mealId: m.id,
          mealDate: m.formattedDate,
          mealRating: m.rating,
        });
      }

      for (const d of m.mains || []) {
        const dishName = d.food?.name;
        if (dishName) {
          if (!mainDishesMap.has(dishName)) {
            mainDishesMap.set(dishName, {
              name: dishName,
              count: 0,
              latestRating: d.rating,
              category: d.food?.category || null,
              ingredient: d.food?.ingredient?.name || null,
              style: d.food?.foodType?.name || null,
            });
          }
          const dishRecord = mainDishesMap.get(dishName);
          dishRecord.count++;
          if (d.rating) dishRecord.latestRating = d.rating;
        }
      }
    }

    const yearsVisited = Array.from(yearsSet).sort((a, b) => a - b);
    const mainDishes = Array.from(mainDishesMap.values()).sort((a, b) => b.count - a.count);

    // Primary photo: valid photo from the most recent photographed meal at this restaurant
    let primaryPhoto = null;
    for (const m of rMeals) {
      if (m.photos && m.photos.length > 0) {
        primaryPhoto = m.photos[0];
        break;
      }
    }

    // Determine highest / best rating achieved at this venue
    let bestRating = null;
    let bestRatingRank = -999;
    for (const rating of Object.keys(ratingDistribution)) {
      const rank = RATING_RANK[rating.toLowerCase()] ?? -10;
      if (rank > bestRatingRank) {
        bestRatingRank = rank;
        bestRating = rating;
      }
    }

    // Calculate derived Restaurant Average Rating using published RatingMeal lookup
    let ratingSum = 0;
    let ratedMealCount = 0;
    for (const m of rMeals) {
      if (m.ratingId) {
        ratingSum += m.ratingId;
        ratedMealCount++;
      }
    }
    const averageRatingNumeric = ratedMealCount > 0 ? ratingSum / ratedMealCount : null;
    let averageRatingText = null;
    if (averageRatingNumeric !== null) {
      const roundedId = Math.min(8, Math.max(1, Math.round(averageRatingNumeric)));
      averageRatingText = ratingMealById.get(roundedId)?.text || null;
    }

    // Attach derived personal dining history
    rest.meals = rMeals;
    rest.mealCount = mealCount;
    rest.ratedMealCount = ratedMealCount;
    rest.averageRatingNumeric = averageRatingNumeric;
    rest.averageRatingText = averageRatingText;
    rest.firstVisit = firstMeal
      ? {
          date: firstMeal.date,
          formattedDate: firstMeal.formattedDate,
          year: firstMeal.year,
          timestamp: firstMeal.timestamp,
        }
      : null;
    rest.latestVisit = latestMeal
      ? {
          date: latestMeal.date,
          formattedDate: latestMeal.formattedDate,
          year: latestMeal.year,
          timestamp: latestMeal.timestamp,
        }
      : null;
    rest.yearsVisited = yearsVisited;
    rest.yearSpan =
      yearsVisited.length > 0
        ? yearsVisited.length === 1
          ? `${yearsVisited[0]}`
          : `${yearsVisited[0]} – ${yearsVisited[yearsVisited.length - 1]}`
        : null;
    rest.ratingDistribution = ratingDistribution;
    rest.bestRating = bestRating;
    rest.latestRating = latestMeal?.rating || null;
    rest.primaryPhoto = primaryPhoto;
    rest.photos = photosList;
    rest.mainDishes = mainDishes;

    // Public browse includes restaurants with actual dining history
    if (mealCount > 0) {
      enrichedRestaurants.push(rest);
    }
  }

  // Default discovery order: most recently visited first
  enrichedRestaurants.sort((a, b) => {
    const timeA = a.latestVisit?.timestamp || 0;
    const timeB = b.latestVisit?.timestamp || 0;
    return timeB - timeA;
  });

  return {
    meals: enrichedMeals,
    mealsById,
    restaurants: enrichedRestaurants,
    restaurantsById,
    citiesById,
    countriesById,
    publicPeopleById,
    ratingMealById,
    ratingMealByText,
    counts: {
      totalMeals: enrichedMeals.length,
      resolvedRestaurants: resolvedRestCount,
      unresolvedRestaurants: unresolvedRestCount,
      totalRestaurants: restaurantsById.size,
      totalRestaurantsWithMeals: enrichedRestaurants.length,
      zeroMealRestaurants: zeroMealRestaurantsCount,
      repeatVisitRestaurants: repeatVisitRestaurantsCount,
      maxVisitsRecorded,
      maxVisitedRestaurant,
      totalMains: totalMainsLoaded,
      resolvedFoods: resolvedFoodsCount,
      unresolvedFoods: unresolvedFoodsCount,
      totalValidPhotos,
      mealsWithPhotos: mealsWithPhotosCount,
      mealsWithoutPhotos: enrichedMeals.length - mealsWithPhotosCount,
      totalSelectablePeople: publicPeopleById.size,
      totalMealsPeopleLoaded,
      duplicateRelationshipsRemoved,
      totalPublicRelationships,
    },
  };
}
