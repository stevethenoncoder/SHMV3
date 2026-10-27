import assert from 'node:assert/strict';
import {
  calculateTargetMatrixStats,
  calculateActualPlaceStats,
  calculateProgressByLocation,
  calculateProgressByCategory,
  calculateActivityTimeline,
  normalizeJourneyStatus,
} from '../src/utils/statsCalculations.js';

console.log('Running Milestone 5 Statistics calculations & invariant tests...\n');

// Mock data setup
const mockLocations = ['Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire']; // 4 locations
const mockCategories = ['Museum', 'Park', 'Castle']; // 3 categories
// Full project target = 4 * 3 = 12 combinations

const mockRawRows = [
  // Bedfordshire
  { location: 'Bedfordshire', category: 'Museum', status: 'Blogged', place: 'Beds Museum' },
  { location: 'Bedfordshire', category: 'Park', status: 'Visited', place: 'Beds Park' },
  { location: 'Bedfordshire', category: 'Castle', status: 'Planned', place: '' },

  // Berkshire
  { location: 'Berkshire', category: 'Museum', status: 'Blogged', place: 'Berks Museum' },
  { location: 'Berkshire', category: 'Park', status: 'Not planned', place: '' },
  { location: 'Berkshire', category: 'Castle', status: 'Planned', place: 'Berks Castle' },

  // Bristol
  { location: 'Bristol', category: 'Museum', status: 'Visited', place: 'Bristol Museum' },
  { location: 'Bristol', category: 'Park', status: 'Not planned', place: '' },
  { location: 'Bristol', category: 'Castle', status: 'Not planned', place: '' },

  // Buckinghamshire
  { location: 'Buckinghamshire', category: 'Museum', status: 'Blogged', place: 'Bucks Museum' },
  { location: 'Buckinghamshire', category: 'Park', status: 'Planned', place: 'Bucks Park' },
  { location: 'Buckinghamshire', category: 'Castle', status: 'Not planned', place: '' },
];

// Test 1: Full target = locations × categories
{
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {});
  assert.equal(stats.target, 12, 'Full target must equal 4 locations × 3 categories = 12');
  assert.equal(stats.locationsCount, 4);
  assert.equal(stats.categoriesCount, 3);
  console.log('✓ 1. Full target = locations × categories (12)');
}

// Test 2: Selecting one Location changes target correctly
{
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {
    locations: ['Bedfordshire'],
  });
  assert.equal(stats.target, 3, 'Target for 1 location × 3 categories must equal 3');
  assert.equal(stats.locationsCount, 1);
  assert.equal(stats.categoriesCount, 3);
  console.log('✓ 2. Selecting one Location changes target correctly (3)');
}

// Test 3: Selecting one Category changes target correctly
{
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {
    categories: ['Museum'],
  });
  assert.equal(stats.target, 4, 'Target for 4 locations × 1 category must equal 4');
  assert.equal(stats.locationsCount, 4);
  assert.equal(stats.categoriesCount, 1);
  console.log('✓ 3. Selecting one Category changes target correctly (4)');
}

// Test 4: Selecting both Location and Category changes target correctly
{
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {
    locations: ['Bedfordshire', 'Berkshire'], // 2 locations
    categories: ['Museum'], // 1 category
  });
  assert.equal(stats.target, 2, 'Target for 2 locations × 1 category must equal 2');
  console.log('✓ 4. Selecting both Location and Category changes target correctly (2)');
}

// Test 5: Status filter does NOT alter Target
{
  // Simulating the rule: scopeFilters only passes locations and categories
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {
    locations: [],
    categories: [],
    statuses: ['Blogged'], // Even if status is passed in an extended object, target remains 12
  });
  assert.equal(stats.target, 12, 'Status filter must not alter target');
  console.log('✓ 5. Status filter does not alter Target (12)');
}

// Test 6: Search does NOT alter Target
{
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {
    search: 'Castle',
  });
  assert.equal(stats.target, 12, 'Search query must not alter target');
  console.log('✓ 6. Search does not alter Target (12)');
}

