const sanitizeHtml = require('sanitize-html');

function cleanNoteHtml(content) {
  return sanitizeHtml(content || '', {
    allowedTags: [
      'p', 'br', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote',
      'strong', 'em', 'u', 's', 'code', 'pre', 'span', 'a', 'hr',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      p: ['style'], h1: ['style'], h2: ['style'], h3: ['style'], span: ['style'],
    },
    allowedStyles: {
      p: { 'text-align': [/^(?:left|center|right|justify)$/] },
      h1: { 'text-align': [/^(?:left|center|right|justify)$/] },
      h2: { 'text-align': [/^(?:left|center|right|justify)$/] },
      h3: { 'text-align': [/^(?:left|center|right|justify)$/] },
      span: { color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i] },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (_tag, attrs) => ({ tagName: 'a', attribs: {
        ...(attrs.href ? { href: attrs.href } : {}),
        ...(attrs.target === '_blank' ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
      } }),
    },
  });
}

module.exports = { cleanNoteHtml };
