/**
 * Places Globe Data Processing & Precomputation Utilities
 *
 * Implements the geographic coordinate calculations, hierarchical aggregation,
 * and filtering for the 3D Places Globe as specified in PLACES_GLOBE_HANDOVER.md.
 */

/**
 * Calculates the median of an array of numbers.
 */
function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Precomputes stable spatial positions for all countries, cities, London areas,
 * and restaurants across the entire dataset (independent of active filters).
 */
export function precomputePlacesSpatialIndex(mealsData) {
  if (!mealsData) {
    return {
      countryPositions: new Map(),
      cityPositions: new Map(),
      areaPositions: new Map(),
      restaurantPositions: new Map(),
      londonCityId: null,
    };
  }

  const { restaurants, citiesById, countriesById, londonAreasById } = mealsData;

  // 1. Gather all raw coordinates by City
  const rawCoordsByCity = new Map();
  // 2. Gather all raw coordinates by London Area
  const rawCoordsByArea = new Map();

  // Find London city ID
  let londonCityId = null;
  if (citiesById) {
    for (const [id, city] of citiesById.entries()) {
      if ((city.name || '').trim().toLowerCase() === 'london') {
        londonCityId = id;
        break;
      }
    }
  }

  for (const r of restaurants || []) {
    const lat = r.latitude;
    const lng = r.longitude;
    if (lat == null || lng == null || (lat === 0 && lng === 0)) continue;

    const cityId = r.city?.id;
    if (cityId != null) {
      if (!rawCoordsByCity.has(cityId)) rawCoordsByCity.set(cityId, []);
      rawCoordsByCity.get(cityId).push({ lat, lng, restId: r.id });
    }

    const londonId = r.londonId;
    if (londonId != null) {
      if (!rawCoordsByArea.has(londonId)) rawCoordsByArea.set(londonId, []);
      rawCoordsByArea.get(londonId).push({ lat, lng, restId: r.id });
    }
  }

  // 3. Precompute City Positions (median, outlier filtered > 1.5° lat or > 2.5° lon)
  const cityPositions = new Map();
  for (const [cityId, coords] of rawCoordsByCity.entries()) {
    if (!coords.length) continue;
    const rawMedLat = median(coords.map((c) => c.lat));
    const rawMedLng = median(coords.map((c) => c.lng));

    // Filter outliers
    const filtered = coords.filter(
      (c) => Math.abs(c.lat - rawMedLat) <= 1.5 && Math.abs(c.lng - rawMedLng) <= 2.5
    );
    const useCoords = filtered.length > 0 ? filtered : coords;
    const lat = median(useCoords.map((c) => c.lat));
    const lon = median(useCoords.map((c) => c.lng));
    cityPositions.set(cityId, { lat, lon });
  }

  // 4. Precompute London Area Positions (median of area restaurants)
  const areaPositions = new Map();
  for (const [areaId, coords] of rawCoordsByArea.entries()) {
    if (!coords.length) continue;
    const lat = median(coords.map((c) => c.lat));
    const lon = median(coords.map((c) => c.lng));
    areaPositions.set(areaId, { lat, lon });
  }

  // 5. Precompute Country Positions
  const countryPositions = new Map();
  // Group computed city positions by country
  const cityPositionsByCountry = new Map();
  if (citiesById) {
    for (const [cId, cityPos] of cityPositions.entries()) {
      const city = citiesById.get(cId);
      const countryId = city?.countryId || city?.country?.id;
      if (countryId != null) {
        if (!cityPositionsByCountry.has(countryId)) {
          cityPositionsByCountry.set(countryId, []);
        }
        cityPositionsByCountry.get(countryId).push(cityPos);
      }
    }
  }

  if (countriesById) {
    for (const [countryId, country] of countriesById.entries()) {
      let lat = country.latitude;
      let lon = country.longitude;

      // Rule: If latitude is outside -90 to 90, pair was swapped (e.g. Japan): swap it back
      if (lat != null && lon != null) {
        if (lat < -90 || lat > 90) {
          const temp = lat;
          lat = lon;
          lon = temp;
        }
      }

      // Fallback: If missing, use median of that country's city positions
      if (lat == null || lon == null || (lat === 0 && lon === 0)) {
        const cCities = cityPositionsByCountry.get(countryId) || [];
        if (cCities.length > 0) {
          lat = median(cCities.map((c) => c.lat));
          lon = median(cCities.map((c) => c.lon));
        }
      }

      if (lat != null && lon != null) {
        countryPositions.set(countryId, { lat, lon });
      }
    }
  }

  // 6. Precompute Valid Restaurant Positions
  // Ignore 0,0 and values more than 1.5° lat / 2.5° lon from its city's position
  const restaurantPositions = new Map();
  for (const r of restaurants || []) {
    const lat = r.latitude;
    const lng = r.longitude;
    if (lat == null || lng == null || (lat === 0 && lng === 0)) continue;

    const cityId = r.city?.id;
    const cityPos = cityId != null ? cityPositions.get(cityId) : null;
    if (cityPos) {
      if (Math.abs(lat - cityPos.lat) > 1.5 || Math.abs(lng - cityPos.lon) > 2.5) {
        // Discard coordinate outlier
        continue;
      }
    }
    restaurantPositions.set(r.id, { lat, lon: lng });
  }

  return {
    countryPositions,
    cityPositions,
    areaPositions,
    restaurantPositions,
    londonCityId,
  };
}

/**
 * Filter meals according to active filters.
 */