// Test 7: Rating filter does NOT alter Target
{
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {
    minRating: 4,
  });
  assert.equal(stats.target, 12, 'Rating filter must not alter target');
  console.log('✓ 7. Rating filter does not alter Target (12)');
}

// Test 8: Date filter does NOT alter Target
{
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });
  assert.equal(stats.target, 12, 'Date filter must not alter target');
  console.log('✓ 8. Date filter does not alter Target (12)');
}

// Test 9: Favourites does NOT alter Target
{
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {
    favouritesOnly: true,
  });
  assert.equal(stats.target, 12, 'Favourites filter must not alter target');
  console.log('✓ 9. Favourites does not alter Target (12)');
}

// Test 10: Journey status counts sum to Target
{
  const stats = calculateTargetMatrixStats(mockRawRows, mockLocations, mockCategories, {});
  const sum = stats.counts['Not planned'] + stats.counts['Planned'] + stats.counts['Visited'] + stats.counts['Blogged'];
  assert.equal(sum, stats.target, 'Sum of journey status counts must reconcile exactly to Target');
  assert.equal(stats.counts['Blogged'], 3);
  assert.equal(stats.counts['Visited'], 2);
  assert.equal(stats.counts['Planned'], 3);
  assert.equal(stats.counts['Not planned'], 4);
  console.log('✓ 10. Journey status counts sum to Target (3 + 2 + 3 + 4 = 12)');
}

// Test 11: Blank ratings are excluded from average and rating score
{
  const mockPlaces = [
    { place: 'Place 1', rating: 4 },
    { place: 'Place 2', rating: null },
    { place: 'Place 3', rating: undefined },
    { place: 'Place 4', rating: 5 },
  ];
  const stats = calculateActualPlaceStats(mockPlaces);
  assert.equal(stats.ratedPlacesCount, 2, 'Only 2 places have valid ratings');
  assert.equal(stats.averageRating, 4.5, 'Average rating of 4 and 5 must be 4.5');
  assert.equal(stats.ratingScore, 90, 'Rating score must be (9 / 10) * 100 = 90%');
  console.log('✓ 11. Blank/unrated places are excluded');
}

// Test 12: 5, 4, 3 gives Rating Score 80%
{
  const mockPlaces = [
    { place: 'Place A', rating: 5 },
    { place: 'Place B', rating: 4 },
    { place: 'Place C', rating: 3 },
  ];
  const stats = calculateActualPlaceStats(mockPlaces);
  assert.equal(stats.ratedPlacesCount, 3);
  assert.equal(stats.averageRating, 4);
  assert.equal(stats.ratingScore, 80, 'Rating score must equal 80% (12 / 15 * 100)');
  console.log('✓ 12. 5, 4, 3 gives Rating Score 80%');
}

// Test 13: Single rating 5 gives 100% with rating count 1
{
  const mockPlaces = [
    { place: 'Solo Place', rating: 5 },
  ];
  const stats = calculateActualPlaceStats(mockPlaces);
  assert.equal(stats.ratedPlacesCount, 1);
  assert.equal(stats.ratingScore, 100, 'Single rating of 5 produces 100%');
  console.log('✓ 13. Single rating 5 gives 100% with rating count 1');
}

