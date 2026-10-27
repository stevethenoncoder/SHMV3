import fs from 'fs';
import Papa from 'papaparse';
import { normaliseConfigs, getPluralLocationLabel } from './src/data/normaliseConfig.js';
import {
  normaliseItems,
  cleanText,
  cleanPhotoUrl,
  parseRating,
  parseFavourite,
  parseCoordinate,
} from './src/data/normaliseItems.js';
import { getProjectData } from './src/data/projectDataService.js';

function parseCSV(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return result.data;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAILED: ${message}`);
  }
}

console.log('=== RUNNING STRUCTURAL & INVARIANT TESTS ===\n');

// 1. Unit tests on helper functions
assert(cleanText('  Test Place  ') === 'Test Place', 'cleanText trims whitespace');
assert(cleanText('Generate and insert') === null, 'cleanText removes "Generate and insert" placeholder');
assert(cleanText('#REF!') === null, 'cleanText removes "#REF!" error text');

assert(
  cleanPhotoUrl('https://storage.googleapis.com/abc-post-photos/.jpg') === null,
  'cleanPhotoUrl detects missing filename .jpg'
);
assert(
  cleanPhotoUrl('https://storage.googleapis.com/abc-post-photos/PXL_123.jpg') ===
    'https://storage.googleapis.com/abc-post-photos/PXL_123.jpg',
  'cleanPhotoUrl preserves real photo URL'
);

assert(parseRating('4/5 - Very Good').numeric === 4, 'parseRating extracts 4 from 4/5');
assert(parseRating('5/5 - Excellent').numeric === 5, 'parseRating extracts 5 from 5/5');
assert(parseRating('   ').numeric === null, 'parseRating handles blank as null');

assert(parseFavourite('Y') === true, 'parseFavourite handles Y');
assert(parseFavourite('y') === true, 'parseFavourite handles y');
assert(parseFavourite('TRUE') === true, 'parseFavourite handles TRUE');
assert(parseFavourite('FALSE') === false, 'parseFavourite handles FALSE');
assert(parseFavourite('') === false, 'parseFavourite handles blank');

assert(parseCoordinate('51.5074') === 51.5074, 'parseCoordinate parses float');
assert(parseCoordinate('invalid') === null, 'parseCoordinate handles invalid as null');
assert(parseCoordinate('0') === null, 'parseCoordinate treats 0 as null');

assert(getPluralLocationLabel('County') === 'Counties', 'getPluralLocationLabel County -> Counties');
assert(getPluralLocationLabel('Borough') === 'Boroughs', 'getPluralLocationLabel Borough -> Boroughs');

// 2. Integration tests with loaded feeds
const rawConfig = parseCSV(fs.readFileSync('config_feed_raw.csv', 'utf8'));
const rawMain = parseCSV(fs.readFileSync('main_feed_raw.csv', 'utf8'));

const { configs, configMap } = normaliseConfigs(rawConfig);

assert(Array.isArray(configs) && configs.length >= 2, 'Config feed contains at least 2 configs');
assert(Boolean(configMap['England']), 'Config contains England key');
assert(Boolean(configMap['London']), 'Config contains London key');
assert(configMap['England'].locationLabel === 'County', 'England has locationLabel County');
assert(configMap['England'].locationLabelPlural === 'Counties', 'England has locationLabelPlural Counties');
assert(configMap['London'].locationLabel === 'Borough', 'London has locationLabel Borough');
assert(configMap['London'].locationLabelPlural === 'Boroughs', 'London has locationLabelPlural Boroughs');

// 3. Normalise all items
const allItems = normaliseItems(rawMain);
assert(Array.isArray(allItems) && allItems.length > 0, 'normaliseItems returns non-empty array');
assert(
  allItems.every((item) => item.id && item.hasOwnProperty('projectKey') && item.hasOwnProperty('place')),
  'Every item conforms to ExplorerItem structure'
);
assert(
  allItems.every((item) => !item.hasOwnProperty('10Facts')),
  '10Facts is ignored and not in item properties'
);
assert(
  allItems.some((item) => item.aiSummary !== null),
  'AI Summary is parsed and preserved where available'
);

// 4. Project isolation & dynamic option derivation
const englandData = getProjectData(allItems, 'England', configMap['England']);
const londonData = getProjectData(allItems, 'London', configMap['London']);

assert(englandData.rawProjectRows.length > 0, 'England has rows in feed');
assert(londonData.rawProjectRows.length > 0, 'London has rows in feed');
assert(
  englandData.rawProjectRows.every((item) => item.projectKey.toLowerCase() === 'england'),
  'England items are isolated to England'
);
assert(
  londonData.rawProjectRows.every((item) => item.projectKey.toLowerCase() === 'london'),
  'London items are isolated to London'
);

assert(
  englandData.explorerItems.every((item) => item.place && item.place.trim().length > 0),
  'England Explorer items all have non-blank place'
);
assert(
  londonData.explorerItems.every((item) => item.place && item.place.trim().length > 0),
  'London Explorer items all have non-blank place'
);

assert(
  englandData.locations.length > 0 && englandData.categories.length > 0,
  'England dynamically computes locations and categories'
);
assert(
  londonData.locations.length > 0 && londonData.categories.length > 0,
  'London dynamically computes locations and categories'
);

console.log(`\nTests Completed: ${passed} passed, ${failed} failed.`);

console.log('\n--- CURRENT LIVE FEED DIAGNOSTICS ---');
console.log(`Total Configs: ${configs.length} (${configs.map((c) => c.projectKey).join(', ')})`);
console.log(`Total Raw Feed Rows: ${allItems.length}`);
console.log(`\n[England Project Diagnostic]`);
console.log(`- Total Feed Rows: ${englandData.summary.totalProjectRows}`);
console.log(`- Eligible Explorer Places: ${englandData.summary.eligibleExplorerPlaces}`);
console.log(`- Matrix Placeholder Rows: ${englandData.summary.matrixPlaceholderRows}`);
console.log(`- Unique Locations (${englandData.config.locationLabelPlural}): ${englandData.locations.length}`);
console.log(`- Unique Categories: ${englandData.categories.length}`);
console.log(`- Active Statuses:`, englandData.statuses);
console.log(`- Valid Coordinates: ${englandData.summary.validCoordsCount} / ${englandData.summary.eligibleExplorerPlaces}`);

console.log(`\n[London Project Diagnostic]`);
console.log(`- Total Feed Rows: ${londonData.summary.totalProjectRows}`);
console.log(`- Eligible Explorer Places: ${londonData.summary.eligibleExplorerPlaces}`);
console.log(`- Matrix Placeholder Rows: ${londonData.summary.matrixPlaceholderRows}`);
console.log(`- Unique Locations (${londonData.config.locationLabelPlural}): ${londonData.locations.length}`);
console.log(`- Unique Categories: ${londonData.categories.length}`);
console.log(`- Active Statuses:`, londonData.statuses);
console.log(`- Sample London Places:`, londonData.explorerItems.map((i) => i.place));

if (failed > 0) process.exit(1);
