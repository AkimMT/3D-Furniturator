// All options live here. To add a finish or a leather colour, edit this file only.

// The whole wooden frame (legs, seat frame, arms and back) is one piece of wood in one
// finish -- there is no separate colour per part. Base/grain colours are sampled from
// the client's own "wood types" photo so the render matches it.
export const FINISHES = [
  { id: 'walnut-natural', name: 'Natūralus riešutas', base: '#6b4a32', grain: '#3c2818' },
  { id: 'oak-natural',    name: 'Natūralus ąžuolas',  base: '#b08a55', grain: '#7a5c34' },
  { id: 'oak-dark',       name: 'Tamsintas ąžuolas',  base: '#7a5a34', grain: '#4a3620' },
  { id: 'oak-black',      name: 'Juodas ąžuolas',     base: '#232221', grain: '#0e0e0d' },
];

// The cushion (and, on the upholstered back, the back pad) is always leather.
// Colours and hex values sampled from the client's "Natūrali oda" swatch sheet.
export const CUSHION_COLORS = [
  { id: 'misty',     name: 'Misty',     hex: '#cbbdb9' },
  { id: 'betulla',   name: 'Betulla',   hex: '#d2c2a9' },
  { id: 'mastic',    name: 'Mastic',    hex: '#a7977e' },
  { id: 'mocca',     name: 'Mocca',     hex: '#766958' },
  { id: 'lever',     name: 'Lever',     hex: '#574f44' },
  { id: 'moss',      name: 'Moss',      hex: '#4e4c3f' },
  { id: 'avorio',    name: 'Avorio',    hex: '#d6d0b7' },
  { id: 'bianco',    name: 'Bianco',    hex: '#f9faf6' },
  { id: 'nebbia',    name: 'Nebbia',    hex: '#c4c2b5' },
  { id: 'perle',     name: 'Perle',     hex: '#a5a89c' },
  { id: 'purewhite', name: 'Purewhite', hex: '#fcfcfa' },
  { id: 'khaki',     name: 'Khaki',     hex: '#746e62' },
  { id: 'smog',      name: 'Smog',      hex: '#5a584e' },
  { id: 'antracite', name: 'Antracite', hex: '#373b37' },
  { id: 'nero',      name: 'Nero',      hex: '#202624' },
  { id: 'polar',     name: 'Polar',     hex: '#d8c8a3' },
  { id: 'kalahari',  name: 'Kalahari',  hex: '#b8a177' },
  { id: 'camel',     name: 'Camel',     hex: '#936d45' },
  { id: 'espresso',  name: 'Espresso',  hex: '#41362d' },
  { id: 'caffe',     name: 'Caffe',     hex: '#2d2e28' },
  { id: 'sabbia',    name: 'Sabbia',    hex: '#a06836' },
  { id: 'cotto',     name: 'Cotto',     hex: '#8e4024' },
  { id: 'natur',     name: 'Natur',     hex: '#7b4731' },
  { id: 'terra',     name: 'Terra',     hex: '#693c2d' },
  { id: 'pacific',   name: 'Pacific',   hex: '#24282b' },
  { id: 'marine',    name: 'Marine',    hex: '#26333b' },
  { id: 'kobalt',    name: 'Kobalt',    hex: '#273555' },
  { id: 'whale',     name: 'Whale',     hex: '#374a50' },
  { id: 'turquoise', name: 'Turquoise', hex: '#1e4456' },
  { id: 'skyblue',   name: 'Skyblue',   hex: '#7ba7d1' },
];

// From the dimension drawings: overall width in metres. Same M/L widths for both models.
export const SIZES = [
  { id: 'M', name: 'M', width: 0.58, label: 'M (58 cm pločio)' },
  { id: 'L', name: 'L', width: 0.62, label: 'L (62 cm pločio)' },
];

export const BACKS = [
  { id: 'wood',        name: 'Standartinis' },
  { id: 'upholstered', name: 'Medžiaginis' },
];

// Two models sharing the same design: RK1 is the dining chair, BK1 is the bar-stool
// version, with longer legs and an added footrest rail. The bar-stool drawing labels
// seat height (66 cm) and footrest height (25 cm) only once, not separately per M/L,
// so both sizes use those same figures here -- only the width changes between M and L,
// same as on the drawing. If the real M and L bar stools have different seat heights,
// give seatHeight/footrestHeight per size instead of one value for the model.
export const MODELS = [
  { id: 'RK1', name: 'RK1', kindLabel: 'Kėdė',     kind: 'chair' },
  { id: 'BK1', name: 'BK1', kindLabel: 'Baro kėdė', kind: 'stool', seatHeight: 0.66, footrestHeight: 0.25 },
];

export const DEFAULT_SELECTION = {
  model: 'RK1',
  size: 'M',
  back: 'wood',
  finish: 'oak-dark',
  cushion: 'terra',
};

export const CHAIR_NAME = 'Retro chair';

const byId = (list, id) => list.find((x) => x.id === id);
export const getFinish = (id) => byId(FINISHES, id);
export const getCushionColor = (id) => byId(CUSHION_COLORS, id);
export const getSize = (id) => byId(SIZES, id);
export const getBack = (id) => byId(BACKS, id);
export const getModel = (id) => byId(MODELS, id);
