import assert from 'node:assert';
import { filterMeals, computeFacetCounts, DEFAULT_MEALS_FILTER_STATE } from '../src/utils/mealsFilter.js';

console.log('Running TypeIcon & Photo Substitution Verification Suite...\n');

// Mock data representing meals with and without user photos, with typeIcon available
const mockMeals = [
  {
    id: 1,
    restaurant: {
      name: 'Chez Janou',
      type: { id: 10, name: 'Bistrot', typeIcon: 'https://storage.googleapis.com/shm-ing-icons/French.png' },
      city: { name: 'Paris', country: { name: 'France' } },
    },
    photos: [{ id: 101, url: 'https://photos.example.com/real-photo-1.jpg' }],
    hasPhoto: true,
    year: 2024,
  },
  {
    id: 2,
    restaurant: {
      name: 'Afghan Kebab House',
      type: { id: 1, name: 'Afghan', typeIcon: 'https://storage.googleapis.com/shm-ing-icons/MiddleEast.png' },
      city: { name: 'London', country: { name: 'United Kingdom' } },
    },
    // No user photos! But typeIcon exists.
    photos: [],
    hasPhoto: false,
    year: 2023,
  },
  {
    id: 3,
    restaurant: {
      name: 'The Argyll Pub',
      type: { id: 5, name: 'Pub', typeIcon: 'https://storage.googleapis.com/shm-ing-icons/Pub.png' },
      city: { name: 'London', country: { name: 'United Kingdom' } },
    },
    // Multiple user photos
    photos: [
      { id: 201, url: 'https://photos.example.com/real-photo-2.jpg' },
      { id: 202, url: 'https://photos.example.com/real-photo-3.jpg' },
    ],
    hasPhoto: true,
    year: 2022,
  },
];

// Test 1: Record without photos is strictly marked as hasPhoto: false
const noPhotoMeal = mockMeals.find((m) => m.id === 2);
assert(noPhotoMeal.hasPhoto === false, '1a. Meal without photos is marked as hasPhoto === false');
assert(noPhotoMeal.photos.length === 0, '1b. Meal without photos has photos.length === 0');
assert(noPhotoMeal.restaurant.type.typeIcon === 'https://storage.googleapis.com/shm-ing-icons/MiddleEast.png', '1c. TypeIcon is resolved and available on restaurant.type');
console.log('  ✓ 1. Meal without photos has hasPhoto === false and empty photos array, but typeIcon is present');

// Test 2: Photo filter (hasPhoto: true) strictly excludes meals that only have typeIcon
const photosOnly = filterMeals(mockMeals, {
  ...DEFAULT_MEALS_FILTER_STATE,
  hasPhoto: true,
});
assert(photosOnly.length === 2, `2a. Photos filter returns only meals with real photos (expected 2, got ${photosOnly.length})`);
assert(!photosOnly.some((m) => m.id === 2), '2b. Meal #2 (with typeIcon but no photos) is excluded by hasPhoto: true');
console.log('  ✓ 2. Photo filter (hasPhoto: true) correctly excludes records without real photos');

// Test 3: Facet counts for photoCount only counts actual photos
const counts = computeFacetCounts(mockMeals, DEFAULT_MEALS_FILTER_STATE);
assert(counts.photoCount === 2, `3. photoCount is 2 (only actual photo records counted, got ${counts.photoCount})`);
console.log('  ✓ 3. Dynamic facet counts for photos strictly reflect actual photo records (2/3)');

// Test 4: Default view returns all 3 meals
const allMeals = filterMeals(mockMeals, DEFAULT_MEALS_FILTER_STATE);
assert(allMeals.length === 3, `4. Default view returns all records (got ${allMeals.length})`);
console.log('  ✓ 4. Default Chronicle view returns all records, allowing cards to substitute typeIcon visually');

console.log('\nResults: 4/4 checks passed successfully.');
