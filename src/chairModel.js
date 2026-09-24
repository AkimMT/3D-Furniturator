import * as THREE from 'three';
import {
  makeLegGeometry, makeSideWebGeometry, makeFrontRailGeometry,
  makeSeatPadGeometry, makeBandGeometry, smooth,
} from './geometry';
import { getSize } from './config';

/**
 * Pure geometry, no React. All numbers are metres and come from the manufacturer's
 * drawing: height 80, seat 47, arm height 68, width 58 (M) / 62 (L), depth 59.
 * z = forward (toward the sitter's knees), y = up.
 *
 * Returns a list of mesh descriptors:
 *   { part: 'legs'|'frame'|'arms'|'cushion', geometry, position, rotation, tilted, only? }
 * `tilted` parts live inside the seat group, which leans back 4.5 degrees.
 */

export const PIVOT_Y = 0.432;   // seat frame top, at the tilt pivot
export const SEAT_TILT = 0.08;  // radians, rear lower than front

const YT = 0.672;               // top of the legs, buried inside the arm
const FRONT = { footZ: 0.278, topZ: 0.1385, footX: 0.275, topX: 0.25 };
const REAR = { footZ: -0.278, topZ: -0.0865, footX: 0.225, topX: 0.25 };
const RX_TOP = 0.026;                     // legs are ~5 cm thick where they merge into the side panel
const legAxisZ = (leg, y) => leg.footZ + (leg.topZ - leg.footZ) * (y / YT);
const legRz = (y) => 0.017 + (0.045 - 0.017) * (y / YT);       // half-size front-to-back
// half-size sideways: slim (2.5-3 cm) down to knee height, then widening into the panel
const legRx = (y) => 0.0125 + 0.002 * Math.min(y / 0.35, 1) + (RX_TOP - 0.0145) * smooth(0.35, 0.56, y);

const FOOT_RX = legRx(0);
const FOOT_RZ = legRz(0);

/**
 * BK1 (bar stool): straight leg-extension posts under RK1's feet, lifting the whole
 * chair assembly by `liftY`, plus a round footrest rail on each side at `footrestY`.
 * Returns { liftY, meshes } -- meshes go in the 'legs' part group, not lifted themselves.
 */
export function buildStoolExtension(sizeId, liftY, footrestY) {
  const dx = (getSize(sizeId).width - 0.58) / 2;
  const meshes = [];
  [1, -1].forEach((sx) => {
    [FRONT, REAR].forEach((leg) => {
      const x = sx * (leg.footX + dx);
      meshes.push({
        position: [0, 0, 0], rotation: [0, 0, 0],
        geometry: makeLegGeometry({
          top: [x, leg.footZ], foot: [x, leg.footZ], yTop: liftY,
          rz: () => FOOT_RZ, rx: () => FOOT_RX,
        }),
      });
    });
    // footrest rail, front foot to rear foot, on this side
    const x = sx * (FRONT.footX + dx);
    const zMid = (FRONT.footZ + REAR.footZ) / 2;
    const len = FRONT.footZ - REAR.footZ;
    const rail = new THREE.CylinderGeometry(0.013, 0.013, len, 20);
    rail.rotateX(Math.PI / 2);
    meshes.push({ position: [x, footrestY, zMid], rotation: [0, 0, 0], geometry: rail });
  });
  return meshes;
}

