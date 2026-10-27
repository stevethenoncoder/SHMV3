import { getStatusStyle } from './statusColors.js';

/**
 * Normalises a raw status string into one of the 4 canonical journey statuses:
 * 'Blogged', 'Visited', 'Planned', or 'Not planned'.
 * Missing/blank statuses are treated as 'Not planned'.
 *
 * @param {string|null|undefined} rawStatus
 * @returns {'Blogged'|'Visited'|'Planned'|'Not planned'}
 */
export function normalizeJourneyStatus(rawStatus) {
  if (!rawStatus) return 'Not planned';
  const trimmed = rawStatus.trim().toLowerCase();
  if (trimmed === 'blogged' || trimmed === 'complete' || trimmed.includes('blogged & logged')) {
    return 'Blogged';
  }
  if (trimmed === 'visited' || trimmed.includes('visited only')) {
    return 'Visited';
  }
  if (trimmed === 'planned' || trimmed.includes('planned trip')) {
    return 'Planned';
  }
  return 'Not planned';
}

/**
 * Calculates Target Matrix statistics based on project raw matrix rows and scope filters (locations & categories).
 *
 * Rules:
 * - Baseline is affected ONLY by: active project, selected Location(s), selected Category/Categories.
 * - Search, Status, Rating, Date, Favourites do NOT alter target or journey status calculations.
 * - Target = scopedLocations.length × scopedCategories.length.
 * - Journey status counts reconcile exactly: Not planned + Planned + Visited + Blogged = Target.
 *
 * @param {Array<Object>} rawProjectRows All raw matrix rows for the project
 * @param {Array<string>} allProjectLocations All unique locations defined in the matrix
 * @param {Array<string>} allProjectCategories All unique categories defined in the matrix
 * @param {{ locations?: string[], categories?: string[] }} [scopeFilters]
 */
export function calculateTargetMatrixStats(
  rawProjectRows = [],
  allProjectLocations = [],
  allProjectCategories = [],
  scopeFilters = {}
) {
  const selectedLocations = scopeFilters.locations && scopeFilters.locations.length > 0
    ? scopeFilters.locations
    : null;

  const selectedCategories = scopeFilters.categories && scopeFilters.categories.length > 0
    ? scopeFilters.categories
    : null;

  // Active locations and categories in scope
  const scopedLocations = selectedLocations
    ? allProjectLocations.filter((loc) => selectedLocations.includes(loc))
    : allProjectLocations;

  const scopedCategories = selectedCategories
    ? allProjectCategories.filter((cat) => selectedCategories.includes(cat))
    : allProjectCategories;

  const target = scopedLocations.length * scopedCategories.length;

  const scopedLocSet = new Set(scopedLocations);
  const scopedCatSet = new Set(scopedCategories);

  // Filter raw matrix rows to those falling within the scoped locations and categories
  const scopedRows = rawProjectRows.filter(
    (row) => scopedLocSet.has(row.location) && scopedCatSet.has(row.category)
  );

  // Tally status counts
  const counts = {
    'Not planned': 0,
    'Planned': 0,
    'Visited': 0,
    'Blogged': 0,
  };

  for (const row of scopedRows) {
    const canonical = normalizeJourneyStatus(row.status);
    counts[canonical] = (counts[canonical] || 0) + 1;
  }

  // Handle any missing matrix rows (e.g. if raw rows < locs * cats, treat missing as Not planned)
  const accountedRows = counts['Not planned'] + counts['Planned'] + counts['Visited'] + counts['Blogged'];
  if (accountedRows < target) {
    counts['Not planned'] += (target - accountedRows);
  }

  // Calculate percentages (rounded nicely, but percentages of target)
  const percentages = {
    'Not planned': target > 0 ? (counts['Not planned'] / target) * 100 : 0,
    'Planned': target > 0 ? (counts['Planned'] / target) * 100 : 0,
    'Visited': target > 0 ? (counts['Visited'] / target) * 100 : 0,
    'Blogged': target > 0 ? (counts['Blogged'] / target) * 100 : 0,
  };

  return {
    target,
    locationsCount: scopedLocations.length,
    categoriesCount: scopedCategories.length,
    scopedLocations,
    scopedCategories,
    counts,
    percentages,
  };
}

