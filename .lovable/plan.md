# Save Official Design System Contract

Copy the uploaded `DESIGN_SYSTEM.md` into the project root so every future UI task can reference it.

## Change

- `code--copy user-uploads://DESIGN_SYSTEM.md DESIGN_SYSTEM.md` (project root, 712 lines, full visual identity contract for Kojobot).

## After save

- File lives at `/DESIGN_SYSTEM.md` (root).
- No UI work, no token wiring into `src/styles.css`, no component changes in this step.
- From the next UI task onward, this file is the single source of truth for colors, typography, spacing, gradients, and motion. Any deviation must be flagged before implementation.

## Out of scope (deferred to a later task)

- Translating the tokens into `src/styles.css` (`oklch` variables + Tailwind theme).
- Updating shadcn component variants to match the Kojobot palette.
- Replacing the placeholder `/dashboard` and `/login` stubs with branded UI.
- Chunk 2 DB work (still queued).
