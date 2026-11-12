import { slugifyPerson } from './journeySummary.js';
import { buildSentimentWordCloud, countSentimentHighCategories } from './sentimentAnalytics.js';

export const SOLO_PERSON_ID = 317;

/**
 * Checks if an ID or name refers to Stevie's solo dining identity ("Just Me !!")
 */
export function isSoloDiningPerson(id, name) {
  if (id === SOLO_PERSON_ID) return true;
  if (name && name.toLowerCase().includes('just me')) return true;
  return false;
}

/**
 * Normalizes string for case-insensitive search
 */
export function normalizeText(str) {
  return (str || '').toLowerCase().trim();
}

/**
 * Filter meals for People Overview according to:
 * - search (searches companion names, restaurant names, cities)
 * - country
 * - decade
 * - restaurantType
 */
export function filterPeopleMeals(meals = [], filters = {}) {
  const { search = '', country = '', decade = '', restaurantType = '' } = filters;
  const searchLower = search.trim().toLowerCase();

  return meals.filter((meal) => {
    // 1. Search Query
    if (searchLower) {
      const matchCompanion = (meal.companions || []).some((c) =>
        (c.publicName || '').toLowerCase().includes(searchLower)
      );
      const matchRest = (meal.restaurant?.name || '').toLowerCase().includes(searchLower);
      const matchCity = (meal.restaurant?.city?.name || '').toLowerCase().includes(searchLower);
      if (!matchCompanion && !matchRest && !matchCity) return false;
    }

    // 2. Country
    if (country) {
      const mealCountry = meal.restaurant?.city?.country?.name;
      if (!mealCountry || mealCountry.toLowerCase() !== country.toLowerCase()) return false;
    }

    // 3. Decade
    if (decade) {
      const year = meal.year;
      if (!year) return false;
      let mealDecade = 'Pre-1990';
      if (year >= 2020) mealDecade = '2020s';
      else if (year >= 2010) mealDecade = '2010s';
      else if (year >= 2000) mealDecade = '2000s';
      else if (year >= 1990) mealDecade = '1990s';
      if (mealDecade !== decade) return false;
    }

    // 4. Restaurant Type
    if (restaurantType) {
      const group = meal.restaurant?.type?.typeGroup || meal.restaurant?.type?.name;
      if (!group || group.toLowerCase() !== restaurantType.toLowerCase()) return false;
    }

    return true;
  });
}

/**
 * Compute KPI metrics for People Overview
 */
export function calculatePeopleOverviewKpis(filteredMeals = [], allMeals = [], publicPeopleById = new Map()) {
  const uniqueAllPeople = new Set();
  const uniquePublicPeople = new Set();
  const personMealCounts = new Map();

  for (const meal of filteredMeals) {
    for (const id of meal.allPeopleIds || []) {
      if (isSoloDiningPerson(id)) continue;
      uniqueAllPeople.add(id);
      personMealCounts.set(id, (personMealCounts.get(id) || 0) + 1);
    }
    for (const c of meal.companions || []) {
      if (
        c.peopleId &&
        c.publicName &&
        c.publicName.toLowerCase() !== 'hidden name' &&
        !isSoloDiningPerson(c.peopleId, c.publicName)
      ) {
        uniquePublicPeople.add(c.peopleId);
      }
    }
  }

  let repeatCount = 0;
  let oneOffCount = 0;

  for (const [id, count] of personMealCounts.entries()) {
    if (count > 1) {
      repeatCount++;
    } else if (count === 1) {
      oneOffCount++;
    }
  }

  // Count meals where Stevie dined on his own ("Just Me !!", ID 317)
  let justMeMealsCount = 0;
  for (const meal of filteredMeals) {
    const isJustMe = (meal.companions || []).some(
      (c) => isSoloDiningPerson(c.peopleId, c.publicName)
    );
    if (isJustMe) {
      justMeMealsCount++;
    }
  }

  const publicCount = uniquePublicPeople.size;
  const privateCount = Math.max(0, uniqueAllPeople.size - publicCount);

  // Top public companion
  let topCompanion = null;
  let maxMeals = 0;

  for (const personId of uniquePublicPeople) {
    const count = personMealCounts.get(personId) || 0;
    if (count > maxMeals) {
      maxMeals = count;
      const personRecord = publicPeopleById.get(personId);
      const name = personRecord ? (personRecord.publicName || personRecord.name) : `Person #${personId}`;
      topCompanion = {
        id: personId,
        name,
        count,
      };
    }
  }

  return {
    totalUniquePeople: uniqueAllPeople.size,
    publicPeople: publicCount,
    privatePeople: privateCount,
    repeatCompanions: repeatCount,
    oneOffCompanions: oneOffCount,
    justMeMealsCount,
    topCompanion: topCompanion || { name: 'None', count: 0 },
    filteredMealsCount: filteredMeals.length,
  };
}

/**
 * Compute "People Through Time" chart series
 * Groups unique people by year, distinguishing first-seen (new) vs returning (repeat)
 */
