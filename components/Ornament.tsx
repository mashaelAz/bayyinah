/** نجمة ثمانية (خاتم) — العنصر الزخرفي الأساسي في هوية تثبّت */
export function Star({ color = 'currentColor', className }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="2">
        <rect x="11" y="11" width="26" height="26" />
        <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" />
        <circle cx="24" cy="24" r="5" />
      </g>
    </svg>
  );
}

/** فاصل زخرفي: خطان ذهبيان تتوسطهما نجمة */
export default function Ornament() {
  return (
    <div className="ornament" aria-hidden="true">
      <Star />
    </div>
  );
}
