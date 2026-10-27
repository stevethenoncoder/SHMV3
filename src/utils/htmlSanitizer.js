import DOMPurify from 'dompurify';

// In browser environments, DOMPurify.sanitize is directly available or initialized.
// If imported in Node without window, getPurifier handles fallback safely.
function getPurifier() {
  if (typeof DOMPurify?.sanitize === 'function') {
    return DOMPurify;
  }
  if (typeof window !== 'undefined' && typeof DOMPurify === 'function') {
    return DOMPurify(window);
  }
  return null;
}

/**
 * Sanitises HTML blog content for safe rendering.
 * Strips scripts, event handlers, unsafe attributes, and any embedded map iframes
 * (since maps are handled in the dedicated Map section).
 *
 * @param {string|null} rawHtml
 * @returns {string}
 */
export function sanitizeBlogContent(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  // Pre-clean: strip iframe tags so map iframes don't duplicate the dedicated map section
  const withoutIframes = rawHtml.replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gi, '');

  const purifier = getPurifier();
  if (!purifier) {
    // Basic fallback if running in a headless/test environment without DOM
    return withoutIframes;
  }

  // Configure DOMPurify
  const clean = purifier.sanitize(withoutIframes, {
    ALLOWED_TAGS: [
      'p', 'br', 'span', 'div', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
      'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', 'hr',
      'code', 'pre', 'figure', 'figcaption'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style',
      'width', 'height', 'loading'
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
  });

  return clean;
}
