import fs from 'fs';
import Papa from 'papaparse';
import {
  DEFAULT_MEALS_FILTER_STATE,
  filterMeals,
  computeFacetCounts,
  CANONICAL_RATINGS,
  CANONICAL_DECADES,
} from '../src/utils/mealsFilter.js';

// Load locally saved CSVs
function loadLocalCsv(filename) {
  const text = fs.readFileSync('sheets_csv/' + filename, 'utf-8');
  return Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  }).data;
}

const rawMeals = loadLocalCsv('Meals_489348868.csv');
const rawRest = loadLocalCsv('Rest_0.csv');
const rawCity = loadLocalCsv('City_763089517.csv');
const rawCountry = loadLocalCsv('Country_172877059.csv');
const rawType = loadLocalCsv('Type_61815367.csv');
const rawMain = loadLocalCsv('Meals_Main_786291206.csv');
const rawFood = loadLocalCsv('Food_377846928.csv');
const rawIngredient = loadLocalCsv('Ingredient_1459651357.csv');
const rawFoodType = loadLocalCsv('FoodType_1922827128.csv');
const rawPhoto = loadLocalCsv('Meals_Photo_153241932.csv');
const rawMealsPeople = loadLocalCsv('Meals_People_668079142.csv');
const rawPeoplePublic = loadLocalCsv('People_Public_2108210132.csv');

// Build indexes
const countries = new Map();
rawCountry.forEach((c) => countries.set(parseInt(c.Country_ID), { name: c.Country_Text?.trim() }));

const cities = new Map();
rawCity.forEach((c) =>
  cities.set(parseInt(c.City_ID), {
    name: c.City_Text?.trim(),
    country: countries.get(parseInt(c.Country_ID)),
  })
);

const types = new Map();
rawType.forEach((t) => types.set(parseInt(t.Type_ID), { name: t.Type?.trim() }));

const ings = new Map();
rawIngredient.forEach((i) =>
  ings.set(parseInt(i.Ingredient_ID), { name: i.Food_Ingredient?.trim() })
);

const ftypes = new Map();
rawFoodType.forEach((f) =>
  ftypes.set(parseInt(f.Food_Type_ID), { name: f.FoodType?.trim() })
);

const foods = new Map();
rawFood.forEach((f) =>
  foods.set(parseInt(f.Food_ID), {
    name: f.Food_Text?.trim(),
    ingredient: ings.get(parseInt(f.Ingredient_ID)),
    foodType: ftypes.get(parseInt(f.Food_Type_ID)),
  })
);

const rests = new Map();
rawRest.forEach((r) => {
  if (!r.Rest_ID || !r.Rest_ID.trim()) return;
  rests.set(parseInt(r.Rest_ID), {
    name: r.Rest_Name?.trim(),
    city: cities.get(parseInt(r.City_ID)),
    type: types.get(parseInt(r.Type_ID)),
  });
});

const mains = new Map();
rawMain.forEach((m) => {
  const mId = parseInt(m.Meal_ID);
  if (!mains.has(mId)) mains.set(mId, []);
  mains.get(mId).push({ food: foods.get(parseInt(m.Food_ID)) });
});

const photos = new Map();
rawPhoto.forEach((p) => {
  if (!p.Photo_ID || !p.Meal_ID || !p.PhotoName || p.Photo?.trim().endsWith('/.jpg')) return;
  const mId = parseInt(p.Meal_ID);
  if (!photos.has(mId)) photos.set(mId, []);
  photos.get(mId).push({ url: p.Photo?.trim() });
});

// Build public people index with strict privacy enforcement
const publicPeople = new Map();
rawPeoplePublic.forEach((row) => {
  const id = parseInt(row.People_ID);
  if (isNaN(id) || id > 1009) return;
  const isPublic = (row['Public?'] || '').trim().toUpperCase() === 'Y';
  const name = (row.Public_Name || '').trim();
  if (isPublic && name && name.toLowerCase() !== 'hidden name') {
    publicPeople.set(id, { peopleId: id, publicName: name });
  }
});

