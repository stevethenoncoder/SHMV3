/**
 * Pure analytical calculation engine for the SHMV3 Sentiment Page.
 */

/**
 * Strips diacritical accents and converts to lowercase for accent-insensitive search.
 * e.g. "Café Le Rouge" -> "cafe le rouge", "crème brûlée" -> "creme brulee"
 */
export function stripAccents(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export const RATING_LEVEL_MAP = {
  'the dogs': { level: 8, label: 'The Dogs', color: '#10b981' },
  'exceptional': { level: 7, label: 'Exceptional', color: '#059669' },
  'very good': { level: 6, label: 'Very Good', color: '#0284c7' },
  'fine': { level: 5, label: 'Fine', color: '#38bdf8' },
  "ok but wouldn't recommend": { level: 4, label: 'Okay', color: '#f59e0b' },
  'ok': { level: 4, label: 'Okay', color: '#f59e0b' },
  'okay': { level: 4, label: 'Okay', color: '#f59e0b' },
  'very bad': { level: 3, label: 'Very Bad', color: '#f97316' },
  'never again': { level: 2, label: 'Never Again', color: '#ef4444' },
  'the worst in the world': { level: 1, label: 'The Worst', color: '#b91c1c' },
  'the worst': { level: 1, label: 'The Worst', color: '#b91c1c' },
};

/**
 * Returns visual representation metadata for a canonical meal rating.
 * There are 8 discrete levels (8 = The Dogs ... 1 = The Worst).
 */
export function getRatingVisualInfo(ratingText, ratingId) {
  if (typeof ratingId === 'number' && ratingId >= 1 && ratingId <= 8) {
    const level = 9 - ratingId;
    const byId = {
      1: { label: 'The Dogs', color: '#10b981' },
      2: { label: 'Exceptional', color: '#059669' },
      3: { label: 'Very Good', color: '#0284c7' },
      4: { label: 'Fine', color: '#38bdf8' },
      5: { label: 'Okay', color: '#f59e0b' },
      6: { label: 'Very Bad', color: '#f97316' },
      7: { label: 'Never Again', color: '#ef4444' },
      8: { label: 'The Worst', color: '#b91c1c' },
    };
    return {
      level,
      label: byId[ratingId]?.label || ratingText || 'Rated',
      color: byId[ratingId]?.color || '#64748b',
    };
  }

  if (ratingText) {
    const key = ratingText.trim().toLowerCase();
    const match = RATING_LEVEL_MAP[key];
    if (match) return match;
    for (const [k, val] of Object.entries(RATING_LEVEL_MAP)) {
      if (key.includes(k) || k.includes(key)) return val;
    }
  }

  return { level: 0, label: 'Unrated', color: '#94a3b8' };
}

export const SENTIMENT_HIGH_CATEGORIES = [
  {
    key: 'Positive',
    label: 'Positive',
    color: '#10b981',
    bgActive: '#ecfdf5',
    borderActive: '#10b981',
    textActive: '#065f46',
  },
  {
    key: 'Neutral',
    label: 'Neutral',
    color: '#f59e0b',
    bgActive: '#fef3c7',
    borderActive: '#f59e0b',
    textActive: '#92400e',
  },
  {
    key: 'Negative',
    label: 'Negative',
    color: '#ef4444',
    bgActive: '#fef2f2',
    borderActive: '#ef4444',
    textActive: '#991b1b',
  },
];

/**
 * Normalises Sentiment_High to one of 'Positive', 'Neutral', 'Negative'.
 */
export function normalizeSentimentHigh(raw) {
  if (!raw) return null;
  const norm = raw.trim().toLowerCase();
  if (norm === 'positive') return 'Positive';
  if (norm === 'negative') return 'Negative';
  if (norm === 'neutral') return 'Neutral';
  return null;
}

/**
 * Computes counts of meals by Sentiment_High categories.
 */
export function countSentimentHighCategories(meals = []) {
  const counts = {
    Positive: 0,
    Neutral: 0,
    Negative: 0,
    Other: 0,
    total: meals.length,
  };

  for (const meal of meals) {
    const cat = normalizeSentimentHigh(meal.sentimentCategory);
    if (cat === 'Positive') counts.Positive++;
    else if (cat === 'Negative') counts.Negative++;
    else if (cat === 'Neutral') counts.Neutral++;
    else counts.Other++;
  }

  return counts;
}

/**
 * Filters meals based on active Sentiment_High categories (e.g. ['Positive', 'Neutral']).
 */
export function filterMealsBySentimentHigh(
  meals = [],
  activeCategories = ['Positive', 'Neutral', 'Negative']
) {
  if (!Array.isArray(activeCategories) || activeCategories.length === 0) {
    return [];
  }
  const catSet = new Set(activeCategories);

  return meals.filter((meal) => {
    const cat = normalizeSentimentHigh(meal.sentimentCategory);
    return cat && catSet.has(cat);
  });
}

/**
 * Builds frequency data for actual Sentiment words from the filtered meals.
 */
export function buildSentimentWordCloud(filteredMeals = [], options = {}) {
  const { minFontSize = 13, maxFontSize = 38, maxWords = 90 } = options;
  const wordMap = new Map();

  for (const meal of filteredMeals) {
    const rawWord = meal.sentiment?.trim();
    if (
      !rawWord ||
      rawWord.toLowerCase() === 'no comment' ||
      rawWord.toLowerCase() === 'null'
    ) {
      continue;
    }

    if (!wordMap.has(rawWord)) {
      wordMap.set(rawWord, {
        text: rawWord,
        count: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
      });
    }

    const entry = wordMap.get(rawWord);
    entry.count++;

    const cat = normalizeSentimentHigh(meal.sentimentCategory);
    if (cat === 'Positive') entry.positiveCount++;
    else if (cat === 'Negative') entry.negativeCount++;
    else if (cat === 'Neutral') entry.neutralCount++;
  }

  // Sort by frequency descending and take top N words
  const sortedWords = Array.from(wordMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxWords);

  if (sortedWords.length === 0) {
    return { words: [], maxCount: 0, minCount: 0, totalSentiments: 0 };
  }

  const maxCount = sortedWords[0].count;
  const minCount = sortedWords[sortedWords.length - 1].count;
  const countRange = Math.max(maxCount - minCount, 1);

  const words = sortedWords.map((w) => {
    // Dominant high-level category
    let dominantCategory = 'Neutral';
    if (w.positiveCount >= w.neutralCount && w.positiveCount >= w.negativeCount) {
      dominantCategory = 'Positive';
    } else if (w.negativeCount >= w.positiveCount && w.negativeCount >= w.neutralCount) {
      dominantCategory = 'Negative';
    }

    // Square-root frequency scaling for harmonious word cloud sizing
    const scale = Math.sqrt((w.count - minCount) / countRange);
    const fontSize = Math.round(minFontSize + scale * (maxFontSize - minFontSize));

    return {
      text: w.text,
      count: w.count,
      dominantCategory,
      fontSize,
    };
  });

  return {
    words,
    maxCount,
    minCount,
    totalSentiments: sortedWords.reduce((sum, w) => sum + w.count, 0),
  };
}

/**
 * Filters meals based on a search query across comment, restaurant name,
 * city, year, and sentiment word - strictly accent-insensitive.
 * e.g. "cafe" matches "Café Le Rouge", "marrakesh" matches "Marrakech"
 */
export function filterMealsBySearch(meals = [], searchQuery = '') {
  if (!searchQuery || !searchQuery.trim()) return meals;
  const q = stripAccents(searchQuery.trim());

  return meals.filter((m) => {
    const commentMatch = m.comment && stripAccents(m.comment).includes(q);
    const restMatch =
      m.restaurant?.name && stripAccents(m.restaurant.name).includes(q);
    const cityMatch =
      m.restaurant?.city?.name && stripAccents(m.restaurant.city.name).includes(q);
    const yearMatch = m.year && String(m.year).includes(q);
    const sentMatch = m.sentiment && stripAccents(m.sentiment).includes(q);
    const ratingMatch = m.rating && stripAccents(m.rating).includes(q);
    return commentMatch || restMatch || cityMatch || yearMatch || sentMatch || ratingMatch;
  });
}

/**
 * Filters and sorts meals that have a valid comment for the compact comments table.
 */
export function filterAndSortComments(
  meals = [],
  selectedSentimentWord = null,
  searchQuery = '',
  sortField = 'year',
  sortDirection = 'desc'
) {
  // 1. Only include meals with non-blank comments
  let result = meals.filter(
    (m) => typeof m.comment === 'string' && m.comment.trim().length > 0
  );

  // 2. Search query filter (comment, restaurant, city, year, sentiment, rating) - accent-insensitive
  if (searchQuery && searchQuery.trim().length > 0) {
    result = filterMealsBySearch(result, searchQuery);
  }

  // 3. Filter by selected sentiment word if clicked in word cloud
  if (selectedSentimentWord) {
    const targetWord = selectedSentimentWord.toLowerCase();
    result = result.filter(
      (m) => m.sentiment && m.sentiment.trim().toLowerCase() === targetWord
    );
  }

  // 4. Sort
  result.sort((a, b) => {
    let comp = 0;
    if (sortField === 'year') {
      comp = (a.year || 0) - (b.year || 0);
    } else if (sortField === 'rating') {
      const levelA = getRatingVisualInfo(a.rating, a.ratingId).level;
      const levelB = getRatingVisualInfo(b.rating, b.ratingId).level;
      comp = levelA - levelB;
    } else if (sortField === 'sentiment') {
      const sentA = a.sentiment || '';
      const sentB = b.sentiment || '';
      comp = sentA.localeCompare(sentB);
    } else if (sortField === 'restaurant') {
      const nameA = a.restaurant?.name || '';
      const nameB = b.restaurant?.name || '';
      comp = nameA.localeCompare(nameB);
    } else if (sortField === 'city') {
      const cityA = a.restaurant?.city?.name || '';
      const cityB = b.restaurant?.city?.name || '';
      comp = cityA.localeCompare(cityB);
    } else if (sortField === 'comment') {
      const commA = a.comment || '';
      const commB = b.comment || '';
      comp = commA.localeCompare(commB);
    }

    return sortDirection === 'asc' ? comp : -comp;
  });

  return result;
}
