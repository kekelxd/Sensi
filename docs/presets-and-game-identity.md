# Shared presets and game identity

## Data and precedence

`playerProfileStore.ts` remains the source of truth in localStorage under
`xensi-player-profile`. Authentication is not required. The existing
SensitivityPreset model retains id, gameId, optional name, sensitivity, dpi,
isPrimary, createdAt and updatedAt. Preset IDs, not game IDs, identify records.

The migration now normalizes one primary per game. Existing IDs, values and
timestamps are retained. For a game with no designated primary, the first
stored preset is the deterministic compatibility fallback. Multiple presets
remain selectable by ID in the form.

`usePlayerProfile` subscribes to storage events and same-tab profile updates.
`useSensitivityPreset` creates an editable, non-persistent session draft:

1. Explicit navigation values initialize the draft, including the preset ID.
2. Manual values survive unrelated rendering, locale and storage updates.
3. Explicitly choosing a preset replaces the draft by user intent.
4. Switching to a different game loads its primary/fallback preset.
5. With no preset, the existing editable 1 / 800 defaults remain available.

Selecting the same game does not reset a draft. Converter destination changes
do not overwrite the origin. Swapping games uses the conversion result and
DPI values as an explicit action, not a background preset reload.

No form writes presets implicitly. Calibration results offer separate actions
to create a preset or update the game's current primary ID. Storage failures
are reported. The old `sensi-settings:v1` recommendations remain untouched;
they lack DPI and are not silently promoted to complete presets or read as a
second source of configuration. Legacy profile `games` arrays still migrate.

## Session context and Aim Profile groundwork

New completed minigame summaries include an optional sessionContext with
presetId, gameId, sensitivity and dpi. Values are captured at session start,
after existing normalization, and copied into the summary. Editing a preset
later cannot rewrite these historical values. Old summaries remain readable.

This is the low-risk foundation for a future Aim Profile, not a new assessment
score or routine. Existing latest-session storage semantics are unchanged;
this task does not add a longitudinal history backend or population rankings.

## Shared UI

- `GameBadge`: decorative neutral code, sm/md/lg and selected state.
- `gameIdentity.ts`: presentation registry derived from existing profile names.
- Codes: CS, VA, OW, RA, AP, FN, PB, BF, BO, WZ, AR, RU.
- `GamePicker`: compact buttons, checkmark + aria-pressed, keyboard activation.
- `PresetSelection`: saved/default/temporary status, optional preset selector,
  and current values with cm/360 only when the existing engine supports it.
- `useDialogFocus`: focus containment/restoration for training/calibration setup.
- `presetCopy.ts`: new PT/EN/ES copy; no extra dependency.
- Hover: 2px elevation and subtle surface, 160ms transitions. Reduced motion
  disables transitions. Desktop uses three columns, smaller widths two or one.
  Modal content scrolls internally and remains above the navbar.

Profile, minigames, calibrator and converter reuse these components. Routine
and legacy calibration setup only replace their old artwork with GameBadge;
their mechanics and configuration flows are unchanged.

## Asset audit

All ten files formerly in public/game-icons were referenced by Profile,
Converter, Warmup, Routine or legacy App setup, via iconFile/fallback names:

arcraiders.jpg, battlefield6.jpg, blackops7.png, cs2.png, fortnite.png,
overwatch2.svg, pubg.jpg, rust.jpg, valorant.png and warzone.png.

All were replaced and removed after the reference search. Game-specific logo
CSS and iconFile properties were removed. No official game artwork remains
in these interfaces. XENSI artwork and avatar files were preserved.

The mathematical registry only lost its unused iconFile field. Yaw, input
precision, verification, sources and audit metadata were not changed.

## Verification coverage

`sensitivityPresetFlow.test.tsx` covers primary/fallback/explicit selection,
per-game migration, detached drafts, explicit persistence, snapshots and
unique GameBadge codes. Existing conversion and audit tests remain in place.

`preset-flow.spec.ts` covers creation through Profile, automatic loading via
the navbar, temporary edits, a completed desktop session and its snapshot,
calibration/conversion defaults, anonymous use, multiple presets, keyboard
focus, reduced motion and selector screenshots. Touch-only mobile validates
setup, not unsupported pointer-lock gameplay.

Browser plugin not available: validation uses the repository's Playwright
test runner. Viewports: 1920x1080, 1440x900, 1366x768 and Pixel 5.
