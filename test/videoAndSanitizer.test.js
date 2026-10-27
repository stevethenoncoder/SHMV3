import assert from 'node:assert/strict';
import { extractYouTubeEmbedSrc, extractGoogleMapEmbedSrc } from '../src/data/normaliseItems.js';
import { sanitizeBlogContent } from '../src/utils/htmlSanitizer.js';

console.log('Running tests for video embed extraction and HTML sanitizer...\n');

// 1. Standard YouTube watch URL
{
  const input = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  const actual = extractYouTubeEmbedSrc(input);
  assert.equal(actual, expected, 'Standard YouTube watch URL should convert to embed URL');
  console.log('✓ Standard YouTube watch URL converts correctly');
}

// 2. youtu.be URL
{
  const input = 'https://youtu.be/dQw4w9WgXcQ';
  const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  const actual = extractYouTubeEmbedSrc(input);
  assert.equal(actual, expected, 'youtu.be URL should convert to embed URL');
  console.log('✓ youtu.be URL converts correctly');
}

// 3. YouTube Shorts URL
{
  const input = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
  const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  const actual = extractYouTubeEmbedSrc(input);
  assert.equal(actual, expected, 'YouTube Shorts URL should convert to embed URL');
  console.log('✓ YouTube Shorts URL converts correctly');
}

// 4. Existing /embed/ URL
{
  const input = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  const expected = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  const actual = extractYouTubeEmbedSrc(input);
  assert.equal(actual, expected, 'Existing /embed/ URL should work');
  console.log('✓ Existing /embed/ URL works');
}

// 5. Non-YouTube URLs or invalid video IDs are rejected
{
  assert.equal(extractYouTubeEmbedSrc('https://vimeo.com/12345678'), null, 'Vimeo URL must be rejected');
  assert.equal(extractYouTubeEmbedSrc('https://evil.com/watch?v=dQw4w9WgXcQ'), null, 'Phishing host must be rejected');
  assert.equal(extractYouTubeEmbedSrc('https://www.youtube.com/watch?v=short'), null, 'Invalid video ID length (< 11) must be rejected');
  assert.equal(extractYouTubeEmbedSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQextra'), null, 'Invalid video ID length (> 11) must be rejected');
  assert.equal(extractYouTubeEmbedSrc('not a url'), null, 'Arbitrary text must be rejected');
  assert.equal(extractYouTubeEmbedSrc(null), null, 'null input must return null');
  console.log('✓ Non-YouTube and invalid URLs are rejected');
}

// 6. Arbitrary iframe HTML inside Content is still removed by sanitizer
{
  const rawHtml = '<p>Hello world</p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe><p>Second paragraph</p>';
  const sanitized = sanitizeBlogContent(rawHtml);
  assert.ok(!sanitized.includes('<iframe'), 'iframe tag must be stripped from sanitized content');
  assert.ok(sanitized.includes('<p>Hello world</p>'), 'Legitimate p tag must be preserved');
  assert.ok(sanitized.includes('<p>Second paragraph</p>'), 'Second p tag must be preserved');

  const evilHtml = '<iframe src="https://evil.com/attack"></iframe>';
  const evilSanitized = sanitizeBlogContent(evilHtml);
  assert.equal(evilSanitized, '', 'Arbitrary iframe must produce clean output without iframes');
  console.log('✓ Arbitrary iframe HTML inside Content is still removed');
}

// 7. Google Map embed behaviour still works
{
  const mapIframe = '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2483.54!2d-0.1278!3d51.5074" width="600" height="450"></iframe>';
  const actualFromIframe = extractGoogleMapEmbedSrc(mapIframe);
  assert.equal(actualFromIframe, 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2483.54!2d-0.1278!3d51.5074', 'Google Maps embed iframe src should be extracted');

  const mapDirectUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2483.54!2d-0.1278!3d51.5074';
  const actualFromDirect = extractGoogleMapEmbedSrc(mapDirectUrl);
  assert.equal(actualFromDirect, mapDirectUrl, 'Direct Google Maps embed URL should be preserved');

  const invalidMap = '<iframe src="https://evilmaps.com/embed"></iframe>';
  assert.equal(extractGoogleMapEmbedSrc(invalidMap), null, 'Non-Google map URL must return null');
  console.log('✓ Current Google Map behaviour still works');
}

// 8. Placeholder text resolves correctly based on status and config
{
  const mockConfig = {
    visitedPlaceholder: 'Custom visited message',
    plannedPlaceholder: 'Custom planned message',
    unscheduledPlaceholder: 'Custom unscheduled message',
  };

  const { getPlaceholderText } = await import('../src/utils/statusColors.js');

  assert.equal(getPlaceholderText('Visited', mockConfig), 'Custom visited message');
  assert.equal(getPlaceholderText('Visited only', mockConfig), 'Custom visited message');
  assert.equal(getPlaceholderText('Planned', mockConfig), 'Custom planned message');
  assert.equal(getPlaceholderText('Not planned', mockConfig), 'Custom unscheduled message');

  // Without config, falls back to standard friendly messages
  assert.ok(getPlaceholderText('Visited', null).includes('logged a visit'));
  assert.ok(getPlaceholderText('Planned', null).includes('managed to visit yet'));
  assert.ok(getPlaceholderText('Not planned', null).includes('temporary placeholder'));
  assert.equal(getPlaceholderText('Blogged', null), 'No image available');
  console.log('✓ Status placeholder text resolves correctly with and without config');
}

console.log('\nAll 8 test cases passed successfully!');

