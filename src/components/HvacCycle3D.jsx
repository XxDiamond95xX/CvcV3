'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const COMPONENTS = {
  compressor: {
    label: 'Compresseur',
    shortLabel: 'Compresseur',
    position: [-2.8, 0, 0],
    labelOffset: [0, 0.82, 0],
    colorClass: 'border-red-400/80 bg-red-500/15 text-red-50'
  },
  condenser: {
    label: 'Condenseur',
    shortLabel: 'Condenseur',
    position: [0, 1.7, 0],
    labelOffset: [0, 0.72, 0],
    colorClass: 'border-orange-300/80 bg-orange-500/15 text-orange-50'
  },
  expansionValve: {
    label: 'Détendeur',
    shortLabel: 'Détendeur',
    position: [2.8, 0, 0],
    labelOffset: [0, 0.76, 0],
    colorClass: 'border-emerald-300/80 bg-emerald-500/15 text-emerald-50'
  },
  evaporator: {
    label: 'Évaporateur',
    shortLabel: 'Évaporateur',
    position: [0, -1.7, 0],
    labelOffset: [0, 0.72, 0],
    colorClass: 'border-sky-300/80 bg-sky-500/15 text-sky-50'
  }
};

const PIPE_LEGEND = [
  {
    label: 'Refoulement',
    state: 'Vapeur chaude HP',
    color: 'bg-red-500',
    text: 'Sortie compresseur : gaz très chaud, haute pression.'
  },
  {
    label: 'Ligne liquide',
    state: 'Liquide HP',
    color: 'bg-orange-400',
    text: 'Sortie condenseur : liquide sous-refroidi, haute pression.'
  },
  {
    label: 'Après détente',
    state: 'Mélange BP',
    color: 'bg-emerald-400',
    text: 'Après le détendeur : mélange liquide-vapeur froid.'
  },
  {
    label: 'Aspiration',
    state: 'Vapeur BP',
    color: 'bg-sky-400',
    text: 'Retour évaporateur : vapeur basse pression vers compresseur.'
  }
];

const COMPONENT_DETAILS = {
  compressor: {
    label: 'Compresseur',
    role: 'Il aspire la vapeur basse pression et la comprime pour créer la haute pression.',
    observe: 'Surveiller la surchauffe, l’intensité, la température de refoulement et les bruits mécaniques.',
    warning: 'Une surchauffe trop faible peut annoncer un retour liquide. Une HP élevée augmente fortement l’effort mécanique.'
  },
  condenser: {
    label: 'Condenseur',
    role: 'Il rejette la chaleur vers l’extérieur et transforme la vapeur HP en liquide HP.',
    observe: 'Contrôler l’échange d’air ou d’eau, l’encrassement, la HP et le sous-refroidissement.',
    warning: 'Un condenseur sale fait monter la HP, dégrade le COP et peut déclencher une sécurité HP.'
  },
  expansionValve: {
    label: 'Détendeur',
    role: 'Il crée la chute de pression et règle l’alimentation de l’évaporateur.',
    observe: 'Comparer BP, surchauffe et stabilité de fonctionnement. La sortie doit être froide et partiellement vaporisée.',
    warning: 'Trop fermé : BP basse et surchauffe haute. Trop ouvert : risque de retour liquide.'
  },
  evaporator: {
    label: 'Évaporateur',
    role: 'Il absorbe la chaleur du local ou du fluide à refroidir et vaporise le fluide frigorigène.',
    observe: 'Regarder le débit d’air, le givrage, la BP, la surchauffe et l’état des filtres.',
    warning: 'Un faible débit d’air peut faire chuter la BP, provoquer du givre et perturber la surchauffe.'
  }
};

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
      else child.material.dispose();
    }
  });
}

function makeMaterial(color, highlighted = false) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: highlighted ? 0.15 : 0.25,
    roughness: highlighted ? 0.28 : 0.5,
    emissive: highlighted ? color : 0x000000,
    emissiveIntensity: highlighted ? 0.32 : 0.04
  });
}

