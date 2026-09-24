# Retro chair configurator (demo)

React + three.js (react-three-fiber). The chair is built in code from the manufacturer's
dimension drawing, with named parts, live material swapping, a build animation, and a PNG
export with a spec sheet.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
```

## What you can configure

- **Model:** RK1 (the dining chair) or BK1 (the bar-stool version). BK1 reuses the exact same
  arm/back/seat assembly, lifted onto taller legs with an added footrest rail -- see the note in
  `src/config.js` about the seat/footrest height assumption for BK1, since the drawing only gave
  one seat-height figure, not one per size.
- **Size:** M (58 cm wide) or L (62 cm wide). Height 80, seat 47, arm height 68, depth 59 cm.
- **Back:** wood, or upholstered (the fabric panel on the inside of the back rail).
- **Legs, seat frame, arms and back:** wood (oak, walnut) and finish, each part on its own.
- **Cushion:** material (linen, bouclé, leather, velvet) and colour. The upholstered back uses the same fabric.
- **Download image with specs:** PNG of the current view plus size, back type and materials.

## Where things are

| File | What it does |
|---|---|
| `src/config.js` | All options: woods, finishes, fabrics, colours, sizes. Edit this to add or rename options. |
| `src/chairModel.js` | The chair's dimensions and shape (metres). Numbers come from the drawing. |
| `src/geometry.js` | Shape helpers: oval tapered legs, side panels with the arch, swept arm-and-back band, seat pad. |
| `src/Chair.jsx` | Puts the parts on screen. Groups are named `legs`, `frame`, `arms`, `cushion`. |
| `src/materials.js` | Procedural wood grain and fabric materials. |
| `src/exportImage.js` | Builds the PNG: 3D view + spec band underneath. |
| `src/App.jsx` | Page layout, option panels, spec sheet, download button. |

## Ideas for next steps

- **Live price:** the price list shows oak from 495 EUR and walnut from 695 EUR, +50 EUR for the
  upholstered back. Add a `price` field to the woods and to `BACKS` in `config.js` and show the total.
- **Real wood/fabric photos:** replace the procedural textures in `materials.js` with photographed
  samples from the workshop (put images in `public/`).
- **Real 3D model:** if the workshop gets a Blender/CAD model, export it as `.glb` with objects named
  `legs`, `frame`, `arms`, `cushion` (and `back_pad` for the upholstered back), 1 unit = 1 metre.
  Load it with `useGLTF` from `@react-three/drei` and assign the materials from `materials.js`
  to each named object, exactly as `Chair.jsx` does now.
- **Embeddable build:** bundle as a single script + `<div id="chair-configurator">`, Shadow DOM for CSS isolation.
- **"Send to workshop":** POST the selection JSON + PNG to a tiny endpoint or Formspree.
