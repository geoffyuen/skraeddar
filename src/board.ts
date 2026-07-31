import * as THREE from 'three';
import { HOLE_WIDTH, HOLE_HEIGHT, HOLE_SPACING_X, HOLE_SPACING_Y, EDGE_MARGIN, BOARD_RADIUS } from './constants';

export interface BoardShapeParams {
  width: number;
  height: number;
  mountType: 'none' | 'holes' | 'spacers' | 'command-strip-small' | 'command-strip-medium' | 'command-strip-large';
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

export const createRoundedRectShape = (
  w: number,
  h: number,
  r: number
): THREE.Shape => {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  const cr = Math.min(r, hw, hh);

  shape.moveTo(-hw + cr, -hh);
  shape.lineTo(hw - cr, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cr);
  shape.lineTo(hw, hh - cr);
  shape.quadraticCurveTo(hw, hh, hw - cr, hh);
  shape.lineTo(-hw + cr, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
  shape.lineTo(-hw, -hh + cr);
  shape.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);

  return shape;
};

// Binary STL format constants
const STL_HEADER = 80;
const STL_COUNT = 4;
const STL_TRIANGLE = 50; // 12 normal + 36 vertices + 2 attribute bytes
const STL_FLOAT = 4;
const STL_UINT16 = 2;

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _subA = new THREE.Vector3();
const _subB = new THREE.Vector3();
const _normal = new THREE.Vector3();

const writeTriangle = (view: DataView, offset: number): number => {
  _subA.subVectors(_vB, _vA);
  _subB.subVectors(_vC, _vA);
  _normal.crossVectors(_subA, _subB).normalize();

  const floats = [
    _normal.x, _normal.y, _normal.z,
    _vA.x, _vA.y, _vA.z,
    _vB.x, _vB.y, _vB.z,
    _vC.x, _vC.y, _vC.z,
  ];
  for (let i = 0; i < floats.length; i++) {
    view.setFloat32(offset, floats[i], true);
    offset += STL_FLOAT;
  }
  view.setUint16(offset, 0, true);
  return offset + STL_UINT16;
};

let _prevKey = '';
let _prevResult: { shape: THREE.Shape; totalHoles: number } | null = null;

export const buildBoardShape = (params: BoardShapeParams): { shape: THREE.Shape; totalHoles: number } => {
  const key = `${params.width}|${params.height}|${params.mountType}|${params.screwHoleDiameter}|${params.screwHoleInset}|${params.extendTop}|${params.extendBottom}|${params.extendLeft}|${params.extendRight}|${params.roundTopLeft}|${params.roundTopRight}|${params.roundBottomLeft}|${params.roundBottomRight}`;
  if (_prevKey === key && _prevResult) return _prevResult;

  const { width, height, mountType, screwHoleDiameter, screwHoleInset,
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

  const screwPositions = (mountType === 'holes' || mountType === 'spacers') ? [
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

  _prevKey = key;
  _prevResult = { shape, totalHoles };
  return _prevResult;
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

  const buffer = new ArrayBuffer(STL_HEADER + STL_COUNT + triangleCount * STL_TRIANGLE);
  const view = new DataView(buffer);

  const header = `Skraeddar - ${solidName}`;
  for (let i = 0; i < STL_HEADER; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  view.setUint32(STL_HEADER, triangleCount, true);

  let offset = STL_HEADER + STL_COUNT;

  const writeAll = (i1: number, i2: number, i3: number) => {
    _vA.set(positions[i1], positions[i1 + 1], positions[i1 + 2]);
    _vB.set(positions[i2], positions[i2 + 1], positions[i2 + 2]);
    _vC.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
    offset = writeTriangle(view, offset);
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

export const mergeSTL = (
  entries: { geometry: THREE.ExtrudeGeometry; offset?: { x: number; y: number; z: number } }[],
  solidName: string
): Blob => {
  let totalTriangles = 0;
  const metas = entries.map(e => {
    const pos = e.geometry.attributes.position.array;
    const idx = e.geometry.index ? e.geometry.index.array : null;
    const count = idx ? idx.length / 3 : pos.length / 9;
    totalTriangles += count;
    return { pos, idx, count, offset: e.offset };
  });

  const buffer = new ArrayBuffer(STL_HEADER + STL_COUNT + totalTriangles * STL_TRIANGLE);
  const view = new DataView(buffer);

  const header = `Skraeddar - ${solidName}`;
  for (let i = 0; i < STL_HEADER; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  view.setUint32(STL_HEADER, totalTriangles, true);

  let offset = STL_HEADER + STL_COUNT;

  for (const meta of metas) {
    const { pos, idx, offset: off } = meta;
    const ox = off?.x ?? 0;
    const oy = off?.y ?? 0;
    const oz = off?.z ?? 0;

    const writeAll = (i1: number, i2: number, i3: number) => {
      _vA.set(pos[i1] + ox, pos[i1 + 1] + oy, pos[i1 + 2] + oz);
      _vB.set(pos[i2] + ox, pos[i2 + 1] + oy, pos[i2 + 2] + oz);
      _vC.set(pos[i3] + ox, pos[i3 + 1] + oy, pos[i3 + 2] + oz);
      offset = writeTriangle(view, offset);
    };

    if (idx) {
      for (let i = 0; i < idx.length; i += 3) {
        writeAll(idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3);
      }
    } else {
      for (let i = 0; i < pos.length; i += 9) {
        writeAll(i, i + 3, i + 6);
      }
    }
  }

  return new Blob([buffer], { type: 'model/stl' });
};
