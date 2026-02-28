# UI Issues

Last updated: 2026-02-27  
Scope: Plan view visual audit (desktop) using latest in-chat screenshot, plus previously tracked UI regressions.

## Status
- Previously tracked issues `UI-001` through `UI-005` are fixed and kept in the resolved archive.
- New visual-polish items `UI-006` through `UI-013` are open from the latest eye-strain/readability pass.

## Priority Legend
- P1: major readability/usability friction in primary flow
- P2: notable clarity/scannability problem
- P3: polish-level inconsistency

## Open Items (2026-02-27 audit)

1. `UI-006` (P1) - Too many competing focal points across three columns
- Area: App shell layout (`Project rail`, `Plan canvas`, `Activity rail`)
- Issue: Left, center, and right regions have similar visual weight, so users do not get a clear primary reading path.
- Evidence: User-provided Plan screenshot (2026-02-27)
- Suggested fix: Reduce peripheral contrast and default-emphasize center canvas; keep side rails visually quieter unless actively used.

2. `UI-007` (P1) - Weak hierarchy in task/control blocks
- Area: Plan header, generation controls, task card headers
- Issue: Primary actions and supporting metadata look too similar in weight, forcing extra scanning effort.
- Evidence: User-provided Plan screenshot (2026-02-27)
- Suggested fix: Establish strict emphasis tiers (primary CTA, secondary CTA, metadata) with consistent weight, size, and color rules.

3. `UI-008` (P2) - Typography density and all-caps overuse reduce legibility
- Area: Milestone chips, batch headers, minor labels
- Issue: Wide tracking + all-caps + small text creates visual noise and reading fatigue.
- Evidence: User-provided Plan screenshot (2026-02-27)
- Suggested fix: Reduce letter spacing on utility labels, limit all-caps to rare micro-labels, and increase body/supporting text size.

4. `UI-009` (P1) - Readability drop from low-contrast text on tinted surfaces
- Area: Secondary descriptions, helper lines, metadata
- Issue: Gray text on off-white/tinted cards is difficult to scan quickly, especially for dense task descriptions.
- Evidence: User-provided Plan screenshot (2026-02-27)
- Suggested fix: Raise contrast for secondary text and simplify tinted backgrounds where text density is high.

5. `UI-010` (P2) - Border/pill/card over-segmentation
- Area: Generation controls and task list containerization
- Issue: Nearly every block is outlined, causing a fragmented, busy appearance.
- Evidence: User-provided Plan screenshot (2026-02-27)
- Suggested fix: Remove non-essential borders, rely more on spacing/grouping, reserve container chrome for meaningful sections only.

6. `UI-011` (P2) - Inconsistent vertical rhythm
- Area: Plan canvas spacing between sections and cards
- Issue: Some regions feel cramped while others are overly open, creating unstable scan rhythm.
- Evidence: User-provided Plan screenshot (2026-02-27)
- Suggested fix: Apply a single spacing scale (for example 8/12/16/24) and normalize padding/margins by component tier.

7. `UI-012` (P2) - Accent color saturation dilutes action priority
- Area: Tabs, CTAs, links, status accents
- Issue: Orange is used in too many competing contexts, so important actions no longer stand out.
- Evidence: User-provided Plan screenshot (2026-02-27)
- Suggested fix: Restrict strong orange to one primary action per zone; shift supporting emphasis to neutral or subdued tones.

8. `UI-013` (P3) - Top bar control grouping is crowded
- Area: Global top bar (`Date`, `Record`, `Activity`, view nav)
- Issue: Distinct control groups are packed into one strip with weak separation.
- Evidence: User-provided Plan screenshot (2026-02-27)
- Suggested fix: Re-group top bar into clear clusters (navigation, session controls, context/date) with consistent spacing rules.

## Make It Calmer Plan (Proposed)

### Phase 1 - Fast wins (half day)
- Define and apply a tighter type scale for Plan view only:
  - `title` strong, `section` medium, `body` readable, `meta` restrained.
- Raise contrast on secondary/helper text and reduce all-caps usage.
- Limit orange to primary CTA and active state; convert secondary emphasis to neutral styles.

### Phase 2 - Visual simplification (1 day)
- Remove low-value borders and pills in generation/task regions.
- Normalize spacing with one layout rhythm across cards, sections, and controls.
- Reduce prominence of side rails so the center plan remains dominant.

### Phase 3 - Structure and grouping (1 day)
- Re-group top bar controls by intent and add spacing separators.
- Introduce a calm default for empty/low-signal side content (quieter surfaces, less outline noise).
- Validate desktop + mobile screenshots against a simple checklist:
  - single focal point, readable secondary text, one obvious primary action.

## Resolved Archive

### Resolved on 2026-02-25
- `UI-R01` Manual task `Add` button alignment mismatch in central panel.
- `UI-R02` Manual task scope label placement/visibility issue.

### Resolved on 2026-02-27
- `UI-001` Mobile top-nav clipping in narrow viewports.
- `UI-002` Excess blank space between latest Drawing Board response and input controls.
- `UI-003` `Start New Project` view/nav mismatch.
- `UI-004` Competing vertical scrollbars in shell/content.
- `UI-005` Empty activity rail consuming persistent width.
