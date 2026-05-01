import { useEffect, useState } from "react";
import "./AnimatedSplash.css";

type Props = {
  onFinish: () => void;
};

/**
 * BizIci cold-start splash. Mirrors the six-step Reanimated choreography of
 * the mobile apps, in pure CSS for the web admin:
 *
 *   0    – 700 ms : orange teardrop pin drops in from above
 *   700  – 1200 ms: navy oval base appears under the pin
 *   900  – 1500 ms: scalloped green awning and storefront materialise inside
 *   1300 – 1700 ms: three green sparks burst out from the pin
 *   1700 – 2200 ms: composition lifts/scales slightly
 *   1900 – 2700 ms: "Biz Ici" wordmark + "Admin" tagline fade in
 *   2900 – 3300 ms: full-screen fade-out, then onFinish() reveals the app
 */
export function AnimatedSplash({ onFinish }: Props) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), 2900);
    const doneTimer = setTimeout(onFinish, 3300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`splash-root${isFading ? " splash-root--fade" : ""}`}
      aria-hidden="true"
      data-testid="admin-splash"
    >
      <div className="splash-stage">
        {/* Stage 4: three green sparks bursting out of the pin */}
        <span className="splash-spark splash-spark--1" aria-hidden />
        <span className="splash-spark splash-spark--2" aria-hidden />
        <span className="splash-spark splash-spark--3" aria-hidden />

        {/* Pin assembly: drops in, then the storefront materialises inside */}
        <div className="splash-pin">
          <svg
            className="splash-pin-svg"
            viewBox="0 0 100 130"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Stage 2: navy oval base shadow */}
            <ellipse
              className="splash-base"
              cx={50}
              cy={120}
              rx={18}
              ry={5}
              fill="#1B2A5C"
            />
            {/* Stage 1: orange teardrop pin */}
            <path
              d="M 50 6 C 26 6 8 24 8 47 C 8 75 50 118 50 118 C 50 118 92 75 92 47 C 92 24 74 6 50 6 Z"
              fill="#F58220"
            />
            {/* White window inside the pin */}
            <path
              d="M 50 16 C 32 16 18 30 18 47 C 18 64 32 78 50 78 C 68 78 82 64 82 47 C 82 30 68 16 50 16 Z"
              fill="#ffffff"
            />

            {/* Stage 3: storefront awning + body materialises inside the window */}
            <g className="splash-store">
              {/* Scalloped green awning */}
              <path
                d="M 28 31 H 72 V 38 Q 66.5 43 61 38 Q 55.5 43 50 38 Q 44.5 43 39 38 Q 33.5 43 28 38 Z"
                fill="#7FB927"
              />
              {/* Awning vertical stripes */}
              <rect x={33} y={31} width={6} height={7} fill="#8FCB2E" />
              <rect x={44} y={31} width={6} height={7} fill="#8FCB2E" />
              <rect x={55} y={31} width={6} height={7} fill="#8FCB2E" />
              <rect x={66} y={31} width={6} height={7} fill="#8FCB2E" />
              {/* Navy storefront body */}
              <path d="M 30 41 H 70 V 70 H 30 Z" fill="#1B2A5C" />
              {/* Navy door + green window */}
              <rect
                x={34}
                y={48}
                width={13}
                height={22}
                rx={1.2}
                fill="#0E1530"
              />
              <rect x={36} y={51} width={3} height={4} fill="#7FB927" />
              {/* Green shopping bag with handle */}
              <rect
                x={52}
                y={53}
                width={13}
                height={15}
                rx={1.5}
                fill="#7FB927"
              />
              <path
                d="M 55 53 Q 55 48 58.5 48 Q 62 48 62 53"
                stroke="#7FB927"
                strokeWidth={1.6}
                fill="none"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>
      </div>

      <div className="splash-wordmark">
        <span className="splash-wordmark-biz">Biz</span>
        <span className="splash-wordmark-ici">Ici</span>
        <span className="splash-wordmark-admin">Admin</span>
      </div>
    </div>
  );
}
