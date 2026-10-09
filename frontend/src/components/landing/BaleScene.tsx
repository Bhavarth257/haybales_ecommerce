'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/*
 * Desktop-only hero scene: clay-like round straw bales floating around the headline.
 * Loaded lazily by HeroArt, so `three` never reaches phones.
 * Motion: springs only (critically damped for pointer/scroll, slightly under-damped for the entrance).
 */

type Props = { onReady?: () => void; onFail?: () => void };

type Item = {
  mesh: THREE.Mesh;
  base: THREE.Vector3;
  rot: THREE.Euler;
  scale: number;
  phase: number;
  period: number;
  amp: number;
  spin: THREE.Vector3; // rotation added as the hero scrolls out
  delay: number;
  // spring state
  enter: Spring;
  pushX: Spring;
  pushY: Spring;
};

type Spring = { x: number; v: number };
const spring = (): Spring => ({ x: 0, v: 0 });

const PALETTE = {
  straw: '#d9a43b',
  strawSoft: '#f6e7c4',
  field: '#2f5d34',
  fieldStrong: '#234828',
  ember: '#b4432b',
};

/** Fine straw fibres. Bands run along U, so a lathe bale shows wrapped straw on its side and rings on its faces. */
function strawTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e9c172';
  g.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tones = ['#d09a3c', '#c58f34', '#f2d48e', '#f8e3ae', '#ddb057'];
  for (let i = 0; i < 300; i++) {
    const y = rnd() * 512;
    g.strokeStyle = tones[Math.floor(rnd() * tones.length)];
    g.globalAlpha = 0.18 + rnd() * 0.3;
    g.lineWidth = 0.6 + rnd() * 2.4;
    g.beginPath();
    g.moveTo(0, y);
    const w = rnd() * 3;
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin((x / 512) * Math.PI * 2 * 2) * w);
    g.stroke();
  }
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const len = 8 + rnd() * 34;
    const a = (rnd() - 0.5) * 0.25;
    g.strokeStyle = tones[Math.floor(rnd() * tones.length)];
    g.globalAlpha = 0.3 + rnd() * 0.5;
    g.lineWidth = 0.5 + rnd() * 1.2;
    for (const off of [0, -512]) {
      g.beginPath();
      g.moveTo(x + off, y);
      g.lineTo(x + off + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = 4;
  return tex;
}

/** Round bale: a cylinder with soft, rounded rims, built as a lathe so the faces get concentric straw rings. */
function baleGeometry(): THREE.LatheGeometry {
  const r = 1;
  const h = 0.82;
  const e = 0.22;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector2(0.001 + ((r - e) * i) / 10, -h));
  for (let i = 1; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - e + Math.cos(a) * e, -h + e + Math.sin(a) * e));
  }
  for (let i = 1; i < 12; i++) pts.push(new THREE.Vector2(r, -h + e + ((2 * (h - e)) * i) / 12));
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - e + Math.cos(a) * e, h - e + Math.sin(a) * e));
  }
  for (let i = 1; i <= 10; i++) pts.push(new THREE.Vector2(r - e - ((r - e) * i) / 10 + 0.001, h));
  const geo = new THREE.LatheGeometry(pts, 56);
  geo.computeVertexNormals();
  return geo;
}

// [x, y, z, scale, rotX, rotY, rotZ]: composed around the centre, big bale slightly right of middle.
const BALES: number[][] = [
  [0.7, 0.2, 0.2, 1.45, 1.25, 0.55, 0],
  [-2.7, 2.3, -1.6, 0.72, 0.2, 0.4, 1.3],
  [3.3, 2.7, -2.2, 0.82, 1.0, -0.6, 0.2],
  [-2.2, -2.0, 0.9, 0.86, 0.1, 0.9, 1.5],
  [3.0, -1.9, 1.1, 0.76, 1.4, -0.2, 0.5],
  [-3.9, -0.1, -2.6, 0.52, 0.9, 0.3, 0.2],
  [0.1, 3.5, -3.2, 0.56, 0.3, 0.8, 1.1],
  [4.5, 0.5, -1.2, 0.56, 1.6, 0.4, 0],
  [-0.8, -3.3, -1.1, 0.5, 1.2, -0.7, 0.3],
  [1.9, -3.5, -2.6, 0.42, 0.4, 0.2, 1.4],
  [-4.6, 2.9, -4.2, 0.46, 1.1, 0.5, 0.6],
  [4.3, -4.1, -1.8, 0.44, 0.2, -0.4, 1.2],
];

