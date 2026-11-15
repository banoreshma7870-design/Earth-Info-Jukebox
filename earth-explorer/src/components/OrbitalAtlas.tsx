// src/components/OrbitalAtlas.tsx
// Fullscreen 3D satellite tracker overlay.
// Opens when user clicks "Launch Sat View" in App.tsx topbar.
// Dependencies already installed: three@^0.187.0

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Satellite as SatIcon, X, Pause, Play, Rewind, FastForward, Eye, EyeOff } from "lucide-react";
import "./OrbitalAtlas.css";

// ============================================================
// SATELLITE FLEET DATA
// ============================================================

interface SatData {
  id: string;
  name: string;
  agency: string;
  flag: "india" | "us" | "intl";
  color: string;
  altKm: number;
  inclinationDeg: number;
  periodMin: number;
  type: string;
  operator: string;
  launched: string;
  mass: string;
  task: string;
  target: string;
  shape: "cartosat" | "iss" | "landsat" | "navic" | "goes" | "sentinel";
}

const FLEET: SatData[] = [
  {
    id: "cartosat3",
    name: "Cartosat-3",
    agency: "ISRO · India",
    flag: "india",
    color: "#ff9933",
    altKm: 509,
    inclinationDeg: 97.5,
    periodMin: 95,
    type: "SSO",
    operator: "ISRO",
    launched: "27 Nov 2019",
    mass: "1625 kg",
    task: "Sub-metre earth imaging · 25cm resolution · urban/defence/mapping · data to NRSC Hyderabad",
    target: "South Asia swath",
    shape: "cartosat",
  },
  {
    id: "iss",
    name: "ISS Zarya",
    agency: "NASA/Roscosmos",
    flag: "intl",
    color: "#f59e0b",
    altKm: 408,
    inclinationDeg: 51.6,
    periodMin: 92.7,
    type: "LEO",
    operator: "Multinational",
    launched: "20 Nov 1998",
    mass: "450,000 kg",
    task: "Human-crewed research platform · 250+ ongoing experiments · 7 crew",
    target: "Variable low-latitude",
    shape: "iss",
  },
  {
    id: "landsat9",
    name: "Landsat-9",
    agency: "NASA · USA",
    flag: "us",
    color: "#22c55e",
    altKm: 705,
    inclinationDeg: 98.2,
    periodMin: 99,
    type: "SSO",
    operator: "NASA/USGS",
    launched: "27 Sep 2021",
    mass: "2623 kg",
    task: "Global land surface imaging · OLI-2 + TIRS-2 · 16-day repeat cycle",
    target: "Global land swath",
    shape: "landsat",
  },
  {
    id: "navic",
    name: "NavIC (IRNSS-1F)",
    agency: "ISRO · India",
    flag: "india",
    color: "#ff6b35",
    altKm: 36000,
    inclinationDeg: 5,
    periodMin: 1436,
    type: "GSO",
    operator: "ISRO",
    launched: "10 Mar 2016",
    mass: "1425 kg",
    task: "Regional navigation over India · L5/S-band · <20m positioning",
    target: "Indian region",
    shape: "navic",
  },
  {
    id: "goes18",
    name: "GOES-18",
    agency: "NOAA/NASA",
    flag: "us",
    color: "#fbbf24",
    altKm: 35786,
    inclinationDeg: 0.1,
    periodMin: 1436,
    type: "GEO",
    operator: "NOAA",
    launched: "01 Mar 2022",
    mass: "5192 kg",
    task: "Continuous West Pacific weather monitoring · ABI 16-band imager",
    target: "Pacific hemisphere",
    shape: "goes",
  },
  {
    id: "sentinel2a",
    name: "Sentinel-2A",
    agency: "ESA · Copernicus",
    flag: "intl",
    color: "#22d3ee",
    altKm: 786,
    inclinationDeg: 98.6,
    periodMin: 100.6,
    type: "SSO",
    operator: "ESA",
    launched: "23 Jun 2015",
    mass: "1140 kg",
    task: "Multispectral vegetation + coastal imaging · 13 bands · 10m resolution",
    target: "Global 5-day revisit",
    shape: "sentinel",
  },
];

const EARTH_RADIUS = 100;
const KM_PER_UNIT = 63.71;

interface OrbitalAtlasProps {
  onClose: () => void;
}

