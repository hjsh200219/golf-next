export interface PinIcon {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Price pill with a bottom tip, as an SVG data URL for google.maps.Marker icons
 * (AdvancedMarkerElement would need a Map ID). Width follows the label length.
 */
export function pinIcon(text: string, selected: boolean): PinIcon {
  const fontSize = selected ? 15 : 13;
  const padX = selected ? 12 : 9;
  const bodyH = selected ? 32 : 26;
  const tip = 7;
  // Hangul/digits ≈ 0.62em average at this weight
  const width = Math.round(text.length * fontSize * 0.62 + padX * 2) + (selected ? 6 : 0);
  const height = bodyH + tip;
  const fill = selected ? '#14532d' : '#15803d';
  const stroke = '#ffffff';
  const r = bodyH / 2;
  const cx = width / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<path d="M${r} 1 H${width - r} A${r - 1} ${r - 1} 0 0 1 ${width - r} ${bodyH - 1} H${cx + 6} L${cx} ${height - 1} L${cx - 6} ${bodyH - 1} H${r} A${r - 1} ${r - 1} 0 0 1 ${r} 1 Z" ` +
    `fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
    `<text x="${cx}" y="${bodyH / 2 + fontSize * 0.36}" text-anchor="middle" font-family="Pretendard, -apple-system, sans-serif" ` +
    `font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(text)}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    width,
    height,
    anchorX: width / 2,
    anchorY: height,
  };
}

/** Small dot for a course whose price pill is hidden by a cheaper overlapping one. */
export function dotIcon(): PinIcon {
  const size = 12;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="6" cy="6" r="4.5" fill="#15803d" stroke="#ffffff" stroke-width="2"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    width: size,
    height: size,
    anchorX: size / 2,
    anchorY: size / 2,
  };
}
