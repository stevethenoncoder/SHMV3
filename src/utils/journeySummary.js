/**
 * Generates the film summary data object required by the 3D Meal Film engine.
 * Matches my-journey-handover/HANDOVER.md and reference/build_film_data.py specifications.
 */

const SCORE = {
  'The Dogs': 5,
  'Exceptional': 4.5,
  'Very Good': 4,
  'Fine': 3,
  "OK but wouldn't recommend": 2,
  'Very Bad': 1,
  'Never Again': 0.5,
  'The Worst in the World': 0,
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatFilmDate(dateStrOrObj) {
  if (!dateStrOrObj) return '';
  const d = dateStrOrObj instanceof Date ? dateStrOrObj : new Date(dateStrOrObj + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function slugifyPerson(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function calculateMedian(coordsList) {
  if (!coordsList || coordsList.length === 0) return [0, 0];
  const lats = coordsList.map((p) => p[0]).sort((a, b) => a - b);
  const lons = coordsList.map((p) => p[1]).sort((a, b) => a - b);
  const mid = Math.floor(coordsList.length / 2);
  return [
    Math.round(lats[mid] * 1000) / 1000,
    Math.round(lons[mid] * 1000) / 1000,
  ];
}

/**
 * Builds the film summary object for a given person.
 *
 * @param {Object} mealsData - Data loaded by loadMealsData()
 * @param {number|string|null} [personId] - Numeric ID, slug, or null for Steve Holland (all meals)
 * @returns {Object|null} Film summary object or null if no meals found
 */
export function buildFilmSummary(mealsData, personId = null) {
  if (!mealsData || !Array.isArray(mealsData.meals)) return null;

  const isSelf =
    personId === null ||
    personId === undefined ||
    personId === 'steve' ||
    personId === 'steve-holland';

  let targetPersonId = null;
  let shortName = 'Steve';
  let fullName = 'Steve Holland';

  if (!isSelf) {
    // Resolve person from numeric ID or slug
    if (typeof personId === 'number' || !isNaN(Number(personId))) {
      targetPersonId = Number(personId);
      const p = mealsData.publicPeopleById?.get(targetPersonId);
      if (p) {
        fullName = p.publicName.trim();
        shortName = fullName.split(/\s+/)[0];
      }
    } else {
      // String slug matching
      const targetSlug = slugifyPerson(personId);
      if (mealsData.publicPeopleById) {
        for (const [id, p] of mealsData.publicPeopleById.entries()) {
          if (slugifyPerson(p.publicName) === targetSlug) {
            targetPersonId = id;
            fullName = p.publicName.trim();
            shortName = fullName.split(/\s+/)[0];
            break;
          }
        }
      }
      // Fallback check against rawPeoplePublic if not in publicPeopleById
      if (targetPersonId === null && Array.isArray(mealsData.rawPeoplePublic)) {
        for (const row of mealsData.rawPeoplePublic) {
          const name = (row.Public_Name || '').trim();
          if (name && slugifyPerson(name) === targetSlug) {
            targetPersonId = parseInt(row.People_ID, 10);
            fullName = name;
            shortName = name.split(/\s+/)[0];
            break;
          }
        }
      }
    }

    if (targetPersonId === null && !fullName) {
      return null;
    }
  }

  // Filter meals for the selected person
  const personMeals = mealsData.meals.filter((m) => {
    if (!m.date) return false;
    if (isSelf) return true;
    const hasInAll = m.allPeopleIds && m.allPeopleIds.includes(targetPersonId);
    const hasInCompanions =
      m.companions && m.companions.some((c) => c.peopleId === targetPersonId);
    return hasInAll || hasInCompanions;
  });

  if (personMeals.length === 0) return null;

  // 1. Dates: First & Latest
  const mealDateObjects = personMeals
    .map((m) => ({ meal: m, date: new Date(m.date + 'T00:00:00') }))
    .filter((x) => !isNaN(x.date.getTime()))
    .sort((a, b) => a.date - b.date);

  if (mealDateObjects.length === 0) return null;

  const firstDate = mealDateObjects[0].date;
  const latestDate = mealDateObjects[mealDateObjects.length - 1].date;
  const first = formatFilmDate(firstDate);
  const latest = formatFilmDate(latestDate);

  // 2. Distinct Restaurants
  const distinctRestIds = new Set();
  for (const m of personMeals) {
    if (m.restaurant && m.restaurant.id) {
      distinctRestIds.add(m.restaurant.id);
    }
  }
  const restaurantsCount = distinctRestIds.size;

  // 3. Cuisines (TypeGroup without .png)
  const cuisineCounts = new Map();
  for (const m of personMeals) {
    const rawGroup =
      m.restaurant?.typeGroup ||
      m.restaurant?.type?.typeGroup ||
      'General';
    const cleanGroup = rawGroup.replace(/\.png$/i, '').trim() || 'General';
    cuisineCounts.set(cleanGroup, (cuisineCounts.get(cleanGroup) || 0) + 1);
  }

  const sortedCuisines = Array.from(cuisineCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  const top8Cuisines = sortedCuisines.slice(0, 8);
  const cuisines = top8Cuisines.map(([name, n]) => ({ name, n }));
  const otherSum = sortedCuisines
    .slice(8)
    .reduce((sum, [, n]) => sum + n, 0);
  if (otherSum > 0) {
    cuisines.push({ name: 'Other', n: otherSum });
  }

  // 4. Years: complete sequence from first to latest year
  const yearCounts = new Map();
  for (const { date } of mealDateObjects) {
    const y = date.getFullYear();
    yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
  }
  const years = [];
  for (let y = firstDate.getFullYear(); y <= latestDate.getFullYear(); y++) {
    years.push([y, yearCounts.get(y) || 0]);
  }

  // 5. World: meals by Country (UK nations separate)
  // Pre-index countries by name for instant coordinate / ISO lookup
  const countriesByName = new Map();
  if (mealsData.countriesById) {
    for (const c of mealsData.countriesById.values()) {
      if (c && c.name) {
        countriesByName.set(c.name.trim().toLowerCase(), c);
      }
    }
  }

  const countryMealCounts = new Map();
  const distinctCountryNames = new Set();

  for (const m of personMeals) {
    const ctry =
      m.restaurant?.city?.countryName ||
      m.restaurant?.city?.country?.name ||
      '';
    const ctryTrimmed = ctry.trim();
    if (ctryTrimmed) {
      distinctCountryNames.add(ctryTrimmed);
      countryMealCounts.set(
        ctryTrimmed,
        (countryMealCounts.get(ctryTrimmed) || 0) + 1
      );
    }
  }

  const sortedCountries = Array.from(countryMealCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  const world = [];
  for (const [cName, n] of sortedCountries) {
    if (world.length >= 8) break;
    const cMeta = countriesByName.get(cName.toLowerCase());
    if (cMeta && cMeta.latitude != null && cMeta.longitude != null) {
      let la = cMeta.latitude;
      let lo = cMeta.longitude;
      // Japan coordinate swap safeguard: latitude outside -90..90
      if (Math.abs(la) > 90) {
        const tmp = la;
        la = lo;
        lo = tmp;
      }
      const iso = (cMeta.isoCode || '').trim().slice(0, 2);
      world.push({
        name: cName,
        lat: Math.round(la * 100) / 100,
        lon: Math.round(lo * 100) / 100,
        n,
        iso,
      });
    }
  }

  // 40-iteration tower repulsion algorithm
  for (let it = 0; it < 40; it++) {
    for (const a of world) {
      for (const b of world) {
        if (a === b) continue;
        const dx = (b.lon - a.lon) * 0.62;
        const dy = b.lat - a.lat;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        if (d < 3.4) {
          const p = ((3.4 - d) / 2) * 0.5;
          const wa = a.n < b.n ? 1.0 : 0.25;
          a.lon -= ((dx / d) * p * wa) / 0.62;
          a.lat -= (dy / d) * p * wa;
        }
      }
    }
  }
  for (const a of world) {
    a.lat = Math.round(a.lat * 100) / 100;
    a.lon = Math.round(a.lon * 100) / 100;
  }

  const topCountry = world[0]?.name || '';
  const areaCountry = topCountry;
  const areaIso = world[0]?.iso || '';
  const countriesCount = distinctCountryNames.size;

  // 6. Areas: Top 7 cities within top country
  const cityMealCounts = new Map();
  const cityPositions = new Map();

  for (const m of personMeals) {
    const r = m.restaurant;
    if (!r) continue;
    const ctry = (r.city?.countryName || r.city?.country?.name || '').trim();
    const cityName = (r.city?.name || '').trim();
    if (ctry === topCountry && cityName) {
      cityMealCounts.set(cityName, (cityMealCounts.get(cityName) || 0) + 1);
      const la = r.latitude;
      const lo = r.longitude;
      if (la != null && lo != null && !isNaN(la) && !isNaN(lo)) {
        if (la > -89 && la < 89 && lo > -179 && lo < 179) {
          if (Math.abs(la) > 0.01 || Math.abs(lo) > 0.01) {
            if (!cityPositions.has(cityName)) cityPositions.set(cityName, []);
            cityPositions.get(cityName).push([la, lo]);
          }
        }
      }
    }
  }

  const sortedCities = Array.from(cityMealCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14);

  const areas = [];
  for (const [cityName, n] of sortedCities) {
    const pts = cityPositions.get(cityName);
    if (pts && pts.length > 0 && areas.length < 7) {
      const [lat, lon] = calculateMedian(pts);
      areas.push({ name: cityName, n, lat, lon });
    }
  }

  // 7. London Areas: Top 7 London areas when top area is London
  const london = [];
  if (areas.length > 0 && areas[0].name === 'London') {
    const londonMealCounts = new Map();
    const londonPositions = new Map();

    for (const m of personMeals) {
      const r = m.restaurant;
      if (!r) continue;
      const cityName = (r.city?.name || '').trim();
      if (cityName === 'London') {
        const areaName =
          r.londonArea ||
          (r.londonId && mealsData.londonAreasById?.get(r.londonId)) ||
          null;
        if (areaName) {
          londonMealCounts.set(
            areaName,
            (londonMealCounts.get(areaName) || 0) + 1
          );
          const la = r.latitude;
          const lo = r.longitude;
          if (la != null && lo != null && !isNaN(la) && !isNaN(lo)) {
            if (la > 51.28 && la < 51.70 && lo > -0.52 && lo < 0.30) {
              if (!londonPositions.has(areaName)) londonPositions.set(areaName, []);
              londonPositions.get(areaName).push([la, lo]);
            }
          }
        }
      }
    }

    const sortedLondonAreas = Array.from(londonMealCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);

    for (const [areaName, n] of sortedLondonAreas) {
      const pts = londonPositions.get(areaName);
      if (pts && pts.length > 0 && london.length < 7) {
        const [lat, lon] = calculateMedian(pts);
        london.push({ name: areaName, n, lat, lon });
      }
    }
  }

  // 8. Top 6 Restaurants
  // Group meals by restaurant
  const mealsByRestId = new Map();
  for (const m of personMeals) {
    if (m.restaurant && m.restaurant.id) {
      if (!mealsByRestId.has(m.restaurant.id)) {
        mealsByRestId.set(m.restaurant.id, []);
      }
      mealsByRestId.get(m.restaurant.id).push(m);
    }
  }

  const sortedRestEntries = Array.from(mealsByRestId.entries())
    .map(([rid, ms]) => ({ rid, count: ms.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);

  const topCandidates = [];
  for (const { rid, count } of sortedRestEntries) {
    const ms = mealsByRestId.get(rid) || [];
    const rest = ms[0]?.restaurant;
    if (!rest) continue;

    const restName = (rest.name || '').trim();
    if (
      !restName ||
      restName === 'TBA' ||
      restName.toLowerCase().startsWith('random')
    ) {
      continue;
    }

    // Star score calculation
    const scores = ms.map((m) => SCORE[m.rating] ?? 3);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    // Rating verdicts
    const ratingFreq = new Map();
    for (const m of ms) {
      const rText = m.rating?.trim() || 'Fine';
      ratingFreq.set(rText, (ratingFreq.get(rText) || 0) + 1);
    }
    const sortedRatings = Array.from(ratingFreq.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    const baseVerdict =
      sortedRatings.length === 1 ||
      sortedRatings[0][1] > (sortedRatings[1]?.[1] || 0)
        ? sortedRatings[0][0]
        : 'Mixed verdicts';

    const verdictText =
      baseVerdict !== 'Mixed verdicts' && count > 1
        ? `Usually ${baseVerdict}`
        : baseVerdict;

    // Latest visit timestamp
    const latestVisitTime = Math.max(
      ...ms.map((m) => {
        const t = m.timestamp || new Date(m.date + 'T00:00:00').getTime();
        return isNaN(t) ? 0 : t;
      })
    );

    const cityName = (rest.city?.name || '').trim();
    const typeGroup =
      (rest.typeGroup || rest.type?.typeGroup || 'General')
        .replace(/\.png$/i, '')
        .trim() || 'General';
    const iconUrl = rest.typeIcon || rest.type?.typeIcon || '';

    topCandidates.push({
      name: restName,
      city: cityName,
      typeGroup,
      visits: count,
      avgScore,
      verdictText,
      iconUrl,
      latestVisitTime,
    });
  }

  topCandidates.sort((a, b) => {
    if (b.visits !== a.visits) return b.visits - a.visits;
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    return b.latestVisitTime - a.latestVisitTime;
  });

  const top = topCandidates.slice(0, 6).map((t) => [
    t.name,
    t.city,
    t.typeGroup,
    t.visits,
    Math.round(t.avgScore * 10) / 10,
    t.verdictText,
    t.iconUrl,
  ]);

  // 9. Companions & CompanionsTotal
  // companionsTotal counts all distinct companion IDs (including hidden names)
  const companionFrequencies = new Map();
  for (const m of personMeals) {
    const pIds = m.allPeopleIds || [];
    for (const pId of pIds) {
      if (pId !== targetPersonId) {
        companionFrequencies.set(
          pId,
          (companionFrequencies.get(pId) || 0) + 1
        );
      }
    }
  }
  const companionsTotal = companionFrequencies.size;

  // Filter top 10 public companions: non-hidden, not 'Just Me', no phone numbers
  const publicCompanionList = [];
  for (const [pId, count] of companionFrequencies.entries()) {
    const pObj = mealsData.publicPeopleById?.get(pId);
    let pName = pObj?.publicName?.trim();
    if (!pName && Array.isArray(mealsData.rawPeoplePublic)) {
      const match = mealsData.rawPeoplePublic.find(
        (r) => parseInt(r.People_ID, 10) === pId
      );
      pName = (match?.Public_Name || '').trim();
    }
    if (
      pName &&
      pName !== 'Hidden name' &&
      !pName.includes('Just Me') &&
      !/\d{3}/.test(pName)
    ) {
      publicCompanionList.push([pName, count]);
    }
  }

  publicCompanionList.sort((a, b) => b[1] - a[1]);
  const companions = publicCompanionList.slice(0, 10);

  // 10. Photos
  // Every photo from the person's meals: [url, restaurantName, mealFormattedDate, mealComment]
  const photos = [];
  for (const m of personMeals) {
    for (const p of m.photos || []) {
      const pUrl = (p.url || '').trim();
      if (pUrl && pUrl.startsWith('https://')) {
        photos.push([
          pUrl,
          (m.restaurant?.name || '').trim(),
          m.formattedDate || formatFilmDate(m.date),
          (m.comment || '').trim(),
        ]);
      }
    }
  }

  // 11. Comments: up to 7 short comments (11-43 chars, non-negative sentiment)
  const validComments = [];
  for (const m of personMeals) {
    const cText = (m.comment || '').trim();
    if (
      cText.length > 10 &&
      cText.length < 44 &&
      m.sentimentCategory !== 'Negative'
    ) {
      validComments.push(cText);
    }
  }
  const step = Math.max(1, Math.floor(validComments.length / 7));
  const comments = [];
  for (let i = 0; i < validComments.length && comments.length < 7; i += step) {
    comments.push(validComments[i]);
  }
  if (comments.length === 0) {
    comments.push('A good one');
  }

  // 12. Verdict & Exceptional
  const mealRatingCounts = new Map();
  let exceptionalCount = 0;
  for (const m of personMeals) {
    const r = m.rating?.trim() || 'Fine';
    mealRatingCounts.set(r, (mealRatingCounts.get(r) || 0) + 1);
    if (r === 'The Dogs' || r === 'Exceptional') {
      exceptionalCount++;
    }
  }
  const sortedMealRatings = Array.from(mealRatingCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  const verdict = sortedMealRatings[0] || ['Fine', 0];

  return {
    name: shortName,
    full: fullName,
    me: isSelf,
    host: 'Steve',
    areaCountry,
    areaIso,
    first,
    latest,
    restaurants: restaurantsCount,
    cuisines,
    years,
    world,
    countries: countriesCount,
    areas,
    london,
    top,
    companions,
    companionsTotal,
    photos,
    comments,
    verdict: [verdict[0], verdict[1]],
    exceptional: exceptionalCount,
  };
}
