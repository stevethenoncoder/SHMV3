/**
 * Helper to produce plural location terminology when not provided by feed.
 * @param {string} singular
 * @returns {string}
 */
export function getPluralLocationLabel(singular) {
  if (!singular) return '';
  const s = singular.trim().toLowerCase();
  if (s === 'county') return 'Counties';
  if (s === 'borough') return 'Boroughs';
  return `${singular}s`;
}

/**
 * Normalises raw config rows into a mapped array and lookup map of ProjectConfig.
 * @param {Array<Object>} rawRows
 * @returns {{ configs: Array<Object>, configMap: Record<string, Object> }}
 */
export function normaliseConfigs(rawRows) {
  if (!Array.isArray(rawRows)) return { configs: [], configMap: {} };

  const configs = [];
  const configMap = {};

  for (const row of rawRows) {
    const projectKey = (row['Project'] || '').trim();
    if (!projectKey) continue;

    const locationLabel = (row['Location Label'] || '').trim();
    const locationLabelPlural =
      (row['Location Plural'] || '').trim() || getPluralLocationLabel(locationLabel);

    const visitedPlaceholder = (row['Visited Place Holder'] || row['Visited Placeholder'] || '').trim() || null;
    const plannedPlaceholder = (row['Planned Placeholder'] || '').trim() || null;
    const unscheduledPlaceholder = (row['Unscheduled Placeholder'] || '').trim() || null;

    const projectTitle = (row['Project Title'] || '').trim();

    // Parse mobile title (e.g. "Project Title - Mobile" or "projectTitle-mobile")
    const projectTitleMobileRaw =
      row['Project Title - Mobile'] ||
      row['projectTitle-mobile'] ||
      row['Project Title-Mobile'] ||
      row['Project Title Mobile'] ||
      row['projectTitleMobile'] ||
      Object.entries(row).find(([k]) => k.replace(/[\s\-_]/g, '').toLowerCase() === 'projecttitlemobile')?.[1] ||
      '';
    const projectTitleMobile = (projectTitleMobileRaw || '').trim() || projectTitle;

    const config = {
      projectKey,
      projectTitle,
      projectTitleMobile,
      projectSubHeading: (row['Project Sub Heading'] || '').trim(),
      projectLogo: (row['Project Logo'] || '').trim() || null,
      locationLabel,
      locationLabelPlural,
      visitedPlaceholder,
      plannedPlaceholder,
      unscheduledPlaceholder,
    };

    configs.push(config);
    configMap[projectKey] = config;
  }

  return { configs, configMap };
}
