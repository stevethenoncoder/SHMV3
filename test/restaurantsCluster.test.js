import assert from 'node:assert';
import Supercluster from 'supercluster';

console.log('Running Restaurants Cluster & Zoom Resolution Test Suite...\n');

// Mock restaurant dataset with clusters (London cluster & Birmingham cluster)
const mockRestaurants = [
  // London cluster (4 restaurants close to Soho / Covent Garden)
  { id: 101, name: 'Dishoom Covent Garden', latitude: 51.5126, longitude: -0.1264, averageRatingText: 'The Dogs (5/5)' },
  { id: 102, name: 'Hawksmoor Seven Dials', latitude: 51.5135, longitude: -0.1268, averageRatingText: 'Superb (4.5/5)' },
  { id: 103, name: 'Bao Soho', latitude: 51.5139, longitude: -0.1340, averageRatingText: 'Very Good (4/5)' },
  { id: 104, name: 'Barrafina Dean St', latitude: 51.5137, longitude: -0.1322, averageRatingText: 'Exceptional (5/5)' },

  // Birmingham cluster (2 restaurants)
  { id: 201, name: 'Opheem', latitude: 52.4842, longitude: -1.9056, averageRatingText: 'Superb (4.5/5)' },
  { id: 202, name: 'Simpsons', latitude: 52.4678, longitude: -1.9288, averageRatingText: 'Very Good (4/5)' },

  // Isolated Edinburgh restaurant
  { id: 301, name: 'The Kitchin', latitude: 55.9754, longitude: -3.1706, averageRatingText: 'The Dogs (5/5)' }
];

// Convert to GeoJSON Features
const points = mockRestaurants.map(r => ({
  type: 'Feature',
  properties: {
    cluster: false,
    restaurantId: r.id,
    restaurant: r,
  },
  geometry: {
    type: 'Point',
    coordinates: [r.longitude, r.latitude]
  }
}));

const sc = new Supercluster({
  radius: 60,
  maxZoom: 16,
  extent: 512
});

sc.load(points);

// Test 1: Nationwide view at zoom 6 (UK view)
const ukBounds = [-8, 50, 2, 58];
const zoom6Clusters = sc.getClusters(ukBounds, 6);

console.log('✓ 1. UK view at zoom 6 produces clusters and isolated markers');
const londonClusterAtZ6 = zoom6Clusters.find(c => c.properties.cluster && c.properties.point_count === 4);
assert(londonClusterAtZ6, 'Expected London cluster of 4 restaurants at zoom 6');
assert.strictEqual(londonClusterAtZ6.properties.point_count, 4);

const birminghamClusterAtZ6 = zoom6Clusters.find(c => c.properties.cluster && c.properties.point_count === 2);
assert(birminghamClusterAtZ6, 'Expected Birmingham cluster of 2 restaurants at zoom 6');

const edinburghAtZ6 = zoom6Clusters.find(c => !c.properties.cluster && c.properties.restaurantId === 301);
assert(edinburghAtZ6, 'Expected isolated Edinburgh restaurant to remain unclustered');

// Test 2: Cluster expansion zoom calculation
const clusterId = londonClusterAtZ6.properties.cluster_id;
const expansionZoom = sc.getClusterExpansionZoom(clusterId);
console.log(`✓ 2. London cluster calculates expansion zoom (${expansionZoom})`);
assert(expansionZoom > 6, 'Expansion zoom must be higher than current zoom');

// Test 3: Zooming in on London (zoom 12-14) resolves into smaller clusters or individual points
const londonBounds = [-0.2, 51.48, -0.05, 51.55];
const zoom13Clusters = sc.getClusters(londonBounds, 13);
const unclusteredCountAtZ13 = zoom13Clusters.filter(c => !c.properties.cluster).length;
console.log(`✓ 3. At zoom 13, cluster resolves down (found ${zoom13Clusters.length} items, ${unclusteredCountAtZ13} unclustered)`);
assert(zoom13Clusters.length > 1, 'Should resolve into multiple smaller clusters/points');

// Test 4: At max zoom (zoom 17), all restaurants resolve to individual markers
const zoom17Clusters = sc.getClusters(ukBounds, 17);
console.log('✓ 4. At street zoom 17, 100% of restaurants resolve to individual markers');
assert.strictEqual(zoom17Clusters.length, 7);
assert(zoom17Clusters.every(c => c.properties.cluster === false));

// Test 5: Empty and single restaurant bounds
const singlePointSc = new Supercluster({ radius: 60, maxZoom: 16 });
singlePointSc.load([points[0]]);
const singleRes = singlePointSc.getClusters(ukBounds, 6);
console.log('✓ 5. Single restaurant is never clustered');
assert.strictEqual(singleRes.length, 1);
assert.strictEqual(singleRes[0].properties.cluster, false);

// Test 6: Co-located restaurants grouping and radial fan-out
const coLocatedRests = [
  { id: 401, name: 'Borough Market Tapas', latitude: 51.5055, longitude: -0.0910 },
  { id: 402, name: 'Borough Market Oyster Bar', latitude: 51.5055, longitude: -0.0910 },
  { id: 403, name: 'Borough Market Bao', latitude: 51.5055, longitude: -0.0910 },
];

const coordGroups = new Map();
coLocatedRests.forEach((r) => {
  const key = `${r.latitude.toFixed(5)},${r.longitude.toFixed(5)}`;
  if (!coordGroups.has(key)) coordGroups.set(key, []);
  coordGroups.get(key).push(r);
});

assert.strictEqual(coordGroups.size, 1);
const boroughGroup = coordGroups.get('51.50550,-0.09100');
assert.strictEqual(boroughGroup.length, 3);

// Calculate fan-out positions
const fannedPins = [];
const offsetRadius = 0.00022;
boroughGroup.forEach((r, idx) => {
  const angle = (2 * Math.PI * idx) / boroughGroup.length - Math.PI / 2;
  const pinLat = r.latitude + Math.cos(angle) * offsetRadius;
  const pinLng = r.longitude + Math.sin(angle) * offsetRadius;
  fannedPins.push({ r, pinLat, pinLng, badge: `${idx + 1}/${boroughGroup.length}` });
});

console.log('✓ 6. Co-located venues fan out radially into distinct positions');
assert.strictEqual(fannedPins.length, 3);
// Check that each pin position is unique
const uniquePinCoords = new Set(fannedPins.map(p => `${p.pinLat.toFixed(5)},${p.pinLng.toFixed(5)}`));
assert.strictEqual(uniquePinCoords.size, 3, 'All 3 pins must have distinct coordinates');

// Test 7: Multi-venue badges are correctly numbered
console.log('✓ 7. Multi-venue badges accurately reflect sequence and total (1/3, 2/3, 3/3)');
assert.strictEqual(fannedPins[0].badge, '1/3');
assert.strictEqual(fannedPins[1].badge, '2/3');
assert.strictEqual(fannedPins[2].badge, '3/3');

console.log('\nAll 7 cluster & co-location tests passed successfully!');