export function buildChairModel(sizeId = 'M') {
  const dx = (getSize(sizeId).width - 0.58) / 2;
  const meshes = [];
  const add = (m) => meshes.push({ position: [0, 0, 0], rotation: [0, 0, 0], tilted: false, ...m });

  /* ---- legs and side panels ---- */
  [1, -1].forEach((sx) => {
    [FRONT, REAR].forEach((leg) => {
      add({
        part: 'legs',
        geometry: makeLegGeometry({
          top: [sx * (leg.topX + dx), leg.topZ],
          foot: [sx * (leg.footX + dx), leg.footZ],
          yTop: YT, rz: legRz, rx: legRx,
        }),
      });
    });
  });

  const yTopWeb = 0.668;
  const yB = 0.395;
  const webGeo = makeSideWebGeometry({
    A: [legAxisZ(REAR, yTopWeb), yTopWeb],
    B: [legAxisZ(FRONT, yTopWeb), yTopWeb],
    C: [legAxisZ(FRONT, yB) - legRz(yB), yB],
    D: [legAxisZ(REAR, yB) + legRz(yB), yB],
    apexY: 0.608,
    thickness: 2 * RX_TOP,
    taper: (y) => legRx(Math.min(Math.max(y, 0), YT)) / RX_TOP,
  });
  [1, -1].forEach((sx) => add({ part: 'legs', geometry: webGeo, position: [sx * (0.25 + dx), 0, 0] }));

  /* ---- seat frame (rails), tilted with the seat ---- */
  const yR = 0.43; // height of the rails, to find where the legs are
  const zFrontRail = legAxisZ(FRONT, yR);
  const zRearRail = legAxisZ(REAR, yR);
  const xFrontRail = FRONT.topX + (FRONT.footX - FRONT.topX) * (1 - yR / YT) + dx;
  const xRearRail = REAR.topX + (REAR.footX - REAR.topX) * (1 - yR / YT) + dx;

  add({
    part: 'frame', tilted: true, position: [0, 0, zFrontRail],
    geometry: makeFrontRailGeometry({ halfWidth: xFrontRail - 0.004 }),
  });
  add({
    part: 'frame', tilted: true, position: [0, -0.0225, zRearRail],
    geometry: new THREE.BoxGeometry(2 * (xRearRail - 0.004), 0.045, 0.035),
  });
  const sideLen = Math.hypot(xFrontRail - xRearRail, zFrontRail - zRearRail);
  const sideAng = Math.atan2(xFrontRail - xRearRail, zFrontRail - zRearRail);
  [1, -1].forEach((sx) => add({
    part: 'frame', tilted: true,
    position: [sx * (xFrontRail + xRearRail) / 2, -0.015, (zFrontRail + zRearRail) / 2],
    rotation: [0, sx * sideAng, 0],
    geometry: new THREE.BoxGeometry(0.035, 0.03, sideLen),
  }));

  /* ---- arm-and-back: one continuous band ---- */
  const Z_ARC = -0.09;                 // where the arms start to curve round the back
  const AX = 0.246 + dx;               // half-width of the curve
  const BZ = 0.145;                    // depth of the curve
  const Y_ARM_BACK = 0.6665;
  const Y_APEX = 0.746;
  // arm slab: top 67.7 cm, underside 65.6 cm, flat along its length
  const armY = () => 0.6665;
  const armT = () => 0.021;

  const armPts = [
    [0.257 + dx, armY(0.236), 0.236],
    [0.254 + dx, armY(0.12), 0.12],
    [0.250 + dx, armY(0.0), 0.0],
    [AX, Y_ARM_BACK, Z_ARC],
  ];
  const arcAt = (deg) => {
    const f = (deg * Math.PI) / 180;
    const t = deg / 90;
    return [AX * Math.cos(f), Y_ARM_BACK + (Y_APEX - Y_ARM_BACK) * t * t * (3 - 2 * t), Z_ARC - BZ * Math.sin(f)];
  };
  const right = [...armPts, ...[15, 30, 45, 60, 75, 90].map(arcAt)];
  const mirror = ([x, y, z]) => new THREE.Vector3(-x, y, z);
  const path = [
    ...right.slice(0, -1).map(mirror),
    new THREE.Vector3(...right[right.length - 1]),
    ...right.slice(0, -1).reverse().map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  ];
  const sB = (p) => smooth(Z_ARC, Z_ARC - BZ, p.z);
  const bandThickness = (p) => armT() * (1 - sB(p)) + 0.033 * sB(p);

  add({
    part: 'arms',
    geometry: makeBandGeometry({
      points: path,
      tilt: (p) => 1.25 * sB(p),
      width: (p) => 0.072 + 0.026 * sB(p),
      thickness: bandThickness,
    }),
  });

  /* ---- seat pad ---- */
  add({
    part: 'cushion', tilted: true,
    geometry: makeSeatPadGeometry({
      cornerR: 0.07, zRear: -0.223, zFront: 0.278, halfRear: 0.21 + 0.5 * dx, halfFront: 0.245 + 0.5 * dx,
    }),
  });

  /* ---- upholstered back pad (only shown for the upholstered back) ---- */
  const padAngles = [38, 52, 66, 80, 90];
  const padRight = padAngles.map(arcAt);
  const padPath = [
    ...padRight.slice(0, -1).map(mirror),
    new THREE.Vector3(...padRight[padRight.length - 1]),
    ...padRight.slice(0, -1).reverse().map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  ];
  const padHalf = AX * Math.cos((38 * Math.PI) / 180) + 0.006;
  add({
    part: 'cushion', only: 'upholstered',
    geometry: makeBandGeometry({
      points: padPath,
      samples: 120,
      tilt: (p) => 1.25 * sB(p),
      width: (p) => 0.034 + 0.056 * Math.sqrt(Math.max(0, 1 - (p.x / padHalf) ** 2)),
      thickness: () => 0.02,
      shiftTh: (p) => bandThickness(p) / 2 + 0.008,
      uScale: 2.3, vScale: 2.3,
    }),
  });

  return meshes;
}
