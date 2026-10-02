const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function IconAlert() {
  return (
    <svg {...base}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </svg>
  );
}

export function IconEdit() {
  return (
    <svg {...base}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

export function IconQuote() {
  return (
    <svg {...base}>
      <path d="M5 11h4v6H4v-5c0-3 1.5-5 4-6" />
      <path d="M15 11h4v6h-5v-5c0-3 1.5-5 4-6" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg {...base}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.8-4.8" />
      <path d="M9 8.6a1.7 1.7 0 1 1 2.4 1.6c-.6.3-.9.7-.9 1.3M10.5 13.2v.01" />
    </svg>
  );
}

export function IconSpark() {
  return (
    <svg {...base}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
    </svg>
  );
}