export function filterPlacesMeals(meals, filters, londonCityId) {
  if (!Array.isArray(meals)) return [];

  const {
    country = '',
    city = '',
    area = '',
    type = '',
    from = 0,
    to = 9999,
    person = '',
  } = filters || {};

  const targetCountryId = country !== '' ? parseInt(country, 10) : null;
  const targetCityId = city !== '' ? parseInt(city, 10) : null;
  const targetAreaId = area !== '' ? parseInt(area, 10) : null;
  const targetPersonId = person !== '' && person !== 'all' ? parseInt(person, 10) : null;

  return meals.filter((m) => {
    const r = m.restaurant;
    if (!r) return false;

    // Year range filter
    const y = m.year;
    if (y && (y < from || y > to)) return false;

    // Restaurant Type (TypeGroup or Type)
    if (type !== '') {
      const tg = r.typeGroup || r.type?.typeGroup || r.type?.name;
      if (tg !== type) return false;
    }

    // Person filter
    if (targetPersonId != null) {
      const attendees = m.allPeopleIds || (m.companions || []).map((c) => c.peopleId);
      if (!attendees.includes(targetPersonId)) return false;
    }

    // Country filter
    const cId = r.city?.countryId || r.city?.country?.id;
    if (targetCountryId != null && cId !== targetCountryId) return false;

    // City filter
    const ciId = r.city?.id;
    if (targetCityId != null && ciId !== targetCityId) return false;

    // London Area filter
    if (targetAreaId != null && r.londonId !== targetAreaId) return false;

    return true;
  });
}

/**
 * Aggregates points and metrics for the 3D Places Globe at the current level.
 */
export function aggregatePlacesPoints({
  filteredMeals,
  mode = 'country',
  topN = 20,
  spatialIndex,
  mealsData,
}) {
  const {
    countryPositions,
    cityPositions,
    areaPositions,
    restaurantPositions,
    londonCityId,
  } = spatialIndex;

  const { citiesById, countriesById, londonAreasById } = mealsData;

  const countByPlaceId = new Map();
  const uniqueCountries = new Set();
  const uniqueCities = new Set();
  const uniqueRestaurants = new Set();

  let noCoordMeals = 0;
  let noAreaMeals = 0;

  for (const m of filteredMeals) {
    const r = m.restaurant;
    if (!r) continue;

    const restId = r.id;
    uniqueRestaurants.add(restId);

    const city = r.city;
    const cityId = city?.id;
    if (cityId != null) uniqueCities.add(cityId);

    const countryId = city?.countryId || city?.country?.id;
    if (countryId != null) uniqueCountries.add(countryId);

    if (mode === 'country') {
      if (countryId != null) {
        countByPlaceId.set(countryId, (countByPlaceId.get(countryId) || 0) + 1);
      }
    } else if (mode === 'city') {
      if (cityId != null) {
        const pos = cityPositions.get(cityId);
        if (!pos) {
          noCoordMeals++;
        } else {
          countByPlaceId.set(cityId, (countByPlaceId.get(cityId) || 0) + 1);
        }
      }
    } else if (mode === 'area') {
      const areaId = r.londonId;
      if (areaId == null) {
        noAreaMeals++;
      } else {
        countByPlaceId.set(areaId, (countByPlaceId.get(areaId) || 0) + 1);
      }
    } else {
      // mode === 'rest' (restaurant)
      const pos = restaurantPositions.get(restId);
      if (!pos) {
        noCoordMeals++;
      } else {
        countByPlaceId.set(restId, (countByPlaceId.get(restId) || 0) + 1);
      }
    }
  }

  // Build points array
  const allPoints = [];
  for (const [key, n] of countByPlaceId.entries()) {
    if (mode === 'country') {
      const c = countriesById?.get(key);
      const pos = countryPositions.get(key);
      if (c && pos) {
        allPoints.push({
          id: 'country:' + key,
          key,
          name: c.name,
          lat: pos.lat,
          lon: pos.lon,
          n,
        });
      }
    } else if (mode === 'city') {
      const city = citiesById?.get(key);
      const pos = cityPositions.get(key);
      if (city && pos) {
        const country = countriesById?.get(city.countryId || city.country?.id);
        allPoints.push({
          id: 'city:' + key,
          key,
          name: city.name,
          sub: country?.name || '',
          lat: pos.lat,
          lon: pos.lon,
          n,
        });
      }
    } else if (mode === 'area') {
      const areaName = londonAreasById?.get(key) || `Area #${key}`;
      const pos = areaPositions.get(key);
      if (pos) {
        allPoints.push({
          id: 'area:' + key,
          key,
          name: areaName,
          lat: pos.lat,
          lon: pos.lon,
          n,
        });
      }
    } else {
      // mode === 'rest'
      const rest = mealsData.restaurantsById?.get(key);
      const pos = restaurantPositions.get(key);
      if (rest && pos) {
        allPoints.push({
          id: 'rest:' + key,
          key,
          name: rest.name,
          sub: rest.city?.name || '',
          cityId: rest.city?.id,
          lat: pos.lat,
          lon: pos.lon,
          n,
        });
      }
    }
  }

  // Sort points: count descending, then alphabetical name ascending
  allPoints.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

  // Top N slice
  const topPoints = topN && topN > 0 ? allPoints.slice(0, topN) : allPoints;

  return {
    allPoints,
    topPoints,
    kpis: {
      meals: filteredMeals.length,
      countries: uniqueCountries.size,
      cities: uniqueCities.size,
      restaurants: uniqueRestaurants.size,
    },
    noCoordMeals,
    noAreaMeals,
  };
}