/**
 * Calculates Actual Place statistics from populated explorer places matching the full filter state.
 *
 * @param {Array<Object>} filteredPlaces Filtered populated places
 * @returns {{
 *   totalActualPlaces: number,
 *   statusBreakdown: Record<string, number>,
 *   ratedPlacesCount: number,
 *   averageRating: number | null,
 *   ratingScore: number | null
 * }}
 */
export function calculateActualPlaceStats(filteredPlaces = []) {
  const statusBreakdown = {
    Blogged: 0,
    Visited: 0,
    Planned: 0,
    'Not planned': 0,
  };

  let validRatingsCount = 0;
  let totalRatingPoints = 0;
  let favouritesCount = 0;

  for (const item of filteredPlaces) {
    const canonical = normalizeJourneyStatus(item.status);
    statusBreakdown[canonical] = (statusBreakdown[canonical] || 0) + 1;

    if (item.favourite === true) {
      favouritesCount++;
    }

    if (item.rating !== null && item.rating !== undefined && typeof item.rating === 'number' && !isNaN(item.rating)) {
      if (item.rating >= 1 && item.rating <= 5) {
        validRatingsCount++;
        totalRatingPoints += item.rating;
      }
    }
  }

  const averageRating = validRatingsCount > 0
    ? totalRatingPoints / validRatingsCount
    : null;

  const maxPoints = validRatingsCount * 5;
  const ratingScore = maxPoints > 0
    ? (totalRatingPoints / maxPoints) * 100
    : null;

  return {
    totalActualPlaces: filteredPlaces.length,
    statusBreakdown,
    ratedPlacesCount: validRatingsCount,
    averageRating,
    ratingScore,
    favouritesCount,
  };
}

/**
 * Calculates Progress & Rating Score grouped by Location.
 *
 * For each Location:
 * - target = scopedCategories.length (the number of target categories for that location)
 * - nonNotPlanned = count of matrix rows with Planned, Visited, or Blogged
 * - journeyProgressPct = (nonNotPlanned / target) * 100
 * - ratingPoints = sum(valid ratings for actual places in this location)
 * - maximumPoints = count(valid ratings) * 5
 * - ratingScore = (ratingPoints / maximumPoints) * 100
 * - ratingsCount = count(valid ratings)
 *
 * @param {Array<Object>} rawProjectRows
 * @param {Array<string>} scopedLocations
 * @param {Array<string>} scopedCategories
 * @param {Array<Object>} applicableActualPlaces Populated places (matching current applicable filters)
 */
export function calculateProgressByLocation(
  rawProjectRows = [],
  scopedLocations = [],
  scopedCategories = [],
  applicableActualPlaces = []
) {
  const scopedCatSet = new Set(scopedCategories);
  const targetPerLocation = scopedCategories.length;

  // 1. Group matrix status counts by location
  const matrixByLoc = new Map();
  for (const loc of scopedLocations) {
    matrixByLoc.set(loc, {
      Blogged: 0,
      Visited: 0,
      Planned: 0,
      'Not planned': 0,
    });
  }

  for (const row of rawProjectRows) {
    if (matrixByLoc.has(row.location) && scopedCatSet.has(row.category)) {
      const canonical = normalizeJourneyStatus(row.status);
      const entry = matrixByLoc.get(row.location);
      entry[canonical] = (entry[canonical] || 0) + 1;
    }
  }

  // 2. Group ratings by location from applicable populated places
  const ratingsByLoc = new Map();
  for (const loc of scopedLocations) {
    ratingsByLoc.set(loc, { points: 0, count: 0 });
  }

  for (const place of applicableActualPlaces) {
    if (ratingsByLoc.has(place.location)) {
      if (place.rating !== null && place.rating !== undefined && typeof place.rating === 'number' && !isNaN(place.rating)) {
        if (place.rating >= 1 && place.rating <= 5) {
          const entry = ratingsByLoc.get(place.location);
          entry.points += place.rating;
          entry.count += 1;
        }
      }
    }
  }

  // 3. Combine into structured rows
  const rows = scopedLocations.map((location) => {
    const matrix = matrixByLoc.get(location) || { Blogged: 0, Visited: 0, Planned: 0, 'Not planned': 0 };
    const ratings = ratingsByLoc.get(location) || { points: 0, count: 0 };

    const nonNotPlanned = matrix.Blogged + matrix.Visited + matrix.Planned;
    const progressCount = matrix.Blogged; // Progress is measured against "Blogged" (completely done)
    const progressPct = targetPerLocation > 0
      ? (progressCount / targetPerLocation) * 100
      : 0;

    const maxPoints = ratings.count * 5;
    const ratingScore = maxPoints > 0
      ? (ratings.points / maxPoints) * 100
      : null;

    return {
      key: location,
      name: location,
      target: targetPerLocation,
      matrixCounts: matrix,
      progressCount,
      nonNotPlanned,
      progressPct: Math.round(progressPct * 10) / 10,
      ratingScore: ratingScore !== null ? Math.round(ratingScore * 10) / 10 : null,
      ratingsCount: ratings.count,
    };
  });

  return rows;
}