export function buildPeopleThroughTimeSeries(filteredMeals = [], allMeals = []) {
  // Precompute first year each canonical person was ever seen in allMeals
  const firstYearByPersonId = new Map();
  // Sort allMeals chronologically to get true first visit
  const chronologicalMeals = [...allMeals].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  for (const meal of chronologicalMeals) {
    const year = meal.year;
    if (!year) continue;
    for (const id of meal.allPeopleIds || []) {
      if (isSoloDiningPerson(id)) continue;
      if (!firstYearByPersonId.has(id)) {
        firstYearByPersonId.set(id, year);
      }
    }
  }

  // Group filtered meals by year
  const yearlyMap = new Map();

  for (const meal of filteredMeals) {
    const year = meal.year;
    if (!year) continue;
    if (!yearlyMap.has(year)) {
      yearlyMap.set(year, {
        year,
        allPeople: new Set(),
        publicPeople: new Set(),
      });
    }
    const entry = yearlyMap.get(year);
    for (const id of meal.allPeopleIds || []) {
      if (isSoloDiningPerson(id)) continue;
      entry.allPeople.add(id);
    }
    for (const c of meal.companions || []) {
      if (
        c.peopleId &&
        c.publicName &&
        c.publicName.toLowerCase() !== 'hidden name' &&
        !isSoloDiningPerson(c.peopleId, c.publicName)
      ) {
        entry.publicPeople.add(c.peopleId);
      }
    }
  }

  const sortedYears = Array.from(yearlyMap.keys()).sort((a, b) => a - b);
  let maxYearTotal = 1;

  const periods = sortedYears.map((year) => {
    const entry = yearlyMap.get(year);
    let newPeopleCount = 0;
    let repeatPeopleCount = 0;

    for (const personId of entry.allPeople) {
      const firstYear = firstYearByPersonId.get(personId);
      if (firstYear === year) {
        newPeopleCount++;
      } else {
        repeatPeopleCount++;
      }
    }

    const totalUnique = entry.allPeople.size;
    if (totalUnique > maxYearTotal) maxYearTotal = totalUnique;

    return {
      year,
      totalUnique,
      newCount: newPeopleCount,
      repeatCount: repeatPeopleCount,
      publicCount: entry.publicPeople.size,
      privateCount: Math.max(0, entry.allPeople.size - entry.publicPeople.size),
    };
  });

  return {
    periods,
    maxTotal: maxYearTotal,
  };
}

/**
 * Builds the Dining Circle / Social Network data
 * Deterministic circular network layout of top N public companions and their shared connections.
 */
