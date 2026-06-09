import React, { useMemo } from 'react';

const parser = new DOMParser();

/**
 * Convert an SVG string to a React element tree safely.
 * Only accepts static SVG strings from NAV_ICONS (compile-time constants).
 */
function svgStringToReactNode(svgString, size) {
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return null;

  function convert(node) {
    if (node.nodeType === 3) {
      const text = node.textContent.trim();
      return text || null;
    }
    if (node.nodeType !== 1) return null;

    const tag = node.tagName.toLowerCase();
    const attrs = {};
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:') || attr.name.startsWith('xlink:')) continue;
      const key = attr.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      attrs[key] = attr.value;
    }

    if (tag === 'svg') {
      attrs.width = size;
      attrs.height = size;
    }

    const children = [];
    node.childNodes.forEach(child => {
      const converted = convert(child);
      if (converted !== null) children.push(converted);
    });

    return React.createElement(tag, { key: Math.random(), ...attrs }, ...children);
  }

  return convert(svgEl);
}

export default function SafeIcon({ svg, size = 18, style }) {
  const node = useMemo(() => svgStringToReactNode(svg, size), [svg, size]);

  if (!node) return null;

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size + 6,
        height: size + 6,
        ...style,
      }}
    >
      {node}
    </span>
  );
}