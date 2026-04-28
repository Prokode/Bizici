import { useEffect, useState } from "react";
import "./AnimatedSplash.css";

type Props = {
  onFinish: () => void;
};

export function AnimatedSplash({ onFinish }: Props) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Sequence:
    //  - 0 ms       : pin starts dropping (CSS animation, ~700 ms)
    //  - 700 ms     : pin landed, bag starts spinning (CSS animation, ~2200 ms)
    //  - 2900 ms    : start fade out
    //  - 3300 ms    : reveal underlying screen (login)
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
      <div className="splash-pin">
        <svg
          className="splash-pin-svg"
          viewBox="0 0 100 130"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="splash-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FF6B35" />
              <stop offset="1" stopColor="#FF3D7F" />
            </linearGradient>
          </defs>
          {/* Pin outline */}
          <path
            d="M 50 8
               C 26.8 8 8 26.8 8 50
               C 8 78 50 122 50 122
               C 50 122 92 78 92 50
               C 92 26.8 73.2 8 50 8 Z"
            stroke="url(#splash-grad)"
            strokeWidth={5}
            fill="none"
            strokeLinejoin="round"
          />
          {/* Inner circle */}
          <circle
            cx={50}
            cy={48}
            r={32}
            stroke="url(#splash-grad)"
            strokeWidth={3.5}
            fill="none"
          />
        </svg>
        {/* Bag inside the pin's inner circle */}
        <div className="splash-bag">
          <svg
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            className="splash-bag-svg"
          >
            <defs>
              <linearGradient id="splash-bag-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FF6B35" />
                <stop offset="1" stopColor="#FF3D7F" />
              </linearGradient>
            </defs>
            {/* Bag handles */}
            <path
              d="M 22 22 V 18 a 10 10 0 0 1 20 0 V 22"
              stroke="url(#splash-bag-grad)"
              strokeWidth={3.5}
              fill="none"
              strokeLinecap="round"
            />
            {/* Bag body */}
            <path
              d="M 14 22 H 50 L 47 54 H 17 Z"
              stroke="url(#splash-bag-grad)"
              strokeWidth={3.5}
              fill="none"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <div className="splash-wordmark">
        <span className="splash-wordmark-near">Near</span>
        <span className="splash-wordmark-buy">Buy</span>
        <span className="splash-wordmark-admin">Admin</span>
      </div>
    </div>
  );
}
