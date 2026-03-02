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

## Open Items (2026-02-27 audit)

(No visual-polish items remain from the 2026-02-27 audit).
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

### Resolved on 2026-03-01
- `UI-009` Readability drop from low-contrast text on tinted surfaces.
- `UI-010` Border/pill/card over-segmentation.
- `UI-011` Inconsistent vertical rhythm.
- `UI-012` Accent color saturation dilutes action priority.
- `UI-016` Manual Task Addition Failure (Bug).
- `UI-014` Task Pin Button Misalignment.
- `UI-015` Unpolished Technical Status Strings.
- `UI-017` Sidebar Milestone Tag Clipping/Overlap.
- `UI-018` Insufficient Progress Bar Contrast.
- `UI-008` Typography density and all-caps overuse reduce legibility.
- `UI-013` Top bar control grouping is crowded.
- `UI-006` Too many competing focal points across three columns.
- `UI-007` Weak hierarchy in task/control blocks.

### Resolved on 2026-02-25
- `UI-R01` Manual task `Add` button alignment mismatch in central panel.
- `UI-R02` Manual task scope label placement/visibility issue.

### Resolved on 2026-02-27
- `UI-001` Mobile top-nav clipping in narrow viewports.
- `UI-002` Excess blank space between latest Drawing Board response and input controls.
- `UI-003` `Start New Project` view/nav mismatch.
- `UI-004` Competing vertical scrollbars in shell/content.
- `UI-005` Empty activity rail consuming persistent width.
