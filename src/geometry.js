import * as THREE from 'three';

/** Multiply UVs. Extruded shapes use metres as UVs, so we scale them to get sensible grain size. */
export function scaleUV(geometry, su, sv) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geometry;
}

export const smooth = (a, b, x) => {
  const k = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
};

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Tapered leg with an oval cross-section (wide front-to-back, slimmer sideways),
 * straight axis from `foot` [x, z] at y = 0 to `top` [x, z] at y = yTop.
 * rz(y) / rx(y) = half-sizes along z and x at height y.
 */
export function makeLegGeometry({ top, foot, yTop, rz, rx, radial = 32, rings = 24 }) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  const dcx = (top[0] - foot[0]) / yTop;
  const dcz = (top[1] - foot[1]) / yTop;
  const eps = 1e-3;
  const tt = new THREE.Vector3();
  const ty = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const y = t * yTop;
    const cx = lerp(foot[0], top[0], t);
    const cz = lerp(foot[1], top[1], t);
    const rxx = rx(y);
    const rzz = rz(y);
    const drx = (rx(Math.min(y + eps, yTop)) - rx(Math.max(y - eps, 0))) / (Math.min(y + eps, yTop) - Math.max(y - eps, 0));
    const drz = (rz(Math.min(y + eps, yTop)) - rz(Math.max(y - eps, 0))) / (Math.min(y + eps, yTop) - Math.max(y - eps, 0));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pos.push(cx + rxx * c, y, cz + rzz * s);
      tt.set(-rxx * s, 0, rzz * c);
      ty.set(dcx + drx * c, 1, dcz + drz * s);
      n.crossVectors(ty, tt).normalize();
      nor.push(n.x, n.y, n.z);
      uv.push(j / radial, t);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * The solid panel under each armrest, with the arched opening.
 * A, B = top corners [z, y]; C, D = where the arch springs from the front / rear leg [z, y].
 * Drawn in (z, y), extruded sideways, centred on x = 0, then slimmed toward the floor
 * with `taper(y)` so it blends into the tapering legs.
 */
export function makeSideWebGeometry({ A, B, C, D, apexY, thickness, taper }) {
  const yB = C[1];
  const zc = (C[0] + D[0]) / 2;
  const rz = (C[0] - D[0]) / 2;
  const ry = apexY - yB;

  const s = new THREE.Shape();
  s.moveTo(A[0], A[1]);
  s.lineTo(B[0], B[1]);
  s.lineTo(C[0], C[1]);
  s.absellipse(zc, yB, rz, ry, 0, Math.PI, false); // the arch, ends at D
  s.lineTo(A[0], A[1]);

  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 48 });
  g.rotateY(-Math.PI / 2); // shape x -> world z, extrusion -> world x
  g.translate(thickness / 2, 0, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * taper(p.getY(i)));
  return scaleUV(g, 8, 2);
}

/** Front seat rail: flat top (y = 0), concave underside. Centred on x = 0, z = 0. */
export function makeFrontRailGeometry({ halfWidth, yEnd = -0.062, ySag = -0.03, depth = 0.04 }) {
  const s = new THREE.Shape();
  s.moveTo(-halfWidth, 0);
  s.lineTo(halfWidth, 0);
  s.lineTo(halfWidth, yEnd);
  s.quadraticCurveTo(0, ySag, -halfWidth, yEnd);
  s.lineTo(-halfWidth, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 32 });
  g.translate(0, 0, -depth / 2);
  return scaleUV(g, 2, 8);
}

function roundedPolygonShape(pts, r) {
  const s = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const v1 = new THREE.Vector2().subVectors(p0, p1);
    const v2 = new THREE.Vector2().subVectors(p2, p1);
    const rr = Math.min(r, v1.length() / 2, v2.length() / 2);
    const a = p1.clone().addScaledVector(v1.normalize(), rr);
    const b = p1.clone().addScaledVector(v2.normalize(), rr);
    if (i === 0) s.moveTo(a.x, a.y); else s.lineTo(a.x, a.y);
    s.quadraticCurveTo(p1.x, p1.y, b.x, b.y);
  }
  s.closePath();
  return s;
}

