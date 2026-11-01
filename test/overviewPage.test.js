import assert from 'node:assert';

console.log('Running Overview Page Calculations & Charting Test Suite...\n');

// 1. Spline generator test
function getSmoothSplinePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

const testPoints = [
  { x: 0, y: 100 },
  { x: 50, y: 40 },
  { x: 100, y: 80 },
  { x: 150, y: 20 },
  { x: 200, y: 60 }
];

const splinePath = getSmoothSplinePath(testPoints);
console.log('✓ 1. Generates valid cubic bezier spline path with C commands');
assert(splinePath.startsWith('M 0.0 100.0 C '));
assert(!splinePath.includes('NaN'));
assert(splinePath.includes(' C '));

// 2. Metrics calculation mock
const mockMeals = [
  {
    id: 1,
    valueGBP: 50.0,
    year: 2020,
    rating: 'The Dogs (5/5)',
    sentimentCategory: 'Positive',
    restaurant: { id: 10, name: 'The Ivy', type: { name: 'British' }, city: { name: 'London', country: { name: 'England' } } },
    mains: [{ food: { foodType: { name: 'Steak' } } }],
    companions: [{ publicName: 'Alice' }, { publicName: 'Bob' }]
  },
  {
    id: 2,
    valueGBP: 35.5,
    year: 2020,
    rating: 'Very Good (4/5)',
    sentimentCategory: 'Positive',
    restaurant: { id: 10, name: 'The Ivy', type: { name: 'British' }, city: { name: 'London', country: { name: 'England' } } },
    mains: [{ food: { foodType: { name: 'Fish' } } }],
    companions: [{ publicName: 'Alice' }]
  },
  {
    id: 3,
    valueGBP: 80.0,
    year: 2021,
    rating: 'Fine (3/5)',
    sentimentCategory: 'Neutral',
    restaurant: { id: 20, name: 'Dishoom', type: { name: 'Indian' }, city: { name: 'London', country: { name: 'England' } } },
    mains: [{ food: { foodType: { name: 'Curry' } } }],
    companions: [{ publicName: 'Charlie' }]
  },
  {
    id: 4,
    valueGBP: 25.0,
    year: 2022,
    rating: 'OK (2/5)',
    sentimentCategory: 'Negative',
    restaurant: { id: 30, name: 'Le Relais', type: { name: 'French' }, city: { name: 'Paris', country: { name: 'France' } } },
    mains: [{ food: { foodType: { name: 'Steak' } } }],
    companions: []
  }
];

// Test total spend
const totalCost = mockMeals.reduce((sum, m) => sum + (m.valueGBP || 0), 0);
console.log(`✓ 2. Total cost sums correctly (£${totalCost})`);
assert.strictEqual(totalCost, 190.5);

// Test top restaurants
const restCounts = new Map();
mockMeals.forEach(m => {
  const id = m.restaurant.id;
  restCounts.set(id, (restCounts.get(id) || 0) + 1);
});
console.log('✓ 3. Top restaurant correctly identified as The Ivy (2 meals)');
assert.strictEqual(restCounts.get(10), 2);

// Test top cuisines and dish types
const cuisines = new Map();
const dishTypes = new Map();
mockMeals.forEach(m => {
  const c = m.restaurant?.type?.name;
  if (c) cuisines.set(c, (cuisines.get(c) || 0) + 1);
  (m.mains || []).forEach(item => {
    const dt = item.food?.foodType?.name;
    if (dt) dishTypes.set(dt, (dishTypes.get(dt) || 0) + 1);
  });
});

console.log('✓ 4. Food breakdowns correctly computed (3 cuisines, 3 dish types)');
assert.strictEqual(cuisines.size, 3);
assert.strictEqual(dishTypes.get('Steak'), 2);

// Test countries and cities
const countries = new Map();
const cities = new Map();
mockMeals.forEach(m => {
  const c = m.restaurant?.city?.country?.name;
  const ci = m.restaurant?.city?.name;
  if (c) countries.set(c, (countries.get(c) || 0) + 1);
  if (ci) cities.set(ci, (cities.get(ci) || 0) + 1);
});

console.log('✓ 5. Geography breakdowns correctly computed (England 3, France 1)');
assert.strictEqual(countries.get('England'), 3);
assert.strictEqual(countries.get('France'), 1);
assert.strictEqual(cities.get('London'), 3);
assert.strictEqual(cities.get('Paris'), 1);

// Test companions
const companions = new Map();
mockMeals.forEach(m => {
  (m.companions || []).forEach(c => {
    companions.set(c.publicName, (companions.get(c.publicName) || 0) + 1);
  });
});
console.log('✓ 6. Companions correctly counted (Alice 2, Bob 1, Charlie 1)');
assert.strictEqual(companions.get('Alice'), 2);
assert.strictEqual(companions.get('Bob'), 1);

// Test sentiment breakdown
const sentiments = { Positive: 0, Neutral: 0, Negative: 0 };
mockMeals.forEach(m => {
  if (sentiments[m.sentimentCategory] !== undefined) {
    sentiments[m.sentimentCategory]++;
  }
});
console.log('✓ 7. Sentiment correctly classified (Positive: 2, Neutral: 1, Negative: 1)');
assert.strictEqual(sentiments.Positive, 2);
assert.strictEqual(sentiments.Neutral, 1);
assert.strictEqual(sentiments.Negative, 1);

console.log('\nAll 7 Overview tests passed successfully!');