export function buildDiningCircleNetwork(filteredMeals = [], publicPeopleById = new Map(), options = {}) {
  const { topN = 24, minShared = 2 } = options;

  // 1. Gather public people and their meal counts in filteredMeals
  const personMealsMap = new Map();
  // 2. Co-occurrence counts between pairs of public people
  const coOccurMap = new Map();

  for (const meal of filteredMeals) {
    if (!meal.companions || meal.companions.length === 0) continue;
    const comps = meal.companions.filter(
      (c) =>
        c.peopleId &&
        c.publicName &&
        c.publicName.toLowerCase() !== 'hidden name' &&
        !isSoloDiningPerson(c.peopleId, c.publicName)
    );

    for (let i = 0; i < comps.length; i++) {
      const idA = comps[i].peopleId;
      personMealsMap.set(idA, (personMealsMap.get(idA) || 0) + 1);

      for (let j = i + 1; j < comps.length; j++) {
        const idB = comps[j].peopleId;
        const [minId, maxId] = idA < idB ? [idA, idB] : [idB, idA];
        const pairKey = `${minId}_${maxId}`;
        coOccurMap.set(pairKey, (coOccurMap.get(pairKey) || 0) + 1);
      }
    }
  }

  // Rank people by meal count with Stevie
  const rankedPeople = Array.from(personMealsMap.entries())
    .map(([id, count]) => {
      const rec = publicPeopleById.get(id);
      const name = rec ? (rec.publicName || rec.name) : `Person #${id}`;
      return { id, name, count, slug: slugifyPerson(name) };
    })
    .sort((a, b) => b.count - a.count);

  const selectedPeople = rankedPeople.slice(0, topN);
  const selectedIds = new Set(selectedPeople.map((p) => p.id));

  // Compute circular layout coordinates (scaled up to occupy prominent left visual space)
  const radius = 165; // SVG orbit radius
  const cx = 280;
  const cy = 220;
  const numNodes = selectedPeople.length;

  const maxMeals = selectedPeople.length > 0 ? selectedPeople[0].count : 1;
  const minMeals = selectedPeople.length > 0 ? selectedPeople[selectedPeople.length - 1].count : 1;

  const nodes = selectedPeople.map((p, idx) => {
    // Angle evenly spaced around circle
    const angle = (idx / numNodes) * 2 * Math.PI - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    // Node radius between 7px and 18px (sleek, proportional)
    const normalizedSize = maxMeals > minMeals ? (p.count - minMeals) / (maxMeals - minMeals) : 0.5;
    const r = 7 + normalizedSize * 11;

    return {
      ...p,
      x,
      y,
      r,
      angle,
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Build links between selected nodes
  const links = [];
  let maxShared = 1;

  for (const [pairKey, sharedCount] of coOccurMap.entries()) {
    if (sharedCount < minShared) continue;
    const [idA, idB] = pairKey.split('_').map((s) => parseInt(s, 10));
    if (selectedIds.has(idA) && selectedIds.has(idB)) {
      if (sharedCount > maxShared) maxShared = sharedCount;
      const nodeA = nodeById.get(idA);
      const nodeB = nodeById.get(idB);
      links.push({
        sourceId: idA,
        targetId: idB,
        source: nodeA,
        target: nodeB,
        count: sharedCount,
      });
    }
  }

  // Sort links so thicker ones are drawn nicely
  links.sort((a, b) => a.count - b.count);

  return {
    nodes,
    links,
    maxShared,
    topN: selectedPeople.length,
    totalAvailable: rankedPeople.length,
    allCompanions: rankedPeople,
    cx,
    cy,
    radius,
    width: 560,
    height: 440,
  };
}

/**
 * Computes uppercase 1-2 letter initials for a person's name
 * e.g. "Lou Holland" -> "LH", "Dad" -> "D", "Rich Benson" -> "RB"
 */
export function getPersonInitials(name) {
  if (!name) return '?';
  const clean = name.trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Mines recurring groups of 1 to 5 public people
 * - 1-person groups represent Stevie + that 1 companion (1-on-1 dining)
 * - 2 to 5-person groups represent recurring dining combinations
 * - Applies subset suppression: if smaller group A is subset of larger group B,
 *   and shared meals between A and B account for >= 75% of group A's total meals,
 *   group A is suppressed in favor of the richer group B.
 */
export function mineRecurringGroups(filteredMeals = [], options = {}) {
  const { limit = 8, threshold = 0.75 } = options;
  const groupObjMap = new Map();

  for (const meal of filteredMeals) {
    const comps = (meal.companions || [])
      .filter(
        (c) =>
          c.peopleId &&
          c.publicName &&
          c.publicName.toLowerCase() !== 'hidden name' &&
          !isSoloDiningPerson(c.peopleId, c.publicName)
      )
      .map((c) => ({ id: c.peopleId, name: c.publicName }))
      .filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx)
      .sort((a, b) => a.id - b.id);

    if (comps.length === 0 || comps.length > 5) continue;
    const n = comps.length;

    function addCandidate(sub) {
      const subKey = sub.map((c) => c.id).join(',');
      let entry = groupObjMap.get(subKey);
      if (!entry) {
        entry = {
          key: subKey,
          ids: sub.map((c) => c.id),
          names: sub.map((c) => c.name),
          size: sub.length,
          mealIds: new Set(),
          firstDate: null,
          latestDate: null,
          venueCounts: new Map(),
          cityCounts: new Map(),
        };
        groupObjMap.set(subKey, entry);
      }
      entry.mealIds.add(meal.id);
      if (meal.date && (!entry.firstDate || meal.date < entry.firstDate)) entry.firstDate = meal.date;
      if (meal.date && (!entry.latestDate || meal.date > entry.latestDate)) entry.latestDate = meal.date;

      const restName = meal.restaurant?.name;
      const cityName = meal.restaurant?.city?.name;
      if (restName) {
        const venueLabel = cityName ? `${cityName} • ${restName}` : restName;
        entry.venueCounts.set(venueLabel, (entry.venueCounts.get(venueLabel) || 0) + 1);
      }
      if (cityName) {
        entry.cityCounts.set(cityName, (entry.cityCounts.get(cityName) || 0) + 1);
      }
    }

    // Subsets of size 2 to 5
    if (n >= 2) {
      for (let mask = 1; mask < (1 << n); mask++) {
        const sub = [];
        for (let i = 0; i < n; i++) {
          if ((mask & (1 << i)) !== 0) sub.push(comps[i]);
        }
        if (sub.length >= 2 && sub.length <= 5) {
          addCandidate(sub);
        }
      }
    } else if (n === 1) {
      // 1-on-1 meal
      addCandidate([comps[0]]);
    }
  }

  const minMeals = filteredMeals.length < 50 ? 2 : 3;
  const candidates = [];
  for (const entry of groupObjMap.values()) {
    if (entry.mealIds.size >= minMeals) {
      candidates.push({ ...entry, count: entry.mealIds.size });
    }
  }

  // Sort by count descending, then by larger size to favor richer groups
  candidates.sort((a, b) => (b.count !== a.count ? b.count - a.count : b.size - a.size));

  // Subset suppression: if groupA is subset of groupB, and sharedMeals / groupA.count >= threshold (default 75%), suppress groupA
  const suppressed = new Set();
  for (let i = 0; i < candidates.length; i++) {
    const groupA = candidates[i];
    if (suppressed.has(groupA.key)) continue;

    for (let j = 0; j < candidates.length; j++) {
      if (i === j) continue;
      const groupB = candidates[j];
      if (groupB.size <= groupA.size) continue;

      const isSubset = groupA.ids.every((id) => groupB.ids.includes(id));
      if (isSubset) {
        let shared = 0;
        for (const mid of groupB.mealIds) {
          if (groupA.mealIds.has(mid)) shared++;
        }
        const coverage = shared / groupA.count;
        if (coverage >= threshold) {
          suppressed.add(groupA.key);
          break;
        }
      }
    }
  }

  const unsuppressed = candidates.filter((g) => !suppressed.has(g.key)).slice(0, limit);

  return unsuppressed.map((g) => {
    // Find top venue
    let topVenue = null;
    let topVenueCount = 0;
    for (const [v, cnt] of g.venueCounts.entries()) {
      if (cnt > topVenueCount) {
        topVenue = v;
        topVenueCount = cnt;
      }
    }

    // Find top city
    let topCity = null;
    let topCityCount = 0;
    for (const [c, cnt] of g.cityCounts.entries()) {
      if (cnt > topCityCount) {
        topCity = c;
        topCityCount = cnt;
      }
    }

    // Format latest date (e.g. "Oct 2026")
    let formattedLatest = '';
    if (g.latestDate) {
      const parts = g.latestDate.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const dt = new Date(y, m, 1);
        if (!isNaN(dt.getTime())) {
          formattedLatest = dt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        }
      }
    }

    const firstYear = g.firstDate ? g.firstDate.slice(0, 4) : '';
    const latestYear = g.latestDate ? g.latestDate.slice(0, 4) : '';

    // Supporting detail: prefer top venue if at least 2 meals, else latest date, else city
    let supportingDetail = null;
    if (topVenue && topVenueCount >= 2) {
      supportingDetail = { type: 'venue', label: `Most often: ${topVenue}` };
    } else if (formattedLatest) {
      supportingDetail = { type: 'date', label: `Latest meal: ${formattedLatest}` };
    } else if (topCity) {
      supportingDetail = { type: 'city', label: `Most common: ${topCity}` };
    }

    const initials = g.names.map(getPersonInitials);

    return {
      ids: g.ids,
      names: g.names,
      count: g.count,
      firstDate: g.firstDate,
      latestDate: g.latestDate,
      topVenue,
      topVenueCount,
      topCity,
      formattedLatest,
      firstYear,
      latestYear,
      supportingDetail,
      initials,
    };
  });
}

/**
 * Computes frequency distribution bands across all canonical people (including private),
 * with a dedicated first band for solo dining ("Just Me / Dining alone").
 */
export function buildCompanionFrequencyDistribution(filteredMeals = []) {
  const personMealCounts = new Map();
  let soloMealsCount = 0;

  for (const meal of filteredMeals) {
    const isSolo = (meal.companions || []).some((c) => isSoloDiningPerson(c.peopleId, c.publicName));
    if (isSolo) {
      soloMealsCount++;
    }

    for (const id of meal.allPeopleIds || []) {
      if (isSoloDiningPerson(id)) continue;
      personMealCounts.set(id, (personMealCounts.get(id) || 0) + 1);
    }
  }

  const totalPeople = personMealCounts.size || 1;
  const totalMeals = filteredMeals.length || 1;

  const soloPct = Math.round((soloMealsCount / totalMeals) * 1000) / 10;
  const soloBand = {
    key: 'solo',
    label: 'Just Me / Dining alone',
    count: soloMealsCount,
    percentage: soloPct,
    isSolo: true,
    formattedStats: `${soloMealsCount.toLocaleString()} meals (${soloPct}%)`,
  };

  const bands = [
    { key: '1 meal', label: '1 meal (One-off)', count: 0, min: 1, max: 1 },
    { key: '2–5 meals', label: '2–5 meals', count: 0, min: 2, max: 5 },
    { key: '6–20 meals', label: '6–20 meals', count: 0, min: 6, max: 20 },
    { key: '21–50 meals', label: '21–50 meals', count: 0, min: 21, max: 50 },
    { key: '50+ meals', label: '50+ meals (Regulars)', count: 0, min: 51, max: Infinity },
  ];

  for (const [, count] of personMealCounts.entries()) {
    if (count === 1) bands[0].count++;
    else if (count <= 5) bands[1].count++;
    else if (count <= 20) bands[2].count++;
    else if (count <= 50) bands[3].count++;
    else bands[4].count++;
  }

  const companionBands = bands.map((b) => {
    const pct = Math.round((b.count / totalPeople) * 1000) / 10;
    return {
      ...b,
      percentage: pct,
      totalPeople,
      formattedStats: `${b.count.toLocaleString()} people (${pct}%)`,
    };
  });

  return [soloBand, ...companionBands];
}

/**
 * Extracts explicit historical-to-current identity transitions from People_Public
 * Strictly excludes private / hidden identities
 */
export function extractNamesThroughTime(rawPeoplePublic = [], allMeals = []) {
  if (!rawPeoplePublic || rawPeoplePublic.length === 0) return [];

  // 1. Gather historical date occurrences from meals for every historical ID
  const datesByPersonId = new Map();
  for (const meal of allMeals) {
    if (!meal.companions || !meal.date) continue;
    for (const comp of meal.companions) {
      for (const hId of comp.historicalIds || [comp.historicalPeopleId]) {
        if (!hId) continue;
        const entry = datesByPersonId.get(hId) || { count: 0, firstDate: meal.date, latestDate: meal.date };
        entry.count++;
        if (meal.date < entry.firstDate) entry.firstDate = meal.date;
        if (meal.date > entry.latestDate) entry.latestDate = meal.date;
        datesByPersonId.set(hId, entry);
      }
    }
  }

  const results = [];
  const seenMappings = new Set();

  for (const row of rawPeoplePublic) {
    const historicalId = parseInt(row.People_ID || row.people_id, 10);
    const canonicalId = parseInt(row.People_ID_Current || row.people_id_current, 10);
    const histName = (row.Public_Name || row.public_name || '').trim();
    const currName = (row.People_Name_Current || row.people_name_current || '').trim();

    if (isNaN(historicalId) || isNaN(canonicalId)) continue;

    // Must be public and non-hidden
    const isPublic = (row['Public?'] || row['public?'] || row['Public'] || row['public'] || '').trim().toUpperCase() === 'Y';
    if (!isPublic) continue;
    if (histName.toLowerCase() === 'hidden name' || currName.toLowerCase() === 'hidden name') continue;

    // Check if ID changed or name changed materially
    const isDifferentId = historicalId !== canonicalId;
    const isDifferentName = histName && currName && histName.toLowerCase() !== currName.toLowerCase();

    if (isDifferentId || isDifferentName) {
      const key = `${historicalId}_${canonicalId}`;
      if (seenMappings.has(key)) continue;
      seenMappings.add(key);

      const oldUsage = datesByPersonId.get(historicalId) || { count: 0, firstDate: null, latestDate: null };
      const newUsage = datesByPersonId.get(canonicalId) || { count: 0, firstDate: null, latestDate: null };

      const oldFirstYear = oldUsage.firstDate ? oldUsage.firstDate.slice(0, 4) : '';
      const oldLatestYear = oldUsage.latestDate ? oldUsage.latestDate.slice(0, 4) : '';
      const oldEra = oldFirstYear && oldLatestYear ? (oldFirstYear === oldLatestYear ? oldFirstYear : `${oldFirstYear}–${oldLatestYear}`) : '—';

      const newFirstYear = newUsage.firstDate ? newUsage.firstDate.slice(0, 4) : '';
      const newLatestYear = newUsage.latestDate ? newUsage.latestDate.slice(0, 4) : '';
      const newEra = newFirstYear && newLatestYear ? (newFirstYear === newLatestYear ? newFirstYear : `${newFirstYear}–${newLatestYear}`) : '—';

      const totalMeals = oldUsage.count + newUsage.count;

      // Determine primary transition era
      let transitionEra = 'Historical';
      if (newFirstYear) {
        transitionEra = `c. ${newFirstYear}`;
      } else if (oldLatestYear) {
        transitionEra = `Until ${oldLatestYear}`;
      }

      results.push({
        historicalId,
        canonicalId,
        historicalName: histName || `ID ${historicalId}`,
        currentName: currName || histName,
        oldMealCount: oldUsage.count,
        oldEra,
        oldFirstDate: oldUsage.firstDate,
        oldLatestDate: oldUsage.latestDate,
        newMealCount: newUsage.count,
        newEra,
        newFirstDate: newUsage.firstDate,
        newLatestDate: newUsage.latestDate,
        totalMeals,
        transitionEra,
        slug: slugifyPerson(currName || histName),
        // Retain backward-compatible fields
        mealCount: oldUsage.count,
        firstDate: oldUsage.firstDate,
        latestDate: oldUsage.latestDate,
      });
    }
  }

  // Sort by total combined meals descending
  results.sort((a, b) => b.totalMeals - a.totalMeals);
  return results;
}

/**
 * Builds the searchable and sortable People Directory
 */
export function buildPeopleDirectory(
  filteredMeals = [],
  publicPeopleById = new Map(),
  sortOption = 'meals_desc',
  searchQuery = ''
) {
  // Aggregate meals by canonical person ID
  const personStats = new Map();

  for (const meal of filteredMeals) {
    if (!meal.companions) continue;
    for (const comp of meal.companions) {
      const id = comp.peopleId;
      if (
        !id ||
        !comp.publicName ||
        comp.publicName.toLowerCase() === 'hidden name' ||
        isSoloDiningPerson(id, comp.publicName)
      ) {
        continue;
      }

      if (!personStats.has(id)) {
        const rec = publicPeopleById.get(id);
        const name = rec ? (rec.publicName || rec.name) : comp.publicName;
        personStats.set(id, {
          id,
          name,
          slug: slugifyPerson(name),
          mealCount: 0,
          firstMealDate: meal.date,
          latestMealDate: meal.date,
          firstMealYear: meal.year,
          latestMealYear: meal.year,
          cities: new Map(),
          restaurants: new Map(),
        });
      }

      const p = personStats.get(id);
      p.mealCount++;
      if (meal.date && (!p.firstMealDate || meal.date < p.firstMealDate)) {
        p.firstMealDate = meal.date;
        p.firstMealYear = meal.year;
      }
      if (meal.date && (!p.latestMealDate || meal.date > p.latestMealDate)) {
        p.latestMealDate = meal.date;
        p.latestMealYear = meal.year;
      }

      const cityName = meal.restaurant?.city?.name;
      if (cityName) {
        p.cities.set(cityName, (p.cities.get(cityName) || 0) + 1);
      }

      const restName = meal.restaurant?.name;
      if (restName) {
        p.restaurants.set(restName, (p.restaurants.get(restName) || 0) + 1);
      }
    }
  }

  let list = Array.from(personStats.values()).map((p) => {
    // Top city
    let topCity = 'Unknown';
    let topCityCount = 0;
    for (const [c, cnt] of p.cities.entries()) {
      if (cnt > topCityCount) {
        topCityCount = cnt;
        topCity = c;
      }
    }

    // Top restaurant
    let topRest = 'Unknown';
    let topRestCount = 0;
    for (const [r, cnt] of p.restaurants.entries()) {
      if (cnt > topRestCount) {
        topRestCount = cnt;
        topRest = r;
      }
    }

    const spanYears =
      p.latestMealYear && p.firstMealYear
        ? Math.max(1, p.latestMealYear - p.firstMealYear + 1)
        : 1;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      mealCount: p.mealCount,
      firstMealDate: p.firstMealDate,
      latestMealDate: p.latestMealDate,
      firstMealYear: p.firstMealYear,
      latestMealYear: p.latestMealYear,
      spanYears,
      topCity,
      topCityCount,
      topRestaurant: topRest,
      topRestaurantCount: topRestCount,
    };
  });

  // Search filter
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }

  // Sort
  list.sort((a, b) => {
    if (sortOption === 'meals_desc') return b.mealCount - a.mealCount;
    if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
    if (sortOption === 'recent_desc') {
      const dateA = a.latestMealDate || '';
      const dateB = b.latestMealDate || '';
      return dateB.localeCompare(dateA);
    }
    if (sortOption === 'span_desc') return b.spanYears - a.spanYears;
    return b.mealCount - a.mealCount;
  });

  return list;
}