// Build meals -> companions map with deduplication of (Meal_ID, People_ID)
const companions = new Map();
const seenPairs = new Set();
let duplicatesRemoved = 0;
let totalPublicRelationships = 0;

rawMealsPeople.forEach((row) => {
  const mId = parseInt(row.Meal_ID);
  const pId = parseInt(row.People_ID);
  if (isNaN(mId) || isNaN(pId)) return;

  const key = `${mId}_${pId}`;
  if (seenPairs.has(key)) {
    duplicatesRemoved++;
    return;
  }
  seenPairs.add(key);

  const person = publicPeople.get(pId);
  if (person) {
    totalPublicRelationships++;
    if (!companions.has(mId)) companions.set(mId, []);
    companions.get(mId).push(person);
  }
});

const meals = [];
rawMeals.forEach((m) => {
  if (!m.Meal_ID) return;
  const id = parseInt(m.Meal_ID);
  const year = parseInt(m.Year);
  const isMatch = (m.AFC_Game || '').toLowerCase() === 'yes';
  meals.push({
    id,
    year,
    rating: m.Meal_Rating?.trim(),
    valueGBP: parseFloat((m.Meal_Value || '').replace(/[^0-9.]/g, '')) || null,
    comment: m.Comment?.trim(),
    isBusiness: (m.Business || '').toLowerCase() === 'yes',
    restaurant: rests.get(parseInt(m.Rest_ID)) || null,
    mains: mains.get(id) || [],
    photos: photos.get(id) || [],
    companions: companions.get(id) || [],
    arsenal: isMatch ? { isMatchday: true, opponent: m.AFC_Opponent } : null,
  });
});

console.log(`Loaded ${meals.length} meals for verification.`);
console.log(`Selectable public people: ${publicPeople.size}`);
console.log(`Total public companion relationships: ${totalPublicRelationships}`);
console.log(`Duplicate relationships removed: ${duplicatesRemoved}`);

// Check Example A: Country = France
const franceFilter = { ...DEFAULT_MEALS_FILTER_STATE, countries: ['France'] };
const franceMeals = filterMeals(meals, franceFilter);
const franceCounts = computeFacetCounts(meals, franceFilter);
console.log(`Meals in France: ${franceMeals.length}`);
console.log(`Top 5 Cities in France:`, Object.entries(franceCounts.cityCounts).slice(0, 5));

// Check Example B: Country + Ingredient
const franceBeef = filterMeals(meals, { ...franceFilter, ingredients: ['Beef'] });
console.log(`Meals in France involving Beef: ${franceBeef.length}`);

// Check Example C: Meal Rating + Photo Available
const photoRating = filterMeals(meals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  ratings: ['Exceptional'],
  hasPhoto: true,
});
console.log(`Exceptional meals with photos: ${photoRating.length}`);

// Check Example D: Arsenal Matchday
const matchdayMeals = filterMeals(meals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  isArsenalMatch: true,
});
console.log(`Arsenal Matchday meals: ${matchdayMeals.length}`);

// Check Example E: Search + Country
const searchFrance = filterMeals(meals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  countries: ['France'],
  search: 'bistro',
});
console.log(`Meals in France matching "bistro": ${searchFrance.length}`);

// Check Example F: Dining Companion (Single)
const louMeals = filterMeals(meals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  people: ['Lou Holland'],
});
console.log(`Meals attended by Lou Holland: ${louMeals.length}`);

// Check Example G: Dining Companions (Multiple OR)
const orCompanions = filterMeals(meals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  people: ['Lou Holland', 'Rich Benson'],
});
console.log(`Meals attended by Lou Holland OR Rich Benson: ${orCompanions.length}`);

// Check Example H: Dining Companion + Country
const louFrance = filterMeals(meals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  countries: ['France'],
  people: ['Lou Holland'],
});
console.log(`Meals attended by Lou Holland in France: ${louFrance.length}`);

// Check Example I: Dynamic Companion Counts in France
const topCompanionsFrance = Object.entries(franceCounts.peopleCounts || {})
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
console.log(`Top 5 Dining Companions for French meals:`, topCompanionsFrance);

console.log('Real data checks completed successfully!');
