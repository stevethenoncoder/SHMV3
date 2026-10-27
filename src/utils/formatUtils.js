/**
 * Parses raw DD/MM/YYYY date strings into structured Date object and timestamps.
 * 
 * @param {string|null} dateStr e.g. "26/03/2026"
 * @returns {{ date: Date | null, timestamp: number | null, formatted: string | null, isoDate: string | null }}
 */
export function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return { date: null, timestamp: null, formatted: null, isoDate: null };
  }

  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) {
    return { date: null, timestamp: null, formatted: null, isoDate: null };
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed month
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return { date: null, timestamp: null, formatted: null, isoDate: null };
  }

  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) {
    return { date: null, timestamp: null, formatted: null, isoDate: null };
  }

  // ISO date format YYYY-MM-DD
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const isoDate = `${year}-${mm}-${dd}`;

  // Clean, simple formatted date string e.g. "26 Mar 2026"
  const formatted = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    date: d,
    timestamp: d.getTime(),
    formatted,
    isoDate,
  };
}

/**
 * Returns formatted date string (e.g. "26 Mar 2026") from DD/MM/YYYY or null.
 * @param {string|null} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  const parsed = parseDate(dateStr);
  return parsed.formatted || dateStr || '';
}

/**
 * Extracts a clean plain-text blog excerpt strictly from raw HTML content.
 * Looks for content after "Blog:" heading, strips tags, collapses whitespaces,
 * and adds an ellipsis "..." if truncated.
 * Returns null if no actual blog text exists.
 *
 * @param {string|null} rawContent
 * @param {number} maxLength
 * @returns {string|null}
 */
export function extractBlogReport(rawContent, maxLength = 260) {
  if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
    return null;
  }

  // Check if there is a "Blog:" marker
  const splitMatch = rawContent.split(/Blog:<\/b><\/p>|Blog:<\/i><\/b><\/p>|Blog:<\/p>|<b>Blog:<\/b>/i);
  if (splitMatch.length <= 1) {
    return null;
  }

  const blogPart = splitMatch[1];

  // Strip HTML tags and entities
  const plain = blogPart
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) return null;

  if (plain.length <= maxLength) {
    return plain + '...';
  }

  // Truncate at natural word boundary
  const sub = plain.slice(0, maxLength);
  const lastSpace = sub.lastIndexOf(' ');
  const cleanSub = lastSpace > 180 ? sub.slice(0, lastSpace) : sub;

  return cleanSub.trim() + '...';
}

/**
 * Formats a description text with clean spacing and truncation.
 *
 * @param {string|null} description
 * @param {number} maxLength
 * @returns {string|null}
 */
export function formatDescription(description, maxLength = 240) {
  if (!description || typeof description !== 'string' || !description.trim()) {
    return null;
  }

  const clean = description.replace(/\s+/g, ' ').trim();
  if (!clean) return null;

  if (clean.length <= maxLength) {
    return clean;
  }

  const sub = clean.slice(0, maxLength);
  const lastSpace = sub.lastIndexOf(' ');
  const cleanSub = lastSpace > 160 ? sub.slice(0, lastSpace) : sub;
  return cleanSub.trim() + '...';
}

/**
 * Generates a stable, deterministic, URL-friendly slug based on projectKey, location, category, and place.
 * E.g.: "england-wiltshire-museum-wiltshire-museum"
 *
 * @param {Object} item
 * @returns {string}
 */
export function generatePlaceSlug(item) {
  if (!item) return '';
  const parts = [
    item.projectKey || '',
    item.location || '',
    item.category || '',
    item.place || '',
  ];

  return parts
    .map((p) =>
      p
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric with hyphen
        .replace(/^-+|-+$/g, '')         // trim hyphens
    )
    .filter(Boolean)
    .join('-');
}