export default function OrbitalAtlas({ onClose }: OrbitalAtlasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState("cartosat3");
  const [playing, setPlaying] = useState(true);
  const [timeSpeed, setTimeSpeed] = useState(1000);
  const [showOrbits, setShowOrbits] = useState(true);
  const [labelPositions, setLabelPositions] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});

  const stateRef = useRef({ playing, timeSpeed, showOrbits, selectedId });
  stateRef.current = { playing, timeSpeed, showOrbits, selectedId };

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Three.js scene
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100000);
    camera.position.set(0, 100, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 150;
    controls.maxDistance = 3000;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0x6b7a9e, 0.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(500, 200, 400);
    scene.add(sun);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(2500 * 3);
    for (let i = 0; i < 2500; i++) {
      const r = 5000;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos[3 * i] = r * Math.sin(p) * Math.cos(t);
      starPos[3 * i + 1] = r * Math.sin(p) * Math.sin(t);
      starPos[3 * i + 2] = r * Math.cos(p);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaaccff, size: 1.5, transparent: true, opacity: 0.7 })));

    // Earth
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const earthMat = new THREE.MeshPhongMaterial({ color: 0x1a3a6c, shininess: 15, specular: new THREE.Color(0x333366) });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 128, 128), earthMat);
    earthGroup.add(earth);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const tryLoad = (urls: string[], idx: number, onTex: (t: THREE.Texture) => void) => {
      if (idx >= urls.length) return;
      loader.load(
        urls[idx],
        (t) => { t.colorSpace = THREE.SRGBColorSpace; onTex(t); },
        undefined,
        () => tryLoad(urls, idx + 1, onTex)
      );
    };

    tryLoad(
      [
        "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/textures/planets/earth_atmos_2048.jpg",
        "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      ],
      0,
      (t) => { earthMat.map = t; earthMat.needsUpdate = true; }
    );

    tryLoad(
      ["https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/textures/planets/earth_specular_2048.jpg"],
      0,
      (t) => { earthMat.specularMap = t; earthMat.needsUpdate = true; }
    );

    tryLoad(
      ["https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/textures/planets/earth_normal_2048.jpg"],
      0,
      (t) => { earthMat.normalMap = t; earthMat.normalScale.set(0.8, 0.8); earthMat.needsUpdate = true; }
    );

    // Night lights
    const nightMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const nightMesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.001, 128, 128), nightMat);
    earthGroup.add(nightMesh);
    tryLoad(
      ["https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/textures/planets/earth_lights_2048.png"],
      0,
      (t) => { nightMat.map = t; nightMat.opacity = 0.5; nightMat.needsUpdate = true; }
    );

    // Clouds
    const cloudsMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.55, depthWrite: false });
    const cloudsMesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.008, 128, 128), cloudsMat);
    earthGroup.add(cloudsMesh);
    tryLoad(
      ["https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/textures/planets/earth_clouds_1024.png"],
      0,
      (t) => { cloudsMat.map = t; cloudsMat.alphaMap = t; cloudsMat.needsUpdate = true; }
    );

    // Atmosphere glow
    const atmMat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0x4a9eff) } },
      vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; uniform vec3 glowColor; void main() { float i = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); gl_FragColor = vec4(glowColor, 1.0) * i; }`,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.04, 64, 64), atmMat));

    // Satellite factories
    const body = (w: number, h: number, d: number, c: number) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhongMaterial({ color: c, shininess: 60 }));
    const panel = (w: number, h: number, c: number) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhongMaterial({ color: c, side: THREE.DoubleSide, shininess: 50 }));
    const dish = (r: number, c: number) => new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.3, r * 0.3, 16, 1, true), new THREE.MeshPhongMaterial({ color: c, side: THREE.DoubleSide, shininess: 80 }));

    const factories: Record<string, () => THREE.Group> = {
      cartosat: () => {
        const g = new THREE.Group();
        const b = body(3, 3, 5, 0xe8d5a0);
        const p1 = panel(8, 2.5, 0x14213d); p1.position.x = 6; p1.rotation.y = Math.PI / 2;
        const p2 = panel(8, 2.5, 0x14213d); p2.position.x = -6; p2.rotation.y = Math.PI / 2;
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.5, 16), new THREE.MeshPhongMaterial({ color: 0x1a1a1a }));
        lens.position.y = -2.5; lens.rotation.x = Math.PI / 2;
        g.add(b, p1, p2, lens); return g;
      },
      iss: () => {
        const g = new THREE.Group();
        g.add(body(14, 1, 1.2, 0xaaaaaa));
        const m1 = body(2.5, 2, 4, 0xe4e4e7); m1.position.set(-1.5, 0, 0);
        const m2 = body(2.5, 2, 4, 0xd4d4d8); m2.position.set(1.5, 0, 0);
        g.add(m1, m2);
        for (let i = 0; i < 4; i++) {
          const w = panel(5, 10, 0x1e2d4f);
          w.position.set((i < 2 ? 1 : -1) * 10, 0, ((i % 2) ? 1 : -1) * 5);
          g.add(w);
        }
        return g;
      },
      landsat: () => {
        const g = new THREE.Group();
        g.add(body(3, 4, 5, 0xe4e4e7));
        const arr = panel(11, 4, 0x14213d); arr.position.y = 4; g.add(arr);
        const inst = body(2, 1.5, 3, 0x9ca3af); inst.position.y = -2.5; g.add(inst);
        return g;
      },
      navic: () => {
        const g = new THREE.Group();
        g.add(body(2.5, 2.5, 3, 0xe8d5a0));
        const p1 = panel(6, 2, 0x14213d); p1.position.x = 4; p1.rotation.y = Math.PI / 2;
        const p2 = panel(6, 2, 0x14213d); p2.position.x = -4; p2.rotation.y = Math.PI / 2;
        const ant = dish(2, 0xf59e0b); ant.position.y = -2.2; ant.rotation.x = Math.PI;
        g.add(p1, p2, ant); return g;
      },
      goes: () => {
        const g = new THREE.Group();
        g.add(body(3, 3, 4, 0xe4e4e7));
        const p = panel(9, 3, 0x14213d); p.position.z = 5.5; p.rotation.x = Math.PI / 2;
        const d = dish(2.5, 0xd1d5db); d.position.y = -2.5; d.rotation.x = Math.PI;
        g.add(p, d); return g;
      },
      sentinel: () => {
        const g = new THREE.Group();
        g.add(body(3, 3, 5, 0xe4e4e7));
        const p1 = panel(7, 2.5, 0x1e2d4f); p1.position.set(5.5, 0, 0); p1.rotation.y = Math.PI / 2;
        const inst = body(1.5, 1.5, 3.5, 0x9ca3af); inst.position.y = -2.5;
        g.add(p1, inst); return g;
      },
    };

    const altToUnits = (km: number) => {
      if (km < 2000) return EARTH_RADIUS + km / KM_PER_UNIT;
      if (km < 10000) return EARTH_RADIUS + 50 + km / 200;
      return EARTH_RADIUS * 3.5 + Math.log(km) * 8;
    };

    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const sats: Array<{ data: SatData; mesh: THREE.Group; radius: number; inclination: number; angle: number; speed: number }> = [];

    FLEET.forEach((sat, i) => {
      const radius = altToUnits(sat.altKm);
      const inclRad = THREE.MathUtils.degToRad(sat.inclinationDeg);
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const pts = curve.getPoints(128);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const orbit = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({ color: sat.color, transparent: true, opacity: 0.25 }));
      orbit.rotation.x = Math.PI / 2 + (inclRad - Math.PI / 2);
      orbitGroup.add(orbit);

      const mesh = factories[sat.shape]();
      const scale = sat.altKm > 10000 ? 3.0 : (sat.altKm > 2000 ? 2.0 : 1.4);
      mesh.scale.setScalar(scale);
      scene.add(mesh);

      sats.push({
        data: sat,
        mesh,
        radius,
        inclination: inclRad,
        angle: (i / FLEET.length) * Math.PI * 2,
        speed: (2 * Math.PI) / (sat.periodMin * 60) * 1000,
      });
    });

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const s = stateRef.current;
      if (s.playing) {
        sats.forEach((sat) => {
          sat.angle += sat.speed * dt * (s.timeSpeed / 1000);
          const x = sat.radius * Math.cos(sat.angle);
          const y = sat.radius * Math.sin(sat.angle);
          sat.mesh.position.set(x, y * Math.sin(sat.inclination), y * Math.cos(sat.inclination));
          sat.mesh.lookAt(0, 0, 0);
          sat.mesh.rotateY(Math.PI);
        });
        earthGroup.rotation.y += dt * 0.02;
        cloudsMesh.rotation.y += dt * 0.004;
      }
      orbitGroup.visible = s.showOrbits;
      controls.update();
      renderer.render(scene, camera);

      // Update label positions
      const positions: Record<string, { x: number; y: number; visible: boolean }> = {};
      sats.forEach((sat) => {
        const p = sat.mesh.position.clone().project(camera);
        positions[sat.data.id] = {
          x: (p.x * 0.5 + 0.5) * el.clientWidth + 20,
          y: (-p.y * 0.5 + 0.5) * el.clientHeight,
          visible: p.z < 1,
        };
      });
      setLabelPositions(positions);
    };
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  const selected = FLEET.find((s) => s.id === selectedId)!;

  return (
    <div className="orbital-atlas">
      <div ref={canvasRef} className="oa-canvas" />

      {/* Top bar */}
      <div className="oa-top">
        <div className="oa-title">
          <SatIcon size={16} />
          <span className="t">Orbital Atlas</span>
          <span className="ver">v1.0 · 6 assets tracked</span>
        </div>
        <button className="oa-close" onClick={onClose}>
          <X size={14} /> Close [ESC]
        </button>
      </div>

      {/* Satellite labels (overlay) */}
      {FLEET.map((sat) => {
        const pos = labelPositions[sat.id];
        if (!pos || !pos.visible) return null;
        return (
          <div
            key={sat.id}
            className={`oa-sat-label ${sat.id === selectedId ? "selected" : ""}`}
            style={{
              left: pos.x,
              top: pos.y,
              color: sat.color,
              borderColor: sat.color,
              background: sat.id === selectedId ? sat.color : undefined,
            }}
            onClick={() => setSelectedId(sat.id)}
          >
            [{sat.id.toUpperCase()}]
          </div>
        );
      })}

      {/* Dossier */}
      <div className="oa-dossier">
        <div className="doss-head">
          <span className="doss-code">ASSET // {selected.id.toUpperCase()}</span>
          <span className={`doss-flag ${selected.flag}`}>
            {selected.flag === "india" ? "🇮🇳 INDIA" : selected.flag === "us" ? "USA" : "INTL"}
          </span>
        </div>
        <div className="doss-name">{selected.name}</div>
        <div className="doss-sub">{selected.agency} · {selected.type}</div>
        <div className="doss-stats">
          <div><span className="k">ALT</span><span className="v">{selected.altKm} km</span></div>
          <div><span className="k">INCL</span><span className="v">{selected.inclinationDeg}°</span></div>
          <div><span className="k">PERIOD</span><span className="v">{selected.periodMin} m</span></div>
          <div><span className="k">MASS</span><span className="v">{selected.mass}</span></div>
          <div><span className="k">LAUNCH</span><span className="v">{selected.launched}</span></div>
          <div><span className="k">OPERATOR</span><span className="v">{selected.operator}</span></div>
        </div>
        <div className="doss-task">
          <div className="lbl">◆ CURRENT PAYLOAD</div>
          <div className="val">{selected.task}</div>
        </div>
        <div className="doss-task" style={{ borderColor: "#22d3ee" }}>
          <div className="lbl" style={{ color: "#22d3ee" }}>◆ TARGET REGION</div>
          <div className="val">{selected.target}</div>
        </div>
      </div>

      {/* Fleet selector */}
      <div className="oa-fleet">
        {FLEET.map((sat) => (
          <button
            key={sat.id}
            className={`fleet-btn ${sat.id === selectedId ? "selected" : ""}`}
            onClick={() => setSelectedId(sat.id)}
          >
            <span className="dot" style={{ background: sat.color }} />
            {sat.name} · {sat.type}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="oa-controls">
        <button className="oa-ctrl" onClick={() => setPlaying((p) => !p)}>
          {playing ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Play</>}
        </button>
        <button className="oa-ctrl" onClick={() => setTimeSpeed((s) => Math.max(100, s / 2))}>
          <Rewind size={12} /> Slow
        </button>
        <div className="oa-speed">× {timeSpeed.toLocaleString()}</div>
        <button className="oa-ctrl" onClick={() => setTimeSpeed((s) => Math.min(50000, s * 2))}>
          <FastForward size={12} /> Fast
        </button>
        <button className="oa-ctrl" onClick={() => setShowOrbits((s) => !s)}>
          {showOrbits ? <><EyeOff size={12} /> Hide Orbits</> : <><Eye size={12} /> Show Orbits</>}
        </button>
      </div>
    </div>
  );
}