function makePipe(points, color, radius = 0.055) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geometry = new THREE.TubeGeometry(curve, 96, radius, 16, false);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.4,
    emissive: color,
    emissiveIntensity: 0.08
  });
  return new THREE.Mesh(geometry, material);
}

function makeComponent(type, isHighlighted) {
  const group = new THREE.Group();
  group.userData.component = type;

  if (type === 'compressor') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.82, 40),
      makeMaterial(0xef4444, isHighlighted)
    );
    body.rotation.z = Math.PI / 2;
    group.add(body);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.34), makeMaterial(0x991b1b, isHighlighted));
    cap.position.x = -0.44;
    group.add(cap);
  }

  if (type === 'condenser') {
    const coil = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.18), makeMaterial(0xf97316, isHighlighted));
    group.add(coil);
    for (let i = -3; i <= 3; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.24), makeMaterial(0xfdba74, isHighlighted));
      fin.position.x = i * 0.24;
      group.add(fin);
    }
  }

  if (type === 'expansionValve') {
    const valve = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), makeMaterial(0x22c55e, isHighlighted));
    group.add(valve);
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 16), makeMaterial(0x86efac, isHighlighted));
    spindle.rotation.z = Math.PI / 2;
    group.add(spindle);
  }

  if (type === 'evaporator') {
    const coil = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.18), makeMaterial(0x38bdf8, isHighlighted));
    group.add(coil);
    for (let i = -3; i <= 3; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.24), makeMaterial(0x7dd3fc, isHighlighted));
      fin.position.x = i * 0.24;
      group.add(fin);
    }
  }

  if (isHighlighted) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.025, 12, 80),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  group.traverse((child) => {
    child.userData.component = type;
  });

  return group;
}

function getOperatingNote(params) {
  if (!params) return 'Sélectionne un organe ou change les paramètres pour observer le comportement du circuit.';
  if (params.hp >= 21) return 'HP élevée : observe surtout le condenseur, le refoulement et le sous-refroidissement.';
  if (params.bp <= 3.2 && params.sh >= 12) return 'BP basse avec surchauffe élevée : l’évaporateur est probablement sous-alimenté.';
  if (params.sh <= 3) return 'Surchauffe faible : attention au retour liquide côté aspiration.';
  if (params.sc <= 1) return 'Sous-refroidissement faible : la ligne liquide peut manquer de réserve stable.';
  return 'Fonctionnement proche du nominal : suis le sens du fluide et les changements d’état.';
}

function findComponentKey(object) {
  let current = object;
  while (current) {
    if (current.userData?.component) return current.userData.component;
    current = current.parent;
  }
  return null;
}

