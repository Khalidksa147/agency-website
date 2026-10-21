import {
  CARD_COUNT,
  DEAL_ANGLE_OFFSET,
  DEAL_START_DROP,
  CARD_SCALE_MAX,
  LIFT_CARD_GROW,
  LIFT_TIP_X,
  LIFT_TURN,
  LIFT_WORLD_SCALE,
  PIVOT_END,
  PIVOT_START,
  RADIUS_END,
  RADIUS_START,
  VISIBLE_HALF_DEG,
} from './constants.js';

/** Normalize degrees into [-180, 180]. */
export function wrap180(deg) {
  const x = ((((deg + 180) % 360) + 360) % 360) - 180;
  return x;
}

export function easeOutCubic(t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - (1 - x) ** 3;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Home angle for card i; 0 = straight down (front of the bowl). */
export function homeAngle(i, count = CARD_COUNT) {
  return (i * 360) / count;
}

/**
 * Deal rank 0…1 by angular distance from the front so the centre card deals
 * first and the pack spreads outward to both sides.
 */
export function dealOrderNorm(i, count = CARD_COUNT) {
  const items = Array.from({ length: count }, (_, idx) => ({
    idx,
    dist: Math.abs(wrap180(homeAngle(idx, count))),
  }));
  items.sort((a, b) => a.dist - b.dist || a.idx - b.idx);
  const rank = items.findIndex((item) => item.idx === i);
  return count <= 1 ? 0 : rank / (count - 1);
}

/**
 * Pose for one card — inverted arc (bowl / smile), opposite of a rainbow.
 *
 * Pivot sits ABOVE the hero. Angle 0 is straight down. Transform order:
 *   translate3d(0, pivotY, depth)   // pivotY is negative
 *   rotateZ(angle)
 *   translate3d(0, +radius, 0)      // push out; at 0° that is downward
 *   rotateY(flip)
 *   scale(s)
 *
 * Tops face the pivot. Depth is a small negative z from distance-to-front
 * so the centre card overlaps neighbours symmetrically.
 */
export function computeCardPose(i, { deal, lift, wheelAngle }) {
  const order = dealOrderNorm(i);
  const p = easeOutCubic((deal - order * 0.6) / 0.4);

  const home = homeAngle(i);
  const liftTurn = LIFT_TURN * lift;
  const angle =
    lerp(home + DEAL_ANGLE_OFFSET, home, p) + liftTurn + wheelAngle;

  const radius = lerp(RADIUS_START, RADIUS_END, lift) * p;
  const pivotY = -(
    lerp(PIVOT_START, PIVOT_END, lift) +
    DEAL_START_DROP * (1 - p)
  );

  const flip = lerp(180, 0, p);
  // Grow is baked into element pixel size; scale stays ≤ 1 so video stays sharp.
  const scale =
    (lerp(0.7, 1, p) *
      (1 + LIFT_CARD_GROW * lift) *
      (1 + LIFT_WORLD_SCALE * lift)) /
    CARD_SCALE_MAX;

  const distFromFront = Math.abs(wrap180(angle));
  const depth = -distFromFront * 0.35;
  const visible = distFromFront <= VISIBLE_HALF_DEG && p > 0.001;

  const transform =
    `translate3d(0, ${pivotY}px, ${depth}px) ` +
    `rotateZ(${angle}deg) ` +
    `translate3d(0, ${radius}px, 0) ` +
    `rotateY(${flip}deg) ` +
    `scale(${scale})`;

  return { transform, visible, angle, flip, p, scale };
}

/** World tip during lift. */
export function computeWorldPose(lift) {
  const tipX = LIFT_TIP_X * lift;
  return {
    transform: `rotateX(${tipX}deg)`,
    tipX,
  };
}
