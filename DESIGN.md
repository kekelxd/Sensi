---
version: alpha
colors:
  background: "#08090d"
  surface: "#0e1016"
  surfaceRaised: "#12161d"
  text: "#f5f1ea"
  muted: "#aab4c0"
  border: "rgba(255, 255, 255, 0.105)"
  accent: "#ff4f58"
  accentWarm: "#ff674d"
  positive: "#75ffd5"
  focus: "#75ffd5"
typography:
  display:
    fontFamily: "Space Grotesk, Plus Jakarta Sans, sans-serif"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
  data:
    fontFamily: "DM Mono, ui-monospace, monospace"
rounded:
  control: "14px"
  surface: "22px"
  media: "28px"
spacing:
  compact: "12px"
  regular: "20px"
  section: "56px"
components:
  action:
    emphasis: "solid coral for primary; outline graphite for secondary"
  surface:
    elevation: "tonal layer and fine border; shadows only on primary media"
  telemetry:
    color: "mint only for positive measurements"
---

## Overview

XENSI is a hybrid product: a focused technical home that leads into practical FPS tools. It should feel like a purpose-built training room, not an esports marketing page or a corporate dashboard. The distinctive move is the live training arena: a calm technical field where targets, a crosshair, and trajectory make the product understandable before a user starts a session.

The intended audience is competitive FPS players using a desktop browser before or between matches. The product should be direct, competent, and honest about browser limitations. It must not resemble Aim Lab, generic neon gaming landing pages, or heavy glassmorphism.

Runtime tokens live in `src/styles.css`; this file records their semantic intent and values.

## Colors

Use the near-black background and graphite surfaces to create depth through contrast, not stacked cards. Coral is the sole action and target color. Mint is reserved for a hit, a positive trend, or a stable metric; it must never become a second brand accent. Borders are thin and low-contrast. A technical grid may support orientation but should fade into the page.

## Typography

Space Grotesk carries focused display headings. Manrope handles instruction and reports at comfortable reading sizes. DM Mono is limited to small technical labels, timers, and measurements. Portuguese, English, and Spanish use the same visual hierarchy; do not hard-code line breaks that cause translated copy to clip.

## Layout

Desktop is the primary experience. The home uses a two-column hero: explanation left, training arena right. Below it, tools use open technical surfaces with a dedicated visual area and a bottom-aligned action. At 1020px the hero and tool grid become one column; at 740px targets and metrics remain legible and touch targets remain at least 44px.

Document scrolling belongs to the home surface. Scrollbars use the global dark styling and remain visible and operable. Never use viewport clipping to hide sections.

## Elevation & Depth

Most surfaces sit flat on tonal contrast with a one-pixel border. The training arena can use a restrained dark shadow because it represents an active space. Do not add frosted glass, broad blur, or persistent glow around static copy.

## Shapes

Controls use a 14px radius. Section surfaces use 22px. The arena can use 28px. Targets are circular. Avoid mixing pill shapes into ordinary UI.

## Components

### Foundational visual states

Interactive controls use native buttons, a visible mint focus ring, a small transform-only hover lift, and a pressed scale. Disabled controls lose contrast and do not look actionable. Motion pauses when the document is hidden or its section is outside the viewport; reduced-motion users keep slow, readable arena feedback without page entrance animation.

### Buttons and actions

Use one coral primary action per local decision. Secondary actions use an outline and mint text. Icons clarify actions but text remains visible. Busy states preserve the button geometry.

### Navigation and data display

Navigation is compact and text-led. Technical readings use the data face and tabular figures. Sparklines, bars, and target feedback must have text labels or an accessible summary.

### Forms and overlays

Fields remain dark and use coral on focus. Product dialogs are app-owned and restore focus when closed. Browser alerts and prompts are not used.

### Iconography

Lucide is the current source. Use its 1.8–2px outline language consistently at 15–22px. Do not use icons only as decoration when a label is available.

### Motion

Motion is short and mechanical: 160–240ms for controls, 2.8–5s for the arena loop. Animate `transform` and `opacity`; do not bind document-wide mouse movement to React state. `prefers-reduced-motion` removes nonessential entrance and hover translation while retaining slow target state feedback.

### Content and data visualization

Write like a precise coach: name the measure, say what it means, and offer the next action. Avoid inflated rankings and generic promises. Values are concise and use units where meaningful.

## Do's and Don'ts

- **Do:** let the live arena demonstrate the product before explaining every feature.
- **Do:** use coral for actions and targets, and mint only for a positive result.
- **Don't:** fill the page with dashboard cards, artificial HUD labels, or oversized display type.
- **Don't:** claim browser input is physically identical to a game engine.
