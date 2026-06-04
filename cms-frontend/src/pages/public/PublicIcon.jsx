const ICONS = {
  book: (
    <>
      <path d="M3 4h5a4 4 0 0 1 4 4v12a3.5 3.5 0 0 0-3.5-3.5H3z" />
      <path d="M21 4h-5a4 4 0 0 0-4 4v12a3.5 3.5 0 0 1 3.5-3.5H21z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  church: (
    <>
      <path d="M4 21h16M6 21V10l6-4 6 4v11M9 21v-5h6v5" />
      <path d="M12 2v5M10 4h4" />
    </>
  ),
  cross: <path d="M12 3v18M7.5 8h9" />,
  dove: (
    <>
      <path d="M3 14c3.2 0 5.7-1.2 7.4-3.7L13 6l1.5 4.2c1.9.5 4 .4 6.5-.2-1.6 2.5-3.6 4.2-6.1 5.1-1.6.6-2.9 1.6-3.9 3-1.5-2-4.2-3.4-8-4.1Z" />
      <path d="m17.5 9.3 1-2 1.1 1.8" />
    </>
  ),
  facebook: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M14 21v-8h3l.5-3H14V8.5c0-1 .5-1.5 1.7-1.5H18V4.2c-.7-.1-1.5-.2-2.4-.2-2.6 0-4.3 1.6-4.3 4.5V10H9v3h2.3v8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" />
    </>
  ),
  house: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v12h14V9M9 21v-6h6v6" />
    </>
  ),
  island: (
    <>
      <path d="M3 18h18M5 18l4.5-7 2.5 3 2.5-5 4.5 9" />
      <path d="M4 21c2-1 4-1 6 0s4 1 6 0 3-1 4 0" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 21c5-1 9-5 11-11" />
      <path d="M7 16C3 12 5 6 14 4c2-.4 4-.4 6 0-.6 8-5 12-13 12Z" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M8.5 15.5A6.5 6.5 0 1 1 15.5 15.5c-.8.6-1.2 1.4-1.2 2.5H9.7c0-1.1-.4-1.9-1.2-2.5Z" />
      <path d="M9 18h6M10 21h4" />
    </>
  ),
  mobile: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2" />
      <path d="M10 18.5h4" />
    </>
  ),
  palm: (
    <>
      <path d="M11 21c0-5 .6-9.3 2.5-13" />
      <path d="M13.5 8C11 5.2 8 5 5.5 6.5c2.4.2 4.4 1.2 5.8 3M13.5 8c1-3 3.8-4.5 7-3.5-1.3 1.6-3.2 2.6-5.4 2.8M13.5 8c2.8-.1 5 1.1 6.2 3.2-2 .4-3.9 0-5.4-1.2M13.5 8c-1-2.8-.9-5.1.3-7 1.4 1.8 1.9 4 1.2 6.2" />
      <path d="M7.5 21h8" />
    </>
  ),
  phone: <path d="M21 16.5v3a2 2 0 0 1-2.2 2 18 18 0 0 1-7.8-2.8 17.7 17.7 0 0 1-5.7-5.7 18 18 0 0 1-2.8-7.8A2 2 0 0 1 4.5 3h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1l-1.2 1.2a14 14 0 0 0 4.9 4.9l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2Z" />,
  pin: (
    <>
      <path d="M20 10c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  play: <path d="m8 5 10 7-10 7Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  wave: (
    <>
      <path d="M3 7c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" />
      <path d="M3 12c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" />
      <path d="M3 17c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" />
    </>
  ),
};

export default function PublicIcon({ name, size = 18, style = {} }) {
  const icon = ICONS[name];
  if (!icon) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {icon}
    </svg>
  );
}
