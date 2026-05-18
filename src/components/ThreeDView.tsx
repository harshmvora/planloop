import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useActiveVariation, useStore } from '../store';
import type { WallMaterial } from '../types';

// ── PBR wall materials ───────────────────────────────────────────────────────
const WALL_PBR: Record<WallMaterial, () => THREE.Material> = {
  concrete: () => new THREE.MeshStandardMaterial({ color: 0x78808a, roughness: 0.95, metalness: 0 }),
  brick:    () => new THREE.MeshStandardMaterial({ color: 0xc2622d, roughness: 0.92, metalness: 0 }),
  drywall:  () => new THREE.MeshStandardMaterial({ color: 0xd4d0c8, roughness: 0.97, metalness: 0 }),
  wood:     () => new THREE.MeshStandardMaterial({ color: 0x7c4a1e, roughness: 0.72, metalness: 0 }),
  steel:    () => new THREE.MeshStandardMaterial({ color: 0x5d7a8a, roughness: 0.18, metalness: 0.88 }),
  glass:    () => new THREE.MeshPhysicalMaterial({
    color: 0xc8eeff, roughness: 0.02, metalness: 0.0,
    transparent: true, opacity: 0.28, side: THREE.DoubleSide,
    depthWrite: false, envMapIntensity: 3,
  }),
};

// ── Geometry helpers ─────────────────────────────────────────────────────────
function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, castShadow = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = castShadow; m.receiveShadow = true;
  return m;
}

function cyl(rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 12), mat);
  m.position.set(x, y, z); m.castShadow = true;
  return m;
}

// ── Furniture builders ───────────────────────────────────────────────────────
function buildChair(color: number, isOffice: boolean): THREE.Group {
  const g = new THREE.Group();
  const upholstery = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: isOffice ? 0.25 : 0.5, metalness: isOffice ? 0.9 : 0.3 });
  g.add(box(0.5, 0.07, 0.5, upholstery, 0, 0.46, 0));
  g.add(box(0.5, 0.5, 0.07, upholstery, 0, 0.73, -0.21));
  if (isOffice) {
    g.add(cyl(0.03, 0.03, 0.35, metal, 0, 0.22, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(box(0.28, 0.03, 0.04, metal, Math.cos(a) * 0.14, 0.02, Math.sin(a) * 0.14));
    }
    g.add(cyl(0.04, 0.06, 0.04, metal, 0, 0.0, 0));
  } else {
    for (const [lx, lz] of [[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]] as [number,number][]) {
      g.add(box(0.04, 0.45, 0.04, metal, lx, 0.225, lz));
    }
  }
  g.add(box(0.05, 0.06, 0.3, upholstery, -0.25, 0.6, 0));
  g.add(box(0.05, 0.06, 0.3, upholstery,  0.25, 0.6, 0));
  return g;
}

function buildDesk(w: number, d: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 });
  const leg = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.85 });
  g.add(box(w, 0.04, d, top, 0, 0.74, 0));
  g.add(box(w - 0.1, 0.38, 0.02, leg, 0, 0.38, -(d / 2 - 0.01)));
  for (const [lx, lz] of [[w/2-0.04, d/2-0.04],[w/2-0.04,-(d/2-0.04)],[-(w/2-0.04),d/2-0.04],[-(w/2-0.04),-(d/2-0.04)]] as [number,number][]) {
    g.add(box(0.05, 0.74, 0.05, leg, lx, 0.37, lz));
  }
  return g;
}

function buildSofa(w: number, d: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const fabric = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 });
  const leg = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.4, metalness: 0.6 });
  g.add(box(w, 0.28, d * 0.6, fabric, 0, 0.26, d * 0.08));
  g.add(box(w, 0.58, d * 0.22, fabric, 0, 0.57, -(d * 0.37)));
  g.add(box(0.14, 0.46, d, fabric, -(w / 2 - 0.07), 0.38, 0));
  g.add(box(0.14, 0.46, d, fabric,  (w / 2 - 0.07), 0.38, 0));
  for (const [lx, lz] of [[w/2-0.14, d/2-0.07],[w/2-0.14,-(d/2-0.07)],[-(w/2-0.14),d/2-0.07],[-(w/2-0.14),-(d/2-0.07)]] as [number,number][]) {
    g.add(box(0.07, 0.12, 0.07, leg, lx, 0.06, lz));
  }
  return g;
}

