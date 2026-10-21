import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';
import {
  CARD_COUNT,
  DEAL_DURATION,
  DRIFT_DEG_PER_SEC,
  FOLLOW_LAMBDA,
  LIFT_DURATION,
  LIFT_EASE,
  VELOCITY_DECAY,
  VELOCITY_PAUSE_MS,
  VIDEO_HALF_DEG,
} from './constants.js';
import { markPageReady } from '../../preloader/Preloader.js';
import { initCopy, playHeroCopy, prepareHeroCopy } from '../../text/Copy.js';
import { buildCards, prepareCardThumbnails } from './cards.js';
import { computeCardPose, computeWorldPose, wrap180 } from './pose.js';
import './HeroWheel.css';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setCached(el, cache, prop, value) {
  if (cache[prop] === value) return;
  cache[prop] = value;
  el.style[prop] = value;
}

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

/** Wait until the site preloader finishes lifting (or skip if none). */
function waitForPreloaderReveal() {
  if (!document.documentElement.classList.contains('is-preloading')) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    document.addEventListener('qiram:reveal', () => resolve(), { once: true });
  });
}

export default function HeroWheel() {
  const seed = useMemo(() => buildCards(CARD_COUNT), []);
  const [cards, setCards] = useState(seed);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const rootRef = useRef(null);
  const worldRef = useRef(null);
  const cardRefs = useRef([]);
  const videoRefs = useRef([]);
  const styleCache = useRef([]);
  const worldCache = useRef({});

  const deal = useMotionValue(0);
  const lift = useMotionValue(0);

  const targetAngle = useRef(0);
  const visibleAngle = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const lastPointerX = useRef(0);
  const lastPointerT = useRef(0);
  const lastMoveGap = useRef(0);
  const suppressClick = useRef(false);
  const finished = useRef(false);
  const controlsRef = useRef({ deal: null, lift: null });

  const finishEntrance = () => {
    if (finished.current) {
      deal.set(1);
      lift.set(1);
      return;
    }
    finished.current = true;
    controlsRef.current.deal?.stop();
    controlsRef.current.lift?.stop();
    deal.set(1);
    lift.set(1);
  };

  useEffect(() => {
    let cancelled = false;
    const blobUrls = [];

    (async () => {
      // Load hero media under the preloader before anything reveals.
      const prepared = await prepareCardThumbnails(seed);
      if (cancelled) return;
      prepared.forEach((card) => {
        if (card.cover?.startsWith('blob:')) blobUrls.push(card.cover);
      });
      setCards(prepared);
      await nextFrame();
      if (cancelled) return;

      try {
        prepareHeroCopy();
      } catch {
        document
          .querySelectorAll('[data-copy]')
          .forEach((el) => el.classList.add('is-copy-ready'));
      }

      // Listen before marking ready so we never miss qiram:reveal.
      const revealPromise = waitForPreloaderReveal();
      markPageReady();
      await revealPromise;
      if (cancelled || finished.current) return;

      try {
        const played = playHeroCopy();
        initCopy({ skipHero: played });
      } catch {
        document
          .querySelectorAll('[data-copy]')
          .forEach((el) => el.classList.add('is-copy-ready'));
      }

      const forceInstant =
        prefersReducedMotion() &&
        new URLSearchParams(window.location.search).has('reduced');

      if (forceInstant) {
        finishEntrance();
        return;
      }

      const dealAnim = animate(deal, 1, {
        duration: DEAL_DURATION,
        ease: 'linear',
      });
      controlsRef.current.deal = dealAnim;
      await dealAnim;
      if (cancelled || finished.current) return;

      await nextFrame();
      if (cancelled || finished.current) return;

      const liftAnim = animate(lift, 1, {
        duration: LIFT_DURATION,
        ease: LIFT_EASE,
      });
      controlsRef.current.lift = liftAnim;
      await liftAnim;
      if (!cancelled) finished.current = true;
    })();

    return () => {
      cancelled = true;
      controlsRef.current.deal?.stop();
      controlsRef.current.lift?.stop();
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, deal, lift]);

  useEffect(() => {
    let raf = 0;
    let lastT = performance.now();
    const skipDrift =
      prefersReducedMotion() &&
      new URLSearchParams(window.location.search).has('reduced');

    const tick = (now) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      const dealV = deal.get();
      const liftV = lift.get();

      if (!dragging.current && !skipDrift && liftV > 0) {
        targetAngle.current -= DRIFT_DEG_PER_SEC * liftV * dt;
      }

      if (!dragging.current && Math.abs(velocity.current) > 0.001) {
        targetAngle.current += velocity.current * dt;
        velocity.current *= Math.exp(-dt * VELOCITY_DECAY);
      }

      const follow = 1 - Math.exp(-dt * FOLLOW_LAMBDA);
      visibleAngle.current += (targetAngle.current - visibleAngle.current) * follow;

      const world = computeWorldPose(liftV);
      if (worldRef.current) {
        setCached(worldRef.current, worldCache.current, 'transform', world.transform);
      }

      const list = cardsRef.current;
      for (let i = 0; i < list.length; i += 1) {
        const el = cardRefs.current[i];
        if (!el) continue;
        if (!styleCache.current[i]) styleCache.current[i] = {};
        const cache = styleCache.current[i];

        const pose = computeCardPose(i, {
          deal: dealV,
          lift: liftV,
          wheelAngle: visibleAngle.current,
        });

        setCached(el, cache, 'transform', pose.transform);
        const vis = pose.visible ? 'visible' : 'hidden';
        if (cache.visibility !== vis) {
          cache.visibility = vis;
          el.style.visibility = vis;
        }

        const vid = videoRefs.current[i];
        if (vid) {
          const nearTop = Math.abs(wrap180(pose.angle)) <= VIDEO_HALF_DEG;
          const shouldPlay = liftV >= 0.6 && nearTop && pose.visible;
          if (shouldPlay) {
            if (vid.paused) {
              const play = vid.play();
              if (play?.catch) play.catch(() => {});
            }
          } else if (!vid.paused) {
            vid.pause();
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [deal, lift]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finishEntrance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    dragging.current = true;
    dragMoved.current = false;
    suppressClick.current = false;
    velocity.current = 0;
    lastPointerX.current = e.clientX;
    lastPointerT.current = performance.now();
    lastMoveGap.current = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const now = performance.now();
    const dx = e.clientX - lastPointerX.current;
    const dt = Math.max(1, now - lastPointerT.current);
    lastMoveGap.current = now - lastPointerT.current;

    if (Math.abs(dx) > 2) dragMoved.current = true;

    // Follow the finger: swipe left → cards move left (and vice versa).
    const deg = -dx * 0.12;
    targetAngle.current += deg;
    velocity.current = (deg / dt) * 1000;

    lastPointerX.current = e.clientX;
    lastPointerT.current = now;
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (lastMoveGap.current > VELOCITY_PAUSE_MS) {
      velocity.current = 0;
    }
    if (dragMoved.current) {
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 40);
    }
  };

  const onCardClick = (e) => {
    if (suppressClick.current || dragMoved.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onVideoPlaying = (i) => {
    const vid = videoRefs.current[i];
    if (vid) vid.classList.add('is-on');
  };

  return (
    <div
      ref={rootRef}
      className="hero-wheel"
      aria-label="Project wheel"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="hero-wheel__stage">
        <div className="hero-wheel__world" ref={worldRef}>
          <div className="hero-wheel__deck">
            {cards.map((card, i) => (
              <a
                key={card.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="hw-card"
                href={card.href}
                onClick={onCardClick}
                draggable={false}
              >
                <span className="hw-card__label">{card.title}</span>
                <div className="hw-card__face hw-card__front" aria-hidden="true">
                  {card.cover ? (
                    <img
                      className="hw-card__cover"
                      src={card.cover}
                      alt=""
                      draggable={false}
                      decoding="async"
                    />
                  ) : null}
                  <video
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                    className="hw-card__video"
                    src={card.video}
                    poster={card.cover || undefined}
                    muted
                    loop
                    playsInline
                    preload="none"
                    onPlaying={() => onVideoPlaying(i)}
                  />
                </div>
                <div className="hw-card__face hw-card__back" aria-hidden="true">
                  <span className="hw-card__monogram">Q</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
