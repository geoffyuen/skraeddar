# Skraeddar - Agent Guide

## Overview

Skraeddar is a browser-based tool for creating custom 3D-printable pegboard panels compatible with IKEA Skadis. Users adjust dimensions and options in a settings panel, preview the board live in 3D, and export STL files for printing. The exported boards work with Skadis-compatible accessories found on Printables, Makerworld, and similar platforms.

No backend, no routing, no external data dependencies. Settings are persisted to `localStorage` and restored on load.

## Tech Stack

| Layer            | Technology                      |
|------------------|---------------------------------|
| UI Framework     | React 18 (TypeScript)           |
| 3D Rendering     | Three.js r128                   |
| Bundler          | Vite 7                          |
| CSS              | Tailwind CSS 3                  |
| Module System    | ES Modules (`"type": "module"`) |

No testing framework, linter, or formatter is configured.

## Project Structure

```
index.html              Vite HTML entry point
src/
  main.tsx              React entry - mounts <App />
  App.tsx               Main component (SkadisGenerator) - state, effects, STL export, layout
  board.ts              Board geometry - buildBoardShape, formatTriangle, addPillHole, BoardShapeParams
  components.tsx        Reusable UI components - Slider, Checkbox, SectionBox, Logo, DownloadIcon
  constants.ts          All constants - DEFAULTS, HOLE_* dimensions, STORAGE_KEY, SHOW_OUTLINE
  index.css             Tailwind directives + body styles
public/
  favicon.png           App icon
package.json            Dependencies and scripts
vite.config.ts          Vite config (React plugin only)
tsconfig.json           TypeScript config (app code)
tailwind.config.js      Tailwind scan paths
postcss.config.js       PostCSS plugins
```

## Scripts

| Command            | Description |
|--------------------|-------------|
| `npm run dev`      | Start Vite dev server (localhost:5173) |
| `npm run build`    | Type-check with `tsc` then `vite build` |
| `npm run preview`  | Preview production build locally |

No test or lint commands exist.

## Architecture

All business logic is in `src/App.tsx` (`SkadisGenerator` component, ~418 lines) which imports helpers from `board.ts`, `components.tsx`, and `constants.ts`.

### State

A single `useReducer` with `Partial<State>` actions manages all 14 parameters:

| Variable             | Default | Description |
|----------------------|---------|-------------|
| `width`              | 280     | Board width in mm (80-800, step 40) |
| `height`             | 280     | Board height in mm (80-800, step 40) |
| `thickness`          | 5       | Board thickness in mm (2-8, step 0.5) |
| `withMountingHoles`  | true    | Include 4 corner screw holes |
| `screwHoleDiameter`  | 5       | Diameter of mounting holes in mm (3-8, step 0.05) |
| `screwHoleInset`     | 8.75    | Distance from board edge to screw hole center in mm (5-20, step 0.05) |
| `extendTop/Bottom/Left/Right` | false | Half-pill edge extensions |
| `roundTopLeft/...`   | true    | Individual corner rounding toggles |

Five slider values (`width`, `height`, `thickness`, `screwHoleDiameter`, `screwHoleInset`) use `useDeferredValue` to defer geometry rebuilds during fast scrubbing.

### 3D Rendering

Two `useEffect` hooks drive all 3D logic:

1. **Mount effect** (runs once): Creates the Three.js scene, `PerspectiveCamera`, `WebGLRenderer`, `OrbitControls`, lights, animation loop, resize handler. Returns cleanup that disposes everything.

2. **Rebuild effect** (runs on state change via deps): Clears non-light scene children, calls `buildBoardShape()` from `board.ts`, extrudes with `ExtrudeGeometry`, adds mesh + optional outline. Updates `geometryRef` for STL export.

### Staggered Hole Pattern

Odd rows (`j % 2 == 1`) are offset by `HOLE_SPACING_X / 2` (20mm) horizontally. Edge extensions also use staggered logic:
- Left/right edges only add pill holes on **odd** rows (`j % 2 == 1`).
- Top/bottom edges filter by `HOLE_SPACING_X / 2` stagger offset and X-range.

### Key Constants (in `constants.ts`)

| Constant              | Value  | Purpose |
|-----------------------|--------|---------|
| `HOLE_WIDTH`          | 5mm    | Pegboard slot width |
| `HOLE_HEIGHT`         | 15mm   | Pegboard slot height |
| `HOLE_SPACING_X`      | 40mm   | Horizontal distance between hole centers |
| `HOLE_SPACING_Y`      | 20mm   | Vertical distance between hole centers |
| `EDGE_MARGIN`         | 20mm   | Margin from board edge where holes are excluded |
| `BOARD_RADIUS`        | 8mm    | Corner rounding radius |
| `COUNTERSINK_DEPTH`   | 10mm   | Spacer height |
| `SHOW_OUTLINE`        | false  | Toggle cosmetic board outline in 3D view |

### STL Export

- **`generateSTL()`**: Reads cached `ExtrudeGeometry` from `geometryRef.current`, iterates triangle faces, writes ASCII STL via `formatTriangle()` from `board.ts`. Filename: `skadis_{width}x{height}x{thickness}mm.stl`.
- **`generateSpacerSTL()`**: Creates a ring shape (outer = `screwHoleDiameter/2 + 3`, inner = `screwHoleDiameter/2`), extrudes to `COUNTERSINK_DEPTH`, writes ASCII STL. Filename: `spacer_10mm.stl`.

### UI Layout

- **Header**: Logo + title + subtitle
- **Main area**: Flex row (desktop) / column (mobile)
  - **Sidebar**: Dimension sliders, screw hole options, edge/rounding checkboxes, reset & download buttons
  - **Viewport**: `<div ref={mountRef}>` with Three.js canvas + "Reset view" overlay button

## Conventions

- `.ts` files for pure TypeScript (no JSX), `.tsx` files for components with JSX.
- Imports across source files (no single-file constraint).
- Pure React hooks and `useReducer` for state — no external state management.
- Three.js r128 intentionally pinned for compatibility.
- Tailwind utility classes for all styling.
- ESLint / Prettier / Husky are not configured.
