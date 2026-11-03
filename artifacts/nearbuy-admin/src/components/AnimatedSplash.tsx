import { useEffect, useRef, useState } from "react";
import "./AnimatedSplash.css";

type MotionMode = "initial" | "full" | "reduced";
const FULL_FINISH_MS = 1200;

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const [motionMode, setMotionMode] = useState<MotionMode>(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "initial",
  );
  const [isFading, setIsFading] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const completedRef = useRef(false);

  useEffect(() => {
    let fadeTimer: number | undefined;
    let finishTimer: number | undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clearTimers = () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(finishTimer);
    };
    const finishOnce = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onFinishRef.current();
    };
    const schedule = (reduced: boolean) => {
      if (completedRef.current) return;
      clearTimers();
      if (reduced) {
        setMotionMode("reduced");
        finishOnce();
        return;
      }
      setMotionMode("full");
      fadeTimer = window.setTimeout(() => setIsFading(true), FULL_FINISH_MS - 180);
      finishTimer = window.setTimeout(finishOnce, FULL_FINISH_MS);
    };
    const handleMotionChange = (event: MediaQueryListEvent) => schedule(event.matches);
    media.addEventListener("change", handleMotionChange);
    schedule(media.matches);
    return () => {
      clearTimers();
      media.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <div className={`bsplash bsplash--${motionMode}${isFading ? " bsplash--fade" : ""}`} aria-hidden="true" data-testid="admin-splash">
      <div className="bsplash__lockup">
        <div className="bsplash__mark-stage">
          <svg className="bsplash__mark" viewBox="2 28 25 30.3" aria-hidden="true">
            <g className="bsplash__pin">
              <path className="bsplash__shell" d="m14.47 29.83c-5.65 0-10.26 4.58-10.26 10.28 0 1.46 0.29 2.85 0.82 4.1 1.77 4.08 6.48 8.7 8.69 10.62 0.53 0.47 1.22 0.49 1.67 0.06 2.33-2.19 6.95-6.7 8.71-10.78 0.52-1.23 0.8-2.59 0.8-4 0-5.7-4.71-10.28-10.43-10.28z" />
              <circle className="bsplash__dot" cx="14.53" cy="41.76" r="1.076" />
              <path className="bsplash__body" d="m11.85 45.21c0-0.76 0.62-1.36 1.37-1.36h2.57c0.77 0 1.43 0.58 1.43 1.32v5.24h-5.37v-5.2z" />
              <g className="bsplash__wings">
                <path className="bsplash__wing bsplash__wing--left" d="m9.71 34.31c0.18-0.3 0.5-0.5 0.85-0.5h3.21c0.17 0 0.29 0.13 0.26 0.29l-0.82 4.67c-0.12 0.68-0.74 1.16-1.44 1.16h-3.36c-0.97 0-1.5-0.96-1.04-1.69l2.34-3.93z" />
                <path className="bsplash__wing bsplash__wing--right" d="m19.41 34.31c-0.18-0.3-0.5-0.5-0.85-0.5h-3.17c-0.2 0-0.33 0.15-0.3 0.32l0.82 4.65c0.11 0.68 0.72 1.15 1.42 1.15h3.28c1.01 0 1.53-0.94 1.08-1.68l-2.28-3.94z" />
              </g>
            </g>
          </svg>
        </div>
        <div className="bsplash__wordmark">
          <span className="bsplash__brand"><span className="bsplash__brand-ici">ici</span><span className="bsplash__brand-biz">Biz</span></span>
        </div>
      </div>
    </div>
  );
}
