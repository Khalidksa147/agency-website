import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';
import {
  CARD_COUNT,
  DEAL_DURATION,
  DEAL_DURATION_MOBILE,
  DRIFT_DEG_PER_SEC,
  FOLLOW_LAMBDA,
  LIFT_DURATION,
  LIFT_DURATION_MOBILE,
  LIFT_EASE,
  POST_REVEAL_DELAY_MS,
  PIVOT_END,
  PIVOT_END_MOBILE,
  RADIUS_END,
  RADIUS_END_MOBILE,
  VELOCITY_DECAY,
  VELOCITY_PAUSE_MS,
  VIDEO_HALF_DEG,
} from './constants.js';
import { markPageReady } from '../../preloader/Preloader.js';
import { initCopy, playHeroCopy, prepareHeroCopy } from '../../text/Copy.js';
import { buildCards, prepareCardThumbnails } from './cards.js';
import { computeCardPose, computeWorldPose, wrap180 } from './pose.js';
import './HeroWheel.css';

const VIDEO_POOL_SIZE = 3;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 720px)').matches;
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

function createPoolVideo() {
  const vid = document.createElement('video');
  vid.className = 'hw-card__video';
  vid.muted = true;
  vid.defaultMuted = true;
  vid.loop = true;
  vid.playsInline = true;
  vid.preload = 'none';
  vid.setAttribute('muted', '');
  vid.setAttribute('playsinline', '');
  vid.setAttribute('webkit-playsinline', '');
  vid.addEventListener('playing', () => {
    vid.classList.add('is-on');
  });
  return vid;
}

