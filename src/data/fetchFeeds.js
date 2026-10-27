import Papa from 'papaparse';
import { CONFIG_FEED_URL, MAIN_DATA_FEED_URL, LOCATION_METADATA_FEED_URL, CATEGORY_METADATA_FEED_URL } from './feedConstants.js';

/**
 * Fetches and parses a CSV via HTTP/HTTPS.
 * @param {string} url
 * @returns {Promise<Array<Object>>}
 */
export async function fetchCsvFeed(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV from ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          // Log parsing warnings/errors but return data if present
          console.warn('CSV parsing warnings:', results.errors);
        }
        resolve(results.data);
      },
      error: (error) => reject(error),
    });
  });
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
