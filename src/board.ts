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

const pillHoleTemplate = (() => {
  const hw = HOLE_WIDTH / 2;
  const hh = HOLE_HEIGHT / 2;
  const p = new THREE.Path();
  p.moveTo(-hw, -hh + hw);
  p.lineTo(-hw, hh - hw);
  p.quadraticCurveTo(-hw, hh, 0, hh);
  p.quadraticCurveTo(hw, hh, hw, hh - hw);
  p.lineTo(hw, -hh + hw);
  p.quadraticCurveTo(hw, -hh, 0, -hh);
  p.quadraticCurveTo(-hw, -hh, -hw, -hh + hw);
  return p;
})();

const offsetPath = (path: THREE.Path, dx: number, dy: number) => {
  for (const c of path.curves) {
    if (c instanceof THREE.LineCurve) {
      c.v1.x += dx; c.v1.y += dy;
      c.v2.x += dx; c.v2.y += dy;
    } else if (c instanceof THREE.QuadraticBezierCurve) {
      c.v0.x += dx; c.v0.y += dy;
      c.v1.x += dx; c.v1.y += dy;
      c.v2.x += dx; c.v2.y += dy;
    }
  }
  path.currentPoint.x += dx;
  path.currentPoint.y += dy;
};

const writeTriangle = (
  view: DataView,
  offset: number,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  v3: THREE.Vector3
): number => {
  const subA = new THREE.Vector3().subVectors(v2, v1);
  const subB = new THREE.Vector3().subVectors(v3, v1);
  const normal = new THREE.Vector3().crossVectors(subA, subB).normalize();

  const floats = [
    normal.x, normal.y, normal.z,
    v1.x, v1.y, v1.z,
    v2.x, v2.y, v2.z,
    v3.x, v3.y, v3.z,
  ];
  for (let i = 0; i < floats.length; i++) {
    view.setFloat32(offset, floats[i], true);
    offset += 4;
  }
  view.setUint16(offset, 0, true);
  return offset + 2;
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

      const hole = pillHoleTemplate.clone();
      offsetPath(hole, xPos, yPos);
      shape.holes.push(hole);
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

export const generateBinarySTLBlob = (
  geometry: THREE.ExtrudeGeometry,
  solidName: string
): Blob => {
  const positions = geometry.attributes.position.array;
  const indices = geometry.index ? geometry.index.array : null;

  const triangleCount = indices
    ? indices.length / 3
    : positions.length / 9;

  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  const view = new DataView(buffer);

  const header = `Skraeddar - ${solidName}`;
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  view.setUint32(80, triangleCount, true);

  let offset = 84;

  const writeAll = (i1: number, i2: number, i3: number) => {
    const v1 = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
    const v2 = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
    const v3 = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
    offset = writeTriangle(view, offset, v1, v2, v3);
  };

  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      writeAll(
        indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3
      );
    }
  } else {
    for (let i = 0; i < positions.length; i += 9) {
      writeAll(i, i + 3, i + 6);
    }
  }

  return new Blob([buffer], { type: 'model/stl' });
};