export default function BaleScene({ onReady, onFail }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef({ onReady, onFail });
  useEffect(() => {
    cbRef.current = { onReady, onFail };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      cbRef.current.onFail?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // Lighting: warm soft key from top-left, warm hemisphere fill, low bounce from below, cool-free rim.
    scene.add(new THREE.HemisphereLight('#fff8ea', '#e2c98f', 1.6));
    const key = new THREE.DirectionalLight('#fff1d6', 2.3);
    key.position.set(-5, 8, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 4;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.03;
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
    scene.add(key);
    const bounce = new THREE.DirectionalLight('#f6d48a', 0.7);
    bounce.position.set(3, -6, 4);
    scene.add(bounce);
    const rim = new THREE.DirectionalLight('#fff4dc', 0.9);
    rim.position.set(6, 3, -6);
    scene.add(rim);

    const tex = strawTexture();
    const baleGeo = baleGeometry();
    const baleMats = ['#ffffff', '#f4e2bd', '#ffe9c2'].map(
      (tint, i) =>
        new THREE.MeshStandardMaterial({ color: tint, map: tex, bumpMap: tex, bumpScale: 0.7, roughness: 0.82 + i * 0.05, metalness: 0 }),
    );

    const items: Item[] = [];
    const add = (mesh: THREE.Mesh, p: number[], i: number) => {
      const [x, y, z, s, rx, ry, rz] = p;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      scene.add(mesh);
      const out = new THREE.Vector3(x, y + 1.2, z * 0.3).normalize();
      items.push({
        mesh,
        base: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(rx, ry, rz),
        scale: s,
        phase: i * 1.7,
        period: 6 + ((i * 37) % 5),
        amp: 0.08 + ((i * 13) % 5) * 0.025,
        spin: new THREE.Vector3(out.y * 1.2, out.x * 1.6, (i % 2 ? 1 : -1) * 0.8),
        delay: i * 0.055,
        enter: spring(),
        pushX: spring(),
        pushY: spring(),
      });
    };
    BALES.forEach((p, i) => add(new THREE.Mesh(baleGeo, baleMats[i % 3]), p, i));

    // Clay accents: field green carries the brand, ember appears once.
    const clay = (color: string, rough = 0.62) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
    const accents: [THREE.BufferGeometry, THREE.Material, number[]][] = [
      [new THREE.SphereGeometry(1, 48, 32), clay(PALETTE.field), [-1.5, 0.9, 1.7, 0.4, 0, 0, 0]],
      [new THREE.TorusGeometry(1, 0.36, 32, 64), clay(PALETTE.fieldStrong), [2.5, 1.3, 1.6, 0.42, 0.6, -0.5, 0]],
      [new RoundedBoxGeometry(1, 1, 1, 5, 0.22), clay(PALETTE.field, 0.7), [-3.9, -3.3, 0.6, 0.58, 0.5, 0.7, 0.2]],
      [new THREE.SphereGeometry(1, 40, 28), clay(PALETTE.ember, 0.55), [-0.3, -1.5, 2.5, 0.2, 0, 0, 0]],
      [new RoundedBoxGeometry(1, 1, 1, 5, 0.3), clay(PALETTE.strawSoft, 0.75), [1.6, 2.6, 0.8, 0.5, 0.3, 0.9, 0.4]],
    ];
    accents.forEach(([geo, mat, p], i) => add(new THREE.Mesh(geo, mat), p, BALES.length + i));

    // --- sizing ---------------------------------------------------------------
    let width = 1;
    let height = 1;
    const resize = () => {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      // Fit a ~5.4 x 4.9 half-extent composition in whichever axis is tighter.
      camera.userData.dist = Math.max(5.1 / (t * camera.aspect), 4.7 / t);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // --- input ----------------------------------------------------------------
    const pointer = { x: 0, y: 0, active: false };
    const ndc = new THREE.Vector2(9, 9);
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.active = true;
      const r = host.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    };
    const onLeave = () => {
      pointer.active = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    // --- springs ----------------------------------------------------------------
    // Critically damped unless stated: omega = 2*pi/response.
    const step = (sp: Spring, target: number, response: number, zeta: number, dt: number) => {
      const w = (2 * Math.PI) / response;
      sp.v += (-w * w * (sp.x - target) - 2 * zeta * w * sp.v) * dt;
      sp.x += sp.v * dt;
    };
    const camX = spring();
    const camY = spring();
    const scroll = spring();

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    const tmp = new THREE.Vector2();

    // --- loop -------------------------------------------------------------------
    let raf = 0;
    let last = 0;
    let time = 0;
    let first = true;
    let visible = true;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      time += dt;

      // Scroll progress across the first ~90% of a viewport; smoothed so trackpad steps don't stutter.
      const target = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9)));
      step(scroll, target, 0.45, 1, dt);
      const s = scroll.x;
      const se = s * s * (3 - 2 * s);

      // Camera eases toward the pointer (parallax: nearer bales shift more).
      step(camX, pointer.active ? pointer.x : 0, 1.1, 1, dt);
      step(camY, pointer.active ? pointer.y : 0, 1.1, 1, dt);
      const dist = camera.userData.dist as number;
      camera.position.set(camX.x * 1.4, 0.6 + camY.x * 0.9, dist);
      camera.lookAt(0, 0.1 - se * 0.6, 0);

      // Pointer on the z=0 plane, used to nudge nearby forms away.
      let px = 99;
      let py = 99;
      if (pointer.active && Math.abs(ndc.x) < 1.6 && Math.abs(ndc.y) < 1.6) {
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.ray.intersectPlane(plane, hit)) {
          px = hit.x;
          py = hit.y;
        }
      }

      for (const it of items) {
        const te = time > it.delay + 0.15 ? 1 : 0;
        step(it.enter, te, 0.9, 0.72, dt);

        const float = Math.sin((time * 2 * Math.PI) / it.period + it.phase) * it.amp;
        const sway = Math.sin((time * 2 * Math.PI) / (it.period * 1.6) + it.phase) * 0.06;

        tmp.set(it.base.x + it.pushX.x - px, it.base.y + it.pushY.x - py);
        const d = tmp.length();
        const reach = 2.4 * Math.max(0.6, it.scale);
        const f = d < reach ? (1 - d / reach) ** 2 * 0.9 : 0;
        if (d > 0.0001) tmp.multiplyScalar(f / d);
        else tmp.set(0, 0);
        step(it.pushX, tmp.x, 0.7, 1, dt);
        step(it.pushY, tmp.y, 0.7, 1, dt);
        const pxo = it.pushX.x;
        const pyo = it.pushY.x;

        // Scroll scatter: away from centre and upward, deeper bales lag behind.
        const depth = 1 + it.base.z * 0.12;
        const k = se * depth;
        const e = Math.max(0, it.enter.x);
        it.mesh.position.set(
          it.base.x * (1 + k * 0.45) + pxo,
          it.base.y * (1 + k * 0.3) + float + pyo + k * 3.2 - (1 - e) * 1.2,
          it.base.z + k * 1.2,
        );
        it.mesh.rotation.set(
          it.rot.x + it.spin.x * se + sway + pyo * 0.35,
          it.rot.y + it.spin.y * se + sway * 0.7 - pxo * 0.35,
          it.rot.z + it.spin.z * se,
        );
        it.mesh.scale.setScalar(it.scale * e);
      }

      renderer.render(scene, camera);
      if (first) {
        first = false;
        cbRef.current.onReady?.();
      }
    };

    const start = () => {
      if (raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(host);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
      cbRef.current.onFail?.();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      tex.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className="pointer-events-none h-full w-full" />;
}
