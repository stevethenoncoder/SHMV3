import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMealCategoryValues,
  computeRelationshipsFlow,
  computeSankeyLayout,
  sortNodes,
  convertCategoryToFilter,
  buildCombinedChronicleFilter,
  AVAILABLE_CATEGORIES,
} from '../src/utils/relationshipsHelper.js';

test('Relationships Calculations & Sankey Flow Suite', async (t) => {
  const mockMeals = [
    {
      id: 1,
      restaurant: {
        name: 'The Ivy',
        type: { name: 'British' },
        city: { name: 'London', country: { name: 'England' } },
      },
      mains: [
        { food: { name: 'Fish & Chips', foodType: { name: 'Fish' } } },
      ],
      companions: [{ publicName: 'Chris' }, { publicName: 'Heidi' }],
      rating: 'Exceptional',
      year: 2023,
    },
    {
      id: 2,
      restaurant: {
        name: 'Pizza East',
        type: { name: 'Italian' },
        city: { name: 'London', country: { name: 'England' } },
      },
      mains: [
        { food: { name: 'Margherita Pizza', foodType: { name: 'Pizza' } } },
      ],
      companions: [{ publicName: 'Chris' }],
      rating: 'Very Good',
      year: 2022,
    },
    {
      id: 3,
      restaurant: {
        name: 'Le Bistro',
        type: { name: 'French' },
        city: { name: 'Paris', country: { name: 'France' } },
      },
      mains: [
        { food: { name: 'Steak Frites', foodType: { name: 'Steak' } } },
      ],
      companions: [{ publicName: 'Kate' }, { publicName: 'Heidi' }],
      rating: 'Very Good',
      year: 2024,
    },
  ];

  await t.test('1. Category value extraction works for all categories', () => {
    assert.deepEqual(getMealCategoryValues(mockMeals[0], 'people'), ['Chris', 'Heidi']);
    assert.deepEqual(getMealCategoryValues(mockMeals[0], 'country'), ['England']);
    assert.deepEqual(getMealCategoryValues(mockMeals[0], 'city'), ['London']);
    assert.deepEqual(getMealCategoryValues(mockMeals[0], 'cuisine'), ['British']);
    assert.deepEqual(getMealCategoryValues(mockMeals[0], 'dishType'), ['Fish']);
    assert.deepEqual(getMealCategoryValues(mockMeals[0], 'food'), ['Fish & Chips']);
    assert.deepEqual(getMealCategoryValues(mockMeals[0], 'restaurant'), ['The Ivy']);
    assert.deepEqual(getMealCategoryValues(mockMeals[0], 'rating'), ['Exceptional']);
    assert.deepEqual(getMealCategoryValues(mockMeals[0], 'decade'), ['2020s']);
  });

  await t.test('2. Computes pairwise flow matrix correctly', () => {
    const flow = computeRelationshipsFlow(
      mockMeals,
      'people',
      ['Chris', 'Heidi', 'Kate'],
      'cuisine',
      ['British', 'Italian', 'French']
    );

    // Chris went to British (meal 1) and Italian (meal 2)
    assert.equal(flow.matrix['Chris']?.['British'], 1);
    assert.equal(flow.matrix['Chris']?.['Italian'], 1);
    assert.equal(flow.matrix['Chris']?.['French'], undefined);

    // Heidi went to British (meal 1) and French (meal 3)
    assert.equal(flow.matrix['Heidi']?.['British'], 1);
    assert.equal(flow.matrix['Heidi']?.['French'], 1);

    // Kate went to French (meal 3)
    assert.equal(flow.matrix['Kate']?.['French'], 1);

    // Total links count
    assert.equal(flow.links.length, 5);
  });

  await t.test('3. Column sorting handles count up/down and name A-Z/Z-A', () => {
    const nodes = [
      { name: 'Heidi', value: 5 },
      { name: 'Chris', value: 12 },
      { name: 'Kate', value: 2 },
    ];

    const countDesc = sortNodes(nodes, 'count_desc');
    assert.deepEqual(countDesc.map((n) => n.name), ['Chris', 'Heidi', 'Kate']);

    const countAsc = sortNodes(nodes, 'count_asc');
    assert.deepEqual(countAsc.map((n) => n.name), ['Kate', 'Heidi', 'Chris']);

    const nameAsc = sortNodes(nodes, 'name_asc');
    assert.deepEqual(nameAsc.map((n) => n.name), ['Chris', 'Heidi', 'Kate']);

    const nameDesc = sortNodes(nodes, 'name_desc');
    assert.deepEqual(nameDesc.map((n) => n.name), ['Kate', 'Heidi', 'Chris']);
  });

  await t.test('4. Builds combined dual filter for Chronicle navigation', () => {
    const dual = buildCombinedChronicleFilter(
      'people',
      'Chris',
      'cuisine',
      'Italian',
      mockMeals
    );

    assert.deepEqual(dual, {
      people: ['Chris'],
      cuisines: ['Italian'],
    });

    const dualCountryDish = buildCombinedChronicleFilter(
      'country',
      'France',
      'dishType',
      'Steak',
      mockMeals
    );

    assert.deepEqual(dualCountryDish, {
      countries: ['France'],
      foodTypes: ['Steak'],
    });
  });

  await t.test('5. Computes Sankey layout with custom column sorting', () => {
    const flow = computeRelationshipsFlow(
      mockMeals,
      'people',
      ['Chris', 'Heidi', 'Kate'],
      'cuisine',
      ['British', 'Italian', 'French']
    );

    const layout = computeSankeyLayout(flow, {
      width: 800,
      height: 400,
      leftSortOption: 'name_asc',
      rightSortOption: 'name_desc',
    });

    assert.equal(layout.leftNodes.length, 3);
    assert.equal(layout.rightNodes.length, 3);
    assert.equal(layout.ribbons.length, 5);

    // Left nodes sorted A-Z: Chris, Heidi, Kate
    assert.deepEqual(layout.leftNodes.map((n) => n.name), ['Chris', 'Heidi', 'Kate']);
    // Right nodes sorted Z-A: Italian, French, British
    assert.deepEqual(layout.rightNodes.map((n) => n.name), ['Italian', 'French', 'British']);

    // Check ribbon geometry
    layout.ribbons.forEach((r) => {
      assert(r.path.startsWith('M'), 'Ribbon path must start with M');
      assert(r.path.includes('C'), 'Ribbon path must contain cubic bezier C command');
      assert(r.path.includes('Z'), 'Ribbon path must close with Z');
      assert(r.value > 0, 'Ribbon value must be positive');
    });
  });
});
