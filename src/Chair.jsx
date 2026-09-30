import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { makeWoodMaterial, makeCushionMaterial } from './materials';
import { getSize } from './config';

// const GLB = { RK1: '/models/rk-medziaginis.glb', BK1: '/models/rk-standartinis.glb' };
const GLB = {
  RK1: {
    wood: '/models/rk-standartinis.glb',
    upholstered: '/models/rk-medziaginis.glb',
  },
  BK1: {
    wood: '/models/rk-standartinis.glb',        // once you have the bar stool versions
    upholstered: '/models/rk-medziaginis.glb',
  },
};

const HEIGHT = { RK1: 0.80, BK1: 1.00 };            // metres, from the drawings

// Which mesh is leather? Adjust this if your part names differ.
// const isLeather = (name) => /seat|cushion|uphol|leather|pad/i.test(name);
// const isLeather = (name) => name !== 'frame';
const isLeather = (name) => name === 'backrest' || name === 'seat';

// export default function Chair({ selection }) {
//   const { model, size, finish, cushion } = selection;
//   const { scene } = useGLTF(GLB[model]);

export default function Chair({ selection }) {
  const { model, size, back, finish, cushion } = selection;
  const { scene } = useGLTF(GLB[model][back]);

  // Meshy models come at arbitrary size and position, so scale to the real
  // height, stand it on the floor and centre it.
  const root = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    clone.scale.setScalar(HEIGHT[model] / (box.max.y - box.min.y));
    box.setFromObject(clone);
    const c = box.getCenter(new THREE.Vector3());
    clone.position.set(-c.x, -box.min.y, -c.z);
    const wrap = new THREE.Group();
    wrap.add(clone);
    wrap.scale.x = getSize(size).width / 0.58;   // M = 58 cm, L = 62 cm
    // wrap.rotation.y = Math.PI;                // uncomment if it faces backwards
    return wrap;
  }, [scene, model, size, back]);

  const woodMat = useMemo(() => makeWoodMaterial(finish, false), [finish]);
  const leatherMat = useMemo(() => makeCushionMaterial(cushion), [cushion]);
  useEffect(() => () => woodMat.dispose(), [woodMat]);
  useEffect(() => () => leatherMat.dispose(), [leatherMat]);

  useEffect(() => {
    root.traverse((o) => {
      if (!o.isMesh) return;
      console.log('mesh name:', o.name);          // check the browser console
      o.material = isLeather(o.name) ? leatherMat : woodMat;
    });
  }, [root, woodMat, leatherMat]);

  return <primitive object={root} />;
}

Object.values(GLB).forEach((byBack) => Object.values(byBack).forEach(useGLTF.preload));
// useGLTF.preload('/models/rk-medziaginis.glb');