function buildBed(w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.55, metalness: 0.3 });
  const mattress = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.97, metalness: 0 });
  const pillow = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 1, metalness: 0 });
  const duvet = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.95, metalness: 0 });
  g.add(box(w, 0.18, d, frame, 0, 0.09, 0));
  g.add(box(w - 0.06, 0.22, d - 0.1, mattress, 0, 0.32, 0.04));
  g.add(box(w - 0.06, 0.12, d * 0.55, duvet, 0, 0.44, d * 0.1));
  g.add(box(w, 0.72, 0.1, frame, 0, 0.54, -(d / 2 - 0.05)));
  const pw = w > 1.1 ? w * 0.36 : w * 0.72;
  const pCount = w > 1.1 ? 2 : 1;
  for (let i = 0; i < pCount; i++) {
    const px = pCount === 2 ? (i === 0 ? -w * 0.18 : w * 0.18) : 0;
    g.add(box(pw - 0.02, 0.09, 0.24, pillow, px, 0.45, -(d / 2 - 0.2)));
  }
  return g;
}

function buildTable(w: number, d: number, color: number, round = false): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05 });
  const leg = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35, metalness: 0.75 });
  if (round) {
    const r = Math.min(w, d) / 2;
    const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 32), top);
    topMesh.position.set(0, 0.755, 0); topMesh.castShadow = true;
    g.add(topMesh);
    g.add(cyl(0.04, 0.04, 0.74, leg, 0, 0.37, 0));
    g.add(cyl(0.3, 0.3, 0.04, leg, 0, 0.02, 0));
  } else {
    g.add(box(w, 0.05, d, top, 0, 0.755, 0));
    for (const [lx, lz] of [[w/2-0.05,d/2-0.05],[w/2-0.05,-(d/2-0.05)],[-(w/2-0.05),d/2-0.05],[-(w/2-0.05),-(d/2-0.05)]] as [number,number][]) {
      g.add(box(0.05, 0.74, 0.05, leg, lx, 0.37, lz));
    }
  }
  return g;
}

function buildWardrobe(w: number, h: number, d: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 });
  const handle = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3, metalness: 0.8 });
  g.add(box(w, h, d, body, 0, h / 2, 0));
  const doors = Math.round(w / 0.5);
  for (let i = 0; i < doors; i++) {
    const dx = -w / 2 + (i + 0.5) * (w / doors);
    g.add(box(0.008, h * 0.85, 0.012, handle, dx, h / 2, d / 2 + 0.005));
  }
  return g;
}

function buildReceptionDesk(w: number, d: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
  g.add(box(w, 1.1, 0.5, mat, 0, 0.55, -(d / 2 - 0.25)));
  g.add(box(0.5, 0.75, d, mat, w / 2 - 0.25, 0.375, 0));
  return g;
}

// ── Seated person builder ────────────────────────────────────────────────────
const SKIN_TONES  = [0xc8956c, 0xe8c49a, 0xa0694a, 0x7a4825, 0xd4a878];
const SHIRT_COLS  = [0x1e40af, 0x065f46, 0x7c2d12, 0x1e3a5f, 0x4c1d95, 0x374151, 0x155e75];
const PANTS_COL   = 0x1a2535;

