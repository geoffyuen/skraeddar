import * as THREE from 'three';
import { HOLE_WIDTH, HOLE_HEIGHT, HOLE_SPACING_X, HOLE_SPACING_Y, EDGE_MARGIN, BOARD_RADIUS } from './constants';

export interface BoardShapeParams {
  width: number;
  height: number;
  withMountingHoles: boolean;
  screwHoleDiameter: number;
  screwHoleInset: number;
  extendTop: boolean;
  extendBottom: boolean;
  extendLeft: boolean;
  extendRight: boolean;
  roundTopLeft: boolean;
  roundTopRight: boolean;
  roundBottomLeft: boolean;
  roundBottomRight: boolean;
}

const addPillHole = (shape: THREE.Shape, xPos: number, yPos: number) => {
  const hw = HOLE_WIDTH / 2;
  const hh = HOLE_HEIGHT / 2;
  const holePath = new THREE.Path();
  holePath.moveTo(xPos - hw, yPos - hh + hw);
  holePath.lineTo(xPos - hw, yPos + hh - hw);
  holePath.quadraticCurveTo(xPos - hw, yPos + hh, xPos, yPos + hh);
  holePath.quadraticCurveTo(xPos + hw, yPos + hh, xPos + hw, yPos + hh - hw);
  holePath.lineTo(xPos + hw, yPos - hh + hw);
  holePath.quadraticCurveTo(xPos + hw, yPos - hh, xPos, yPos - hh);
  holePath.quadraticCurveTo(xPos - hw, yPos - hh, xPos - hw, yPos - hh + hw);
  shape.holes.push(holePath);
};

export const formatTriangle = (v1: THREE.Vector3, v2: THREE.Vector3, v3: THREE.Vector3): string => {
  const normal = new THREE.Vector3()
    .crossVectors(
      new THREE.Vector3().subVectors(v2, v1),
      new THREE.Vector3().subVectors(v3, v1)
    )
    .normalize();

  let result = '';
  result += `  facet normal ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}\n`;
  result += `    outer loop\n`;
  result += `      vertex ${v1.x.toFixed(6)} ${v1.y.toFixed(6)} ${v1.z.toFixed(6)}\n`;
  result += `      vertex ${v2.x.toFixed(6)} ${v2.y.toFixed(6)} ${v2.z.toFixed(6)}\n`;
  result += `      vertex ${v3.x.toFixed(6)} ${v3.y.toFixed(6)} ${v3.z.toFixed(6)}\n`;
  result += `    endloop\n`;
  result += `  endfacet\n`;

  return result;
};

