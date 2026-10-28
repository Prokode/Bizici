import { useEffect, useRef, useState } from "react";
import "./AnimatedSplash.css";

type Props = {
  onFinish: () => void;
};

type MotionMode = "initial" | "full" | "reduced";

const FULL_FINISH_MS = 2250;
const REDUCED_FINISH_MS = 450;
const markSrc = `${import.meta.env.BASE_URL}icibiz-mark.svg`;

export function AnimatedSplash({ onFinish }: Props) {
  const [motionMode, setMotionMode] = useState<MotionMode>("initial");
  const [isFading, setIsFading] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const completedRef = useRef(false);

  useEffect(() => {
    let fadeTimer: number | undefined;
    let finishTimer: number | undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const clearTimers = () => {
      if (fadeTimer) window.clearTimeout(fadeTimer);
      if (finishTimer) window.clearTimeout(finishTimer);
      fadeTimer = undefined;
      finishTimer = undefined;
    };

    const finishOnce = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onFinishRef.current();
    };

    const schedule = (reduced: boolean) => {
      if (completedRef.current) return;
      clearTimers();
      setMotionMode(reduced ? "reduced" : "full");
      setIsFading(false);
      const duration = reduced ? REDUCED_FINISH_MS : FULL_FINISH_MS;
      const fadeDuration = reduced ? 260 : 400;
      fadeTimer = window.setTimeout(() => setIsFading(true), duration - fadeDuration);
      finishTimer = window.setTimeout(finishOnce, duration);
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      schedule(event.matches);
    };

    media.addEventListener("change", handleMotionChange);
    schedule(media.matches);

    return () => {
      clearTimers();
      media.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <div
      className={`bsplash bsplash--${motionMode}${isFading ? " bsplash--fade" : ""}`}
      aria-hidden="true"
      data-testid="site-splash"
    >
      <div className="bsplash__lockup">
        <div className="bsplash__mark-stage">
          <span className="bsplash__halo" />
          <img className="bsplash__mark" src={markSrc} alt="" />
        </div>
        <div className="bsplash__wordmark">
          <span className="bsplash__brand">
            <span className="bsplash__brand-ici">ici</span>
            <span className="bsplash__brand-biz">Biz</span>
          </span>
        </div>
      </div>
    </div>
  );
}
