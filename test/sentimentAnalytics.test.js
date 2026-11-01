import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSentimentHigh,
  countSentimentHighCategories,
  filterMealsBySentimentHigh,
  filterMealsBySearch,
  stripAccents,
  buildSentimentWordCloud,
  filterAndSortComments,
  getRatingVisualInfo,
  SENTIMENT_HIGH_CATEGORIES,
} from '../src/utils/sentimentAnalytics.js';

test('Sentiment Analytics Suite', async (t) => {
  const mockMeals = [
    {
      id: 1,
      comment: 'Delicious meal and wonderful service',
      sentiment: 'Delighted',
      sentimentCategory: 'Positive',
      rating: 'Exceptional',
      ratingId: 2,
      restaurant: { name: 'The Ivy', city: { name: 'London' } },
      year: 2024,
    },
    {
      id: 2,
      comment: 'Pleasant afternoon lunch',
      sentiment: 'Content',
      sentimentCategory: 'Positive',
      rating: 'The Dogs',
      ratingId: 1,
      restaurant: { name: 'Café Paris', city: { name: 'Paris' } },
      year: 2023,
    },
    {
      id: 3,
      comment: 'Average food, nothing special',
      sentiment: 'Neutral',
      sentimentCategory: 'Neutral',
      rating: 'Fine',
      ratingId: 4,
      restaurant: { name: 'Pizza Express', city: { name: 'London' } },
      year: 2022,
    },
    {
      id: 4,
      comment: 'Terrible cold soup and rude staff',
      sentiment: 'Disappointed',
      sentimentCategory: 'Negative',
      rating: 'Very Bad',
      ratingId: 6,
      restaurant: { name: 'Bad Bistro', city: { name: 'Manchester' } },
      year: 2021,
    },
    {
      id: 5,
      comment: 'Total disaster never coming back',
      sentiment: 'Disappointed',
      sentimentCategory: 'Negative',
      rating: 'Never Again',
      ratingId: 7,
      restaurant: { name: 'Bad Bistro', city: { name: 'Manchester' } },
      year: 2020,
    },
    {
      id: 6,
      comment: '',
      sentiment: 'No Comment',
      sentimentCategory: 'No Comment',
      rating: 'Unrated',
      ratingId: null,
      restaurant: { name: 'Quick Bite', city: { name: 'London' } },
      year: 2019,
    },
  ];

  await t.test('1. normalizeSentimentHigh handles valid, lowercase, and null values', () => {
    assert.strictEqual(normalizeSentimentHigh('Positive'), 'Positive');
    assert.strictEqual(normalizeSentimentHigh('positive'), 'Positive');
    assert.strictEqual(normalizeSentimentHigh('Negative'), 'Negative');
    assert.strictEqual(normalizeSentimentHigh('neutral'), 'Neutral');
    assert.strictEqual(normalizeSentimentHigh('No Comment'), null);
    assert.strictEqual(normalizeSentimentHigh(null), null);
    assert.strictEqual(normalizeSentimentHigh(''), null);
  });

  await t.test('2. countSentimentHighCategories computes correct distribution', () => {
    const counts = countSentimentHighCategories(mockMeals);
    assert.strictEqual(counts.Positive, 2);
    assert.strictEqual(counts.Neutral, 1);
    assert.strictEqual(counts.Negative, 2);
    assert.strictEqual(counts.Other, 1);
    assert.strictEqual(counts.total, 6);
  });

  await t.test('3. filterMealsBySentimentHigh filters by active category set', () => {
    // Only Positive
    const posOnly = filterMealsBySentimentHigh(mockMeals, ['Positive']);
    assert.strictEqual(posOnly.length, 2);
    assert.strictEqual(posOnly[0].id, 1);
    assert.strictEqual(posOnly[1].id, 2);

    // Positive + Negative (excluding Neutral)
    const posAndNeg = filterMealsBySentimentHigh(mockMeals, ['Positive', 'Negative']);
    assert.strictEqual(posAndNeg.length, 4);

    // Empty active categories returns empty
    const none = filterMealsBySentimentHigh(mockMeals, []);
    assert.strictEqual(none.length, 0);
  });

  await t.test('4. buildSentimentWordCloud groups by sentiment word and excludes No Comment', () => {
    const cloud = buildSentimentWordCloud(mockMeals);
    assert.strictEqual(cloud.words.length, 4); // Disappointed (2), Delighted (1), Content (1), Neutral (1)
    assert.strictEqual(cloud.words[0].text, 'Disappointed');
    assert.strictEqual(cloud.words[0].count, 2);
    assert.strictEqual(cloud.words[0].dominantCategory, 'Negative');
  });

  await t.test('5. filterAndSortComments filters non-empty comments and searches', () => {
    // Filter non-empty comments
    const comments = filterAndSortComments(mockMeals);
    assert.strictEqual(comments.length, 5); // meal #6 has empty comment

    // Filter by specific sentiment word
    const disappointed = filterAndSortComments(mockMeals, 'Disappointed');
    assert.strictEqual(disappointed.length, 2);

    // Search by text
    const searchIvy = filterAndSortComments(mockMeals, null, 'ivy');
    assert.strictEqual(searchIvy.length, 1);
    assert.strictEqual(searchIvy[0].restaurant.name, 'The Ivy');

    // Search by city
    const searchParis = filterAndSortComments(mockMeals, null, 'paris');
    assert.strictEqual(searchParis.length, 1);
    assert.strictEqual(searchParis[0].restaurant.city.name, 'Paris');

    // Accent-insensitive search: typing "cafe" matches "Café Paris"
    assert.strictEqual(stripAccents('Café Le Rouge'), 'cafe le rouge');
    const searchCafe = filterAndSortComments(mockMeals, null, 'cafe');
    assert.strictEqual(searchCafe.length, 1);
    assert.strictEqual(searchCafe[0].restaurant.name, 'Café Paris');

    // Sort by sentiment
    const sortedSent = filterAndSortComments(mockMeals, null, '', 'sentiment', 'asc');
    assert.strictEqual(sortedSent[0].sentiment, 'Content');
    assert.strictEqual(sortedSent[sortedSent.length - 1].sentiment, 'Neutral');

    // Sort by rating (descending: highest rating first)
    const sortedRating = filterAndSortComments(mockMeals, null, '', 'rating', 'desc');
    assert.strictEqual(sortedRating[0].rating, 'The Dogs'); // Level 8
    assert.strictEqual(sortedRating[1].rating, 'Exceptional'); // Level 7
    assert.strictEqual(sortedRating[sortedRating.length - 1].rating, 'Never Again'); // Level 2
  });

  await t.test('6. filterMealsBySearch dynamically updates meals and word cloud', () => {
    // Dynamic search for "london" returns 3 meals (#1, #3, and #6)
    const londonMeals = filterMealsBySearch(mockMeals, 'london');
    assert.strictEqual(londonMeals.length, 3);

    // Word cloud built from searched meals reflects only London sentiments (ignoring "No Comment")
    const londonCloud = buildSentimentWordCloud(londonMeals);
    assert.strictEqual(londonCloud.words.length, 2);
    const words = londonCloud.words.map((w) => w.text);
    assert.ok(words.includes('Delighted'));
    assert.ok(words.includes('Neutral'));
    assert.ok(!words.includes('Disappointed'));
  });

  await t.test('7. getRatingVisualInfo maps 8 canonical levels accurately', () => {
    assert.strictEqual(getRatingVisualInfo('The Dogs', 1).level, 8);
    assert.strictEqual(getRatingVisualInfo('Exceptional', 2).level, 7);
    assert.strictEqual(getRatingVisualInfo('Very Good', 3).level, 6);
    assert.strictEqual(getRatingVisualInfo('Fine', 4).level, 5);
    assert.strictEqual(getRatingVisualInfo("OK but wouldn't recommend", 5).level, 4);
    assert.strictEqual(getRatingVisualInfo('Very Bad', 6).level, 3);
    assert.strictEqual(getRatingVisualInfo('Never Again', 7).level, 2);
    assert.strictEqual(getRatingVisualInfo('The Worst in the World', 8).level, 1);
    assert.strictEqual(getRatingVisualInfo('Unrated', null).level, 0);
  });
});