export default function HvacCycle3D({ highlightedComponent = 'all', params }) {
  const mountRef = useRef(null);
  const labelRefs = useRef({});
  const threeApiRef = useRef(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(highlightedComponent === 'all' ? null : highlightedComponent);

  useEffect(() => {
    if (highlightedComponent !== 'all') {
      setSelectedComponent(highlightedComponent);
      setDetailOpen(true);
    }
  }, [highlightedComponent]);

  const sceneFocus = selectedComponent || highlightedComponent;
  const selectedDetails = selectedComponent ? COMPONENT_DETAILS[selectedComponent] : null;
  const statusText = useMemo(() => getOperatingNote(params), [params]);

  const resetView = () => {
    const api = threeApiRef.current;
    if (!api) return;
    api.camera.position.set(0, 4.9, 9.2);
    api.controls.target.set(0, 0, 0);
    api.controls.update();
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 7, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 4.9, 9.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 6.4;
    controls.maxDistance = 13;
    controls.target.set(0, 0, 0);

    threeApiRef.current = { camera, controls };

    const ambient = new THREE.AmbientLight(0x94a3b8, 1.45);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const blueLight = new THREE.PointLight(0x38bdf8, 2, 10);
    blueLight.position.set(-3, -2, 3);
    scene.add(blueLight);

    const group = new THREE.Group();
    scene.add(group);

    const refoulementColor = params?.hp >= 21 ? 0xff1f1f : 0xef4444;
    const liquidColor = params?.sc >= 8 ? 0xfacc15 : 0xfb923c;
    const mixColor = params?.bp <= 3.2 ? 0x22c55e : 0x34d399;
    const suctionColor = params?.sh <= 3 ? 0x7dd3fc : 0x38bdf8;

    group.add(makePipe([[-2.8, 0, 0], [-2.8, 1.7, 0], [0, 1.7, 0]], refoulementColor, 0.06));
    group.add(makePipe([[0, 1.7, 0], [2.8, 1.7, 0], [2.8, 0, 0]], liquidColor, 0.055));
    group.add(makePipe([[2.8, 0, 0], [2.8, -1.7, 0], [0, -1.7, 0]], mixColor, 0.055));
    group.add(makePipe([[0, -1.7, 0], [-2.8, -1.7, 0], [-2.8, 0, 0]], suctionColor, 0.055));

    const components = Object.entries(COMPONENTS).map(([type, definition]) => {
      const isHighlighted = sceneFocus === 'all' || sceneFocus === type;
      const component = makeComponent(type, isHighlighted);
      component.position.set(...definition.position);
      if (type === 'condenser' || type === 'evaporator') component.rotation.x = -0.12;
      group.add(component);
      return component;
    });

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.95, 3.95, 0.06, 96),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, transparent: true, opacity: 0.72, roughness: 0.75 })
    );
    platform.position.y = -2.05;
    group.add(platform);

    const particles = [];
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 28; i += 1) {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), particleMaterial.clone());
      particle.userData.offset = i / 28;
      group.add(particle);
      particles.push(particle);
    }

    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.8, 0, 0),
      new THREE.Vector3(-2.8, 1.7, 0),
      new THREE.Vector3(0, 1.7, 0),
      new THREE.Vector3(2.8, 1.7, 0),
      new THREE.Vector3(2.8, 0, 0),
      new THREE.Vector3(2.8, -1.7, 0),
      new THREE.Vector3(0, -1.7, 0),
      new THREE.Vector3(-2.8, -1.7, 0),
      new THREE.Vector3(-2.8, 0, 0)
    ], true);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const labelAnchors = Object.fromEntries(
      Object.entries(COMPONENTS).map(([key, definition]) => [
        key,
        new THREE.Vector3(
          definition.position[0] + definition.labelOffset[0],
          definition.position[1] + definition.labelOffset[1],
          definition.position[2] + definition.labelOffset[2]
        )
      ])
    );

    function updateLabels() {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;

      Object.entries(labelAnchors).forEach(([key, anchor]) => {
        const label = labelRefs.current[key];
        if (!label) return;

        const projected = anchor.clone();
        group.localToWorld(projected);
        projected.project(camera);

        const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;
        const visible = projected.z > -1 && projected.z < 1 && x >= -80 && x <= width + 80 && y >= -40 && y <= height + 40;

        label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        label.style.opacity = visible ? '1' : '0';
        label.style.pointerEvents = visible ? 'auto' : 'none';
      });
    }

    function handleCanvasClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(components, true);
      if (!hits.length) return;
      const componentKey = findComponentKey(hits[0].object);
      if (!componentKey) return;
      setSelectedComponent(componentKey);
      setDetailOpen(true);
    }

    renderer.domElement.addEventListener('click', handleCanvasClick);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      particles.forEach((particle) => {
        const t = (elapsed * 0.09 + particle.userData.offset) % 1;
        const point = path.getPointAt(t);
        particle.position.copy(point);
        if (t < 0.27) particle.material.color.set(refoulementColor);
        else if (t < 0.52) particle.material.color.set(liquidColor);
        else if (t < 0.76) particle.material.color.set(mixColor);
        else particle.material.color.set(suctionColor);
      });

      controls.update();
      updateLabels();
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      updateLabels();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      threeApiRef.current = null;
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [sceneFocus, params?.bp, params?.hp, params?.sh, params?.sc]);

  return (
    <div className="relative h-full min-h-[520px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.25),rgba(2,6,23,0.98)_60%)] shadow-2xl shadow-black">
      <div ref={mountRef} className="h-full min-h-[520px] w-full" />

      <div className="absolute left-4 top-4 z-20 max-w-[18rem] rounded-2xl border border-slate-800 bg-slate-950/80 text-xs text-slate-300 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={() => setLegendOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-black uppercase tracking-[0.18em] text-slate-200"
        >
          Légende tuyauteries
          <span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400">{legendOpen ? 'Réduire' : 'Ouvrir'}</span>
        </button>
        {legendOpen && (
          <div className="space-y-3 border-t border-slate-800 px-4 py-4">
            {PIPE_LEGEND.map((item) => (
              <div key={item.label} className="grid grid-cols-[0.75rem_1fr] gap-3">
                <span className={`mt-1 h-3 w-3 rounded-full ${item.color}`} />
                <div>
                  <p className="font-black text-white">{item.label} · {item.state}</p>
                  <p className="mt-1 leading-relaxed text-slate-400">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute right-4 top-4 z-20 max-w-[20rem] rounded-2xl border border-blue-500/20 bg-slate-950/80 text-xs text-slate-300 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={() => setDetailOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-black uppercase tracking-[0.18em] text-slate-200"
        >
          Organe sélectionné
          <span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400">{detailOpen ? 'Réduire' : 'Ouvrir'}</span>
        </button>
        {detailOpen && (
          <div className="border-t border-slate-800 px-4 py-4">
            {selectedDetails ? (
              <div>
                <p className="text-lg font-black text-white">{selectedDetails.label}</p>
                <p className="mt-2 leading-relaxed text-slate-300">{selectedDetails.role}</p>
                <div className="mt-4 rounded-2xl bg-slate-900/80 p-3">
                  <p className="font-black text-blue-300">À contrôler</p>
                  <p className="mt-1 leading-relaxed text-slate-400">{selectedDetails.observe}</p>
                </div>
                <div className="mt-3 rounded-2xl bg-amber-500/10 p-3 text-amber-100">
                  <p className="font-black">Attention terrain</p>
                  <p className="mt-1 leading-relaxed text-amber-100/80">{selectedDetails.warning}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-lg font-black text-white">Cycle complet</p>
                <p className="mt-2 leading-relaxed text-slate-400">Clique sur un organe dans le circuit pour afficher son rôle, les points de contrôle et les risques associés.</p>
              </div>
            )}
            <p className="mt-4 rounded-2xl bg-blue-500/10 p-3 leading-relaxed text-blue-100">{statusText}</p>
          </div>
        )}
      </div>

      {Object.entries(COMPONENTS).map(([key, item]) => {
        const active = sceneFocus === 'all' || sceneFocus === key;
        return (
          <button
            type="button"
            key={key}
            ref={(node) => {
              if (node) labelRefs.current[key] = node;
              else delete labelRefs.current[key];
            }}
            onClick={() => {
              setSelectedComponent(key);
              setDetailOpen(true);
            }}
            className={`absolute left-0 top-0 z-10 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] opacity-0 shadow-lg backdrop-blur transition hover:scale-105 hover:border-white/80 hover:bg-white/20 ${
              active ? item.colorClass : 'border-slate-700 bg-slate-950/70 text-slate-300'
            }`}
          >
            {item.shortLabel}
          </button>
        );
      })}

      <div className="pointer-events-none absolute bottom-4 left-4 max-w-[24rem] rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-400 backdrop-blur">
        Orbite 3D : glisser pour tourner, molette pour zoomer. Les noms restent ancrés aux organes. Clique directement sur une pièce ou sur son libellé.
      </div>

      <div className="absolute bottom-4 right-4 z-20 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={resetView}
          className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-300 backdrop-blur transition hover:border-blue-400 hover:text-white"
        >
          Recentrer
        </button>
        <button
          type="button"
          onClick={() => {
            const shouldOpen = !legendOpen || !detailOpen;
            setLegendOpen(shouldOpen);
            setDetailOpen(shouldOpen);
          }}
          className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-300 backdrop-blur transition hover:border-blue-400 hover:text-white"
        >
          {legendOpen || detailOpen ? 'Vue dégagée' : 'Afficher infos'}
        </button>
      </div>
    </div>
  );
}
