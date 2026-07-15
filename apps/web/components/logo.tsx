/** Hoodwire "Split" logo mark — two offset rounded bars. */
export function LogoMark({
  color = "#C6F53E",
  size = 16,
}: {
  color?: string;
  size?: number | string;
}) {
  return (
    <svg width={size} height={size} viewBox="18 14 64 72" fill="none" aria-hidden="true" focusable="false">
      <rect x="22" y="18" width="27" height="56" rx="10" fill={color} />
      <rect x="51" y="26" width="27" height="56" rx="10" fill={color} />
    </svg>
  );
}