/**
 * Builds all data for the Individual Person view
 */
export function buildIndividualProfileData(targetPersonIdOrSlug, allMeals = [], publicPeopleById = new Map(), mealsData = {}) {
  if (!targetPersonIdOrSlug) return null;

  // 1. Resolve person by ID or Slug
  let personRecord = null;
  const isNumeric = !isNaN(parseInt(targetPersonIdOrSlug, 10));

  if (isNumeric) {
    const id = parseInt(targetPersonIdOrSlug, 10);
    personRecord = publicPeopleById.get(id);
  }

  if (!personRecord) {
    // Search by slug or name
    for (const [, p] of publicPeopleById.entries()) {
      const name = p.publicName || p.name || '';
      if (slugifyPerson(name) === targetPersonIdOrSlug || String(p.peopleId) === String(targetPersonIdOrSlug)) {
        personRecord = p;
        break;
      }
    }
  }

  if (!personRecord) return null;

  const personId = personRecord.peopleId;
  const personName = personRecord.publicName || personRecord.name;
  const personSlug = slugifyPerson(personName);

  // 2. Precompute Stevie's first-ever visit date to every restaurant in allMeals
  const firstVisitByRestaurantId = new Map();
  const sortedAllMeals = [...allMeals].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  for (const m of sortedAllMeals) {
    if (m.restaurant?.id && !firstVisitByRestaurantId.has(m.restaurant.id)) {
      firstVisitByRestaurantId.set(m.restaurant.id, m.id);
    }
  }

  // 3. Gather all meals with this person
  const personMeals = allMeals.filter((m) =>
    (m.companions || []).some((c) => c.peopleId === personId)
  );

  if (personMeals.length === 0) {
    return {
      person: { id: personId, name: personName, slug: personSlug, mealCount: 0 },
      headlineSummary: '0 meals',
      heroPhotos: [],
      timeline: [],
      coreMetrics: {},
      globeCityPoints: [],
      favouriteHaunts: [],
      otherCompanions: [],
      privateCompanionMeals: 0,
      sentimentWordCloud: { words: [], maxCount: 0, minCount: 0, totalSentiments: 0 },
      sentimentCounts: { Positive: 0, Neutral: 0, Negative: 0, Other: 0, total: 0 },
      diningGeography: { cities: [], countries: [], restaurantTypes: [] },
      storyComments: [],
    };
  }

  // Sort chronological for metrics
  personMeals.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const totalMeals = personMeals.length;
  const firstMeal = personMeals[0];
  const latestMeal = personMeals[personMeals.length - 1];
  const firstYear = firstMeal.year || (firstMeal.date ? parseInt(firstMeal.date.slice(0, 4), 10) : 2000);
  const latestYear = latestMeal.year || (latestMeal.date ? parseInt(latestMeal.date.slice(0, 4), 10) : 2026);
  const spanYears = Math.max(1, latestYear - firstYear + 1);

  const headlineSummary = `${totalMeals.toLocaleString()} ${
    totalMeals === 1 ? 'meal' : 'meals'
  } • ${firstYear}–${latestYear} • ${spanYears} ${spanYears === 1 ? 'year' : 'years'}`;

  // 4. Hero Photos (rotating meal photos from shared dining)
  const heroPhotos = [];
  for (const m of personMeals) {
    for (const p of m.photos || []) {
      if (p.url && !p.url.endsWith('/.jpg')) {
        heroPhotos.push({
          id: p.id,
          url: p.url,
          caption: p.comment || `${m.restaurant?.name || 'Meal'} (${m.formattedDate || m.date})`,
          restaurantName: m.restaurant?.name || 'Restaurant',
          restaurantId: m.restaurant?.id,
          date: m.formattedDate || m.date,
          rating: m.rating,
          mealId: m.id,
        });
      }
    }
  }

  // 5. Timeline data
  const timeline = personMeals.map((m) => {
    let formattedValue = null;
    if (typeof m.valueGBP === 'number' && !isNaN(m.valueGBP) && m.valueGBP > 0) {
      formattedValue = `£${m.valueGBP.toFixed(2)}`;
    } else if (m.value) {
      formattedValue = String(m.value);
    }
    return {
      id: m.id,
      date: m.date,
      formattedDate: m.formattedDate || m.date,
      year: m.year,
      restaurantId: m.restaurant?.id,
      restaurantName: m.restaurant?.name || 'Unnamed Restaurant',
      city: m.restaurant?.city?.name || '',
      rating: m.rating || 'Unrated',
      valueGBP: m.valueGBP != null ? m.valueGBP : null,
      formattedValue,
      comment: m.comment || null,
      hasPhoto: (m.photos || []).length > 0,
      photoUrl: (m.photos || [])[0]?.url || null,
    };
  });

  // 6. Core metrics
  const uniqueRestaurantsSet = new Set();
  const uniqueCitiesSet = new Set();
  const uniqueCountriesSet = new Set();
  let newVenuesTogetherCount = 0;

  for (const m of personMeals) {
    if (m.restaurant?.id) {
      uniqueRestaurantsSet.add(m.restaurant.id);
      if (firstVisitByRestaurantId.get(m.restaurant.id) === m.id) {
        newVenuesTogetherCount++;
      }
    }
    if (m.restaurant?.city?.id) uniqueCitiesSet.add(m.restaurant.city.id);
    if (m.restaurant?.city?.country?.id) uniqueCountriesSet.add(m.restaurant.city.country.id);
  }

  const coreMetrics = {
    totalMeals,
    uniqueRestaurants: uniqueRestaurantsSet.size,
    uniqueCities: uniqueCitiesSet.size,
    uniqueCountries: uniqueCountriesSet.size,
    firstMealDate: firstMeal.formattedDate || firstMeal.date,
    latestMealDate: latestMeal.formattedDate || latestMeal.date,
    relationshipSpanYears: spanYears,
    newVenuesTogether: newVenuesTogetherCount,
  };

  // 7. Favourite Haunts (Ranked top restaurants)
  const restCountsMap = new Map();
  for (const m of personMeals) {
    const r = m.restaurant;
    if (!r?.id) continue;
    if (!restCountsMap.has(r.id)) {
      restCountsMap.set(r.id, {
        id: r.id,
        name: r.name,
        city: r.city?.name || '',
        country: r.city?.country?.name || '',
        count: 0,
        firstVisit: m.formattedDate || m.date,
        latestVisit: m.formattedDate || m.date,
        latestRating: m.rating,
      });
    }
    const rec = restCountsMap.get(r.id);
    rec.count++;
    rec.latestVisit = m.formattedDate || m.date;
    rec.latestRating = m.rating;
  }

  const favouriteHaunts = Array.from(restCountsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 8. Who Else Was at the Table? (other companions)
  const otherCompanionsMap = new Map();
  let privateCompanionMeals = 0;

  for (const m of personMeals) {
    // Check private companions on this meal
    const hasPrivateOnMeal = (m.allPeopleIds || []).some(
      (id) => !publicPeopleById.has(id) && !isSoloDiningPerson(id)
    );
    if (hasPrivateOnMeal) privateCompanionMeals++;

    for (const c of m.companions || []) {
      if (
        c.peopleId &&
        c.peopleId !== personId &&
        c.publicName &&
        c.publicName.toLowerCase() !== 'hidden name' &&
        !isSoloDiningPerson(c.peopleId, c.publicName)
      ) {
        if (!otherCompanionsMap.has(c.peopleId)) {
          otherCompanionsMap.set(c.peopleId, {
            id: c.peopleId,
            name: c.publicName,
            slug: slugifyPerson(c.publicName),
            count: 0,
          });
        }
        otherCompanionsMap.get(c.peopleId).count++;
      }
    }
  }

  const otherCompanions = Array.from(otherCompanionsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((c) => ({
      ...c,
      percentage: Math.round((c.count / totalMeals) * 100),
    }));

  // 9. Dining Geography / Types
  const citiesMap = new Map();
  const countriesMap = new Map();
  const typesMap = new Map();

  for (const m of personMeals) {
    const cityName = m.restaurant?.city?.name;
    if (cityName) citiesMap.set(cityName, (citiesMap.get(cityName) || 0) + 1);

    const countryName = m.restaurant?.city?.country?.name;
    if (countryName) countriesMap.set(countryName, (countriesMap.get(countryName) || 0) + 1);

    const typeGroup = m.restaurant?.type?.typeGroup || m.restaurant?.type?.name;
    if (typeGroup) typesMap.set(typeGroup, (typesMap.get(typeGroup) || 0) + 1);
  }

  const topCities = Array.from(citiesMap.entries())
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalMeals) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topCountries = Array.from(countriesMap.entries())
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalMeals) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topTypes = Array.from(typesMap.entries())
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalMeals) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 10. Globe Points (Aggregate at city level for 3D Globe)
  // Use city positions from mealsData or calculate median lat/lon of restaurants in each city
  const cityCoordsMap = new Map();
  for (const m of personMeals) {
    const city = m.restaurant?.city;
    if (!city?.id) continue;
    const lat = m.restaurant.latitude;
    const lon = m.restaurant.longitude;
    if (lat != null && lon != null && !(lat === 0 && lon === 0)) {
      if (!cityCoordsMap.has(city.id)) {
        cityCoordsMap.set(city.id, {
          id: city.id,
          name: city.name,
          lats: [],
          lons: [],
          count: 0,
        });
      }
      const entry = cityCoordsMap.get(city.id);
      entry.lats.push(lat);
      entry.lons.push(lon);
      entry.count++;
    }
  }

  const globeCityPoints = Array.from(cityCoordsMap.values()).map((c) => {
    // Median lat and lon
    const sortedLats = [...c.lats].sort((a, b) => a - b);
    const sortedLons = [...c.lons].sort((a, b) => a - b);
    const mid = Math.floor(sortedLats.length / 2);
    return {
      id: c.id,
      name: c.name,
      lat: sortedLats[mid],
      lon: sortedLons[mid],
      n: c.count,
    };
  });

  // 11. Comments / Story section ("The Comments Tell the Story")
  // Pick meaningful, chronological comments from shared meals
  const mealsWithComments = personMeals.filter((m) => m.comment && m.comment.trim().length > 10);
  const storyComments = [];

  if (mealsWithComments.length > 0) {
    if (mealsWithComments.length <= 6) {
      storyComments.push(...mealsWithComments);
    } else {
      // Pick earliest, latest, and evenly distributed in-between comments
      const numToPick = Math.min(6, mealsWithComments.length);
      const step = (mealsWithComments.length - 1) / (numToPick - 1);
      const pickedIndices = new Set();
      for (let i = 0; i < numToPick; i++) {
        const idx = Math.min(mealsWithComments.length - 1, Math.round(i * step));
        if (!pickedIndices.has(idx)) {
          pickedIndices.add(idx);
          storyComments.push(mealsWithComments[idx]);
        }
      }
    }
  }

  const formattedComments = storyComments.map((m) => ({
    mealId: m.id,
    date: m.formattedDate || m.date,
    year: m.year,
    restaurantName: m.restaurant?.name || 'Restaurant',
    restaurantId: m.restaurant?.id,
    rating: m.rating,
    comment: m.comment,
  }));

  // 12. Sentiment Reflections & Word Cloud
  const sentimentWordCloud = buildSentimentWordCloud(personMeals, {
    minFontSize: 12,
    maxFontSize: 24,
    maxWords: 35,
  });
  const sentimentCounts = countSentimentHighCategories(personMeals);

  return {
    person: {
      id: personId,
      name: personName,
      slug: personSlug,
      mealCount: totalMeals,
    },
    headlineSummary,
    heroPhotos,
    timeline,
    coreMetrics,
    globeCityPoints,
    favouriteHaunts,
    otherCompanions,
    privateCompanionMeals,
    sentimentWordCloud,
    sentimentCounts,
    diningGeography: {
      cities: topCities,
      countries: topCountries,
      restaurantTypes: topTypes,
    },
    storyComments: formattedComments,
  };
}
