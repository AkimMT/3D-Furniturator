import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import Chair from './Chair.jsx';
import {
  FINISHES, CUSHION_COLORS, SIZES, BACKS, MODELS, DEFAULT_SELECTION,
  getFinish, getCushionColor, getSize, getBack, getModel,
} from './config';
import { woodSwatchURL, finishedHex } from './materials';
import { composeSpecImage, downloadBlob } from './exportImage';

const STAGE_BG = '#D5DBD3';

/** Gives the page a function that returns the live WebGL canvas. */
function Capture({ apiRef }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    apiRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement;
    };
  }, [gl, scene, camera, apiRef]);
  return null;
}

function describe(sel) {
  const m = getModel(sel.model);
  const rows = [
    {
      part: 'Mediena',
      main: getFinish(sel.finish).name,
      detail: '',
      hex: finishedHex(sel.finish),
    },
    {
      part: 'Natūrali oda',
      main: getCushionColor(sel.cushion).name,
      detail: '',
      hex: getCushionColor(sel.cushion).hex,
    },
  ];
  const subtitle = [
    `${m.name} ${m.kindLabel.toLowerCase()}, dydis ${sel.size}`,
    `${getBack(sel.back).name} atlošas`,
  ];
  return { rows, subtitle, title: `${m.name} - ${m.kindLabel}` };
}

function Option({ label, selected, onClick, dotStyle }) {
  return (
    <button
      type="button"
      className={`option${dotStyle ? '' : ' text-only'}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {dotStyle && <span className="dot" style={dotStyle} />}
      {label}
    </button>
  );
}

export default function App() {
  const [sel, setSel] = useState(DEFAULT_SELECTION);
  const [buildKey, setBuildKey] = useState(0);
  const captureRef = useRef(null);

  const setTop = (key, value) => setSel((s) => ({ ...s, [key]: value }));

  const { rows, subtitle, title } = useMemo(() => describe(sel), [sel]);
  const currentModel = getModel(sel.model);
  const isStool = currentModel.kind === 'stool';
  const camTarget = isStool ? [0, 0.62, 0] : [0, 0.4, 0];

  async function handleDownload() {
    if (!captureRef.current) return;
    const blob = await composeSpecImage(captureRef.current(), rows, [...subtitle, 'Gaminama pagal užsakymą'], title);
    const slug = [sel.model, sel.size, sel.back, sel.finish, sel.cushion].join('_').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    downloadBlob(blob, `retro-chair_${slug}.png`);
  }

  return (
    <div className="app">
      <div className="stage">
        <div className="stage-canvas">
          <Canvas
            key={sel.model}
            camera={{ position: isStool ? [1.55, 1.35, 2.15] : [1.35, 1.0, 1.85], fov: 32 }}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            dpr={[1, 2]}
            onCreated={({ gl }) => { gl.toneMappingExposure = 1.2; }}
          >
            <color attach="background" args={[STAGE_BG]} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[3, 5, 2.5]} intensity={2.2} />
            <directionalLight position={[-3, 2.5, -2]} intensity={0.8} />
            <Environment resolution={256}>
              <group rotation={[-Math.PI / 3, 0, 1]}>
                <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
                <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
                <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={2} />
                <Lightformer form="circle" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
              </group>
            </Environment>

            <Chair key={buildKey} selection={sel} />

            <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={3} blur={2.4} far={1.2} />
            <OrbitControls
              target={camTarget}
              enablePan={false}
              minDistance={isStool ? 1.7 : 1.4}
              maxDistance={isStool ? 4.2 : 3.6}
              maxPolarAngle={Math.PI / 2 - 0.05}
            />
            <Capture apiRef={captureRef} />
          </Canvas>
        </div>
        <p className="stage-hint">Tempkite norėdami pasukti, slinkite norėdami priartinti</p>
      </div>

      <aside className="panel">
        <header>
          <h1>Sukonfigūruokite</h1>
          <p className="lede">Pasirinkite kėdę arba baro kėdę, tuomet išsirinkite medienos apdailą ir odos spalvą</p>
        </header>

        <section className="group">
          <div className="group-head">
            <h2>Modelis</h2>
            <span>{currentModel.name}, {getSize(sel.size).label}, {getBack(sel.back).name.toLowerCase()} atlošas</span>
          </div>
          <p className="sub">Modelis</p>
          <div className="options">
            {MODELS.map((mo) => (
              <Option
                key={mo.id}
                label={`${mo.name} - ${mo.kindLabel}`}
                selected={sel.model === mo.id}
                onClick={() => setTop('model', mo.id)}
              />
            ))}
          </div>
          <p className="sub">Dydis</p>
          <div className="options">
            {SIZES.map((z) => (
              <Option key={z.id} label={z.label} selected={sel.size === z.id} onClick={() => setTop('size', z.id)} />
            ))}
          </div>
          <p className="sub">Atlošas</p>
          <div className="options">
            {BACKS.map((b) => (
              <Option key={b.id} label={b.name} selected={sel.back === b.id} onClick={() => setTop('back', b.id)} />
            ))}
          </div>
        </section>

        <section className="group">
          <div className="group-head">
            <h2>Mediena</h2>
            <span>{getFinish(sel.finish).name}</span>
          </div>
          <p className="sub">Visas karkasas – kojos, sėdynės rėmas, porankiai ir atlošas pagamintas iš tos pačios medienos ir turi tą pačią apdailą.</p>
          <div className="options">
            {FINISHES.map((f) => (
              <Option
                key={f.id}
                label={f.name}
                selected={sel.finish === f.id}
                dotStyle={{ backgroundImage: `url(${woodSwatchURL(f)})` }}
                onClick={() => setTop('finish', f.id)}
              />
            ))}
          </div>
        </section>

        <section className="group">
          <div className="group-head">
            <h2>Natūrali oda</h2>
            <span>{getCushionColor(sel.cushion).name}</span>
          </div>
          <p className="sub">Spalva (natūrali oda, +40 €/vnt.)</p>
          <div className="options">
            {CUSHION_COLORS.map((c) => (
              <Option
                key={c.id}
                label={c.name}
                selected={sel.cushion === c.id}
                dotStyle={{ backgroundColor: c.hex }}
                onClick={() => setTop('cushion', c.id)}
              />
            ))}
          </div>
        </section>

        <section className="spec" aria-label="Spec sheet">
          <h2>{title}</h2>
          <dl>
            {rows.map((r) => (
              <div key={r.part} className="spec-row">
                <dt>{r.part}</dt>
                <dd>{r.main}</dd>
              </div>
            ))}
          </dl>
          <button type="button" className="btn" onClick={handleDownload}>Atsisiųskite savo kėdę</button>
          {/* <button type="button" className="btn-quiet" onClick={() => setBuildKey((k) => k + 1)}>Pakartotinai sukurti</button> */}
        </section>
      </aside>
    </div>
  );
}
