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
    types = [],
    from = 0,
    to = 9999,
    decades = [],
    person = '',
    people = [],
  } = filters || {};

  const targetCountryId = country !== '' && country != null ? parseInt(country, 10) : null;
  const targetCityId = city !== '' && city != null ? parseInt(city, 10) : null;
  const targetAreaId = area !== '' && area != null ? parseInt(area, 10) : null;

  // Single person or multi-select people
  const targetPeopleIds = new Set();
  if (Array.isArray(people) && people.length > 0) {
    people.forEach((p) => {
      const pid = parseInt(p, 10);
      if (!isNaN(pid)) targetPeopleIds.add(pid);
    });
  } else if (person !== '' && person !== 'all' && person != null) {
    const pid = parseInt(person, 10);
    if (!isNaN(pid)) targetPeopleIds.add(pid);
  }

  // Single type or multi-select types
  const targetTypes = new Set();
  if (Array.isArray(types) && types.length > 0) {
    types.forEach((t) => {
      if (t) targetTypes.add(t);
    });
  } else if (type !== '' && type !== 'all' && type != null) {
    targetTypes.add(type);
  }

  const hasDecades = Array.isArray(decades) && decades.length > 0;
  const decadeSet = hasDecades ? new Set(decades) : null;

  return meals.filter((m) => {
    const r = m.restaurant;
    if (!r) return false;

    // Year range filter
    const y = m.year;
    if (y && (y < from || y > to)) return false;

    // Decade filter
    if (decadeSet) {
      const d = m.decade || (y ? `${Math.floor(y / 10) * 10}s` : null);
      if (!d || !decadeSet.has(d)) return false;
    }

    // Restaurant Type filter
    if (targetTypes.size > 0) {
      const tg = r.typeGroup || r.type?.typeGroup || r.type?.name;
      if (!tg || !targetTypes.has(tg)) return false;
    }

    // Person filter
    if (targetPeopleIds.size > 0) {
      const attendees = m.allPeopleIds || (m.companions || []).map((c) => c.peopleId);
      const matches = attendees.some((id) => targetPeopleIds.has(id));
      if (!matches) return false;
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
 * Calculates dynamic facet counts for the Places filter sidebar.
 */
export function calculatePlacesFacetCounts(meals, filters) {
  if (!Array.isArray(meals)) {
    return {
      countryCounts: {},
      cityCounts: {},
      typeCounts: {},
      decadeCounts: {},
      peopleCounts: {},
    };
  }

  const countryCounts = {};
  const cityCounts = {};
  const typeCounts = {};
  const decadeCounts = {};
  const peopleCounts = {};

  const targetCountryId = filters?.country !== '' && filters?.country != null ? parseInt(filters.country, 10) : null;
  const targetCityId = filters?.city !== '' && filters?.city != null ? parseInt(filters.city, 10) : null;
  const targetAreaId = filters?.area !== '' && filters?.area != null ? parseInt(filters.area, 10) : null;

  const targetTypes = new Set(
    Array.isArray(filters?.types) && filters.types.length > 0
      ? filters.types
      : filters?.type && filters.type !== 'all' ? [filters.type] : []
  );

  const targetPeopleIds = new Set(
    Array.isArray(filters?.people) && filters.people.length > 0
      ? filters.people.map((p) => parseInt(p, 10)).filter((p) => !isNaN(p))
      : filters?.person && filters.person !== 'all' ? [parseInt(filters.person, 10)].filter((p) => !isNaN(p)) : []
  );

  const from = filters?.from || 0;
  const to = filters?.to || 9999;
  const decadeSet = Array.isArray(filters?.decades) && filters.decades.length > 0 ? new Set(filters.decades) : null;

  for (const m of meals) {
    const r = m.restaurant;
    if (!r) continue;

    const y = m.year;
    const d = m.decade || (y ? `${Math.floor(y / 10) * 10}s` : null);
    const tg = r.typeGroup || r.type?.typeGroup || r.type?.name;
    const attendees = m.allPeopleIds || (m.companions || []).map((c) => c.peopleId);
    const cId = r.city?.countryId || r.city?.country?.id;
    const ciId = r.city?.id;
    const lId = r.londonId;

    const passYears = (!y || (y >= from && y <= to)) && (!decadeSet || (d && decadeSet.has(d)));
    const passType = targetTypes.size === 0 || (tg && targetTypes.has(tg));
    const passPerson = targetPeopleIds.size === 0 || attendees.some((id) => targetPeopleIds.has(id));
    const passCountry = targetCountryId == null || cId === targetCountryId;
    const passCity = targetCityId == null || ciId === targetCityId;
    const passArea = targetAreaId == null || lId === targetAreaId;
    const passGeo = passCountry && passCity && passArea;

    // 1. Country counts: matches years, type, person
    if (passYears && passType && passPerson && cId != null) {
      countryCounts[cId] = (countryCounts[cId] || 0) + 1;
    }

    // 2. City counts: matches years, type, person, and selected country
    if (passYears && passType && passPerson && passCountry && ciId != null) {
      cityCounts[ciId] = (cityCounts[ciId] || 0) + 1;
    }

    // 3. Type counts: matches geo, years, person
    if (passGeo && passYears && passPerson && tg) {
      typeCounts[tg] = (typeCounts[tg] || 0) + 1;
    }

    // 4. Decade counts: matches geo, type, person, year range
    if (passGeo && passType && passPerson && (!y || (y >= from && y <= to)) && d) {
      decadeCounts[d] = (decadeCounts[d] || 0) + 1;
    }

    // 5. People counts: matches geo, type, years
    if (passGeo && passType && passYears) {
      for (const pId of attendees) {
        peopleCounts[pId] = (peopleCounts[pId] || 0) + 1;
      }
    }
  }

  return {
    countryCounts,
    cityCounts,
    typeCounts,
    decadeCounts,
    peopleCounts,
  };
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
