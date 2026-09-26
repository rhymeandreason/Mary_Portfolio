/* Desk plant — a small procedural 3D plant in the bottom-right corner.
   A new plant every visit. Hover to rustle the leaves, click to water it;
   it grows a little each time and blooms on the third watering. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const W = 380, H = 380;          // canvas size in CSS px
const POT_SCALE = 0.74;          // pot size relative to the plant

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function main() {
  if (window.innerWidth < 700) return;

  /* ── Stage ─────────────────────────────────────────────── */
  const wrap = document.createElement('div');
  wrap.id = 'plant';
  wrap.style.cssText = `position:fixed; right:10px; bottom:4px; width:${W}px; height:${H}px; pointer-events:none; z-index:40;`;
  const tip = document.createElement('div');
  tip.className = 'plant-tip';
  wrap.appendChild(tip);
  document.body.appendChild(wrap);

  const style = document.createElement('style');
  style.textContent = `
    html.plant-hover, html.plant-hover * { cursor: pointer !important; }
    .plant-tip { position: absolute; left: 50%; padding: 6px 11px 7px; border-radius: 14px; background: #fff; color: #3d3a36;
      font-size: 13px; font-style: italic; letter-spacing: 0.01em; white-space: nowrap;
      box-shadow: 0 3px 10px rgba(0,0,0,0.10); opacity: 0; transform: translate(-50%, 6px) rotate(-3deg) scale(0.9);
      transition: opacity .2s, transform .25s cubic-bezier(.2,1.6,.4,1); }
    .plant-tip::after { content: ''; position: absolute; left: 44%; bottom: -5px; width: 10px; height: 10px; background: #fff;
      border-radius: 0 0 3px 0; transform: rotate(45deg); }
    .plant-tip.on { opacity: 1; transform: translate(-50%, 0) rotate(-3deg) scale(1); animation: plant-bob 2.4s ease-in-out .3s infinite; }
    @keyframes plant-bob { 50% { transform: translate(-50%, -3px) rotate(-2deg) scale(1); } }`;
  document.head.appendChild(style);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  wrap.insertBefore(renderer.domElement, tip);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(21, W / H, 0.1, 50);
  camera.position.set(0, 2.3, 9.4);
  camera.lookAt(0, 1.45, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xf3d9c4, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(3, 6, 5);
  scene.add(sun);

  // Three-step toon ramp: soft, illustrated shading.
  const ramp = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra });

  /* ── Palettes ──────────────────────────────────────────── */
  const POTS = ['#e8795a', '#f4a3b8', '#f6c945', '#4f6bed', '#63c7a2', '#b79cf2', '#ff8f4d', '#f2efe6'];
  const ACCENTS = ['#ffffff', '#1f2a44', '#ffd23f', '#ff6f91', '#3c8dde'];
  const GREENS = ['#3aa655', '#2f8f5b', '#6cc24a', '#1f7a55', '#4bb36b'];
  const PETALS = ['#ff6fa3', '#ff8c61', '#ffd23f', '#b388ff', '#ffffff', '#ff4f6d'];
  const CANS = ['#5ab0f0', '#f2b33d', '#e8697d', '#6cc4a1', '#9b8cf2'];

  // ?plant=leafy|snake|succulent picks one; otherwise it's a surprise.
  const asked = new URLSearchParams(location.search).get('plant');
  const kind = ['leafy', 'snake', 'succulent'].includes(asked) ? asked : pick(['leafy', 'leafy', 'snake', 'succulent']);
  const potColor = pick(POTS);
  const accent = pick(ACCENTS.filter(c => c !== potColor));

  /* ── Pot ───────────────────────────────────────────────── */
  const pot = new THREE.Group();
  scene.add(pot);
  const bowl = kind === 'succulent' && Math.random() < 0.6;
  const pr = bowl ? { b: 0.5, t: 0.72, h: 0.62 } : { b: rand(0.4, 0.48), t: rand(0.58, 0.66), h: rand(0.8, 0.9) };
  const rimH = rand(0.1, 0.16);
  const body = [
    [0.001, 0], [pr.b, 0], [pr.b + 0.03, 0.04],
    [pr.t, pr.h - rimH], [pr.t + 0.04, pr.h - rimH + 0.01], [pr.t + 0.04, pr.h + 0.02],
    [pr.t - 0.03, pr.h + 0.03], [pr.t - 0.06, pr.h - 0.08],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const potMat = toon(potColor, { side: THREE.DoubleSide });
  pot.add(new THREE.Mesh(new THREE.LatheGeometry(body, 40), potMat));
  const soilTop = pr.h - 0.05;
  pot.scale.setScalar(POT_SCALE);
  const SOIL_Y = soilTop * POT_SCALE; // top of the soil, in scene units

  const pattern = pick(['plain', 'rim', 'stripes', 'dots']);
  const accentMat = toon(accent);
  // Outer wall radius at height y, matching the lathe profile above.
  const radiusAt = y => (pr.b + 0.03) + (pr.t - pr.b - 0.03) * clamp((y - 0.04) / (pr.h - rimH - 0.04), 0, 1);
  if (pattern === 'rim') {
    const rim = [[pr.t + 0.045, pr.h - rimH + 0.005], [pr.t + 0.045, pr.h + 0.025]].map(([x, y]) => new THREE.Vector2(x, y));
    pot.add(new THREE.Mesh(new THREE.LatheGeometry(rim, 40), toon(accent, { side: THREE.DoubleSide })));
  } else if (pattern === 'stripes') {
    [0.25, 0.4].forEach(f => {
      const y = (pr.h - rimH) * f;
      const band = new THREE.Mesh(new THREE.TorusGeometry(radiusAt(y) + 0.004, 0.022, 6, 40), accentMat);
      band.rotation.x = Math.PI / 2; band.position.y = y;
      pot.add(band);
    });
  } else if (pattern === 'dots') {
    const dot = new THREE.SphereGeometry(0.035, 10, 8);
    for (let i = 0; i < 14; i++) {
      const y = rand(0.12, pr.h - rimH - 0.08), a = rand(0, Math.PI * 2), r = radiusAt(y);
      const m = new THREE.Mesh(dot, accentMat);
      m.position.set(Math.sin(a) * r, y, Math.cos(a) * r); m.scale.z = 0.4;
      m.lookAt(0, y, 0);
      pot.add(m);
    }
  }

  // A face, some of the time.
  const face = Math.random() < 0.5 && pattern !== 'dots';
  const eyes = [];
  if (face) {
    const ink = toon('#1d1b1a');
    const fy = (pr.h - rimH) * 0.52, r = radiusAt(fy);
    [-1, 1].forEach(s => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), ink);
      e.position.set(s * 0.15, fy, r - 0.005); e.scale.z = 0.5;
      pot.add(e); eyes.push(e);
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), toon('#ff8fa8'));
      blush.position.set(s * 0.27, fy - 0.08, radiusAt(fy - 0.08) - 0.01); blush.scale.set(1, 0.55, 0.3);
      pot.add(blush);
    });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 6, 16, Math.PI), ink);
    smile.position.set(0, fy - 0.07, radiusAt(fy - 0.07) + 0.005); smile.rotation.z = Math.PI;
    pot.add(smile);
  }

  // Soil, with a few pebbles.
  const soilMat = toon('#8a5a3b');
  const soil = new THREE.Mesh(new THREE.CircleGeometry(radiusAt(soilTop) - 0.01, 32), soilMat);
  soil.rotation.x = -Math.PI / 2; soil.position.y = soilTop;
  pot.add(soil);
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(rand(0.03, 0.05), 8, 6), toon(pick(['#d8d2c8', '#bdb6aa', '#efe9df'])));
    const a = rand(0, Math.PI * 2), r = rand(0.15, 0.4);
    p.position.set(Math.sin(a) * r, soilTop + 0.01, Math.cos(a) * r); p.scale.y = 0.6;
    pot.add(p);
  }

  // Soft contact shadow.
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sg = sc.getContext('2d'), grd = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(60,40,20,0.35)'); grd.addColorStop(1, 'rgba(60,40,20,0)');
  sg.fillStyle = grd; sg.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; shadow.scale.setScalar(0.85);
  scene.add(shadow);

  /* ── Leaves ────────────────────────────────────────────── */
  // A leaf is a small grid lying along +x, facing up; folded at the midrib and drooping at the tip.
  function leafGeometry({ len, wid, profile, fold = 0.25, droop = 0.3, twist = 0, curl = 0, wave = 0, phase = 0, color }) {
    const N = 14, M = 8, pos = [], col = [], uv = [], idx = [];
    const c = new THREE.Color();
    for (let i = 0; i <= N; i++) {
      const t = i / N, w = wid * profile(t);
      for (let j = 0; j <= M; j++) {
        const u = j / M * 2 - 1;
        // Soft cup across the blade, an arch along it, one edge rolling more than the other, and a wavy margin.
        let x = len * t, z = u * w;
        let y = fold * w * (0.35 * Math.abs(u) + 0.65 * u * u) - droop * len * t * t
          + curl * w * u * Math.abs(u) + wave * w * Math.sin(t * Math.PI * 2.5 + phase) * u * u;
        const a = twist * t, cy = y * Math.cos(a) - z * Math.sin(a), cz = y * Math.sin(a) + z * Math.cos(a);
        pos.push(x, cy, cz);
        uv.push(t, (u + 1) / 2);
        if (color) { color(c, t, u); col.push(c.r, c.g, c.b); }
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + M + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (color) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  const leafMat = toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide });
  const stemMat = toon('#4d9a4a');

  const baseGreen = new THREE.Color(pick(GREENS));

  /* ── Calathea leaves ───────────────────────────────────── */
  // Each leaf's pattern is painted onto a small canvas in leaf space:
  // x runs base → tip, y runs edge → midrib → edge.
  const LW = 256, LH = 128;
  const X = t => t * LW, Y = u => (u + 1) / 2 * LH;
  const shade = (hex, l) => '#' + new THREE.Color(hex).offsetHSL(rand(-0.015, 0.015), 0, l).getHexString();
  function stroke(g, color, width, pts) {
    g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); pts.forEach(([t, u], i) => (i ? g.lineTo(X(t), Y(u)) : g.moveTo(X(t), Y(u)))); g.stroke();
  }
  function blob(g, color, t, u, rx, ry, rot) {
    g.save(); g.translate(X(t), Y(u)); g.rotate(rot); g.fillStyle = color;
    g.beginPath(); g.ellipse(0, 0, rx * LW, ry * LH, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // Lateral veins leave the midrib and sweep toward the tip.
  const lateral = (t0, side, reach = 1, sweep = 0.13) => [[t0, 0], [t0 + sweep * 0.45, side * reach * 0.55], [t0 + sweep, side * reach]];
  const PATTERNS = {
    // Calathea makoyana: pale leaf, dark feathered blotches in alternating sizes.
    peacock(g) {
      g.fillStyle = shade('#c8df98', 0); g.fillRect(0, 0, LW, LH);
      const dark = shade('#2f6a3c', 0);
      for (let i = 0; i < 10; i++) {
        const t = 0.08 + i * 0.088, big = i % 2 === 0;
        [-1, 1].forEach(s => {
          stroke(g, dark, 1.5, lateral(t, s));
          blob(g, dark, t + 0.045, s * (big ? 0.42 : 0.3), big ? 0.034 : 0.022, big ? 0.3 : 0.2, s * 0.35);
        });
      }
      stroke(g, dark, 7, [[0, -1], [1, -1]]); stroke(g, dark, 7, [[0, 1], [1, 1]]);
      stroke(g, shade('#e7f0c4', 0), 3, [[0, 0], [1, 0]]);
    },
    // Calathea ornata: deep green with paired pink pinstripes.
    pinstripe(g) {
      g.fillStyle = shade('#1f4733', 0); g.fillRect(0, 0, LW, LH);
      const ink = pick(['#f4a9c6', '#f7c6d6', '#f1ede2']);
      for (let i = 0; i < 8; i++) {
        const t = 0.12 + i * 0.095;
        [-1, 1].forEach(s => [0, 0.022].forEach(o => stroke(g, ink, 1.6, lateral(t + o, s, 0.78, 0.11).slice(0).map(([a, b], k) => [a, k ? b : s * 0.14]))));
      }
      stroke(g, shade('#2d5c41', 0.05), 2.5, [[0, 0], [1, 0]]);
    },
    // Calathea lancifolia: light green, dark ovals alternating along the midrib.
    rattlesnake(g) {
      g.fillStyle = shade('#b7d67c', 0); g.fillRect(0, 0, LW, LH);
      const dark = shade('#34603a', 0);
      for (let i = 0; i < 11; i++) {
        const t = 0.07 + i * 0.08, s = i % 2 ? 1 : -1;
        blob(g, dark, t, s * 0.34, 0.03, 0.2, 0);
        blob(g, dark, t + 0.04, -s * 0.2, 0.016, 0.1, 0);
      }
      stroke(g, dark, 9, [[0, -1], [1, -1]]); stroke(g, dark, 9, [[0, 1], [1, 1]]);
      stroke(g, shade('#6f9a4a', 0), 2, [[0, 0], [1, 0]]);
    },
    // Calathea roseopicta: dark leaf, a feathered pink or silver band tracing the edge.
    medallion(g) {
      g.fillStyle = shade('#2a5443', 0); g.fillRect(0, 0, LW, LH);
      const band = pick(['#eef2e4', '#f2a6bd', '#e8efe0']), sage = shade('#9cc0a0', 0);
      for (let t = 0.06; t < 0.95; t += 0.016) {
        [-1, 1].forEach(s => {
          stroke(g, sage, 2.6, [[t, 0], [t + 0.035, s * (0.3 + 0.12 * Math.sin(t * 40))]]); // feathered center
          stroke(g, band, 2.2, [[t, s * 0.62], [t + 0.03, s * 0.76]]);                        // band near the edge
        });
      }
      stroke(g, shade('#7a3a4c', 0), 2.5, [[0, 0], [1, 0]]);
    },
    // Maranta: green, red herringbone veins, a lime feather down the middle.
    herringbone(g) {
      g.fillStyle = shade('#5b9844', 0); g.fillRect(0, 0, LW, LH);
      const lime = shade('#c2e07a', 0), red = pick(['#d8344f', '#e0486a']), dark = shade('#2e5d2f', 0);
      for (let t = 0.05; t < 0.95; t += 0.02) [-1, 1].forEach(s => stroke(g, lime, 3, [[t, 0], [t + 0.02, s * 0.3]]));
      for (let i = 0; i < 9; i++) {
        const t = 0.08 + i * 0.1;
        [-1, 1].forEach(s => {
          stroke(g, red, 2, lateral(t, s, 1, 0.12));
          blob(g, dark, t + 0.07, s * 0.72, 0.022, 0.12, s * 0.4);
        });
      }
      stroke(g, red, 3, [[0, 0], [1, 0]]);
    },
    // Calathea zebrina: bright green with bold dark bands.
    zebra(g) {
      g.fillStyle = shade('#86c56c', 0); g.fillRect(0, 0, LW, LH);
      const dark = shade('#2f6a3d', 0);
      for (let i = 0; i < 12; i++) [-1, 1].forEach(s => stroke(g, dark, i % 2 ? 4 : 6, lateral(0.06 + i * 0.075, s, 1, 0.1)));
      stroke(g, shade('#cfeaa4', 0), 4, [[0, 0], [1, 0]]);
    },
    // Plain burgundy leaves, for mixing in.
    burgundy(g) {
      g.fillStyle = shade('#6d2946', 0); g.fillRect(0, 0, LW, LH);
      const vein = shade('#8e3d60', 0);
      for (let i = 0; i < 9; i++) [-1, 1].forEach(s => stroke(g, vein, 1.4, lateral(0.08 + i * 0.1, s)));
      stroke(g, shade('#a14a6e', 0), 2.5, [[0, 0], [1, 0]]);
    },
  };
  const texCache = {};
  function leafTexture(name) {
    // A few variants per pattern, shared between leaves.
    const key = name + Math.floor(Math.random() * 3);
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = LW; c.height = LH;
    PATTERNS[name](c.getContext('2d'));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return (texCache[key] = tex);
  }

  // ?leaf=peacock|pinstripe|rattlesnake|medallion|herringbone|zebra picks the pattern.
  const askedLeaf = new URLSearchParams(location.search).get('leaf');
  const calathea = PATTERNS[askedLeaf] && askedLeaf !== 'burgundy' ? askedLeaf : pick(Object.keys(PATTERNS).filter(k => k !== 'burgundy'));
  const mixBurgundy = ['herringbone', 'medallion', 'peacock'].includes(calathea) && Math.random() < 0.4;
  const underside = toon(['herringbone', 'zebra'].includes(calathea) ? '#9fc07e' : pick(['#7a3556', '#8a3f62']));
  const petioleMat = toon(['herringbone', 'pinstripe'].includes(calathea) || mixBurgundy ? '#b45a72' : '#6f9a4e');
  // Leaf outline: width is half-width as a fraction of length. Ovals taper into the stem and come to a point.
  const leafShape = calathea === 'rattlesnake'
    ? { len: [0.62, 0.85], wid: [0.19, 0.22], profile: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.9)), 0.7) * (1 + 0.07 * Math.sin(t * 30)) }
    : { len: [0.55, 0.75], wid: [0.3, 0.36], profile: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.95) };

  const plant = new THREE.Group();
  plant.position.y = SOIL_Y;
  scene.add(plant);
  const fronds = [];   // everything that sways: { pivot, ax, az, vx, vz, flex, phase }
  const pops = [];     // scale-in animations

  function addFrond(azimuth, build, { flex = 1, offset = 0.12 } = {}) {
    const holder = new THREE.Group();
    holder.rotation.y = azimuth;
    holder.position.set(Math.sin(azimuth) * offset, 0, Math.cos(azimuth) * offset);
    const pivot = new THREE.Group();
    holder.add(pivot);
    build(pivot);
    plant.add(holder);
    const f = { holder, pivot, ax: 0, az: 0, vx: 0, vz: 0, flex, phase: rand(0, 6) };
    fronds.push(f);
    return f;
  }

  // Spread calathea stems toward the sides, so the plant fans out wide rather than tall.
  const fanAzimuth = az => Math.atan2(Math.sin(az) * 0.35, Math.cos(az));
  const VIEW = new THREE.Vector3(0, 0.25, 1).normalize(), Y_AXIS = new THREE.Vector3(0, 1, 0);
  // Leaves are planned before they're built, so each one can find a spot that doesn't
  // run through its neighbors. A leaf's footprint is a capsule down its midrib.
  const placedLeaves = [];
  function planLeaf(az, rank, { fan = true, young = false } = {}) {
    // rank 0 = young leaf in the middle (tall, upright); 1 = old outer leaf (low, spreading).
    if (fan) az = fanAzimuth(az);
    // Like a calathea: the top leaf nearly upright, lower leaves arching out to level or a little below.
    const h = young ? rand(0.85, 1.05) : THREE.MathUtils.lerp(0.95, 0.22, rank) + rand(-0.12, 0.12);
    const out = young ? rand(0, 0.06) : THREE.MathUtils.lerp(0.05, 0.42, rank) + rand(-0.08, 0.08);
    const tilt = young ? rand(1.3, 1.5) : THREE.MathUtils.lerp(1.35, -0.25, rank) + rand(-0.3, 0.3);
    const len = rand(...leafShape.len) * THREE.MathUtils.lerp(0.85, 1.1, rank) * (young ? 0.6 : rand(0.8, 1.15));
    const wid = young ? 0.09 * len : rand(...leafShape.wid) * len;
    const dir = new THREE.Vector3(Math.cos(tilt), Math.sin(tilt), rand(-0.1, 0.1)).normalize();
    const end = new THREE.Vector3(out, h, 0);
    // Into plant space: the frond's holder sits a little off-center and turns by az.
    const base = new THREE.Vector3(Math.sin(az) * 0.12, 0, Math.cos(az) * 0.12);
    const toPlant = v => v.applyAxisAngle(Y_AXIS, az).add(base);
    const a = toPlant(end.clone().addScaledVector(dir, len * 0.12));
    const b = toPlant(end.clone().addScaledVector(dir, len * 0.88));
    return { az, rank, young, h, out, tilt, len, wid, dir, end, a, b, r: wid * 0.8 };
  }
  // Closest distance between two midrib segments, sampled.
  const _p = new THREE.Vector3(), _q = new THREE.Vector3();
  function leafGap(p, q) {
    let d = Infinity;
    for (let i = 0; i <= 6; i++) {
      _p.lerpVectors(p.a, p.b, i / 6);
      for (let j = 0; j <= 6; j++) d = Math.min(d, _p.distanceTo(_q.lerpVectors(q.a, q.b, j / 6)));
    }
    return d;
  }
  function leafyFrond(az, grow = false, rank = Math.random(), opts = {}) {
    // Try nearby placements and keep the first that touches nothing (or the least crowded one).
    let plan = null, best = Infinity;
    for (let k = 0; k < 30 && best > 0; k++) {
      const p = planLeaf(k ? az + rand(-1, 1) : az, k ? clamp(rank + rand(-0.3, 0.3), 0, 1) : rank, opts);
      const crowd = placedLeaves.reduce((c, q) => c + Math.max(0, p.r + q.r - leafGap(p, q)), 0);
      if (crowd < best) { best = crowd; plan = p; }
    }
    placedLeaves.push(plan);
    return buildLeaf(plan, grow);
  }
  function buildLeaf({ az, rank, young, h, out, tilt, len, wid, dir, end }, grow) {
    const pattern = mixBurgundy && Math.random() < 0.3 ? 'burgundy' : calathea;
    const f = addFrond(az, pivot => {
      // The stem rises, then bends into the leaf's direction so the midrib carries on from it.
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(out * 0.1, h * 0.55, 0),
        end.clone().addScaledVector(dir, -h * 0.35), end,
      );
      pivot.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.015, 5), petioleMat));
      const geo = young
        // A new leaf still unfurling: narrow and rolled up tight.
        ? leafGeometry({ len, wid, profile: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.6), fold: -1.6, droop: 0.02 })
        : leafGeometry({
          len, wid, profile: leafShape.profile,
          fold: rand(-0.45, -0.25),                                    // edges cup toward the face
          droop: Math.random() < 0.75 ? rand(-0.45, -0.22) : rand(0.15, 0.3), // tip arches back (sometimes forward)
          curl: rand(-0.3, 0.3), wave: rand(0.08, 0.2), phase: rand(0, 6), twist: rand(-0.35, 0.35),
        });
      const leaf = new THREE.Group();
      leaf.add(new THREE.Mesh(geo, toon('#ffffff', { map: leafTexture(pattern), side: THREE.FrontSide })));
      leaf.add(new THREE.Mesh(geo, toon(underside.color, { side: THREE.BackSide })));
      leaf.position.copy(end);
      // Its face is partly turned toward the room, the way a potted plant grows toward the light.
      // (Blade geometry: length +x, face −y.)
      const toViewer = VIEW.clone().applyAxisAngle(Y_AXIS, -az);
      const natural = new THREE.Vector3(Math.sin(tilt), -Math.cos(tilt), 0);
      const face = natural.lerp(toViewer, 0.7);
      face.addScaledVector(dir, -face.dot(dir)).normalize();
      const down = face.clone().negate(), side = new THREE.Vector3().crossVectors(dir, down);
      leaf.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, down, side));
      pivot.add(leaf);
    });
    if (grow) { f.holder.scale.setScalar(0.001); pops.push({ obj: f.holder, t: 0, dur: 0.8, to: 1 }); }
    return f;
  }

  function snakeBlade(az, grow = false) {
    const len = rand(1.0, 1.7), lean = rand(0.04, 0.3);
    const edge = new THREE.Color(Math.random() < 0.6 ? '#e6d45a' : '#bfe39a');
    const band = baseGreen.clone().offsetHSL(0, 0, -0.12), pale = baseGreen.clone().offsetHSL(0, -0.1, 0.12);
    const f = addFrond(az, pivot => {
      const blade = new THREE.Mesh(leafGeometry({
        len, wid: rand(0.09, 0.13),
        profile: t => (t < 0.8 ? 0.75 + 0.25 * Math.sin(t * 3.4) : Math.max(0.05, (1 - t) / 0.2)),
        fold: 0.35, droop: 0, twist: rand(-0.6, 0.6),
        color: (c, t, u) => {
          if (Math.abs(u) > 0.78) c.copy(edge);
          else c.copy(Math.sin(t * 40 + u * 3) > 0.2 ? band : pale); // tiger banding
        },
      }), leafMat);
      blade.rotation.z = Math.PI / 2 - lean;
      pivot.add(blade);
    }, { flex: 0.6, offset: rand(0.05, 0.2) });
    if (grow) { f.holder.scale.setScalar(0.001); pops.push({ obj: f.holder, t: 0, dur: 0.9, to: 1 }); }
    return f;
  }

  const tipColor = new THREE.Color(pick(['#ff8fb1', '#ff9f6b', '#c79bff', '#ffd1dc']));
  const plump = (() => {
    const g = new THREE.SphereGeometry(1, 14, 10), p = g.attributes.position, col = [];
    const sage = baseGreen.clone().offsetHSL(0.03, -0.25, 0.15), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { c.copy(sage).lerp(tipColor, clamp((p.getZ(i) - 0.35) / 0.65, 0, 1)); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  })();
  const plumpMat = toon('#ffffff', { vertexColors: true });

  function succulentLeaf(i, n) {
    const k = i / n, len = 0.14 + k * 0.32;
    const tilt = 1.25 - k * 1.05;
    addFrond(i * 2.39996, pivot => {
      const m = new THREE.Mesh(plump, plumpMat);
      m.scale.set(0.07 + k * 0.08, 0.05 + k * 0.03, len / 2);
      m.position.z = len / 2;
      pivot.add(m);
      pivot.rotation.x = -tilt;
    }, { flex: 0.35, offset: 0 });
  }

  if (kind === 'leafy') {
    // Leaves alternate left and right on their way down, with a few set forward or back.
    const n = Math.floor(rand(6, 9)), first = Math.random() < 0.5 ? 0 : Math.PI;
    for (let i = 0; i < n; i++) leafyFrond(first + (i % 2) * Math.PI + rand(-0.8, 0.8), false, rand(0, 1));
    // A few strays at any angle, some leaning toward you, some behind, so the fan isn't too tidy.
    const strays = Math.floor(rand(2, 5));
    for (let i = 0; i < strays; i++) leafyFrond(rand(0, Math.PI * 2), false, rand(0.2, 1), { fan: false });
    if (Math.random() < 0.5) leafyFrond(rand(0, Math.PI * 2), false, 0, { young: true });
  } else if (kind === 'snake') {
    const n = Math.floor(rand(5, 8));
    for (let i = 0; i < n; i++) snakeBlade(i / n * Math.PI * 2 + rand(-0.4, 0.4));
  } else {
    const n = Math.floor(rand(22, 32));
    for (let i = n - 1; i >= 0; i--) succulentLeaf(i, n);
    plant.position.y = SOIL_Y + 0.02;
  }
  // Succulent leaves keep their own tilt; remember it so the springs add to it.
  fronds.forEach(f => { f.bx = f.pivot.rotation.x; f.bz = f.pivot.rotation.z; });

  /* ── Flowers (on the third watering) ───────────────────── */
  const petal = PETALS.filter(c => c !== potColor);
  function flower(color, size = 1) {
    const g = new THREE.Group(), pm = toon(color);
    const n = Math.random() < 0.5 ? 5 : 6;
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), pm);
      const a = i / n * Math.PI * 2;
      p.scale.set(0.075 * size, 0.022 * size, 0.045 * size);
      p.position.set(Math.cos(a) * 0.065 * size, 0, Math.sin(a) * 0.065 * size);
      p.rotation.y = -a;
      g.add(p);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.035 * size, 10, 8), toon(color === '#ffd23f' ? '#ff8c61' : '#ffd23f'));
    center.position.y = 0.012;
    g.add(center);
    return g;
  }
  let bloomed = false;
  function bloom() {
    bloomed = true;
    const count = kind === 'succulent' ? 1 : Math.floor(rand(2, 4));
    const color = pick(petal);
    for (let i = 0; i < count; i++) {
      const h = kind === 'succulent' ? rand(0.9, 1.1) : rand(1.05, 1.4) * (kind === 'snake' ? 1.1 : 1);
      const lean = rand(0.1, 0.35);
      const f = addFrond(rand(0, Math.PI * 2), pivot => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.2, h * 0.5, 0), new THREE.Vector3(lean, h, 0),
        ]);
        pivot.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.014, 5), stemMat));
        const heads = kind === 'succulent' ? 3 : 1;
        for (let j = 0; j < heads; j++) {
          const fl = flower(color, kind === 'succulent' ? 0.6 : 1);
          fl.position.copy(curve.getPoint(1 - j * 0.12)).add(new THREE.Vector3(0, 0.02, j ? rand(-0.06, 0.06) : 0));
          fl.rotation.set(rand(-0.3, 0.3), rand(0, 6), rand(-0.3, 0.3));
          fl.scale.setScalar(0.001);
          pops.push({ obj: fl, t: -0.5 - i * 0.2 - j * 0.15, dur: 0.6, to: 1 });
          pivot.add(fl);
        }
      }, { flex: 0.8, offset: rand(0.05, 0.2) });
      f.bx = f.bz = 0;
      f.holder.scale.set(1, 0.001, 1);
      pops.push({ obj: f.holder, t: -i * 0.2, dur: 0.7, to: 1, axis: 'y' });
    }
  }

  /* ── Watering can ──────────────────────────────────────── */
  const can = new THREE.Group();
  const canMat = toon(pick(CANS.filter(c => c !== potColor)));
  const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.29, 0.46, 24), canMat);
  can.add(canBody);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.05, 20), toon('#ffffff'));
  lid.position.y = 0.25; can.add(lid);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 8, 20, Math.PI), canMat);
  handle.position.set(0.05, 0.26, 0); can.add(handle);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.62, 10), canMat);
  spout.position.set(-0.42, 0.06, 0); spout.rotation.z = 0.95; can.add(spout);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.04, 0.07, 14), toon('#ffffff'));
  const TIP = new THREE.Vector3(-0.67, 0.25, 0);
  rose.position.copy(TIP); rose.rotation.z = 0.95; can.add(rose);
  can.visible = false;
  scene.add(can);

  // Shower: thin streaks fanning out of the rose, plus tiny splashes on the soil.
  const streakGeo = new THREE.CylinderGeometry(0.007, 0.007, 1, 4);
  const streakMat = new THREE.MeshBasicMaterial({ color: '#7cc8f5', transparent: true, opacity: 0.7 });
  const splashGeo = new THREE.SphereGeometry(0.014, 6, 4);
  const drops = [], splashes = [];
  const UP = new THREE.Vector3(0, 1, 0), SPOUT_DIR = new THREE.Vector3(-0.813, 0.582, 0), dir = new THREE.Vector3();
  const potR = radiusAt(soilTop) * POT_SCALE;

  /* ── Interaction ───────────────────────────────────────── */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovering = false, pressed = false, last = null;
  let waterings = 0, pour = null, wet = 0;
  const messages = ['Water me', 'More please', 'Almost…', 'Thriving', 'So happy'];

  const hitTest = (x, y) => {
    const r = renderer.domElement.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
    ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects([plant, pot], true).length > 0;
  };
  function impulse(mag) {
    fronds.forEach(f => { f.vx += rand(-1, 1) * mag * f.flex; f.vz += rand(-1, 1) * mag * f.flex; });
  }
  function showTip(on) {
    tip.classList.toggle('on', on && !pour);
    if (!on) return;
    tip.textContent = messages[Math.min(waterings, messages.length - 1)];
    placeTip();
  }
  // Keep the bubble just above the leaves, even while the plant is growing.
  const tipBox = new THREE.Box3(), tipTop = new THREE.Vector3();
  function placeTip() {
    tipBox.setFromObject(plant);
    tipTop.set(0, tipBox.max.y + 0.08, 0).project(camera);
    tip.style.top = Math.max(0, (1 - tipTop.y) / 2 * H - 34) + 'px';
  }

  document.addEventListener('pointermove', e => {
    if (e.buttons) return; // mid-drag or mid-pan elsewhere
    const over = hitTest(e.clientX, e.clientY);
    if (over && !hovering) impulse(2.2);
    if (over && last) impulse(Math.min(1.2, Math.hypot(e.clientX - last.x, e.clientY - last.y) * 0.06));
    last = over ? { x: e.clientX, y: e.clientY } : null;
    if (over !== hovering) {
      hovering = over;
      document.documentElement.classList.toggle('plant-hover', over);
      showTip(over);
    }
  }, { passive: true });
  // The plant sits on top of everything, so it claims its own clicks.
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !hitTest(e.clientX, e.clientY)) return;
    pressed = true;
    e.stopPropagation(); e.preventDefault();
    water();
  }, true);
  document.addEventListener('click', e => { if (pressed) { pressed = false; e.stopPropagation(); e.preventDefault(); } }, true);

  function water() {
    if (pour) { impulse(1.5); return; }
    const box = new THREE.Box3().setFromObject(plant);
    const tipY = clamp(Math.max(box.max.y, SOIL_Y + 0.6) + 0.25, 1.6, 2.55);
    pour = { t: 0, x: 0.2 + 0.69, y: tipY + 0.22, poured: false };
    can.position.set(pour.x, pour.y, 0.2);
    can.rotation.set(0, -0.35, 0);
    can.scale.setScalar(0.001);
    can.visible = true;
    showTip(false);
  }

  function afterPour() {
    waterings++;
    growTo = Math.min(1.35, growTo + 0.07);
    impulse(3);
    if (waterings === 3 && !bloomed) { bloom(); window.sfx && window.sfx('check'); }
    if (waterings > 3 && waterings <= 7) {
      if (kind === 'leafy') leafyFrond(rand(0, Math.PI * 2), true, rand(0, 0.3)); // new leaves come up in the middle
      if (kind === 'snake') snakeBlade(rand(0, Math.PI * 2), true);
    }
  }

  /* ── Animation ─────────────────────────────────────────── */
  let growTo = 1, grow = 0.001, time = 0, blinkAt = rand(2, 5);
  pops.push({ obj: plant, t: -0.2, dur: 0.9, to: 1, raw: true }); // first appearance
  const clock = new THREE.Clock();
  const tipWorld = new THREE.Vector3();
  const dryColor = new THREE.Color('#8a5a3b'), wetColor = new THREE.Color('#4b2f20');

  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    time += dt;

    // Growth and pop-ins.
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += dt;
      const k = easeOutBack(clamp(p.t / p.dur, 0, 1)) * p.to;
      if (p.raw) grow = Math.max(0.001, k);
      else if (p.axis === 'y') p.obj.scale.y = Math.max(0.001, k);
      else p.obj.scale.setScalar(Math.max(0.001, k));
      if (p.t >= p.dur) pops.splice(i, 1);
    }
    if (!pops.some(p => p.raw)) grow += (growTo - grow) * Math.min(1, dt * 2.5);
    plant.scale.setScalar(grow);

    // Leaves on springs, plus a slow idle sway.
    fronds.forEach(f => {
      f.vx += (-90 * f.ax - 5 * f.vx) * dt; f.ax += f.vx * dt;
      f.vz += (-90 * f.az - 5 * f.vz) * dt; f.az += f.vz * dt;
      const sway = Math.sin(time * 1.1 + f.phase) * 0.02 * f.flex;
      f.pivot.rotation.x = (f.bx || 0) + f.ax + sway;
      f.pivot.rotation.z = (f.bz || 0) + f.az + sway * 0.6;
    });

    // Blink.
    if (eyes.length) {
      blinkAt -= dt;
      const closed = pour && pour.t > 0.5 && pour.t < 2.2; // content while being watered
      const s = closed ? 0.15 : (blinkAt < 0 ? 0.1 : 1);
      if (blinkAt < -0.12) blinkAt = rand(2.5, 6);
      eyes.forEach(e => { e.scale.y += (s - e.scale.y) * Math.min(1, dt * 25); });
    }

    // Watering.
    if (pour) {
      pour.t += dt;
      const t = pour.t;
      const appear = easeOutBack(clamp(t / 0.35, 0, 1)), leave = 1 - clamp((t - 2.35) / 0.25, 0, 1);
      can.scale.setScalar(Math.max(0.001, appear * leave));
      const tilt = t < 0.45 ? 0 : t < 0.75 ? (t - 0.45) / 0.3 : t < 2.0 ? 1 : 1 - clamp((t - 2.0) / 0.3, 0, 1);
      can.rotation.z = tilt * 0.7 + Math.sin(t * 6) * 0.02;
      can.position.y = pour.y + Math.sin(t * 3) * 0.02;
      if (t > 0.72 && t < 2.0) {
        can.updateMatrixWorld();
        tipWorld.copy(TIP).applyMatrix4(can.matrixWorld);
        dir.copy(SPOUT_DIR).transformDirection(can.matrixWorld);
        for (let k = 0; k < 5; k++) {
          const d = new THREE.Mesh(streakGeo, streakMat);
          d.position.copy(tipWorld).add(new THREE.Vector3(rand(-0.05, 0.05), rand(-0.05, 0.05), rand(-0.05, 0.05)));
          d.userData.v = dir.clone().multiplyScalar(rand(0.5, 0.9)).add(new THREE.Vector3(rand(-0.22, 0.22), rand(-0.1, 0.1), rand(-0.22, 0.22)));
          scene.add(d); drops.push(d);
        }
      }
      if (t > 1.1 && !pour.poured) { pour.poured = true; afterPour(); }
      if (t > 2.6) { pour = null; can.visible = false; if (hovering) showTip(true); }
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], v = d.userData.v;
      v.y -= 7 * dt;
      d.position.addScaledVector(v, dt);
      d.quaternion.setFromUnitVectors(UP, dir.copy(v).normalize()); // streak along its fall
      d.scale.y = clamp(v.length() * 0.05, 0.04, 0.14);
      const inPot = Math.hypot(d.position.x, d.position.z) < potR;
      if (d.position.y < SOIL_Y + 0.01 && inPot || d.position.y < 0) {
        if (inPot) {
          wet = Math.min(1, wet + 0.006);
          if (Math.random() < 0.25) {
            const sp = new THREE.Mesh(splashGeo, streakMat);
            sp.position.set(d.position.x, SOIL_Y + 0.01, d.position.z);
            sp.userData.v = new THREE.Vector3(rand(-0.4, 0.4), rand(0.5, 0.9), rand(-0.4, 0.4));
            scene.add(sp); splashes.push(sp);
          }
        }
        scene.remove(d); drops.splice(i, 1);
      }
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const sp = splashes[i], v = sp.userData.v;
      v.y -= 7 * dt;
      sp.position.addScaledVector(v, dt);
      if (sp.position.y < SOIL_Y) { scene.remove(sp); splashes.splice(i, 1); }
    }
    wet = Math.max(0, wet - dt / 30);
    soilMat.color.copy(dryColor).lerp(wetColor, wet);

    if (tip.classList.contains('on')) placeTip();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('resize', () => { wrap.style.display = window.innerWidth < 700 ? 'none' : ''; });
}

try { main(); } catch (err) { console.warn('desk plant:', err); }