function buildSeatedPerson(idx: number): THREE.Group {
  const g = new THREE.Group();
  const skin  = new THREE.MeshStandardMaterial({ color: SKIN_TONES[idx % SKIN_TONES.length], roughness: 0.85 });
  const shirt = new THREE.MeshStandardMaterial({ color: SHIRT_COLS[idx % SHIRT_COLS.length], roughness: 0.9  });
  const pants = new THREE.MeshStandardMaterial({ color: PANTS_COL, roughness: 0.85 });
  const hair  = new THREE.MeshStandardMaterial({ color: 0x120c07, roughness: 1 });

  // Chair seat top is at y ≈ 0.50 m.  Person body built in chair-local space.
  // Torso
  g.add(box(0.30, 0.44, 0.20, shirt, 0, 0.72, -0.06));
  // Neck
  g.add(box(0.10, 0.09, 0.10, skin,  0, 0.97, -0.06));
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10), skin);
  head.position.set(0, 1.12, -0.06); head.castShadow = true; g.add(head);
  // Hair cap (top hemisphere)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.130, 14, 10, 0, Math.PI * 2, 0, 1.15), hair,
  );
  hairCap.position.set(0, 1.12, -0.06); g.add(hairCap);
  // Upper arms
  g.add(box(0.09, 0.28, 0.09, shirt, -0.21, 0.77, -0.02));
  g.add(box(0.09, 0.28, 0.09, shirt,  0.21, 0.77, -0.02));
  // Forearms (resting on armrests / lap)
  g.add(box(0.07, 0.07, 0.26, skin, -0.21, 0.62, 0.10));
  g.add(box(0.07, 0.07, 0.26, skin,  0.21, 0.62, 0.10));
  // Thighs (horizontal, extending toward front of seat)
  g.add(box(0.13, 0.13, 0.40, pants, -0.10, 0.50, 0.10));
  g.add(box(0.13, 0.13, 0.40, pants,  0.10, 0.50, 0.10));
  // Shins (hanging from knees at z ≈ 0.30, down to y ≈ 0.06)
  g.add(box(0.10, 0.44, 0.10, pants, -0.10, 0.28, 0.30));
  g.add(box(0.10, 0.44, 0.10, pants,  0.10, 0.28, 0.30));
  // Feet
  g.add(box(0.10, 0.06, 0.20, skin, -0.10, 0.07, 0.38));
  g.add(box(0.10, 0.06, 0.20, skin,  0.10, 0.07, 0.38));

  return g;
}

// ── Lighting moods ───────────────────────────────────────────────────────────
type LightMood = 'golden' | 'noon' | 'overcast' | 'night';
const MOODS: Record<LightMood, { sky: number; ground: number; sunCol: number; sunInt: number; bg: number; fog: number }> = {
  golden:   { sky: 0xffe8a0, ground: 0x1a2010, sunCol: 0xffbb33, sunInt: 2.2, bg: 0x0d0a06, fog: 0.014 },
  noon:     { sky: 0xd0e8ff, ground: 0x1a2218, sunCol: 0xfff5ee, sunInt: 2.8, bg: 0x0d1117, fog: 0.018 },
  overcast: { sky: 0xb0c0d0, ground: 0x202828, sunCol: 0xe0eaff, sunInt: 0.5, bg: 0x0c1015, fog: 0.020 },
  night:    { sky: 0x101828, ground: 0x080810, sunCol: 0x3050c0, sunInt: 0.12, bg: 0x04060a, fog: 0.025 },
};

