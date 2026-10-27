import { parseDate } from './formatUtils.js';

/**
 * Pure multi-field filtering logic:
 * - OR within a filter group
 * - AND between filter groups
 *
 * @param {Array<Object>} items
 * @param {Object} filterState
 * @returns {Array<Object>}
 */
export function filterItems(items, filterState) {
  if (!Array.isArray(items)) return [];

  const {
    search = '',
    favouritesOnly = false,
    statuses = [],
    locations = [],
    categories = [],
    minRating = null,
    startDate = null, // YYYY-MM-DD or YYYY-MM
    endDate = null,   // YYYY-MM-DD or YYYY-MM
  } = filterState;

  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((item) => {
    // 1. Search filter: matches place, location, category, or aiSummary
    if (normalizedSearch) {
      const matchPlace = (item.place || '').toLowerCase().includes(normalizedSearch);
      const matchLoc = (item.location || '').toLowerCase().includes(normalizedSearch);
      const matchCat = (item.category || '').toLowerCase().includes(normalizedSearch);
      const matchSummary = (item.aiSummary || '').toLowerCase().includes(normalizedSearch);

      if (!matchPlace && !matchLoc && !matchCat && !matchSummary) {
        return false;
      }
    }

    // 2. Favourites Only filter
    if (favouritesOnly && !item.favourite) {
      return false;
    }

    // 3. Expedition Status filter (OR within group)
    if (statuses.length > 0) {
      if (!item.status || !statuses.includes(item.status)) {
        return false;
      }
    }

    // 4. Location filter (OR within group)
    if (locations.length > 0) {
      if (!item.location || !locations.includes(item.location)) {
        return false;
      }
    }

    // 5. Category filter (OR within group)
    if (categories.length > 0) {
      if (!item.category || !categories.includes(item.category)) {
        return false;
      }
    }

    // 6. Rating filter (min rating)
    if (minRating !== null) {
      if (item.rating === null || item.rating === undefined || item.rating < minRating) {
        return false;
      }
    }

    // 7. Date range filter
    if (startDate || endDate) {
      const parsed = parseDate(item.date);
      if (!parsed.isoDate) {
        // Items without a date are excluded when an active date range filter is applied
        return false;
      }

      if (startDate && parsed.isoDate < startDate) {
        return false;
      }
      if (endDate && parsed.isoDate > endDate) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts items according to selected sort mode.
 * Supports bidirectional sorts (A-Z and Z-A), rating, and dates (most recent / earliest).
 *
 * @param {Array<Object>} items
 * @param {string} sortOption
 * @returns {Array<Object>}
 */
export function sortItems(items, sortOption = 'name_asc') {
  if (!Array.isArray(items)) return [];

  const shallow = [...items];

  switch (sortOption) {
    case 'name_asc':
      return shallow.sort((a, b) => (a.place || '').localeCompare(b.place || ''));

    case 'name_desc':
      return shallow.sort((a, b) => (b.place || '').localeCompare(a.place || ''));

    case 'location_asc':
      return shallow.sort((a, b) => {
        const locCmp = (a.location || '').localeCompare(b.location || '');
        if (locCmp !== 0) return locCmp;
        return (a.place || '').localeCompare(b.place || '');
      });

    case 'location_desc':
      return shallow.sort((a, b) => {
        const locCmp = (b.location || '').localeCompare(a.location || '');
        if (locCmp !== 0) return locCmp;
        return (a.place || '').localeCompare(b.place || '');
      });

    case 'category_asc':
      return shallow.sort((a, b) => {
        const catCmp = (a.category || '').localeCompare(b.category || '');
        if (catCmp !== 0) return catCmp;
        return (a.place || '').localeCompare(b.place || '');
      });

    case 'category_desc':
      return shallow.sort((a, b) => {
        const catCmp = (b.category || '').localeCompare(a.category || '');
        if (catCmp !== 0) return catCmp;
        return (a.place || '').localeCompare(b.place || '');
      });

    case 'rating_desc':
      return shallow.sort((a, b) => {
        const rA = a.rating !== null ? a.rating : -1;
        const rB = b.rating !== null ? b.rating : -1;
        if (rB !== rA) return rB - rA;
        return (a.place || '').localeCompare(b.place || '');
      });

    case 'rating_asc':
      return shallow.sort((a, b) => {
        const rA = a.rating !== null ? a.rating : 999;
        const rB = b.rating !== null ? b.rating : 999;
        if (rA !== rB) return rA - rB;
        return (a.place || '').localeCompare(b.place || '');
      });

    case 'date_desc': // Most recent first
      return shallow.sort((a, b) => {
        const tA = parseDate(a.date).timestamp || 0;
        const tB = parseDate(b.date).timestamp || 0;
        if (tB !== tA) return tB - tA;
        return (a.place || '').localeCompare(b.place || '');
      });

    case 'date_asc': // Earliest first
      return shallow.sort((a, b) => {
        const tA = parseDate(a.date).timestamp || 9999999999999;
        const tB = parseDate(b.date).timestamp || 9999999999999;
        if (tA !== tB) return tA - tB;
        return (a.place || '').localeCompare(b.place || '');
      });

    default:
      return shallow;
  }
}

