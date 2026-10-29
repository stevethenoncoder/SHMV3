import fs from 'fs';
import Papa from 'papaparse';
import {
  DEFAULT_RESTAURANTS_FILTER_STATE,
  filterRestaurants,
  computeRestaurantFacetCounts,
  sortRestaurants,
  getVisitBand,
} from '../src/utils/restaurantsFilter.js';
import { RATING_RANK } from '../src/utils/mealsFilter.js';

function loadLocalCsv(filename) {
  const text = fs.readFileSync('sheets_csv/' + filename, 'utf-8');
  return Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  }).data;
}

const rawRest = loadLocalCsv('Rest_0.csv');
const rawMeals = loadLocalCsv('Meals_489348868.csv');
const rawCity = loadLocalCsv('City_763089517.csv');
const rawCountry = loadLocalCsv('Country_172877059.csv');
const rawType = loadLocalCsv('Type_61815367.csv');
const rawMain = loadLocalCsv('Meals_Main_786291206.csv');
const rawPhoto = loadLocalCsv('Meals_Photo_153241932.csv');

// Reference lookups
const countriesById = new Map();
rawCountry.forEach((c) => {
  const id = parseInt(c.Country_ID, 10);
  if (!isNaN(id)) countriesById.set(id, { id, name: c.Country_Text?.trim() });
});

const citiesById = new Map();
rawCity.forEach((c) => {
  const id = parseInt(c.City_ID, 10);
  if (!isNaN(id)) {
    const countryId = parseInt(c.Country_ID, 10);
    citiesById.set(id, { id, name: c.City_Text?.trim(), country: countriesById.get(countryId) });
  }
});

const typesById = new Map();
rawType.forEach((t) => {
  const id = parseInt(t.Type_ID, 10);
  if (!isNaN(id)) typesById.set(id, { id, name: t.Type?.trim() });
});

// Meals by Rest_ID
const photosByMealId = new Map();
rawPhoto.forEach((p) => {
  const mId = parseInt(p.Meal_ID, 10);
  const photoName = p.PhotoName?.trim();
  const url = p.Photo?.trim() || '';
  if (!isNaN(mId) && photoName && !url.endsWith('/.jpg')) {
    if (!photosByMealId.has(mId)) photosByMealId.set(mId, []);
    photosByMealId.get(mId).push({ id: parseInt(p.Photo_ID, 10), url, comment: p.Photo_Comment?.trim() });
  }
});

const mainsByMealId = new Map();
rawMain.forEach((m) => {
  const mId = parseInt(m.Meal_ID, 10);
  if (!isNaN(mId)) {
    if (!mainsByMealId.has(mId)) mainsByMealId.set(mId, []);
    mainsByMealId.get(mId).push({ id: parseInt(m.Meals_Main_ID, 10), rating: m.Main_Rating?.trim() });
  }
});

const mealsByRestId = new Map();
rawMeals.forEach((m) => {
  const restId = parseInt(m.Rest_ID, 10);
  const mealId = parseInt(m.Meal_ID, 10);
  if (isNaN(restId) || isNaN(mealId)) return;

  let timestamp = 0;
  let formattedDate = m.Date_Visited?.trim();
  if (m.Date_Visited) {
    const parts = m.Date_Visited.trim().split('/');
    if (parts.length === 3) {
      const dt = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(dt.getTime())) timestamp = dt.getTime();
    }
  }

  const mealObj = {
    id: mealId,
    timestamp,
    formattedDate,
    year: parseInt(m.Year, 10) || null,
    rating: m.Meal_Rating?.trim() || 'Unrated',
    comment: m.Comment?.trim() || null,
    photos: photosByMealId.get(mealId) || [],
    mains: mainsByMealId.get(mealId) || [],
  };

  if (!mealsByRestId.has(restId)) mealsByRestId.set(restId, []);
  mealsByRestId.get(restId).push(mealObj);
});

// Build and enrich restaurants
const restaurants = [];
const restaurantsById = new Map();

for (const row of rawRest) {
  if (!row.Rest_ID || !row.Rest_ID.trim()) continue;
  const id = parseInt(row.Rest_ID, 10);
  if (isNaN(id)) continue;

  const cityId = parseInt(row.City_ID, 10);
  const typeId = parseInt(row.Type_ID, 10);

  const rMeals = mealsByRestId.get(id) || [];
  rMeals.sort((a, b) => b.timestamp - a.timestamp);

  const yearsSet = new Set();
  const ratingDistribution = {};
  const photosList = [];

  for (const m of rMeals) {
    if (m.year) yearsSet.add(m.year);
    if (m.rating && m.rating !== 'Unrated') {
      ratingDistribution[m.rating] = (ratingDistribution[m.rating] || 0) + 1;
    }
    for (const p of m.photos) {
      photosList.push(p);
    }
  }

  const gRating = parseFloat(row.GRating2);
  const rest = {
    id,
    name: row.Rest_Name?.trim(),
    address: row.Rest_Address?.trim() || null,
    city: citiesById.get(cityId) || null,
    type: typesById.get(typeId) || null,
    latitude: parseFloat(row['Rest X Cords']) || null,
    longitude: parseFloat(row['Rest Y Cords']) || null,
    googleRating: !isNaN(gRating) && gRating > 0 ? gRating : null,
    website: row.GURL2 && row.GURL2.trim().startsWith('http') ? row.GURL2.trim() : null,
    mapUrl: row.GMap2 && row.GMap2.trim().startsWith('http') ? row.GMap2.trim() : null,
    meals: rMeals,
    mealCount: rMeals.length,
    firstVisit: rMeals.length > 0 ? rMeals[rMeals.length - 1] : null,
    latestVisit: rMeals.length > 0 ? rMeals[0] : null,
    yearsVisited: Array.from(yearsSet).sort((a, b) => a - b),
    ratingDistribution,
    photos: photosList,
    primaryPhoto: photosList.length > 0 ? photosList[0] : null,
  };

  restaurantsById.set(id, rest);
  if (rest.mealCount > 0) {
    restaurants.push(rest);
  }
}

