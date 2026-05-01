import { useEffect, useState } from "react";
import "./AnimatedSplash.css";

type Props = {
  onFinish: () => void;
};

const REDUCED_MOTION_FINISH_MS = 1600;
const FULL_FINISH_MS = 6200;

/**
 * BizIci cold-start splash — pixel/timing-faithful CSS port of the mobile
 * Reanimated splash (`artifacts/nearbuy/components/AnimatedSplash.tsx`).
 *
 * Six-step choreography (~6.2 s total):
 *   1. 0    – 700 ms : orange pin drops in from above
 *   2. 900  – 1700 ms: green storefront (awning + body + door + bag) materialises inside
 *   3. 1900 – 2500 ms: three green sparks burst (bouncy 1.2 → 1 spring)
 *   4. 2700 – 3400 ms: navy oval base appears under the pin tip
 *   5. 3800 – 4520 ms: pin composition shrinks to 0.5× and lifts up by 100 px
 *   6. 4200 – 4800 ms: "Biz Ici" wordmark + tagline fade in at top 18 %
 *   ⇢ 5700 – 6200 ms: full-screen fade-out, then onFinish()
 */
export function AnimatedSplash({ onFinish }: Props) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const totalDuration = reducedMotion ? REDUCED_MOTION_FINISH_MS : FULL_FINISH_MS;
    const fadeAt = totalDuration - 500;

    const fadeTimer = setTimeout(() => setIsFading(true), fadeAt);
    const doneTimer = setTimeout(onFinish, totalDuration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`bsplash${isFading ? " bsplash--fade" : ""}`}
      aria-hidden="true"
      data-testid="site-splash"
    >
      {/* Wordmark anchored at top — fades in at the end */}
      <div className="bsplash__wordmark">
        <div className="bsplash__brand">
          <span className="bsplash__brand-biz">Biz</span>
          <span className="bsplash__brand-ici">Ici</span>
        </div>
        <div className="bsplash__tagline">
          <span className="bsplash__tagline-navy">Trouvez tout </span>
          <span className="bsplash__tagline-orange">près de vous</span>
        </div>
      </div>

      {/* Pin composition — drops in, gets details, then shrinks + lifts */}
      <div className="bsplash__group">
        {/* Layer 4 (drawn first so the pin sits on top): navy oval base */}
        <div className="bsplash__layer bsplash__layer--base">
          <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx={50} cy={120} rx={18} ry={5} fill="#1B2A5C" />
          </svg>
        </div>

        {/* Layer 1: orange teardrop pin with white inner window */}
        <div className="bsplash__layer bsplash__layer--pin">
          <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 50 6 C 26 6 8 24 8 47 C 8 75 50 118 50 118 C 50 118 92 75 92 47 C 92 24 74 6 50 6 Z"
              fill="#F58220"
            />
            <path
              d="M 50 16 C 32 16 18 30 18 47 C 18 64 32 78 50 78 C 68 78 82 64 82 47 C 82 30 68 16 50 16 Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Layer 2: storefront inside the pin window */}
        <div className="bsplash__layer bsplash__layer--store">
          <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
            <g>
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
              <rect x={34} y={48} width={13} height={22} rx={1.2} fill="#0E1530" />
              <rect x={36} y={51} width={3} height={4} fill="#7FB927" />
              {/* Green shopping bag with handle */}
              <rect x={52} y={53} width={13} height={15} rx={1.5} fill="#7FB927" />
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

        {/* Layer 3: three green sparks above-left of the pin */}
        <div className="bsplash__layer bsplash__layer--sparks">
          <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#7FB927" strokeWidth={2.4} strokeLinecap="round">
              <path d="M 14 24 L 6 18" />
              <path d="M 22 12 L 18 4" />
              <path d="M 33 10 L 33 2" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
