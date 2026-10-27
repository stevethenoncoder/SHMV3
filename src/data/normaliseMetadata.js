/**
 * Normalises raw location and category metadata rows into indexed composite maps:
 * Map<`${project}::${location.toLowerCase()}`, MetadataObject>
 * Map<`${project}::${category.toLowerCase()}`, MetadataObject>
 *
 * Feed Headers:
 * Project, Location / Category, Intro, Last Update, AI Blog Summary, Icon, Tagline
 */

export function buildMetadataKey(project, entityName) {
  if (!project || !entityName) return '';
  return `${String(project).trim().toLowerCase()}::${String(entityName).trim().toLowerCase()}`;
}

/**
 * Normalises raw location metadata rows.
 * @param {Array<Object>} rawRows
 * @returns {Record<string, Object>}
 */
export function normaliseLocationMetadata(rawRows = []) {
  const map = {};
  if (!Array.isArray(rawRows)) return map;

  for (const row of rawRows) {
    const project = (row.Project || row.project || '').trim();
    const location = (row.Location || row.location || '').trim();
    if (!project || !location) continue;

    const key = buildMetadataKey(project, location);
    map[key] = {
      project,
      location,
      name: location,
      intro: (row.Intro || row.intro || '').trim(),
      lastUpdate: (row['Last Update'] || row.lastUpdate || row['Last update'] || '').trim(),
      aiBlogSummary: (row['AI Blog Summary'] || row.aiBlogSummary || row['Blog Summary'] || '').trim(),
      icon: (row.Icon || row.icon || '').trim(),
      tagline: (row.Tag || row.tag || row.Tagline || row.tagline || '').trim(),
    };
  }

  return map;
}

/**
 * Normalises raw category metadata rows.
 * @param {Array<Object>} rawRows
 * @returns {Record<string, Object>}
 */
export function normaliseCategoryMetadata(rawRows = []) {
  const map = {};
  if (!Array.isArray(rawRows)) return map;

  for (const row of rawRows) {
    const project = (row.Project || row.project || '').trim();
    const category = (row.Category || row.category || '').trim();
    if (!project || !category) continue;

    const key = buildMetadataKey(project, category);
    map[key] = {
      project,
      category,
      name: category,
      intro: (row.Intro || row.intro || '').trim(),
      lastUpdate: (row['Last Update'] || row.lastUpdate || row['Last update'] || '').trim(),
      aiBlogSummary: (row['AI Blog Summary'] || row.aiBlogSummary || row['Blog Summary'] || '').trim(),
      icon: (row.Icon || row.icon || '').trim(),
      tagline: (row.Tag || row.tag || row.Tagline || row.tagline || '').trim(),
    };
  }

  return map;
}