export const buildBoardShape = (params: BoardShapeParams): { shape: THREE.Shape; totalHoles: number } => {
  const { width, height, withMountingHoles, screwHoleDiameter, screwHoleInset,
    extendTop, extendBottom, extendLeft, extendRight,
    roundTopLeft, roundTopRight, roundBottomLeft, roundBottomRight } = params;

  const holesX = Math.floor((width - 2 * EDGE_MARGIN) / HOLE_SPACING_X) + 1;
  const holesY = Math.floor((height - 2 * EDGE_MARGIN) / HOLE_SPACING_Y) + 1;
  const startX = (width - (holesX - 1) * HOLE_SPACING_X) / 2;
  const startY = (height - (holesY - 1) * HOLE_SPACING_Y) / 2;

  const shape = new THREE.Shape();
  const r = BOARD_RADIUS;
  const hw = HOLE_WIDTH / 2;
  const hh = HOLE_HEIGHT / 2;

  if (roundBottomLeft) {
    shape.moveTo(-width/2 + r, -height/2);
  } else {
    shape.moveTo(-width/2, -height/2);
  }

  if (extendBottom) {
    for (let i = 0; i < holesX; i++) {
      const xBoard = startX + i * HOLE_SPACING_X + HOLE_SPACING_X / 2;
      if (xBoard < EDGE_MARGIN || xBoard > width - EDGE_MARGIN) continue;
      const xPos = xBoard - width/2;
      shape.lineTo(xPos - hw, -height/2);
      shape.lineTo(xPos - hw, -height/2 + hh - hw);
      shape.quadraticCurveTo(xPos - hw, -height/2 + hh, xPos, -height/2 + hh);
      shape.quadraticCurveTo(xPos + hw, -height/2 + hh, xPos + hw, -height/2 + hh - hw);
      shape.lineTo(xPos + hw, -height/2);
    }
  }
  if (roundBottomRight) {
    shape.lineTo(width/2 - r, -height/2);
    shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + r);
  } else {
    shape.lineTo(width/2, -height/2);
  }

  if (extendRight) {
    for (let j = 1; j < holesY; j += 2) {
      const yPos = startY + j * HOLE_SPACING_Y - height/2;
      shape.lineTo(width/2, yPos - hh);
      shape.quadraticCurveTo(width/2 - hw, yPos - hh, width/2 - hw, yPos - hh + hw);
      shape.lineTo(width/2 - hw, yPos + hh - hw);
      shape.quadraticCurveTo(width/2 - hw, yPos + hh, width/2, yPos + hh);
    }
  }
  if (roundTopRight) {
    shape.lineTo(width/2, height/2 - r);
    shape.quadraticCurveTo(width/2, height/2, width/2 - r, height/2);
  } else {
    shape.lineTo(width/2, height/2);
  }

  if (extendTop) {
    for (let i = holesX - 1; i >= 0; i--) {
      const xBoard = startX + i * HOLE_SPACING_X + HOLE_SPACING_X / 2;
      if (xBoard < EDGE_MARGIN || xBoard > width - EDGE_MARGIN) continue;
      const xPos = xBoard - width/2;
      shape.lineTo(xPos + hw, height/2);
      shape.lineTo(xPos + hw, height/2 - hh + hw);
      shape.quadraticCurveTo(xPos + hw, height/2 - hh, xPos, height/2 - hh);
      shape.quadraticCurveTo(xPos - hw, height/2 - hh, xPos - hw, height/2 - hh + hw);
      shape.lineTo(xPos - hw, height/2);
    }
  }
  if (roundTopLeft) {
    shape.lineTo(-width/2 + r, height/2);
    shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - r);
  } else {
    shape.lineTo(-width/2, height/2);
  }

  if (extendLeft) {
    for (let j = holesY - 1 - (holesY % 2); j >= 0; j -= 2) {
      const yPos = startY + j * HOLE_SPACING_Y - height/2;
      shape.lineTo(-width/2, yPos + hh);
      shape.quadraticCurveTo(-width/2 + hw, yPos + hh, -width/2 + hw, yPos + hh - hw);
      shape.lineTo(-width/2 + hw, yPos - hh + hw);
      shape.quadraticCurveTo(-width/2 + hw, yPos - hh, -width/2, yPos - hh);
    }
  }
  if (roundBottomLeft) {
    shape.lineTo(-width/2, -height/2 + r);
    shape.quadraticCurveTo(-width/2, -height/2, -width/2 + r, -height/2);
  } else {
    shape.lineTo(-width/2, -height/2);
  }

  let totalHoles = 0;
  for (let i = 0; i < holesX; i++) {
    for (let j = 0; j < holesY; j++) {
      const offsetX = (j % 2) * (HOLE_SPACING_X / 2);
      const xPos = startX + i * HOLE_SPACING_X + offsetX - width/2;
      const yPos = startY + j * HOLE_SPACING_Y - height/2;
      
      if (startX + i * HOLE_SPACING_X + offsetX < EDGE_MARGIN || 
          startX + i * HOLE_SPACING_X + offsetX > width - EDGE_MARGIN) continue;
      
      totalHoles++;

      addPillHole(shape, xPos, yPos);
    }
  }

  const screwPositions = withMountingHoles ? [
    { x: -width/2 + screwHoleInset, y: -height/2 + screwHoleInset },
    { x: width/2 - screwHoleInset, y: -height/2 + screwHoleInset },
    { x: -width/2 + screwHoleInset, y: height/2 - screwHoleInset },
    { x: width/2 - screwHoleInset, y: height/2 - screwHoleInset }
  ] : [];

  screwPositions.forEach(pos => {
    const screwHole = new THREE.Path();
    const radius = screwHoleDiameter / 2;
    screwHole.absarc(pos.x, pos.y, radius, 0, Math.PI * 2, false);
    shape.holes.push(screwHole);
  });

  return { shape, totalHoles };
};
