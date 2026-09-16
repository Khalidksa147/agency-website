/* =====================================================
   AWWWARDS SIDE MENU — script.js
   All motion is built as ONE paused GSAP timeline.
   Click the button → tl.play()    (opens)
   Click again       → tl.reverse() (closes — plays backwards)
   ===================================================== */

/* ── DOM references ─────────────────────────────────── */
const menuPanel   = document.getElementById('menuPanel')     // expanding pill-panel
const btnSlider   = document.getElementById('btnSlider')     // Menu/Close slider inside the button
const nav         = document.getElementById('nav')           // nav wrapper (opacity toggle)
const navLinks    = document.querySelectorAll('.nav__link')  // main nav links (5 items)
const footerLinks = document.querySelectorAll('.nav__footer-link')  // footer social links
const menuBtn     = document.getElementById('menuBtn')       // the clickable button

// Tracks whether the menu is currently open
let isOpen = false

/* ───────────────────────────────────────────────────────
   🔥 MAIN TIMELINE
   Built ONCE and kept paused. `defaults` applies to every
   tween inside unless overridden — here we set the easing
   curve that matches the original design.
   ─────────────────────────────────────────────────────── */
const tl = gsap.timeline({
	paused: true,
	defaults: {
		ease: 'power3.inOut',
	},
})

/* 👉 PANEL EXPAND
   Grows the pill container into a full menu panel.
   Negative top/right values push it slightly outside the
   viewport corner so it visually "blooms" from the button. */
tl.to(menuPanel, {
	width: 480,
	height: 650,
	top: -25,
	right: -25,
	borderRadius: 25,
	duration: 0.75,
})

/* 👉 BUTTON SLIDE
   Moves the inner slider up by 100% to reveal the "Close" label.
   The `0` at the end means: start at time 0 of the timeline
   (i.e. run in PARALLEL with the panel expand above). */
tl.to(
	btnSlider,
	{
		top: '-100%',
		duration: 0.5,
	},
	0,
)

/* 👉 NAV SHOW
   Adds the `.nav--visible` class 0.2s into the timeline —
   just after the panel has started growing, so the nav
   does not appear before there is room to show it. */
tl.add(() => nav.classList.add('nav--visible'), 0.2)

/* 👉 NAV LINKS — initial state
   .set() is instantaneous — it just writes these styles
   at time 0 of the timeline, giving us a clean starting point
   for the 3D flip tween below. */
tl.set(
	navLinks,
	{
		opacity: 0,
		rotateX: 90,              // links start rotated 90° (lying flat, unseen)
		y: 80,                    // and pushed down 80px
		x: -20,                   // and slightly offset to the left
		transformPerspective: 300,
		transformOrigin: 'bottom', // pivot around the bottom edge → flip looks natural
	},
	0,
)

/* 👉 NAV LINKS — animate in
   Flip each link into place with a slight overshoot (back.out).
   stagger: 0.1 delays each link by 0.1s → the classic cascade.
   Starts at 0.5s so it lines up with the mid-point of the expand. */
tl.to(
	navLinks,
	{
		opacity: 1,
		rotateX: 0,
		y: 0,
		x: 0,
		duration: 0.65,
		ease: 'back.out(1.2)',
		stagger: 0.1,
	},
	0.5,
)

/* 👉 FOOTER — initial state
   Footer links start hidden and slightly below their final spot. */
tl.set(
	footerLinks,
	{
		opacity: 0,
		y: 20,
	},
	0,
)

/* 👉 FOOTER — animate in
   Simple slide-up fade-in, staggered. Comes in at 0.75s so it
   arrives AFTER the main links have started appearing. */
tl.to(
	footerLinks,
	{
		opacity: 1,
		y: 0,
		duration: 0.5,
		ease: 'power2.out',
		stagger: 0.1,
	},
	0.75,
)

/* ── Cleanup on close ──
   When the timeline is reversed back to the beginning,
   drop the `.nav--visible` class so the nav is fully
   inert (pointer-events: none) again. */
tl.eventCallback('onReverseComplete', () => {
	nav.classList.remove('nav--visible')
})

/* ── TOGGLE ──
   Click flips the state and either plays the timeline
   forward (open) or reverses it (close). GSAP handles
   the in-between state automatically if you click rapidly. */
menuBtn.addEventListener('click', () => {
	isOpen = !isOpen

	if (isOpen) {
		tl.play()
	} else {
		tl.reverse()
	}
})
