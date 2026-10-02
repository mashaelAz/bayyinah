/** نجمة ثمانية (خاتم) — العنصر الزخرفي في هوية بيّنة */
export function Star({ color = 'currentColor', className }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round">
        <rect x="11" y="11" width="26" height="26" />
        <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" />
        <circle cx="24" cy="24" r="5" />
      </g>
    </svg>
  );
}

/** نجمة ممتلئة صغيرة تُستخدم علامةً للقوائم */
export function StarSolid({ color = 'currentColor', className }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g fill={color}>
        <rect x="12" y="12" width="24" height="24" />
        <rect x="12" y="12" width="24" height="24" transform="rotate(45 24 24)" />
      </g>
      <circle cx="24" cy="24" r="5" fill="#fff" />
    </svg>
  );
}
