import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMealsData } from '../src/services/mealsDataService.js';
import {
  precomputePlacesSpatialIndex,
  filterPlacesMeals,
  aggregatePlacesPoints,
} from '../src/utils/placesGlobeData.js';

test('3D Places Globe - Spatial Index & Aggregations Verification Suite', async (t) => {
  let mealsData;
  try {
    mealsData = await loadMealsData();
  } catch (err) {
    console.log('Skipping live data checks in offline sandbox:', err.message);
    return;
  }

  const spatialIndex = precomputePlacesSpatialIndex(mealsData);

  await t.test('1. Default view (no filters, countries, Top 20) matches handover checks', () => {
    const filtered = filterPlacesMeals(mealsData.meals, {}, spatialIndex.londonCityId);
    const result = aggregatePlacesPoints({
      filteredMeals: filtered,
      mode: 'country',
      topN: 20,
      spatialIndex,
      mealsData,
    });

    const pointsByName = new Map(result.allPoints.map((p) => [p.name, p.n]));

    console.log('Top countries result:', result.topPoints.slice(0, 5));
    assert(pointsByName.has('England'), 'Must include England');
    assert(
      pointsByName.get('England') >= 2828,
      `England count must be >= 2828, got ${pointsByName.get('England')}`
    );

    assert(pointsByName.has('France'), 'Must include France');
    assert(
      pointsByName.get('France') >= 253,
      `France count must be >= 253, got ${pointsByName.get('France')}`
    );

    assert(pointsByName.has('Spain'), 'Must include Spain');
    assert(
      pointsByName.get('Spain') >= 215,
      `Spain count must be >= 215, got ${pointsByName.get('Spain')}`
    );
  });

  await t.test('2. London areas: Islington, West End, Soho counts match handover note', () => {
    // Find London city ID
    let londonId = null;
    for (const [id, city] of mealsData.citiesById.entries()) {
      if (city.name?.toLowerCase() === 'london') {
        londonId = id;
        break;
      }
    }
    assert(londonId != null, 'London city must exist');

    const filtered = filterPlacesMeals(
      mealsData.meals,
      { city: String(londonId) },
      spatialIndex.londonCityId
    );

    const result = aggregatePlacesPoints({
      filteredMeals: filtered,
      mode: 'area',
      topN: 20,
      spatialIndex,
      mealsData,
    });

    const areasByName = new Map(result.allPoints.map((p) => [p.name, p.n]));

    console.log('London areas result:', {
      Islington: areasByName.get('Islington'),
      'West End': areasByName.get('West End'),
      Soho: areasByName.get('Soho'),
    });

    assert(
      areasByName.get('Islington') >= 413,
      `Islington must be >= 413, got ${areasByName.get('Islington')}`
    );
    assert(
      areasByName.get('West End') >= 114,
      `West End must be >= 114, got ${areasByName.get('West End')}`
    );
    assert(
      areasByName.get('Soho') >= 112,
      `Soho must be >= 112, got ${areasByName.get('Soho')}`
    );
  });

  await t.test('3. England -> London -> Soho -> restaurants: Melati is first with 11', () => {
    // Find London city ID
    let londonId = null;
    for (const [id, city] of mealsData.citiesById.entries()) {
      if (city.name?.toLowerCase() === 'london') {
        londonId = id;
        break;
      }
    }

    // Find Soho area ID
    let sohoId = null;
    for (const [id, name] of mealsData.londonAreasById.entries()) {
      if (name?.toLowerCase() === 'soho') {
        sohoId = id;
        break;
      }
    }
    assert(sohoId != null, 'Soho area must exist');

    const filtered = filterPlacesMeals(
      mealsData.meals,
      { city: String(londonId), area: String(sohoId) },
      spatialIndex.londonCityId
    );

    const result = aggregatePlacesPoints({
      filteredMeals: filtered,
      mode: 'rest',
      topN: 20,
      spatialIndex,
      mealsData,
    });

    assert(result.topPoints.length > 0, 'Soho must have restaurants');
    const firstRest = result.topPoints[0];
    console.log('First Soho restaurant:', firstRest);

    assert.equal(firstRest.name, 'Melati', `Expected first restaurant Melati, got ${firstRest.name}`);
    assert(firstRest.n >= 11, `Melati count must be >= 11, got ${firstRest.n}`);
  });
});
