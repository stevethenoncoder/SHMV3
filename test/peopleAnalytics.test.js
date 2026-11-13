import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPeopleMeals,
  calculatePeopleFacetCounts,
  calculatePeopleOverviewKpis,
  buildPeopleThroughTimeSeries,
  buildDiningCircleNetwork,
  mineRecurringGroups,
  buildCompanionFrequencyDistribution,
  extractNamesThroughTime,
  buildPeopleDirectory,
  buildIndividualProfileData,
  isSoloDiningPerson,
} from '../src/utils/peopleAnalytics.js';

test('People Analytics: Invariant & Correctness Test Suite', async (t) => {
  // Mock fixtures
  const mockPublicPeople = new Map([
    [744, { peopleId: 744, publicName: 'Lou Holland', name: 'Lou Holland', public: true, historicalIds: [364, 744] }],
    [749, { peopleId: 749, publicName: 'Thomas Holland', name: 'Thomas Holland', public: true, historicalIds: [749] }],
    [493, { peopleId: 493, publicName: 'Rich Benson', name: 'Rich Benson', public: true, historicalIds: [493] }],
    [137, { peopleId: 137, publicName: 'Dad', name: 'Dad', public: true, historicalIds: [137] }],
  ]);

  const mockRawPeoplePublic = [
    { People_ID: '364', 'Public?': 'Y', Public_Name: 'Lou Oram', People_ID_Current: '744', People_Name_Current: 'Lou Holland' },
    { People_ID: '744', 'Public?': 'Y', Public_Name: 'Lou Holland', People_ID_Current: '744', People_Name_Current: 'Lou Holland' },
    { People_ID: '120', 'Public?': 'Y', Public_Name: 'Claire Harradine', People_ID_Current: '122', People_Name_Current: 'Claire Jackets' },
    { People_ID: '121', 'Public?': 'N', Public_Name: 'Hidden name', People_ID_Current: '127', People_Name_Current: 'Hidden name' },
  ];

  const mockMeals = [
    {
      id: 1,
      date: '2010-05-12',
      formattedDate: '12 May 2010',
      year: 2010,
      timestamp: 1273622400000,
      restaurant: { id: 101, name: 'The Ivy', city: { id: 1, name: 'London', country: { id: 1, name: 'United Kingdom' } }, type: { typeGroup: 'Fine Dining' }, latitude: 51.51, longitude: -0.12 },
      allPeopleIds: [744, 749, 999], // 999 is private
      companions: [
        { peopleId: 744, publicName: 'Lou Holland', historicalIds: [364] },
        { peopleId: 749, publicName: 'Thomas Holland', historicalIds: [749] },
      ],
      photos: [{ id: 1, url: 'https://example.com/p1.jpg', comment: 'Great lunch' }],
      comment: 'Superb atmosphere and classic dishes with Lou and Thomas.',
      rating: 'Exceptional',
    },
    {
      id: 2,
      date: '2015-08-20',
      formattedDate: '20 Aug 2015',
      year: 2015,
      timestamp: 1440028800000,
      restaurant: { id: 102, name: 'Dishoom', city: { id: 1, name: 'London', country: { id: 1, name: 'United Kingdom' } }, type: { typeGroup: 'Casual Dining' }, latitude: 51.52, longitude: -0.13 },
      allPeopleIds: [744, 493],
      companions: [
        { peopleId: 744, publicName: 'Lou Holland', historicalIds: [744] },
        { peopleId: 493, publicName: 'Rich Benson', historicalIds: [493] },
      ],
      photos: [],
      comment: 'Spicy ruby chicken and nice cocktails.',
      rating: 'Very Good',
    },
    {
      id: 3,
      date: '2020-03-01',
      formattedDate: '1 Mar 2020',
      year: 2020,
      timestamp: 1583020800000,
      restaurant: { id: 103, name: 'Bistrot Pierre', city: { id: 2, name: 'Paris', country: { id: 2, name: 'France' } }, type: { typeGroup: 'Bistro' }, latitude: 48.85, longitude: 2.35 },
      allPeopleIds: [744, 749, 493],
      companions: [
        { peopleId: 744, publicName: 'Lou Holland', historicalIds: [744] },
        { peopleId: 749, publicName: 'Thomas Holland', historicalIds: [749] },
        { peopleId: 493, publicName: 'Rich Benson', historicalIds: [493] },
      ],
      photos: [{ id: 2, url: 'https://example.com/p2.jpg', comment: 'Paris trip' }],
      comment: 'Delicious duck confit in Paris.',
      rating: 'Exceptional',
    },
    {
      id: 4,
      date: '2024-01-10',
      formattedDate: '10 Jan 2024',
      year: 2024,
      timestamp: 1704844800000,
      restaurant: { id: 104, name: 'Local Pub', city: { id: 3, name: 'Henley', country: { id: 1, name: 'United Kingdom' } }, type: { typeGroup: 'Pub' }, latitude: 51.53, longitude: -0.90 },
      allPeopleIds: [137, 888], // 888 is private one-off
      companions: [
        { peopleId: 137, publicName: 'Dad', historicalIds: [137] },
      ],
      photos: [],
      comment: 'Pint and a pie.',
      rating: 'Fine',
    },
    {
      id: 5,
      date: '2025-06-15',
      formattedDate: '15 Jun 2025',
      year: 2025,
      timestamp: 1750000000000,
      restaurant: { id: 105, name: 'Solo Diner Cafe', city: { id: 1, name: 'London', country: { id: 1, name: 'United Kingdom' } }, type: { typeGroup: 'Cafe' }, latitude: 51.50, longitude: -0.11 },
      allPeopleIds: [317], // Stevie eating alone (Just Me !!)
      companions: [
        { peopleId: 317, publicName: 'Just Me !!', historicalIds: [317] },
      ],
      photos: [],
      comment: 'Quiet lunch alone with a book.',
      rating: 'Very Good',
    },
  ];

  await t.test('1. KPI Calculations, Privacy preservation & Solo Dining Exclusion', () => {
    const kpis = calculatePeopleOverviewKpis(mockMeals, mockMeals, mockPublicPeople);
    // Unique all people: 744, 749, 999, 493, 137, 888 = 6 people (317 'Just Me !!' MUST NOT be counted as a person!)
    assert.equal(kpis.totalUniquePeople, 6);
    // Public people: 744 (Lou), 749 (Thomas), 493 (Rich), 137 (Dad) = 4
    assert.equal(kpis.publicPeople, 4);
    // Private people: 999, 888 = 2
    assert.equal(kpis.privatePeople, 2);
    // Invariant: public + private = totalUniquePeople
    assert.equal(kpis.publicPeople + kpis.privatePeople, kpis.totalUniquePeople);

    // Repeat companions: 744 (3 meals), 749 (2 meals), 493 (2 meals) = 3 repeat companions
    assert.equal(kpis.repeatCompanions, 3);
    // One-off companions: 999 (1), 137 (1), 888 (1) = 3 one-off
    assert.equal(kpis.oneOffCompanions, 3);
    // Repeat + OneOff = TotalUniquePeople
    assert.equal(kpis.repeatCompanions + kpis.oneOffCompanions, kpis.totalUniquePeople);

    // Solo dining meal count (Just Me !!)
    assert.equal(kpis.justMeMealsCount, 1);

    // Top companion: Lou Holland with 3 meals
    assert.equal(kpis.topCompanion.name, 'Lou Holland');
    assert.equal(kpis.topCompanion.count, 3);
  });

  await t.test('2. Filters Reactivity (Country, Decade, Type, Search)', () => {
    const franceMeals = filterPeopleMeals(mockMeals, { country: 'France' });
    assert.equal(franceMeals.length, 1);
    assert.equal(franceMeals[0].restaurant.name, 'Bistrot Pierre');

    const decade2010s = filterPeopleMeals(mockMeals, { decade: '2010s' });
    assert.equal(decade2010s.length, 2);

    const pubMeals = filterPeopleMeals(mockMeals, { restaurantType: 'Pub' });
    assert.equal(pubMeals.length, 1);

    const searchLou = filterPeopleMeals(mockMeals, { search: 'Lou Holland' });
    assert.equal(searchLou.length, 3);

    // Companion-only search: venue name "The Ivy" must NOT match
    const searchVenue = filterPeopleMeals(mockMeals, { search: 'The Ivy' });
    assert.equal(searchVenue.length, 0, 'Search must be companion-only and not match venue names');

    // Multi-select countries
    const multiCountry = filterPeopleMeals(mockMeals, { countries: ['France', 'United Kingdom'] });
    assert.equal(multiCountry.length, 5);

    // Cascading facet counts
    const facets = calculatePeopleFacetCounts(mockMeals, { countries: ['France'] });
    assert.equal(facets.typeCounts['Bistro'], 1);
    assert.equal(facets.countryCounts['United Kingdom'], 4); // other countries preserved in facet count
  });

  await t.test('3. People Through Time (Excludes solo person 317)', () => {
    const series = buildPeopleThroughTimeSeries(mockMeals, mockMeals);
    assert.equal(series.periods.length, 5); // 2010, 2015, 2020, 2024, 2025
    // In 2010: 744, 749, 999 are all new (3 new, 0 repeat)
    const p2010 = series.periods.find((p) => p.year === 2010);
    assert.equal(p2010.newCount, 3);
    assert.equal(p2010.repeatCount, 0);

    // In 2015: 744 (repeat), 493 (new) => 1 new, 1 repeat
    const p2015 = series.periods.find((p) => p.year === 2015);
    assert.equal(p2015.newCount, 1);
    assert.equal(p2015.repeatCount, 1);

    // In 2025: only solo person 317 was present, so totalUnique is 0 (317 excluded)
    const p2025 = series.periods.find((p) => p.year === 2025);
    assert.equal(p2025.totalUnique, 0);
  });

  await t.test('4. Dining Circle Network generation (Excludes solo person 317)', () => {
    const network = buildDiningCircleNetwork(mockMeals, mockPublicPeople, { topN: 10, minShared: 1 });
    // Lou Holland (3), Thomas Holland (2), Rich Benson (2), Dad (1) = 4 nodes (no node for 317)
    assert.equal(network.nodes.length, 4);
    assert.equal(network.nodes[0].name, 'Lou Holland');
    assert.ok(!network.nodes.some((n) => n.id === 317 || n.name.includes('Just Me')));
    assert.ok(network.links.length > 0);
  });

  await t.test('5. Recurring Groups mining & Subset Suppression', () => {
    const groups = mineRecurringGroups(mockMeals, { minMeals: 1, limit: 8, threshold: 0.75 });
    assert.ok(groups.length > 0);
    assert.ok(groups.length <= 8);
    // Lou Holland 1-on-1: meal 2 had Lou + Rich, meal 1 had Lou + Thomas + 999. Meal 4 had Dad.
    // Ensure all groups have valid metadata and NO sparklines or trendPct
    for (const g of groups) {
      assert.ok(g.ids.length >= 1 && g.ids.length <= 5);
      assert.ok(g.count >= 1);
      assert.ok(g.initials.length === g.names.length);
      assert.equal(g.trendPct, undefined);
      assert.equal(g.sparklinePoints, undefined);
    }
  });

  await t.test('6. Frequency Distribution Bands (Includes dedicated Solo row)', () => {
    const bands = buildCompanionFrequencyDistribution(mockMeals);
    // Exactly 6 bands: solo band + 5 companion bands
    assert.equal(bands.length, 6);
    // Band 0: Solo dining
    assert.equal(bands[0].key, 'solo');
    assert.equal(bands[0].isSolo, true);
    assert.equal(bands[0].count, 1); // 1 solo meal (id: 5)
    assert.equal(bands[0].label, 'Just Me / Dining alone');

    // Band 1: 1 meal (One-off companions: 999, 137, 888)
    const oneOffBand = bands.find((b) => b.key === '1 meal');
    assert.equal(oneOffBand.count, 3);
  });

  await t.test('7. Names Through Time (Excludes hidden identities & computes Old/New/Total breakdown)', () => {
    const names = extractNamesThroughTime(mockRawPeoplePublic, mockMeals);
    // Lou Oram -> Lou Holland (historicalId 364 -> 744)
    // Claire Harradine -> Claire Jackets (historicalId 120 -> 122)
    // Hidden name (121) MUST be excluded!
    assert.equal(names.length, 2);
    const lou = names.find((n) => n.historicalName === 'Lou Oram' && n.currentName === 'Lou Holland');
    assert.ok(lou);
    assert.equal(lou.oldMealCount, 1); // 1 meal under Lou Oram (364)
    assert.equal(lou.newMealCount, 2); // 2 meals under Lou Holland (744)
    assert.equal(lou.totalMeals, 3); // 3 total meals
    assert.ok(names.some((n) => n.historicalName === 'Claire Harradine' && n.currentName === 'Claire Jackets'));
    assert.ok(!names.some((n) => n.historicalName === 'Hidden name' || n.currentName === 'Hidden name'));
  });

  await t.test('8. People Directory (Search, Sort, Canonical, Excludes 317)', () => {
    const dir = buildPeopleDirectory(mockMeals, mockPublicPeople, 'meals_desc', '');
    assert.equal(dir.length, 4);
    assert.equal(dir[0].name, 'Lou Holland');
    assert.equal(dir[0].mealCount, 3);
    assert.ok(!dir.some((p) => p.id === 317 || p.name.includes('Just Me')));
  });

  await t.test('9. Individual Profile Data generation', () => {
    const profile = buildIndividualProfileData(744, mockMeals, mockPublicPeople, {});
    assert.ok(profile);
    assert.equal(profile.person.name, 'Lou Holland');
    assert.equal(profile.coreMetrics.totalMeals, 3);
    assert.equal(profile.coreMetrics.uniqueRestaurants, 3);
    assert.equal(profile.heroPhotos.length, 2); // meal 1 and meal 3 have photos
    assert.equal(profile.timeline.length, 3);
    assert.equal(profile.storyComments.length, 3);
    assert.ok(profile.globeCityPoints.length >= 2); // London, Paris
  });
});