/**
 * Calculates Progress & Rating Score grouped by Category.
 *
 * @param {Array<Object>} rawProjectRows
 * @param {Array<string>} scopedLocations
 * @param {Array<string>} scopedCategories
 * @param {Array<Object>} applicableActualPlaces Populated places
 */
export function calculateProgressByCategory(
  rawProjectRows = [],
  scopedLocations = [],
  scopedCategories = [],
  applicableActualPlaces = []
) {
  const scopedLocSet = new Set(scopedLocations);
  const targetPerCategory = scopedLocations.length;

  // 1. Group matrix status counts by category
  const matrixByCat = new Map();
  for (const cat of scopedCategories) {
    matrixByCat.set(cat, {
      Blogged: 0,
      Visited: 0,
      Planned: 0,
      'Not planned': 0,
    });
  }

  for (const row of rawProjectRows) {
    if (matrixByCat.has(row.category) && scopedLocSet.has(row.location)) {
      const canonical = normalizeJourneyStatus(row.status);
      const entry = matrixByCat.get(row.category);
      entry[canonical] = (entry[canonical] || 0) + 1;
    }
  }

  // 2. Group ratings by category from applicable populated places
  const ratingsByCat = new Map();
  for (const cat of scopedCategories) {
    ratingsByCat.set(cat, { points: 0, count: 0 });
  }

  for (const place of applicableActualPlaces) {
    if (ratingsByCat.has(place.category)) {
      if (place.rating !== null && place.rating !== undefined && typeof place.rating === 'number' && !isNaN(place.rating)) {
        if (place.rating >= 1 && place.rating <= 5) {
          const entry = ratingsByCat.get(place.category);
          entry.points += place.rating;
          entry.count += 1;
        }
      }
    }
  }

  // 3. Combine into structured rows
  const rows = scopedCategories.map((category) => {
    const matrix = matrixByCat.get(category) || { Blogged: 0, Visited: 0, Planned: 0, 'Not planned': 0 };
    const ratings = ratingsByCat.get(category) || { points: 0, count: 0 };

    const nonNotPlanned = matrix.Blogged + matrix.Visited + matrix.Planned;
    const progressCount = matrix.Blogged; // Progress is measured against "Blogged" (completely done)
    const progressPct = targetPerCategory > 0
      ? (progressCount / targetPerCategory) * 100
      : 0;

    const maxPoints = ratings.count * 5;
    const ratingScore = maxPoints > 0
      ? (ratings.points / maxPoints) * 100
      : null;

    return {
      key: category,
      name: category,
      target: targetPerCategory,
      matrixCounts: matrix,
      progressCount,
      nonNotPlanned,
      progressPct: Math.round(progressPct * 10) / 10,
      ratingScore: ratingScore !== null ? Math.round(ratingScore * 10) / 10 : null,
      ratingsCount: ratings.count,
    };
  });

  return rows;
}

/**
 * Builds monthly and cumulative timeline buckets from places with valid Date values.
 *
 * @param {Array<Object>} places
 * @returns {Array<{
 *   yearMonth: string,
 *   label: string,
 *   total: number,
 *   cumulativeTotal: number,
 *   blogged: number,
 *   visited: number,
 *   planned: number,
 *   cumulativeBlogged: number,
 *   cumulativeVisited: number,
 *   cumulativePlanned: number,
 * }>}
 */
