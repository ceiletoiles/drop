import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Capacitor } from '@capacitor/core';

/** Distance in px the user must pull before the refresh triggers. */
const TRIGGER_THRESHOLD = 80;
/** Maximum visual pull distance in px. */
const MAX_PULL = 130;
/** Size of the spinner circle in px. */
const SPINNER_SIZE = 36;

type PullState = 'idle' | 'pulling' | 'triggered' | 'refreshing' | 'settling';

/**
 * Checks whether the touch started inside a vertically scrollable container
 * that is not at its scroll top. In that case pull-to-refresh must not
 * activate because the inner container should scroll instead.
 */
const isInsideScrolledContainer = (target: EventTarget | null): boolean => {
  let element = target as HTMLElement | null;
  while (element && element !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(element);
    const scrollable = overflowY === 'auto' || overflowY === 'scroll';
    if (scrollable && element.scrollTop > 0) return true;
    element = element.parentElement;
  }
  return false;
};

export const PullToRefresh = ({ children, onRefresh }: PropsWithChildren<{ onRefresh: () => Promise<void> }>) => {
  const isNative = Capacitor.isNativePlatform();

  const [state, setState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const trackingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (state === 'refreshing' || state === 'settling') return;
      if (event.touches.length !== 1) return;

      // Don't interfere with scrollable children that have scrolled down.
      if (isInsideScrolledContainer(event.target)) return;

      // Only start tracking if the page is scrolled to the very top.
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 0) return;

      startYRef.current = event.touches[0].clientY;
      currentYRef.current = startYRef.current;
      trackingRef.current = true;
    },
    [state]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!trackingRef.current) return;
      if (event.touches.length !== 1) {
        trackingRef.current = false;
        setPullDistance(0);
        setState('idle');
        return;
      }

      const currentY = event.touches[0].clientY;
      const delta = currentY - startYRef.current;

      // Ignore upward or negligible movement.
      if (delta <= 0) {
        setPullDistance(0);
        setState('idle');
        return;
      }

      // Apply rubber-band damping so the content doesn't move 1:1 with the finger.
      const damped = Math.min(delta * 0.45, MAX_PULL);
      currentYRef.current = currentY;

      // Prevent the default browser overscroll / bounce.
      if (damped > 2) {
        event.preventDefault();
      }

      setPullDistance(damped);
      setState(damped >= TRIGGER_THRESHOLD ? 'triggered' : 'pulling');
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    if (!trackingRef.current) return;
    trackingRef.current = false;

    if (state === 'triggered') {
      setState('refreshing');
      setPullDistance(TRIGGER_THRESHOLD);

      onRefresh()
        .catch(() => undefined)
        .finally(() => {
          setState('settling');
          setPullDistance(0);
          // Give the CSS transition time to collapse the indicator.
          setTimeout(() => setState('idle'), 320);
        });
    } else {
      setState('settling');
      setPullDistance(0);
      setTimeout(() => setState('idle'), 320);
    }
  }, [state, onRefresh]);

  useEffect(() => {
    if (!isNative) return;

    const options: AddEventListenerOptions = { passive: false };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isNative, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isNative) return <>{children}</>;

  const progress = Math.min(pullDistance / TRIGGER_THRESHOLD, 1);
  const isActive = state !== 'idle';
  const isRefreshing = state === 'refreshing';
  const showSpinner = isActive && pullDistance > 4;

  // The SVG draws a circular arc that fills as the user pulls.
  const radius = (SPINNER_SIZE - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = isRefreshing ? circumference * 0.7 : circumference * progress;

  return (
    <div ref={containerRef} className="ptr-wrapper">
      {/* Indicator container */}
      <div
        className="ptr-indicator"
        style={{
          height: pullDistance,
          opacity: showSpinner ? 1 : 0,
          transition: state === 'pulling' || state === 'triggered' ? 'none' : 'height 0.3s ease, opacity 0.2s ease'
        }}
      >
        <div
          className={`ptr-spinner-container${isRefreshing ? ' ptr-spinning' : ''}`}
          style={{
            width: SPINNER_SIZE,
            height: SPINNER_SIZE,
            opacity: showSpinner ? Math.min(progress * 1.5, 1) : 0,
            transform: `scale(${0.4 + progress * 0.6})`
          }}
        >
          <svg width={SPINNER_SIZE} height={SPINNER_SIZE} viewBox={`0 0 ${SPINNER_SIZE} ${SPINNER_SIZE}`}>
            {/* Background circle track */}
            <circle
              cx={SPINNER_SIZE / 2}
              cy={SPINNER_SIZE / 2}
              r={radius}
              fill="none"
              stroke="rgba(99,102,241,0.15)"
              strokeWidth="3"
            />
            {/* Foreground arc */}
            <circle
              cx={SPINNER_SIZE / 2}
              cy={SPINNER_SIZE / 2}
              r={radius}
              fill="none"
              stroke="url(#ptr-gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference - arcLength}`}
              strokeDashoffset={circumference * 0.25}
              style={{ transition: isRefreshing ? 'none' : 'stroke-dasharray 0.08s ease' }}
            />
            <defs>
              <linearGradient id="ptr-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {children}
    </div>
  );
};