console.log('Running Real Data Restaurant Verification Suite...\n');

let passed = 0;
let total = 0;
function assert(cond, name) {
  total++;
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
  }
}

// 1. Core data integrity
assert(restaurantsById.size === 3055, `1. Exactly 3,055 valid non-spill Rest records loaded (got ${restaurantsById.size})`);
assert(restaurants.length === 3051, `2. Exactly 3,051 restaurants have at least 1 meal (got ${restaurants.length})`);
assert(restaurantsById.size - restaurants.length === 4, '3. Exactly 4 zero-meal restaurants excluded from browse');

// 2. City & Country resolution
const allHaveCity = restaurants.every((r) => r.city && r.city.name);
const allHaveCountry = restaurants.every((r) => r.city?.country && r.city.country.name);
const allHaveType = restaurants.every((r) => r.type && r.type.name);
assert(allHaveCity, '4. 100% of restaurants resolve to a City');
assert(allHaveCountry, '5. 100% of restaurants resolve to a Country');
assert(allHaveType, '6. 100% of restaurants resolve to a Restaurant Type / Cuisine');

// 3. Repeat visits and Max visits
const repeatRests = restaurants.filter((r) => r.mealCount > 1);
assert(repeatRests.length === 657, `7. Exactly 657 repeat restaurants with >1 visit (got ${repeatRests.length})`);

const maxVisitsRest = restaurants.reduce((max, r) => (r.mealCount > max.mealCount ? r : max), restaurants[0]);
assert(maxVisitsRest.id === 1706 && maxVisitsRest.mealCount === 41, `8. Max visits restaurant is ID 1706 (The Argyll Pub, 41 visits)`);

// 4. Representative checks
// A. Single-visit restaurant
const singleVisit = restaurants.find((r) => r.mealCount === 1);
assert(singleVisit && singleVisit.firstVisit.timestamp === singleVisit.latestVisit.timestamp, '9a. Single-visit restaurant has identical first & latest visit');

// B. Repeat restaurant
const argyll = restaurantsById.get(1706);
assert(argyll && argyll.mealCount === 41 && argyll.meals.length === 41, '9b. Repeat restaurant (The Argyll Pub) has 41 associated meals');

// C. Restaurant with photos
const withPhoto = restaurants.filter((r) => r.photos.length > 0);
assert(withPhoto.length === 1125, `9c. Exactly 1,125 restaurants have associated meal photos (got ${withPhoto.length})`);

// D. Rating calculations
const RATING_MEAL_LOOKUP = {
  'the dogs': 1,
  'exceptional': 2,
  'very good': 3,
  'fine': 4,
  "ok but wouldn't recommend": 5,
  'very bad': 6,
  'never again': 7,
  'the worst in the world': 8,
};
const RATING_ID_TO_TEXT = {
  1: 'The Dogs',
  2: 'Exceptional',
  3: 'Very Good',
  4: 'Fine',
  5: "OK but wouldn't recommend",
  6: 'Very Bad',
  7: 'Never Again',
  8: 'The Worst in the World',
};

// Compute average ratings for each restaurant
for (const r of restaurants) {
  let rSum = 0;
  let rCount = 0;
  for (const m of r.meals) {
    const rId = RATING_MEAL_LOOKUP[m.rating.toLowerCase()];
    if (rId) {
      m.ratingId = rId;
      rSum += rId;
      rCount++;
    }
  }
  r.averageRatingNumeric = rCount > 0 ? rSum / rCount : null;
  r.averageRatingText = r.averageRatingNumeric !== null
    ? RATING_ID_TO_TEXT[Math.min(8, Math.max(1, Math.round(r.averageRatingNumeric)))]
    : null;
}

const allRated = restaurants.every((r) => r.averageRatingNumeric !== null && r.averageRatingText !== null);
assert(allRated, '9d. 100% of restaurants with meals have a derived average rating');

// Sort by best rating
const sortedBest = sortRestaurants(restaurants, 'rating_best');
assert(
  sortedBest[0].averageRatingNumeric <= sortedBest[sortedBest.length - 1].averageRatingNumeric,
  `9e. Sort rating_best orders average rating ascending (best: ${sortedBest[0].averageRatingNumeric.toFixed(2)}, worst: ${sortedBest[sortedBest.length - 1].averageRatingNumeric.toFixed(2)})`
);

// E. Foreign restaurant
const frenchRests = filterRestaurants(restaurants, { ...DEFAULT_RESTAURANTS_FILTER_STATE, countries: ['France'] });
assert(frenchRests.length > 100, `9f. Foreign restaurants in France resolve cleanly (${frenchRests.length} venues found)`);

// F. Dynamic City facet
const frenchCounts = computeRestaurantFacetCounts(restaurants, { ...DEFAULT_RESTAURANTS_FILTER_STATE, countries: ['France'] });
assert(frenchCounts.cityCounts['Paris'] > 0 && frenchCounts.cityCounts['London'] === undefined, '9g. France filter restricts dynamic city facet to French cities only');

// G. Search filtering
const searchArgyll = filterRestaurants(restaurants, { ...DEFAULT_RESTAURANTS_FILTER_STATE, search: 'argyll' });
assert(searchArgyll.some((r) => r.id === 1706), `9h. Search by keyword "argyll" matches The Argyll Pub (${searchArgyll.length} matches across name & address)`);

console.log(`\nResults: ${passed}/${total} checks passed.`);
if (passed !== total) process.exit(1);
