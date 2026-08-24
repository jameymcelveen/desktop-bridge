const BRIDGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="DesktopBridge">
  <rect width="64" height="64" rx="14" fill="#0f2744"/>
  <path d="M6 42 Q32 6 58 42" fill="none" stroke="#7dd3fc" stroke-width="4" stroke-linecap="round"/>
  <path d="M8 46 H56" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
  <path d="M16 46 V36 M24 46 V30 M32 46 V24 M40 46 V30 M48 46 V36" stroke="#7dd3fc" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="32" cy="14" r="3" fill="#fbbf24"/>
</svg>`;

export const BRIDGE_ICON = {
  src: `data:image/svg+xml;utf8,${encodeURIComponent(BRIDGE_SVG)}`,
  mimeType: 'image/svg+xml',
  sizes: ['any'] as string[],
};