// ── Main component ────────────────────────────────────────────────────────────
export function ThreeDView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<THREE.DirectionalLight | null>(null);
  const av = useActiveVariation();
  const { isWalkMode, setWalkMode } = useStore();

  const [sunAzimuth, setSunAzimuth] = useState(45);
  const [sunElevation, setSunElevation] = useState(55);
  const [showSunPanel, setShowSunPanel] = useState(false);
  const [showCeiling, setShowCeiling] = useState(true);
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [lightMood, setLightMood] = useState<LightMood>('golden');

  // Update sun position without scene rebuild
  useEffect(() => {
    const sun = sunRef.current;
    if (!sun) return;
    const az = (sunAzimuth * Math.PI) / 180;
    const el = (sunElevation * Math.PI) / 180;
    const dist = 50;
    sun.position.set(dist * Math.sin(az) * Math.cos(el), dist * Math.sin(el), dist * Math.cos(az) * Math.cos(el));
    sun.shadow.camera.updateProjectionMatrix();
  }, [sunAzimuth, sunElevation]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const W = container.clientWidth, H = container.clientHeight;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const mood = MOODS[lightMood];
    scene.background = new THREE.Color(mood.bg);
    scene.fog = new THREE.FogExp2(mood.bg, isWalkMode ? mood.fog * 0.5 : mood.fog);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer)).texture;

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(isWalkMode ? 62 : 60, W / H, 0.05, 500);

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(mood.sky, mood.ground, 0.55));

    const sun = new THREE.DirectionalLight(mood.sunCol, mood.sunInt);
    const az0 = (sunAzimuth * Math.PI) / 180;
    const el0 = (sunElevation * Math.PI) / 180;
    sun.position.set(50 * Math.sin(az0) * Math.cos(el0), 50 * Math.sin(el0), 50 * Math.cos(az0) * Math.cos(el0));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
    sun.shadow.bias = -0.001; sun.shadow.radius = 3;
    scene.add(sun); scene.add(sun.target);
    sunRef.current = sun;

    const fill = new THREE.DirectionalLight(0x6080ff, 0.35);
    fill.position.set(-10, 10, -10);
    scene.add(fill);

    // Walk mode: add ceiling lights for interior feel
    if (isWalkMode) {
      const ambient = new THREE.PointLight(0xfff5e0, 0.8, 30);
      ambient.position.set(0, 2.5, 0);
      scene.add(ambient);
    }

    // ── Floor ─────────────────────────────────────────────────────────────────
    // When the floor plan overlay is on, use a near-white floor so the image reads cleanly
    const floorColor = showFloorPlan ? 0xf8f5f0 : (isWalkMode ? 0xc8bfb4 : 0xd6cfc4);
    const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.88, metalness: 0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    // Hide grid when floor plan overlay is active — grid lines would obscure the plan image
    if (!showFloorPlan) scene.add(new THREE.GridHelper(300, 60, 0x2a3040, 0x222a38));

    const S = av.scale; // pixels per metre

    // ── Content centering ─────────────────────────────────────────────────────
    // Compute the bounding box of all walls and furniture in metre coordinates,
    // then centre the scene on that box so the floor plan is always at the origin.
    const allX: number[] = [], allZ: number[] = [];
    av.walls.forEach(w => { allX.push(w.x1 / S, w.x2 / S); allZ.push(w.y1 / S, w.y2 / S); });
    av.items.forEach(i => { allX.push(i.x / S); allZ.push(i.y / S); });

    const cX = allX.length ? (Math.min(...allX) + Math.max(...allX)) / 2 : 0;
    const cZ = allZ.length ? (Math.min(...allZ) + Math.max(...allZ)) / 2 : 0;
    const contentW = allX.length ? Math.max(...allX) - Math.min(...allX) : 10;
    const contentD = allZ.length ? Math.max(...allZ) - Math.min(...allZ) : 10;
    const contentSpan = Math.max(contentW, contentD, 4);

    // ── Floor plan image overlay (cross-check 2D vs 3D) ─────────────────────
    let cancelled = false;
    if (showFloorPlan && av.floorPlanImage) {
      new THREE.TextureLoader().load(av.floorPlanImage, (tex) => {
        if (cancelled) { tex.dispose(); return; }
        const iW = (tex.image as HTMLImageElement).naturalWidth / S;
        const iH = (tex.image as HTMLImageElement).naturalHeight / S;
        const planMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(iW, iH),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false }),
        );
        planMesh.rotation.x = -Math.PI / 2;
        planMesh.position.set(iW / 2 - cX, 0.02, iH / 2 - cZ);
        planMesh.renderOrder = 1; // draw after floor so it's never obscured
        scene.add(planMesh);
      });
    }

    // ── Walls ─────────────────────────────────────────────────────────────────
    av.walls.forEach(wall => {
      const dx = (wall.x2 - wall.x1) / S;
      const dy = (wall.y2 - wall.y1) / S;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) return;

      const wallH = Number(wall.height) > 0 ? Number(wall.height) : 2.7;
      const thick = Math.max(wall.thickness / S, 0.04);
      const mat = WALL_PBR[wall.material ?? 'concrete']();

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, thick), mat);
      mesh.position.set(
        (wall.x1 + wall.x2) / 2 / S - cX,
        wallH / 2,
        (wall.y1 + wall.y2) / 2 / S - cZ,
      );
      mesh.rotation.y = -Math.atan2(dy, dx);
      mesh.castShadow = wall.material !== 'glass';
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // ── Furniture ─────────────────────────────────────────────────────────────
    av.items.forEach(item => {
      const w = item.width / S;
      const d = item.height / S;
      const cx = item.x / S - cX;
      const cz = item.y / S - cZ;
      const ry = -(item.rotation * Math.PI) / 180;
      const color = parseInt(item.color.replace('#', ''), 16);

      let group: THREE.Group | null = null;
      const t = item.type;

      if (t === 'office-chair' || t === 'visitor-chair') {
        group = buildChair(color, t === 'office-chair');
        group.add(buildSeatedPerson(av.items.indexOf(item)));
      } else if (t === 'chair') {
        group = buildChair(color, false);
        group.add(buildSeatedPerson(av.items.indexOf(item)));
      } else if (t === 'office-desk' || t === 'desk' || t === 'office-desk-l') {
        group = buildDesk(w, d, color);
      } else if (t === 'sofa-2' || t === 'sofa-3' || t === 'sofa-l') {
        group = buildSofa(w, d, color);
      } else if (t.startsWith('bed')) {
        group = buildBed(w, d);
      } else if (t === 'meeting-table-round') {
        group = buildTable(w, d, color, true);
      } else if (t.startsWith('meeting-table') || t.startsWith('dining')) {
        group = buildTable(w, d, color, false);
      } else if (t === 'wardrobe') {
        group = buildWardrobe(w, 2.2, d, color);
      } else if (t === 'reception-desk') {
        group = buildReceptionDesk(w, d, color);
      } else {
        let h = 0.75;
        if (t === 'refrigerator') h = 1.8;
        else if (t === 'kitchen-counter' || t === 'kitchen-island') h = 0.9;
        else if (t === 'tv-unit') h = 0.45;
        else if (t === 'toilet') h = 0.45;
        else if (t === 'bath-tub') h = 0.55;
        else if (t === 'sink') h = 0.85;
        else if (t === 'filing-cabinet') h = 1.3;
        else if (t === 'printer') h = 0.45;
        else if (t === 'whiteboard') h = 1.4;
        else if (t === 'cubicle') h = 1.5;

        const mat = new THREE.MeshStandardMaterial({
          color, roughness: 0.7,
          metalness: t === 'refrigerator' || t === 'printer' ? 0.5 : 0.05,
        });
        group = new THREE.Group();
        if (t === 'whiteboard') {
          group.add(box(w, h, 0.04, mat, 0, h / 2, 0));
          group.add(box(w - 0.06, h - 0.08, 0.01,
            new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.97, metalness: 0 }),
            0, h / 2, 0.02));
        } else {
          group.add(box(w, h, d, mat, 0, h / 2, 0));
        }
      }

      if (group) {
        group.position.set(cx, 0, cz);
        group.rotation.y = ry;
        scene.add(group);
      }
    });

    // ── Ceiling + recessed lights ─────────────────────────────────────────────
    if (showCeiling && av.walls.length > 0) {
      const ceilH = Math.max(...av.walls.map(w => (Number(w.height) > 0 ? Number(w.height) : 3.05)));
      const minX = Math.min(...allX), maxX = Math.max(...allX);
      const minZ = Math.min(...allZ), maxZ = Math.max(...allZ);
      const cW = maxX - minX + 0.4;
      const cD = maxZ - minZ + 0.4;

      // Ceiling slab (inner face visible from below)
      const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf0ece6, roughness: 0.98, metalness: 0, side: THREE.BackSide });
      const ceilMesh = new THREE.Mesh(new THREE.BoxGeometry(cW, 0.12, cD), ceilMat);
      ceilMesh.position.set((minX + maxX) / 2 - cX, ceilH + 0.06, (minZ + maxZ) / 2 - cZ);
      ceilMesh.receiveShadow = true;
      scene.add(ceilMesh);

      // Recessed LED panel fixtures on a grid (~every 2.5 m)
      const SPACING = 2.5;
      const nX = Math.max(1, Math.round(cW / SPACING));
      const nZ = Math.max(1, Math.round(cD / SPACING));
      const stepX = cW / nX, stepZ = cD / nZ;
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: new THREE.Color(0xfff8e8), emissiveIntensity: 2.5, roughness: 0.3,
      });
      for (let ix = 0; ix < nX; ix++) {
        for (let iz = 0; iz < nZ; iz++) {
          const lx = minX + stepX * (ix + 0.5) - cX;
          const lz = minZ + stepZ * (iz + 0.5) - cZ;
          // Panel mesh
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.28), panelMat);
          panel.position.set(lx, ceilH - 0.01, lz);
          scene.add(panel);
          // Warm white point light below each panel
          const pl = new THREE.PointLight(0xfff4d6, 1.8, 10, 1.5);
          pl.position.set(lx, ceilH - 0.15, lz);
          pl.castShadow = false; // many lights — skip shadow for perf
          scene.add(pl);
        }
      }
    }

    // ── Resize observer (shared) ──────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    let animId: number;

    // ── Walk mode controls ────────────────────────────────────────────────────
    if (isWalkMode) {
      const EYE = 1.52;         // eye height: 5 ft (eyes ~2 in below top of head)
      const MOVE_SPEED = 4;     // m/s
      const TURN_SPEED = 2.2;   // rad/s for arrow-key turning

      let yaw = 0;    // horizontal look angle (radians)
      let pitch = 0;  // vertical look angle (radians, clamped)

      camera.fov = 62;
      camera.updateProjectionMatrix();
      camera.position.set(0, EYE, 0);
      camera.rotation.set(0, 0, 0, 'YXZ');

      const keys = new Set<string>();
      let isDragging = false;
      let lastMouse = { x: 0, y: 0 };

      const movementKeys = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD']);

      const onKeyDown = (e: KeyboardEvent) => {
        keys.add(e.code);
        if (movementKeys.has(e.code)) e.preventDefault();
      };
      const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
      };
      const onMouseUp = () => { isDragging = false; };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        yaw -= (e.clientX - lastMouse.x) * 0.005;
        pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch - (e.clientY - lastMouse.y) * 0.005));
        lastMouse = { x: e.clientX, y: e.clientY };
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mousemove', onMouseMove);

      let lastTime = performance.now();
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        // Arrow Left/Right → turn (yaw)
        if (keys.has('ArrowLeft'))  yaw += TURN_SPEED * dt;
        if (keys.has('ArrowRight')) yaw -= TURN_SPEED * dt;

        // Forward direction in XZ plane based on current yaw
        // With 'YXZ' rotation, yaw=0 looks along -Z, so:
        //   forward = (-sin(yaw), 0, -cos(yaw))
        //   right   = ( cos(yaw), 0, -sin(yaw))
        const fX = -Math.sin(yaw), fZ = -Math.cos(yaw);
        const rX =  Math.cos(yaw), rZ = -Math.sin(yaw);

        if (keys.has('ArrowUp')   || keys.has('KeyW')) { camera.position.x += fX * MOVE_SPEED * dt; camera.position.z += fZ * MOVE_SPEED * dt; }
        if (keys.has('ArrowDown') || keys.has('KeyS')) { camera.position.x -= fX * MOVE_SPEED * dt; camera.position.z -= fZ * MOVE_SPEED * dt; }
        if (keys.has('KeyA')) { camera.position.x -= rX * MOVE_SPEED * dt; camera.position.z -= rZ * MOVE_SPEED * dt; }
        if (keys.has('KeyD')) { camera.position.x += rX * MOVE_SPEED * dt; camera.position.z += rZ * MOVE_SPEED * dt; }

        camera.position.y = EYE; // lock to floor height
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelled = true;
        cancelAnimationFrame(animId);
        ro.disconnect();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mousemove', onMouseMove);
        pmrem.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      };
    }

    // ── Orbit controls ────────────────────────────────────────────────────────
    const orbitDist = contentSpan * 0.7 + 8;
    camera.position.set(0, orbitDist * 0.45, orbitDist);
    camera.lookAt(0, 0, 0);

    let isDragging = false, isRightDrag = false;
    let lastMouse = { x: 0, y: 0 };
    let theta = 0, phi = 0.38, radius = Math.sqrt(orbitDist ** 2 + (orbitDist * 0.45) ** 2);
    const target = new THREE.Vector3(0, 0, 0);

    const updateCamera = () => {
      camera.position.set(
        target.x + radius * Math.sin(theta) * Math.cos(phi),
        target.y + radius * Math.sin(phi),
        target.z + radius * Math.cos(theta) * Math.cos(phi),
      );
      camera.lookAt(target);
    };
    updateCamera();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true; isRightDrag = e.button === 2;
      lastMouse = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
      if (isRightDrag) {
        const right = new THREE.Vector3();
        camera.getWorldDirection(right); right.cross(camera.up).normalize();
        target.addScaledVector(right, -dx * 0.015);
        target.addScaledVector(new THREE.Vector3(0, 1, 0), dy * 0.015);
      } else {
        theta -= dx * 0.008;
        phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, phi + dy * 0.008));
      }
      lastMouse = { x: e.clientX, y: e.clientY };
      updateCamera();
    };
    const onWheel = (e: WheelEvent) => {
      radius = Math.max(2, Math.min(150, radius + e.deltaY * 0.04));
      updateCamera();
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    const animate = () => { animId = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      pmrem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [av.walls, av.items, av.scale, av.floorPlanImage, isWalkMode, showCeiling, showFloorPlan, lightMood]);

  const compassLabel = (() => {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(sunAzimuth / 45) % 8];
  })();

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Mode toggle + Sun controls */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        {/* Walk / Orbit toggle */}
        <button
          onClick={() => setWalkMode(!isWalkMode)}
          className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-all shadow-lg font-medium ${
            isWalkMode
              ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 shadow-emerald-900/40'
              : 'bg-slate-800/90 border-slate-600 text-slate-300 hover:text-white'
          }`}
        >
          {isWalkMode ? '🚶 Walk Mode — ON' : '🔭 Enter Walk Mode'}
        </button>

        {/* Sun controls */}
        <button
          onClick={() => setShowSunPanel(p => !p)}
          className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-600 text-slate-300 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors shadow-lg"
        >
          ☀ Sun · {compassLabel} · {sunElevation}°
        </button>
        {showSunPanel && (
          <div className="bg-slate-800/95 border border-slate-600 rounded-lg p-3 w-56 text-xs text-slate-200 shadow-xl flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-slate-400 mb-1.5">
                <span>Direction</span>
                <span className="text-white font-medium">{compassLabel} ({sunAzimuth}°)</span>
              </div>
              <div className="relative w-28 h-28 mx-auto mb-1">
                <div className="w-full h-full rounded-full border-2 border-slate-600 relative">
                  {['N','E','S','W'].map((d, i) => {
                    const a = i * 90, r = 48;
                    const x = 50 + r * Math.sin((a * Math.PI) / 180);
                    const y = 50 - r * Math.cos((a * Math.PI) / 180);
                    return <span key={d} className="absolute text-[10px] text-slate-400 -translate-x-1/2 -translate-y-1/2 font-medium" style={{ left: `${x}%`, top: `${y}%` }}>{d}</span>;
                  })}
                  {(() => {
                    const r = 42;
                    const x = 50 + r * Math.sin((sunAzimuth * Math.PI) / 180);
                    const y = 50 - r * Math.cos((sunAzimuth * Math.PI) / 180);
                    return <div className="absolute w-4 h-4 rounded-full bg-amber-400 border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow-lg" style={{ left: `${x}%`, top: `${y}%` }} />;
                  })()}
                </div>
              </div>
              <input type="range" min={0} max={359} value={sunAzimuth}
                onChange={e => setSunAzimuth(Number(e.target.value))} className="w-full accent-amber-400" />
            </div>
            <div>
              <div className="flex justify-between text-slate-400 mb-1.5">
                <span>Elevation</span>
                <span className="text-white font-medium">{sunElevation}°</span>
              </div>
              <input type="range" min={5} max={85} value={sunElevation}
                onChange={e => setSunElevation(Number(e.target.value))} className="w-full accent-amber-400" />
              <div className="flex justify-between text-slate-500 text-[10px] mt-0.5">
                <span>Sunrise</span><span>Midday</span><span>High</span>
              </div>
            </div>
            <div className="border-t border-slate-700 pt-2 flex gap-1 flex-wrap">
              {([['Morning', 80, 25],['Noon', 180, 75],['Evening', 260, 20],['Night', 0, 8]] as [string,number,number][]).map(([label, az, el]) => (
                <button key={label} onClick={() => { setSunAzimuth(az); setSunElevation(el); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-1.5 py-1 rounded text-[10px] transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scene toggles */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <button
          onClick={() => setShowCeiling(v => !v)}
          className={`flex items-center gap-1.5 text-xs border px-2.5 py-1 rounded-lg transition-all shadow ${
            showCeiling ? 'bg-slate-700 border-slate-500 text-slate-200' : 'bg-slate-900/80 border-slate-700 text-slate-500'
          }`}
        >
          ▣ Ceiling {showCeiling ? 'ON' : 'OFF'}
        </button>
        {av.floorPlanImage && (
          <button
            onClick={() => setShowFloorPlan(v => !v)}
            className={`flex items-center gap-1.5 text-xs border px-2.5 py-1 rounded-lg transition-all shadow ${
              showFloorPlan ? 'bg-blue-700 border-blue-500 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-500'
            }`}
          >
            ⊞ Show Plan {showFloorPlan ? 'ON' : 'OFF'}
          </button>
        )}

        {/* Lighting mood presets */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-1.5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 px-0.5 uppercase tracking-wider font-semibold">Lighting</span>
          <div className="grid grid-cols-2 gap-1">
            {([
              ['golden',   '🌅', 'Golden'],
              ['noon',     '☀',  'Noon'],
              ['overcast', '☁',  'Overcast'],
              ['night',    '🌙', 'Night'],
            ] as [LightMood, string, string][]).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => setLightMood(id)}
                className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors ${
                  lightMood === id
                    ? 'bg-amber-600 text-white border border-amber-500'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/70 text-slate-400 text-xs px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
        {isWalkMode
          ? '↑↓ / W S — walk forward/back  ·  ← → / turn  ·  A D — strafe  ·  drag mouse — look'
          : 'Left drag — orbit  ·  Right drag — pan  ·  Scroll — zoom'
        }
      </div>

      {av.walls.length === 0 && av.items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-slate-500 text-sm text-center">
            Add walls and furniture in 2D view<br/>to see them here in 3D
          </p>
        </div>
      )}
    </div>
  );
}