export default function HeroWheel() {
  const seed = useMemo(() => buildCards(CARD_COUNT), []);
  const [cards, setCards] = useState(seed);
  const [showBacks, setShowBacks] = useState(true);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const rootRef = useRef(null);
  const worldRef = useRef(null);
  const poolHostRef = useRef(null);
  const cardRefs = useRef([]);
  const frontRefs = useRef([]);
  const styleCache = useRef([]);
  const worldCache = useRef({});
  /** @type {React.MutableRefObject<HTMLVideoElement[]>} */
  const poolVids = useRef([]);
  /** Card index assigned to each pool slot, or -1. */
  const poolCard = useRef(Array.from({ length: VIDEO_POOL_SIZE }, () => -1));

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
  const mobileRef = useRef(isMobileViewport());

  const setEntering = (on) => {
    rootRef.current?.classList.toggle('is-entering', on);
  };

  const releasePoolSlot = (slot) => {
    const vid = poolVids.current[slot];
    if (!vid) return;
    vid.pause();
    vid.classList.remove('is-on');
    const host = poolHostRef.current;
    if (host && vid.parentElement !== host) host.appendChild(vid);
    poolCard.current[slot] = -1;
  };

  const finishEntrance = () => {
    if (finished.current) {
      deal.set(1);
      lift.set(1);
      setEntering(false);
      setShowBacks(false);
      return;
    }
    finished.current = true;
    controlsRef.current.deal?.stop();
    controlsRef.current.lift?.stop();
    deal.set(1);
    lift.set(1);
    setEntering(false);
    setShowBacks(false);
  };

  useEffect(() => {
    const host = poolHostRef.current;
    if (!host) return undefined;
    poolVids.current = Array.from({ length: VIDEO_POOL_SIZE }, () => {
      const vid = createPoolVideo();
      host.appendChild(vid);
      return vid;
    });
    return () => {
      poolVids.current.forEach((vid) => {
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
        vid.remove();
      });
      poolVids.current = [];
      poolCard.current = Array.from({ length: VIDEO_POOL_SIZE }, () => -1);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Static WebP covers are already on seed — decode them without blocking reveal.
      prepareCardThumbnails(seed).then((prepared) => {
        if (!cancelled) setCards(prepared);
      });

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

      // Text starts as the curtain lifts; cards wait briefly more.
      try {
        const played = playHeroCopy();
        initCopy({ skipHero: played });
      } catch {
        document
          .querySelectorAll('[data-copy]')
          .forEach((el) => el.classList.add('is-copy-ready'));
      }

      await new Promise((r) => window.setTimeout(r, POST_REVEAL_DELAY_MS));
      if (cancelled || finished.current) return;

      const forceInstant =
        prefersReducedMotion() &&
        new URLSearchParams(window.location.search).has('reduced');

      if (forceInstant) {
        finishEntrance();
        return;
      }

      const mobile = isMobileViewport();
      setEntering(true);

      const dealAnim = animate(deal, 1, {
        duration: mobile ? DEAL_DURATION_MOBILE : DEAL_DURATION,
        ease: 'linear',
      });
      controlsRef.current.deal = dealAnim;
      await dealAnim;
      if (cancelled || finished.current) return;
      setShowBacks(false);

      await nextFrame();
      if (cancelled || finished.current) return;

      const liftAnim = animate(lift, 1, {
        duration: mobile ? LIFT_DURATION_MOBILE : LIFT_DURATION,
        ease: LIFT_EASE,
      });
      controlsRef.current.lift = liftAnim;
      await liftAnim;
      if (!cancelled) {
        finished.current = true;
        setEntering(false);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current.deal?.stop();
      controlsRef.current.lift?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, deal, lift]);

  useEffect(() => {
    let raf = 0;
    let lastT = performance.now();
    const skipDrift =
      prefersReducedMotion() &&
      new URLSearchParams(window.location.search).has('reduced');

    const mq = window.matchMedia('(max-width: 720px)');
    const syncMobile = () => {
      mobileRef.current = mq.matches;
    };
    syncMobile();
    mq.addEventListener?.('change', syncMobile);

    const tick = (now) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      const dealV = deal.get();
      const liftV = lift.get();
      const mobile = mobileRef.current;
      const videosLive = liftV >= 0.6;

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
      const nearFront = [];

      for (let i = 0; i < list.length; i += 1) {
        const el = cardRefs.current[i];
        if (!el) continue;
        if (!styleCache.current[i]) styleCache.current[i] = {};
        const cache = styleCache.current[i];

        const pose = computeCardPose(i, {
          deal: dealV,
          lift: liftV,
          radiusEnd: mobile ? RADIUS_END_MOBILE : RADIUS_END,
          pivotEnd: mobile ? PIVOT_END_MOBILE : PIVOT_END,
          wheelAngle: visibleAngle.current,
        });

        setCached(el, cache, 'transform', pose.transform);
        const vis = pose.visible ? 'visible' : 'hidden';
        if (cache.visibility !== vis) {
          cache.visibility = vis;
          el.style.visibility = vis;
        }

        if (
          videosLive &&
          pose.visible &&
          Math.abs(wrap180(pose.angle)) <= VIDEO_HALF_DEG
        ) {
          nearFront.push({
            i,
            dist: Math.abs(wrap180(pose.angle)),
          });
        }
      }

      if (videosLive) {
        nearFront.sort((a, b) => a.dist - b.dist);
        const wanted = nearFront.slice(0, VIDEO_POOL_SIZE).map((x) => x.i);
        const wantedSet = new Set(wanted);

        for (let slot = 0; slot < VIDEO_POOL_SIZE; slot += 1) {
          const assigned = poolCard.current[slot];
          if (assigned >= 0 && !wantedSet.has(assigned)) {
            releasePoolSlot(slot);
          }
        }

        for (const cardIndex of wanted) {
          let slot = poolCard.current.findIndex((c) => c === cardIndex);
          if (slot < 0) {
            slot = poolCard.current.findIndex((c) => c < 0);
          }
          if (slot < 0) continue;

          const vid = poolVids.current[slot];
          const front = frontRefs.current[cardIndex];
          const src = list[cardIndex]?.video;
          if (!vid || !front || !src) continue;

          if (poolCard.current[slot] !== cardIndex) {
            poolCard.current[slot] = cardIndex;
            if (vid.parentElement !== front) front.appendChild(vid);
          }

          if (vid.dataset.src !== src) {
            vid.classList.remove('is-on');
            vid.src = src;
            vid.dataset.src = src;
            if (list[cardIndex]?.cover) vid.poster = list[cardIndex].cover;
          }

          if (vid.paused) {
            const play = vid.play();
            if (play?.catch) play.catch(() => {});
          }
        }
      } else {
        for (let slot = 0; slot < VIDEO_POOL_SIZE; slot += 1) {
          if (poolCard.current[slot] >= 0) releasePoolSlot(slot);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener?.('change', syncMobile);
    };
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
    // Only swipe when the press lands on a card — empty stage space scrolls the page.
    if (!e.target.closest?.('.hw-card')) return;
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
      <div ref={poolHostRef} className="hw-video-pool" aria-hidden="true" />
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
                <div
                  className="hw-card__face hw-card__front"
                  aria-hidden="true"
                  ref={(el) => {
                    frontRefs.current[i] = el;
                  }}
                >
                  {card.cover ? (
                    <img
                      className="hw-card__cover"
                      src={card.cover}
                      alt=""
                      draggable={false}
                      decoding="async"
                    />
                  ) : null}
                </div>
                {showBacks ? (
                  <div className="hw-card__face hw-card__back" aria-hidden="true">
                    <span className="hw-card__monogram">Q</span>
                  </div>
                ) : null}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
