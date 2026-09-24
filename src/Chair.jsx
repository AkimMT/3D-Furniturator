import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { makeWoodMaterial, makeCushionMaterial } from './materials';
import { buildChairModel, buildStoolExtension, PIVOT_Y, SEAT_TILT } from './chairModel';
import { getModel } from './config';

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** A named group that drops into place after `delay` seconds (the "build" effect). */
function Part({ name, delay, children }) {
  const ref = useRef();
  const t0 = useRef(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    if (reduceMotion) { g.visible = true; g.position.y = 0; return; }
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current - delay;
    if (t < 0) { g.visible = false; return; }
    g.visible = true;
    g.position.y = (1 - easeOutCubic(Math.min(t / 0.8, 1))) * 1.4;
  });
  return <group ref={ref} name={name} visible={false}>{children}</group>;
}

/**
 * The chair is built in code from the manufacturer's drawing (see chairModel.js).
 * Group names (legs, frame, arms, cushion) are the SAME names to use in Blender
 * when you replace this with a real GLB model.
 *
 * BK1 (bar stool) reuses the whole RK1 assembly unchanged, lifted up on straight leg
 * posts to the stool's seat height, with a footrest rail filling the gap -- rather
 * than stretching the chair, which would distort the arches and taper.
 */
export default function Chair({ selection }) {
  const { model: modelId, size, back, finish, cushion } = selection;
  const modelDef = getModel(modelId);
  const isStool = modelDef.kind === 'stool';
  const liftY = isStool ? Math.max(0, modelDef.seatHeight - PIVOT_Y) : 0;

  const parts = useMemo(() => buildChairModel(size), [size]);
  const extension = useMemo(
    () => (isStool ? buildStoolExtension(size, liftY, modelDef.footrestHeight) : []),
    [isStool, size, liftY, modelDef.footrestHeight],
  );
  useEffect(() => () => {
    // several meshes share one geometry (the two side panels), so dispose each only once
    new Set(parts.map((m) => m.geometry)).forEach((g) => g.dispose());
  }, [parts]);
  useEffect(() => () => extension.forEach((m) => m.geometry.dispose()), [extension]);

  // one wood, one finish, shared by legs, seat frame, and arms/back
  const legMat = useMemo(() => makeWoodMaterial(finish, false), [finish]);
  const frameMat = useMemo(() => makeWoodMaterial(finish, true), [finish]);
  const armsMat = useMemo(() => makeWoodMaterial(finish, false, true), [finish]);
  const cushionMat = useMemo(() => makeCushionMaterial(cushion), [cushion]);
  useEffect(() => () => legMat.dispose(), [legMat]);
  useEffect(() => () => frameMat.dispose(), [frameMat]);
  useEffect(() => () => armsMat.dispose(), [armsMat]);
  useEffect(() => () => cushionMat.dispose(), [cushionMat]);

  const materials = { legs: legMat, frame: frameMat, arms: armsMat, cushion: cushionMat };

  const renderPart = (part) => {
    const items = parts.filter((m) => m.part === part && (!m.only || m.only === back));
    const flat = items.filter((m) => !m.tilted);
    const tilted = items.filter((m) => m.tilted);
    const mesh = (m, i) => (
      <mesh key={i} geometry={m.geometry} material={materials[part]} position={m.position} rotation={m.rotation} />
    );
    return (
      <>
        {flat.map(mesh)}
        {tilted.length > 0 && (
          <group position={[0, PIVOT_Y, 0]} rotation={[-SEAT_TILT, 0, 0]}>
            {tilted.map(mesh)}
          </group>
        )}
      </>
    );
  };

  return (
    <group>
      <Part name="legs" delay={0}>
        {/* the extension posts + footrest sit on the floor, not lifted */}
        {extension.map((m, i) => (
          <mesh key={`ext-${i}`} geometry={m.geometry} material={legMat} position={m.position} rotation={m.rotation} />
        ))}
        <group position={[0, liftY, 0]}>{renderPart('legs')}</group>
      </Part>
      <Part name="frame" delay={0.3}><group position={[0, liftY, 0]}>{renderPart('frame')}</group></Part>
      <Part name="arms" delay={0.6}><group position={[0, liftY, 0]}>{renderPart('arms')}</group></Part>
      <Part name="cushion" delay={0.9}><group position={[0, liftY, 0]}>{renderPart('cushion')}</group></Part>
    </group>
  );
}
