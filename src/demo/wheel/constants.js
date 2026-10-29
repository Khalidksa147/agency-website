export const CARD_COUNT = 34;
/**
 * Only show cards that can sit on-screen with real spacing. A wider half-angle
 * plus fit-scaling used to crush the radius and stack every card on top of its
 * neighbours.
 */
export const VISIBLE_HALF_DEG = 48;
export const VIDEO_HALF_DEG = 36;

/**
 * Radius opens during lift so chord clears the final 550px cards.
 * (chord = 2·R·sin(π/34)).
 */
export const RADIUS_START = 1100;
/** Desktop arc — larger radius = more gap between cards. */
export const RADIUS_END = 3050;
/** Tighter arc on mobile — smaller cards don’t need as much chord gap. */
export const RADIUS_END_MOBILE = 2150;
export const PIVOT_START = 1020;
/** Keep the front of the bowl high so cards sit closer to the CTAs. */
export const PIVOT_END = 2900;
export const PIVOT_END_MOBILE = 2000;

export const DEAL_DURATION = 2.6;
export const LIFT_DURATION = 1.9;
export const LIFT_EASE = [0.5, 0, 0.15, 1];

export const DEAL_ANGLE_OFFSET = 70;
export const DEAL_START_DROP = 140;
export const LIFT_CARD_GROW = 0.35;
export const LIFT_TIP_X = 12;
export const LIFT_WORLD_SCALE = 0.14;
export const LIFT_TURN = -28;
export const DRIFT_DEG_PER_SEC = 4;

export const FOLLOW_LAMBDA = 9;
export const VELOCITY_DECAY = 3.2;
export const VELOCITY_PAUSE_MS = 80;

/**
 * Final on-screen size at end of lift (desktop). Element is laid out at this
 * size so CSS scale never goes above 1 (keeps video/images sharp).
 */
export const CARD_WIDTH = 550;
export const CARD_HEIGHT = 310;
/**
 * Cards are laid out at their max on-screen size so CSS scale never goes
 * above 1 (upscaling video/images is what made them soft).
 */
export const CARD_SCALE_MAX = (1 + LIFT_CARD_GROW) * (1 + LIFT_WORLD_SCALE);
/** Visual width at end of deal / start of lift, before grow. */
export const CARD_BASE_WIDTH = Math.round(CARD_WIDTH / CARD_SCALE_MAX);
