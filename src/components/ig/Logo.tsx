export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <path d="M24 3 42 13.5v21L24 45 6 34.5v-21L24 3Z" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M24 14v20M15 21.5v5M33 18.5v11" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}
