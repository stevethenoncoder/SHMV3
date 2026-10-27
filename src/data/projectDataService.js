/**
 * Extracts project-scoped data from pre-normalised items.
 *
 * Separates:
 * - rawProjectRows: all normalised rows for this project (including empty matrix rows)
 * - explorerItems: public Explorer eligible rows (project match AND non-blank place)
 *
 * Derives available locations, categories, and statuses dynamically from eligible explorer items
 * so filters do not show options with zero public results.
 *
 * @param {Array<Object>} allNormalisedItems
 * @param {string} projectKey
 * @param {Object} projectConfig
 */
export function getProjectData(allNormalisedItems, projectKey, projectConfig = null) {
  if (!Array.isArray(allNormalisedItems) || !projectKey) {
    return {
      projectKey,
      config: projectConfig,
      rawProjectRows: [],
      explorerItems: [],
      locations: [],
      categories: [],
      statuses: [],
      ratingCounts: {},
      summary: {
        totalProjectRows: 0,
        eligibleExplorerPlaces: 0,
        matrixPlaceholderRows: 0,
        validCoordsCount: 0,
        missingCoordsCount: 0,
      },
    };
  }

  const rawProjectRows = allNormalisedItems.filter(
    (item) => item.projectKey.toLowerCase() === projectKey.toLowerCase()
  );

  // Eligible explorer items must have a non-blank Place
  const explorerItems = rawProjectRows.filter((item) => Boolean(item.place && item.place.trim()));

  // Derive unique locations, categories, statuses from eligible items
  const locationsSet = new Set();
  const categoriesSet = new Set();
  const statusesSet = new Set();

  // Also collect all locations and categories across complete raw matrix rows
  const allLocationsSet = new Set();
  const allCategoriesSet = new Set();

  for (const row of rawProjectRows) {
    if (row.location) allLocationsSet.add(row.location);
    if (row.category) allCategoriesSet.add(row.category);
  }

  const ratingCounts = {
    '5': 0,
    '4': 0,
    '3': 0,
    '2': 0,
    '1': 0,
    unrated: 0,
  };

  let validCoordsCount = 0;
  let missingCoordsCount = 0;

  for (const item of explorerItems) {
    if (item.location) locationsSet.add(item.location);
    if (item.category) categoriesSet.add(item.category);
    if (item.status) statusesSet.add(item.status);

    if (item.rating !== null && item.rating !== undefined) {
      const bucket = Math.floor(item.rating).toString();
      if (ratingCounts[bucket] !== undefined) {
        ratingCounts[bucket]++;
      }
    } else {
      ratingCounts.unrated++;
    }

    if (item.latitude !== null && item.longitude !== null) {
      validCoordsCount++;
    } else {
      missingCoordsCount++;
    }
  }

  // Sort lists alphabetically
  const locations = Array.from(locationsSet).sort((a, b) => a.localeCompare(b));
  const categories = Array.from(categoriesSet).sort((a, b) => a.localeCompare(b));
  const statuses = Array.from(statusesSet).sort((a, b) => a.localeCompare(b));
  const allProjectLocations = Array.from(allLocationsSet).sort((a, b) => a.localeCompare(b));
  const allProjectCategories = Array.from(allCategoriesSet).sort((a, b) => a.localeCompare(b));

  return {
    projectKey,
    config: projectConfig,
    rawProjectRows,
    explorerItems,
    locations,
    categories,
    statuses,
    allProjectLocations,
    allProjectCategories,
    ratingCounts,
    summary: {
      totalProjectRows: rawProjectRows.length,
      eligibleExplorerPlaces: explorerItems.length,
      matrixPlaceholderRows: rawProjectRows.length - explorerItems.length,
      validCoordsCount,
      missingCoordsCount,
    },
  };
}