// Test 14: Location progress and sorting
{
  const actualPlaces = [
    { location: 'Bedfordshire', place: 'Beds Museum', rating: 4 },
    { location: 'Bedfordshire', place: 'Beds Park', rating: 4 },
    { location: 'Berkshire', place: 'Berks Museum', rating: 5 },
    { location: 'Bristol', place: 'Bristol Museum', rating: 3 },
  ];

  const locProgress = calculateProgressByLocation(
    mockRawRows,
    mockLocations,
    mockCategories,
    actualPlaces
  );

  assert.equal(locProgress.length, 4);

  // Check Bedfordshire: Blogged = 1 out of target = 3 => 33.3%
  const beds = locProgress.find((l) => l.name === 'Bedfordshire');
  assert.equal(beds.progressPct, 33.3);
  assert.equal(beds.progressCount, 1);
  assert.equal(beds.ratingsCount, 2);
  assert.equal(beds.ratingScore, 80); // (8 / 10) * 100 = 80%

  // Check numeric sorting ascending & descending
  const sortedAsc = [...locProgress].sort((a, b) => (a.progressPct || 0) - (b.progressPct || 0));
  const sortedDesc = [...locProgress].sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0));
  assert.ok(sortedAsc[0].progressPct <= sortedAsc[sortedAsc.length - 1].progressPct);
  assert.ok(sortedDesc[0].progressPct >= sortedDesc[sortedDesc.length - 1].progressPct);

  // Check alphabetical sorting
  const sortedAlpha = [...locProgress].sort((a, b) => a.name.localeCompare(b.name));
  assert.equal(sortedAlpha[0].name, 'Bedfordshire');
  assert.equal(sortedAlpha[3].name, 'Buckinghamshire');

  console.log('✓ 14. Location progress (Blogged only), numeric and alphabetical sorting work correctly');
}

// Test 15: Category progress and sorting
{
  const actualPlaces = [
    { category: 'Museum', place: 'Beds Museum', rating: 4 },
    { category: 'Museum', place: 'Berks Museum', rating: 5 },
    { category: 'Park', place: 'Beds Park', rating: 3 },
  ];

  const catProgress = calculateProgressByCategory(
    mockRawRows,
    mockLocations,
    mockCategories,
    actualPlaces
  );

  assert.equal(catProgress.length, 3);
  const museum = catProgress.find((c) => c.name === 'Museum');
  // In mockRawRows, Museum has: Beds (Blogged), Berks (Blogged), Bristol (Visited), Bucks (Blogged) = 3 Blogged out of 4 locations = 75%
  assert.equal(museum.progressPct, 75);
  assert.equal(museum.progressCount, 3);
  assert.equal(museum.ratingsCount, 2);
  assert.equal(museum.ratingScore, 90); // (9 / 10) * 100 = 90%

  const sortedCatDesc = [...catProgress].sort((a, b) => (b.ratingScore || 0) - (a.ratingScore || 0));
  assert.equal(sortedCatDesc[0].name, 'Museum');
  console.log('✓ 15. Category progress (Blogged only) and sorting work correctly');
}

// Test 16: Activity Timeline derivation with continuous months
{
  const placesWithDates = [
    { date: '15/02/2026', status: 'Blogged' },
    { date: '20/02/2026', status: 'Visited' },
    { date: '10/05/2026', status: 'Planned' },
  ];
  const timeline = calculateActivityTimeline(placesWithDates);
  // Months: Feb 2026, Mar 2026 (0), Apr 2026 (0), May 2026
  assert.equal(timeline.length, 4, 'Must include continuous sequence Feb, Mar, Apr, May');
  assert.equal(timeline[0].yearMonth, '2026-02');
  assert.equal(timeline[0].total, 2);
  assert.equal(timeline[0].blogged, 1);
  assert.equal(timeline[0].visited, 1);
  assert.equal(timeline[0].cumulativeBlogged, 1);
  assert.equal(timeline[0].cumulativeTotal, 2);

  assert.equal(timeline[1].yearMonth, '2026-03');
  assert.equal(timeline[1].total, 0, 'Zero-activity month has total = 0');
  assert.equal(timeline[1].cumulativeBlogged, 1);

  assert.equal(timeline[2].yearMonth, '2026-04');
  assert.equal(timeline[2].total, 0);
  assert.equal(timeline[2].cumulativeBlogged, 1);

  assert.equal(timeline[3].yearMonth, '2026-05');
  assert.equal(timeline[3].total, 1);
  assert.equal(timeline[3].planned, 1);
  assert.equal(timeline[3].cumulativeBlogged, 1);
  assert.equal(timeline[3].cumulativeTotal, 3);
  console.log('✓ 16. Activity Timeline continuous months and cumulative blogged series work correctly');
}

console.log('\nAll 16 statistics invariant tests passed successfully!\n');
