import Papa from 'papaparse';
import { CONFIG_FEED_URL, MAIN_DATA_FEED_URL, LOCATION_METADATA_FEED_URL, CATEGORY_METADATA_FEED_URL } from './feedConstants.js';

// In-memory cache for parsed CSV data
const memoryCache = new Map();

// Cache validity: 30 minutes in milliseconds
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_PREFIX = 'shmv3_csv_v5_';

// Automatically purge legacy unversioned or stale cache entries on load
if (typeof window !== 'undefined' && window.sessionStorage) {
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith('shmv3_csv_') && !k.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch (e) {
    // Ignore storage errors safely
  }
}

/**
 * Gets cached CSV text from sessionStorage if available and unexpired.
 */
function getSessionCachedText(url) {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(`${CACHE_PREFIX}${url}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS && entry.text) {
      return entry.text;
    }
  } catch (e) {
    // SessionStorage may be restricted or corrupted; ignore safely
  }
  return null;
}

/**
 * Saves CSV text to sessionStorage with timestamp.
 */
function setSessionCachedText(url, text) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const entry = {
      timestamp: Date.now(),
      text,
    };
    window.sessionStorage.setItem(`${CACHE_PREFIX}${url}`, JSON.stringify(entry));
  } catch (e) {
    // QuotaExceededError or private mode; ignore safely
  }
}

/**
 * Clears all cached CSV feeds from both memory and sessionStorage.
 */
export function clearCsvCache() {
  memoryCache.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && (key.startsWith('shmv3_csv_') || key.startsWith('shmv3_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Parses raw CSV text with PapaParse.
 * @param {string} text
 * @returns {Promise<Array<Object>>}
 */
function parseCsvText(text) {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }
        resolve(results.data);
      },
      error: (error) => reject(error),
    });
  });
}

/**
 * Fetches and parses a CSV via HTTP/HTTPS with timeout, retry, and caching.
 * @param {string} url
 * @param {Object} [options]
 * @param {boolean} [options.bypassCache=false]
 * @param {number} [options.timeoutMs=15000]
 * @param {number} [options.retries=1]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchCsvFeed(url, options = {}) {
  const { bypassCache = false, timeoutMs = 15000, retries = 1 } = options;

  // 1. Check in-memory cache
  if (!bypassCache && memoryCache.has(url)) {
    return memoryCache.get(url);
  }

  // 2. Check browser sessionStorage
  if (!bypassCache) {
    const cachedText = getSessionCachedText(url);
    if (cachedText) {
      const parsed = await parseCsvText(cachedText);
      memoryCache.set(url, parsed);
      return parsed;
    }
  }

  // 3. Network fetch with timeout and retry
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      setSessionCachedText(url, text);

      const parsed = await parseCsvText(text);
      memoryCache.set(url, parsed);
      return parsed;
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err.name === 'AbortError';
      const msg = isAbort ? `Connection timed out after ${timeoutMs}ms` : err.message;
      lastError = new Error(`Failed to fetch CSV from ${url}: ${msg}`);

      if (attempt < retries) {
        // Short backoff before retry
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  throw lastError;
}

/**
 * Loads all authoritative live CSV feeds in parallel.
 * @returns {Promise<{
 *   rawConfigRows: Array<Object>,
 *   rawMainRows: Array<Object>,
 *   rawLocationMetadataRows: Array<Object>,
 *   rawCategoryMetadataRows: Array<Object>
 * }>}
 */
export async function fetchAllFeeds() {
  const [rawConfigRows, rawMainRows, rawLocationMetadataRows, rawCategoryMetadataRows] = await Promise.all([
    fetchCsvFeed(CONFIG_FEED_URL),
    fetchCsvFeed(MAIN_DATA_FEED_URL),
    fetchCsvFeed(LOCATION_METADATA_FEED_URL).catch((err) => {
      console.warn('Location metadata feed could not be fetched:', err);
      return [];
    }),
    fetchCsvFeed(CATEGORY_METADATA_FEED_URL).catch((err) => {
      console.warn('Category metadata feed could not be fetched:', err);
      return [];
    }),
  ]);

  return {
    rawConfigRows,
    rawMainRows,
    rawLocationMetadataRows,
    rawCategoryMetadataRows,
  };
}
