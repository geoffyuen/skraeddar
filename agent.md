# Skraeddar - Agent Guide

## Overview

Skraeddar is a browser-based tool for creating custom 3D-printable pegboard panels compatible with IKEA Skadis. Users adjust dimensions and options in a settings panel, preview the board live in 3D, and export STL files for printing. The exported boards work with Skadis-compatible accessories found on Printables, Makerworld, and similar platforms.

The entire application is a single React component (`src/App.tsx`, ~640 lines) with no backend, no routing, and no external data dependencies.

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
  App.tsx               Entire application (single component)
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

Everything lives in `src/App.tsx` as the `SkadisGenerator` component.

### State

| Variable             | Default | Description |
|----------------------|---------|-------------|
| `width`              | 280     | Board width in mm (80-800, step 40) |
| `height`             | 280     | Board height in mm (80-800, step 40) |
| `thickness`          | 5       | Board thickness in mm (2-8, step 0.5) |
| `withMountingHoles`  | true    | Include 4 corner screw holes |
| `screwHoleDiameter`  | 5       | Diameter of mounting holes in mm (3-8, step 0.5) |
| `screwHoleInset`     | 8.75    | Distance from board edge to screw hole center in mm (5-20, step 0.25) |

### 3D Rendering

Two `useEffect` hooks drive all 3D logic:

1. **Mount effect** (runs once): Creates the Three.js scene, `PerspectiveCamera`, `WebGLRenderer`, ambient + directional lights, animation loop, window resize handler, and mouse wheel zoom. Returns a cleanup function that disposes everything.

2. **Rebuild effect** (runs on any state change): Clears the scene (preserves lights), rebuilds the pegboard geometry from scratch, and adds it to the scene.

The pegboard shape is a `THREE.Shape` (rounded rectangle) with pill-shaped holes subtracted via `shape.holes`. Odd rows are offset horizontally by half the X-spacing for the staggered Skadis pattern. The shape is extruded with `THREE.ExtrudeGeometry` and rendered with `MeshStandardMaterial` (dark gray, roughness 0.5, metalness 0.1). A wireframe outline is drawn at `z = -thickness`.

### Key Constants

| Constant              | Value  | Purpose |
|-----------------------|--------|---------|
| `HOLE_WIDTH`          | 5mm    | Pegboard slot width |
| `HOLE_HEIGHT`         | 15mm   | Pegboard slot height |
| `HOLE_SPACING_X`      | 40mm   | Horizontal distance between hole centers |
| `HOLE_SPACING_Y`      | 20mm   | Vertical distance between hole centers |
| `EDGE_MARGIN`         | 20mm   | Margin from board edge where holes are excluded |
| `BOARD_RADIUS`        | 8mm    | Corner rounding radius |
| `COUNTERSINK_DEPTH`   | 10mm   | Spacer height |

Mounting hole diameter and inset are configurable via state variables (`screwHoleDiameter`, `screwHoleInset`).

### STL Export

- **`generateSTL()`**: Rebuilds the same `THREE.Shape` with holes, extrudes it, iterates over triangle faces, writes ASCII STL, and triggers a browser download. Filename: `skadis_{width}x{height}x{thickness}mm.stl`.

- **`generateSpacerSTL()`**: Creates a ring (outer radius 5.5mm, inner radius 2.5mm) extruded to 10mm for use with the mounting holes. Filename: `spacer_10mm.stl`.

STL export is independent of the preview scene -- it recalculates geometry from the same parameters.

### UI Layout

- **Header**: Logo + title + subtitle
- **Main area**: Flex row (desktop) / column (mobile)
  - **Sidebar**: Dimension sliders, mounting holes toggle, two download buttons
  - **Viewport**: `<div ref={mountRef}>` where the Three.js canvas is mounted

## Conventions

- All code in a single file -- no component extraction, no imports between source files.
- Pure React hooks for state and effects -- no external state management library.
- Three.js r128 is intentionally used (older version for compatibility).
- Tailwind utility classes for all styling.
- ESLint / Prettier / Husky are not configured.
