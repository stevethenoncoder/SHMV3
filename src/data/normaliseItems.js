/**
 * Known placeholder values that should be mapped to null.
 */
const PLACEHOLDER_TEXTS = new Set([
  'generate and insert',
  'generate & insert',
  'tbc',
  'tbd',
  'n/a',
  '#ref!',
]);

/**
 * Normalises raw string to clean text or null if blank/placeholder.
 * @param {string|any} val
 * @returns {string|null}
 */
export function cleanText(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (PLACEHOLDER_TEXTS.has(s.toLowerCase())) return null;
  return s;
}

/**
 * Normalises photo URLs, catching placeholder patterns.
 * E.g. 'https://storage.googleapis.com/abc-post-photos/.jpg' -> null
 * @param {string|any} val
 * @returns {string|null}
 */
export function cleanPhotoUrl(val) {
  const url = cleanText(val);
  if (!url) return null;
  // If filename is just '.jpg' or ends with '/.jpg'
  if (url.endsWith('/.jpg') || url.endsWith('.jpg') && url.includes('abc-post-photos/.jpg')) {
    return null;
  }
  return url;
}

/**
 * Normalises ratings from strings like '4/5 - Very Good' into numeric values (e.g. 4.0).
 * @param {string|any} val
 * @returns {{ numeric: number | null, label: string | null }}
 */
export function parseRating(val) {
  const text = cleanText(val);
  if (!text) return { numeric: null, label: null };

  // Match leading numeric e.g. "4/5", "4.5", "4"
  const match = text.match(/^(\d+(\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    return {
      numeric: isNaN(num) ? null : num,
      label: text,
    };
  }

  return { numeric: null, label: text };
}

/**
 * Normalises Favourite values to boolean.
 * Truthy values: 'Y', 'y', 'TRUE', 'true'.
 * @param {string|any} val
 * @returns {boolean}
 */
export function parseFavourite(val) {
  if (!val) return false;
  const s = String(val).trim().toUpperCase();
  return s === 'Y' || s === 'TRUE';
}

/**
 * Normalises coordinate numbers.
 * @param {string|any} val
 * @returns {number | null}
 */
export function parseCoordinate(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  const num = parseFloat(s);
  if (isNaN(num) || num === 0) return null;
  return num;
}

/**
 * Validates and extracts only the src URL from a Google Maps embed iframe or raw URL.
 * Accepts only valid Google Maps embed URLs (e.g. google.com/maps/embed...).
 * Returns null if invalid or missing.
 *
 * @param {string|any} val
 * @returns {string|null}
 */
export function extractGoogleMapEmbedSrc(val) {
  const text = cleanText(val);
  if (!text) return null;

  let rawSrc = text;

  // If text contains an <iframe ... src="..." ...>, extract the src attribute
  const srcMatch = text.match(/src=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    rawSrc = srcMatch[1].trim();
  }

  // Validate that it's a genuine Google Maps embed URL
  try {
    const url = new URL(rawSrc);
    const hostname = url.hostname.toLowerCase();
    const isGoogle = hostname === 'google.com' || hostname.endsWith('.google.com') || hostname === 'maps.google.com';
    const isEmbedPath = url.pathname.includes('/maps/embed') || url.pathname.includes('/maps');

    if (isGoogle && isEmbedPath) {
      return url.href;
    }
  } catch (e) {
    return null;
  }

  return null;
}

/**
 * Extracts and converts a YouTube URL into a safe, trusted embed URL.
 * Accepts formats:
 * - https://www.youtube.com/watch?v=VIDEOID
 * - https://youtu.be/VIDEOID
 * - https://www.youtube.com/shorts/VIDEOID
 * - https://www.youtube.com/embed/VIDEOID
 *
 * Validates strictly an 11-character YouTube video ID ([a-zA-Z0-9_-]{11}).
 * Returns null if missing, invalid, or non-YouTube.
 *
 * @param {string|any} val
 * @returns {string|null}
 */
export function extractYouTubeEmbedSrc(val) {
  const text = cleanText(val);
  if (!text) return null;

  try {
    const url = new URL(text);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    let videoId = null;

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.slice('/embed/'.length).split('/')[0];
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.slice('/shorts/'.length).split('/')[0];
      }
    } else if (hostname === 'youtu.be') {
      videoId = url.pathname.slice(1).split('/')[0];
    }

    // Strictly validate 11-character alphanumeric/dash/underscore YouTube ID
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch (e) {
    return null;
  }

  return null;
}

/**
 * Pure transformation that converts all raw CSV feed rows into normalised item objects.
 * NOTE: Does NOT filter by project or eligibility; transforms everything uniformly.
 * 10Facts is deliberately ignored and NOT parsed into the model.
 *
 * @param {Array<Object>} rawRows
 * @returns {Array<Object>}
 */
export function normaliseItems(rawRows) {
  if (!Array.isArray(rawRows)) return [];

  return rawRows.map((row, index) => {
    const ratingData = parseRating(row['Rating']);
    const latitude = parseCoordinate(row['Lat']);
    const longitude = parseCoordinate(row['Long']);
    const googleMapEmbedSrc = extractGoogleMapEmbedSrc(row['GoogleMapEmbed'] || row['Google Map Embed']);
    const rawVideo = cleanText(row['Video']);
    const videoEmbedSrc = extractYouTubeEmbedSrc(rawVideo);

    return {
      id: `row-${index + 1}`,
      projectKey: (row['Project'] || '').trim(),
      location: (row['Location'] || '').trim(),
      category: (row['Category'] || '').trim(),
      place: cleanText(row['Place']) || '',

      googleMapLink: cleanText(row['Google Map Link']),
      googleMapEmbedSrc,
      video: rawVideo,
      videoEmbedSrc,
      latitude,
      longitude,

      favourite: parseFavourite(row['Fav']),
      rating: ratingData.numeric,
      ratingLabel: ratingData.label,
      status: cleanText(row['Status']),

      date: cleanText(row['Date']),
      blog: cleanText(row['Blog']),
      content: cleanText(row['Content']),
      description: cleanText(row['Description']),

      aiSummary: cleanText(row['AI Summary']),
      featurePhoto: cleanPhotoUrl(row['Feature Photo']),
    };
  });
}
