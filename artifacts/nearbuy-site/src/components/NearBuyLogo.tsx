type Props = { size?: number };

export function NearBuyLogo({ size = 32 }: Props) {
  const w = size;
  const h = Math.round(size * 1.3);
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 130"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="nb-pin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="100%" stopColor="#FF3D7F" />
        </linearGradient>
      </defs>
      <path
        d="M50 5 C25 5 8 23 8 48 C8 78 50 122 50 122 C50 122 92 78 92 48 C92 23 75 5 50 5 Z"
        fill="none"
        stroke="url(#nb-pin)"
        strokeWidth="6"
      />
      <circle
        cx="50"
        cy="48"
        r="22"
        fill="none"
        stroke="url(#nb-pin)"
        strokeWidth="4"
      />
      <path
        d="M40 40 L40 56 L60 56 L60 40 M44 40 C44 36 47 33 50 33 C53 33 56 36 56 40"
        fill="none"
        stroke="url(#nb-pin)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
