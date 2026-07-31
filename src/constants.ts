export const STORAGE_KEY = 'skraeddar_settings';

export const DEFAULTS = {
  width: 280,
  height: 280,
  thickness: 5,
  mountType: 'holes',
  screwHoleDiameter: 5,
  screwHoleInset: 8.75,
  extendTop: false,
  extendBottom: false,
  extendLeft: false,
  extendRight: false,
  roundTopLeft: true,
  roundTopRight: true,
  roundBottomLeft: true,
  roundBottomRight: true,
} as const;

export const HOLE_WIDTH = 5;
export const HOLE_HEIGHT = 15;
export const HOLE_SPACING_X = 40;
export const HOLE_SPACING_Y = 20;
export const EDGE_MARGIN = 20;
export const BOARD_RADIUS = 8;
export const SPACER_DEPTH = 10;
export const SHOW_OUTLINE = false;

export const COMMAND_STRIP = {
  small:  { width: 15, height: 30, radius: 2 },
  medium: { width: 20, height: 40, radius: 3 },
  large:  { width: 25, height: 70, radius: 4 },
} as const;