export function calculateActivityTimeline(places = []) {
  const monthMap = new Map();

  for (const place of places) {
    if (!place.date || typeof place.date !== 'string') continue;
    const parts = place.date.trim().split('/');
    if (parts.length !== 3) continue;

    const year = parts[2].trim();
    const month = parts[1].trim().padStart(2, '0');
    if (isNaN(parseInt(year, 10)) || isNaN(parseInt(month, 10))) continue;

    const ymKey = `${year}-${month}`;
    if (!monthMap.has(ymKey)) {
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      monthMap.set(ymKey, {
        yearMonth: ymKey,
        label,
        total: 0,
        blogged: 0,
        visited: 0,
        planned: 0,
      });
    }

    const entry = monthMap.get(ymKey);
    entry.total += 1;
    const canonical = normalizeJourneyStatus(place.status);
    if (canonical === 'Blogged') entry.blogged += 1;
    else if (canonical === 'Visited') entry.visited += 1;
    else if (canonical === 'Planned') entry.planned += 1;
  }

  if (monthMap.size === 0) {
    return [];
  }

  // Find min and max yearMonth
  const existingKeys = Array.from(monthMap.keys()).sort((a, b) => a.localeCompare(b));
  const minKey = existingKeys[0];
  const maxKey = existingKeys[existingKeys.length - 1];

  const [minYear, minM] = minKey.split('-').map((n) => parseInt(n, 10));
  const [maxYear, maxM] = maxKey.split('-').map((n) => parseInt(n, 10));

  // Generate contiguous continuous months between min and max
  const continuousMonths = [];
  let curYear = minYear;
  let curMonth = minM;

  while (curYear < maxYear || (curYear === maxYear && curMonth <= maxM)) {
    const mm = String(curMonth).padStart(2, '0');
    const ymKey = `${curYear}-${mm}`;

    if (monthMap.has(ymKey)) {
      continuousMonths.push(monthMap.get(ymKey));
    } else {
      const d = new Date(curYear, curMonth - 1, 1);
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      continuousMonths.push({
        yearMonth: ymKey,
        label,
        total: 0,
        blogged: 0,
        visited: 0,
        planned: 0,
      });
    }

    curMonth++;
    if (curMonth > 12) {
      curMonth = 1;
      curYear++;
    }
  }

  // Compute cumulative series (cumulative Blogged only for user requirement)
  let cumBlogged = 0;
  let cumTotal = 0;

  return continuousMonths.map((m) => {
    cumBlogged += m.blogged;
    cumTotal += m.total;

    return {
      ...m,
      cumulativeBlogged: cumBlogged,
      cumulativeTotal: cumTotal,
    };
  });
}

/**
 * Returns ordinal string for a rank number (e.g. 1 -> '1st', 2 -> '2nd', 3 -> '3rd', 11 -> '11th').
 * @param {number} n
 * @returns {string}
 */
export function formatOrdinal(n) {
  if (typeof n !== 'number' || isNaN(n)) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Extracts the latest visit date string from a list of places.
 * Considers places with a valid DD/MM/YYYY date.
 * Returns formatted date string or null.
 *
 * @param {Array<Object>} places
 * @returns {string|null}
 */
export function findLatestVisit(places = []) {
  let latestTimestamp = -Infinity;
  let latestDateStr = null;

  for (const place of places) {
    if (!place.date || typeof place.date !== 'string') continue;
    const parts = place.date.trim().split('/');
    if (parts.length !== 3) continue;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) continue;

    const ts = new Date(year, month - 1, day).getTime();
    if (ts > latestTimestamp) {
      latestTimestamp = ts;
      latestDateStr = place.date.trim();
    }
  }

  return latestDateStr;
}

/**
 * Calculates rank among peers for a numeric metric (descending).
 * Ties share the same rank: rank = 1 + count of peers with strictly higher value.
 *
 * @param {number} value
 * @param {Array<number>} allPeerValues
 * @returns {{ rank: number, totalPeers: number, percentileTop: number | null }}
 */
export function calculatePeerRank(value, allPeerValues = []) {
  if (value === null || value === undefined || isNaN(value)) {
    return { rank: null, totalPeers: allPeerValues.length, percentileTop: null };
  }

  const validPeers = allPeerValues.filter((v) => v !== null && v !== undefined && !isNaN(v));
  const strictlyHigher = validPeers.filter((v) => v > value).length;
  const rank = 1 + strictlyHigher;
  const total = validPeers.length;

  const percentileTop = total > 0 ? Math.max(1, Math.round((rank / total) * 100)) : null;

  return {
    rank,
    totalPeers: total,
    percentileTop,
  };
}