/**
 * Loose seat pad: narrower at the back, wider at the front, rounded corners,
 * soft bevelled edges, slightly dished. Bottom sits on y = 0.
 */
export function makeSeatPadGeometry({
  zRear, zFront, halfRear, halfFront, thickness = 0.05, bevel = 0.013, dish = 0, cornerR = 0.045,
}) {
  const b = bevel;
  // plan outline (x, z); shape y = -z so that the extrusion ends up pointing up
  const plan = [
    [-(halfRear - b), zRear + b],
    [halfRear - b, zRear + b],
    [halfFront - b, zFront - b],
    [0, zFront - b + 0.014],
    [-(halfFront - b), zFront - b],
  ];
  const shape = roundedPolygonShape(plan.map(([x, z]) => new THREE.Vector2(x, -z)), cornerR);
  const depth = thickness - 2 * b;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10,
  });
  g.rotateX(-Math.PI / 2);   // extrusion -> +y, shape y -> -z
  g.translate(0, -depth / 2 + thickness / 2, 0); // bottom at y = 0
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i) / halfFront;
    p.setY(i, p.getY(i) + dish * k * k);
  }
  g.computeVertexNormals();
  return scaleUV(g, 2.3, 2.3);
}

/**
 * A rectangular band swept along a 3D path. Used for the single arm-and-back piece
 * and for the upholstered back pad.
 * tilt(p): rotation of the cross-section about the path (0 = flat slab, ~1.25 = tall, like a backrest)
 * width(p), thickness(p): cross-section size. shiftTh(p): move the section along its thickness axis
 * (positive = toward the sitter). UVs: grain runs along the length.
 */
export function makeBandGeometry({
  points, samples = 240, tilt, width, thickness, shiftTh = () => 0, uScale = 8, vScale = 2,
}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const total = curve.getLength();
  const up = new THREE.Vector3(0, 1, 0);

  const rings = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const c = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    const S = new THREE.Vector3().crossVectors(up, T).normalize(); // horizontal, sideways
    const N0 = new THREE.Vector3().crossVectors(T, S).normalize(); // roughly up
    const th = tilt(c);
    const hw = width(c) / 2;
    const ht = thickness(c) / 2;
    const W = S.clone().multiplyScalar(Math.cos(th)).addScaledVector(N0, Math.sin(th));
    const Th = S.clone().multiplyScalar(-Math.sin(th)).addScaledVector(N0, Math.cos(th));
    const centre = c.clone().addScaledVector(Th, shiftTh(c));
    const corner = (a, b) => centre.clone().addScaledVector(W, a * hw).addScaledVector(Th, b * ht);
    rings.push({ s: t * total, c: [corner(1, 1), corner(-1, 1), corner(-1, -1), corner(1, -1)] });
  }

  const pos = [];
  const uv = [];
  const idx = [];

  rings.forEach((ring) => {
    for (let k = 0; k < 4; k++) {
      const a = ring.c[k];
      const b = ring.c[(k + 1) % 4];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      uv.push(0, ring.s * vScale, a.distanceTo(b) * uScale, ring.s * vScale);
    }
  });
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < 4; k++) {
      const a0 = i * 8 + k * 2;
      const b0 = a0 + 1;
      const a1 = (i + 1) * 8 + k * 2;
      const b1 = a1 + 1;
      idx.push(a0, b0, a1, b0, b1, a1);
    }
  }

  // end caps
  const capStart = pos.length / 3;
  rings[0].c.forEach((p) => { pos.push(p.x, p.y, p.z); uv.push(0, 0); });
  idx.push(capStart + 3, capStart + 2, capStart + 1, capStart + 3, capStart + 1, capStart);
  const capEnd = pos.length / 3;
  rings[rings.length - 1].c.forEach((p) => { pos.push(p.x, p.y, p.z); uv.push(0, 0); });
  idx.push(capEnd, capEnd + 1, capEnd + 2, capEnd, capEnd + 2, capEnd + 3);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
