# UX Contract

## Product context

- Audience: competitive FPS players preparing for or reviewing short browser sessions.
- Primary jobs: calibrate a sensitivity, warm up, inspect input devices, and review clear local results.
- Target markets: global; active locales are Portuguese, English, and Spanish.
- Accessibility target: WCAG 2.2 AA.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Product direction | User-provided aim-training brief | Product brief | 2026-09-04 |
| Sensitivity behavior | `src/sensMath.ts`, `src/calibration.ts` | Domain implementation and tests | 2026-09-04 |
| Locale copy | `src/i18n.tsx` | Locale source | 2026-09-04 |

## Visual contract

- Project design context: `DESIGN.md`.
- Runtime design-system source: `src/styles.css`.
- Token drift gate: update `DESIGN.md` whenever shared XENSI home tokens or interaction states change.
- Supported themes: dark only.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native `select` with XENSI styling | `src/App.tsx`, `src/styles.css` | native | keyboard + locale labels |
| Form | Local controlled React state | feature modules | setup / profile edit | unit + browser flow |
| Scrollbar | Global stylesheet | `src/styles.css` | home document scroller | computed style + browser |
| Toast | No shared owner yet | feature-local feedback | none until shared primitive exists | browser |

## Component behavior

| Component | Default | Hover | Focus | Active | Disabled | Busy | Error |
|---|---|---|---|---|---|---|---|
| Button | labeled native button | transform-only lift | mint outline | scale .99 | reduced contrast | fixed geometry | inline explanation when needed |
| Target demo | visible target | pointer-ready | visible outline | hit marker and score | n/a | n/a | n/a |
| Input | dark surface | brighter border | coral border | n/a | reduced contrast | preserve size | inline validation |

## Navigation and responsive behavior

- App navigation changes the local route state and remains disabled while an active training session owns input.
- Home document scrolls naturally; no page-level overflow clipping.
- At narrow screens the navigation may wrap or scroll horizontally, but primary actions and arena targets remain reachable.

## Overlays and feedback

- Dialog primitive: existing app-owned modal backdrop.
- Keyboard focus returns to the trigger after closing a dialog.
- The home demo uses visible score and hit-marker feedback rather than a toast.

## Validation

- Static commands: `npm run lint`, `npm run build`, and `npm test -- --run`.
- Browser checks: desktop and mobile layouts, navigation to calibration/warmup/diagnostics, target demo interaction, Portuguese/English/Spanish copy.
