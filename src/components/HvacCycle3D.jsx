'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const COMPONENTS = {
  compressor: {
    label: 'Compresseur',
    short: 'Compression',
    position: [-2.8, 0, 0],
    color: '#ef4444',
    role: 'Aspire la vapeur basse pression et la comprime pour créer la haute pression.',
    observe: 'Surchauffe, intensité, température de refoulement, bruit mécanique et absence de retour liquide.',
    warning: 'Le compresseur ne doit jamais aspirer de liquide. Une surchauffe trop faible est une alerte sérieuse.'
  },
  condenser: {
    label: 'Condenseur',
    short: 'Rejet de chaleur',
    position: [0, 1.7, 0],
    color: '#f97316',
    role: 'Rejette la chaleur vers l’extérieur et transforme la vapeur HP en liquide HP.',
    observe: 'HP, propreté de l’échangeur, débit d’air ou d’eau, sous-refroidissement et température ambiante.',
    warning: 'Une HP élevée vient souvent d’un mauvais échange : condenseur sale, ventilateur faible, eau trop chaude ou non-condensables.'
  },
  expansionValve: {
    label: 'Détendeur',
    short: 'Chute de pression',
    position: [2.8, 0, 0],
    color: '#22c55e',
    role: 'Crée la chute de pression et dose l’alimentation de l’évaporateur.',
    observe: 'BP, stabilité de la surchauffe, alimentation de l’évaporateur et absence de pompage.',
    warning: 'Trop fermé : BP basse et surchauffe haute. Trop ouvert : surchauffe faible et risque de retour liquide.'
  },
  evaporator: {
    label: 'Évaporateur',
    short: 'Absorption de chaleur',
    position: [0, -1.7, 0],
    color: '#38bdf8',
    role: 'Absorbe la chaleur du local ou du fluide à refroidir et vaporise le fluide frigorigène.',
    observe: 'Débit d’air ou d’eau, filtres, givrage, BP, surchauffe, reprise et soufflage.',
    warning: 'Un faible débit peut faire chuter la BP, créer du givre et déclencher une protection antigel.'
  }
};

const PIPE_LEGEND = [
  {
    id: 'discharge',
    label: 'Refoulement',
    state: 'Vapeur chaude HP',
    color: 'bg-red-500',
    hex: 0xef4444,
    text: 'Sortie compresseur vers condenseur : gaz très chaud, haute pression.'
  },
  {
    id: 'liquid',
    label: 'Ligne liquide',
    state: 'Liquide HP',
    color: 'bg-orange-400',
    hex: 0xfb923c,
    text: 'Sortie condenseur vers détendeur : liquide haute pression, idéalement sous-refroidi.'
  },
  {
    id: 'expansion',
    label: 'Après détente',
    state: 'Mélange liquide-vapeur BP',
    color: 'bg-emerald-400',
    hex: 0x34d399,
    text: 'Après le détendeur : mélange froid, basse pression.'
  },
  {
    id: 'suction',
    label: 'Aspiration',
    state: 'Vapeur BP',
    color: 'bg-sky-400',
    hex: 0x38bdf8,
    text: 'Retour évaporateur vers compresseur : vapeur basse pression avec surchauffe de sécurité.'
  }
];

const GUIDE_STEPS = [
  {
    title: '1. Aspiration',
    component: 'compressor',
    text: 'Le compresseur aspire uniquement de la vapeur basse pression. C’est la zone à surveiller pour éviter le retour liquide.'
  },
  {
    title: '2. Compression',
    component: 'compressor',
    text: 'La pression et la température montent fortement. L’énergie électrique devient un travail de compression.'
  },
  {
    title: '3. Condensation',
    component: 'condenser',
    text: 'Le condenseur rejette la chaleur. Le fluide passe progressivement de vapeur HP à liquide HP.'
  },
  {
    title: '4. Détente',
    component: 'expansionValve',
    text: 'Le détendeur provoque une chute de pression. Le liquide devient un mélange froid liquide-vapeur.'
  },
  {
    title: '5. Évaporation',
    component: 'evaporator',
    text: 'L’évaporateur absorbe la chaleur. Le fluide se vaporise puis revient au compresseur en vapeur BP.'
  }
];

const DEFAULT_PARAMS = { bp: 4.5, hp: 18.2, sh: 5, sc: 3 };

function normalizeParams(params) {
  return {
    bp: Number(params?.bp ?? DEFAULT_PARAMS.bp),
    hp: Number(params?.hp ?? DEFAULT_PARAMS.hp),
    sh: Number(params?.sh ?? DEFAULT_PARAMS.sh),
    sc: Number(params?.sc ?? DEFAULT_PARAMS.sc)
  };
}

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
    metalness: highlighted ? 0.14 : 0.24,
    roughness: highlighted ? 0.28 : 0.5,
    emissive: highlighted ? color : 0x000000,
    emissiveIntensity: highlighted ? 0.28 : 0.04
  });
}

function makePipe(points, color, radius = 0.057, active = true) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geometry = new THREE.TubeGeometry(curve, 92, active ? radius * 1.08 : radius, 18, false);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.32,
    metalness: 0.38,
    emissive: color,
    emissiveIntensity: active ? 0.13 : 0.06
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.curve = curve;
  return mesh;
}

function makeArrow(color, active = true) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.28, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: active ? 0.8 : 0.35 })
  );
  shaft.rotation.z = Math.PI / 2;
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.065, 0.15, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: active ? 0.92 : 0.42 })
  );
  head.rotation.z = -Math.PI / 2;
  head.position.x = 0.22;
  group.add(shaft, head);
  return group;
}

function makeComponent(type, isHighlighted) {
  const group = new THREE.Group();
  group.userData.component = type;

  if (type === 'compressor') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.82, 40), makeMaterial(0xef4444, isHighlighted));
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
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  group.traverse((child) => {
    child.userData.component = type;
  });

  return group;
}

function sectionColors(params) {
  return {
    discharge: params.hp >= 21 ? 0xff1f1f : 0xef4444,
    liquid: params.sc >= 8 ? 0xfacc15 : 0xfb923c,
    expansion: params.bp <= 3.2 ? 0x22c55e : 0x34d399,
    suction: params.sh <= 3 ? 0x7dd3fc : 0x38bdf8
  };
}

function getOperatingNote(params) {
  if (params.hp >= 21) return 'HP élevée : contrôle prioritaire du condenseur, du débit d’air ou d’eau, de l’encrassement et des non-condensables.';
  if (params.bp <= 3.2 && params.sh >= 12) return 'BP basse avec surchauffe élevée : évaporateur probablement sous-alimenté. Vérifier charge, filtre déshydrateur et détendeur.';
  if (params.sh <= 3) return 'Surchauffe faible : risque de retour liquide au compresseur. À traiter avant de laisser fonctionner.';
  if (params.sc <= 1) return 'Sous-refroidissement faible : ligne liquide instable ou manque de liquide disponible.';
  return 'Fonctionnement proche du nominal : observe le sens du fluide et les quatre changements d’état.';
}

function getSafetyNote(params) {
  if (params.bp <= 3.1) return 'Antigel : une BP trop basse peut amener la batterie sous un seuil dangereux. Vérifier débit d’air/eau, filtres, pompe ou ventilateur.';
  if (params.hp >= 21) return 'Purge et non-condensables : on ne rejette pas le fluide à l’air libre. Récupération, tirage au vide sérieux, puis recharge contrôlée.';
  return 'Bonne pratique : récupérer le fluide, remplacer le filtre déshydrateur si nécessaire, tirer au vide et contrôler la charge.';
}

function getStatusLevel(params) {
  if (params.hp >= 24 || params.bp <= 2.7 || params.sh <= 2) return 'danger';
  if (params.hp >= 21 || params.bp <= 3.2 || params.sh >= 12 || params.sc <= 1) return 'watch';
  return 'ok';
}

function findComponentFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.component) return current.userData.component;
    current = current.parent;
  }
  return null;
}

function projectToScreen(position, camera, mount) {
  const projected = position.clone().project(camera);
  const x = (projected.x * 0.5 + 0.5) * mount.clientWidth;
  const y = (-projected.y * 0.5 + 0.5) * mount.clientHeight;
  const visible = projected.z > -1 && projected.z < 1;
  return { x, y, visible };
}

export default function HvacCycle3D({ highlightedComponent = 'all', params, simulationParams }) {
  const mountRef = useRef(null);
  const labelRefs = useRef({});
  const resetViewRef = useRef(null);

  const [selectedComponent, setSelectedComponent] = useState(highlightedComponent === 'all' ? null : highlightedComponent);
  const [activePanel, setActivePanel] = useState(null);
  const [viewMode, setViewMode] = useState('formation');
  const [guideStepIndex, setGuideStepIndex] = useState(0);

  const normalizedParams = useMemo(() => normalizeParams(params ?? simulationParams), [params, simulationParams]);
  const statusText = useMemo(() => getOperatingNote(normalizedParams), [normalizedParams]);
  const safetyText = useMemo(() => getSafetyNote(normalizedParams), [normalizedParams]);
  const statusLevel = useMemo(() => getStatusLevel(normalizedParams), [normalizedParams]);

  const guideActive = activePanel === 'guide';
  const guideStep = GUIDE_STEPS[guideStepIndex];
  const sceneFocus = guideActive ? guideStep.component : selectedComponent || highlightedComponent || 'all';
  const selectedDetails = selectedComponent ? COMPONENTS[selectedComponent] : null;
  const showLabels = viewMode !== 'clean';

  useEffect(() => {
    if (highlightedComponent !== 'all') {
      setSelectedComponent(highlightedComponent);
    }
  }, [highlightedComponent]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 6, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(43, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 3.9, 7.25);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 4.7;
    controls.maxDistance = 10.5;
    controls.target.set(0, 0, 0);

    resetViewRef.current = () => {
      camera.position.set(0, 3.9, 7.25);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    const ambient = new THREE.AmbientLight(0x94a3b8, 1.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const blueLight = new THREE.PointLight(0x38bdf8, 1.8, 9);
    blueLight.position.set(-3, -2, 2);
    scene.add(blueLight);

    const group = new THREE.Group();
    scene.add(group);

    const colors = sectionColors(normalizedParams);
    const pipeDefinitions = [
      { key: 'discharge', points: [[-2.8, 0, 0], [-2.8, 1.7, 0], [0, 1.7, 0]], color: colors.discharge, arrow: [-1.35, 1.7, 0], arrowRotation: 0 },
      { key: 'liquid', points: [[0, 1.7, 0], [2.8, 1.7, 0], [2.8, 0, 0]], color: colors.liquid, arrow: [2.8, 0.86, 0], arrowRotation: -Math.PI / 2 },
      { key: 'expansion', points: [[2.8, 0, 0], [2.8, -1.7, 0], [0, -1.7, 0]], color: colors.expansion, arrow: [1.35, -1.7, 0], arrowRotation: Math.PI },
      { key: 'suction', points: [[0, -1.7, 0], [-2.8, -1.7, 0], [-2.8, 0, 0]], color: colors.suction, arrow: [-2.8, -0.86, 0], arrowRotation: Math.PI / 2 }
    ];

    pipeDefinitions.forEach((pipe) => {
      const active = sceneFocus === 'all' || !sceneFocus ||
        (sceneFocus === 'compressor' && (pipe.key === 'suction' || pipe.key === 'discharge')) ||
        (sceneFocus === 'condenser' && (pipe.key === 'discharge' || pipe.key === 'liquid')) ||
        (sceneFocus === 'expansionValve' && (pipe.key === 'liquid' || pipe.key === 'expansion')) ||
        (sceneFocus === 'evaporator' && (pipe.key === 'expansion' || pipe.key === 'suction'));
      const mesh = makePipe(pipe.points, pipe.color, 0.058, active);
      group.add(mesh);

      if (viewMode !== 'clean') {
        const arrow = makeArrow(pipe.color, active);
        arrow.position.set(...pipe.arrow);
        arrow.rotation.z = pipe.arrowRotation;
        group.add(arrow);
      }
    });

    Object.entries(COMPONENTS).forEach(([type, componentInfo]) => {
      const isHighlighted = sceneFocus === 'all' || sceneFocus === type;
      const component = makeComponent(type, isHighlighted);
      component.position.set(...componentInfo.position);
      if (type === 'condenser' || type === 'evaporator') component.rotation.x = -0.12;
      group.add(component);
    });

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.9, 3.9, 0.055, 96),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, transparent: true, opacity: 0.62, roughness: 0.78 })
    );
    platform.position.y = -2.05;
    group.add(platform);

    const particlePath = new THREE.CatmullRomCurve3([
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

    const particles = [];
    const particleCount = viewMode === 'clean' ? 30 : 38;
    for (let i = 0; i < particleCount; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.037 + (i % 3) * 0.006, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 })
      );
      particle.userData.offset = i / particleCount;
      group.add(particle);
      particles.push(particle);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(group.children, true);
      const componentKey = intersects.map((hit) => findComponentFromObject(hit.object)).find(Boolean);
      if (componentKey) {
        setSelectedComponent(componentKey);
        setActivePanel('details');
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      particles.forEach((particle) => {
        const t = (elapsed * 0.095 + particle.userData.offset) % 1;
        const point = particlePath.getPointAt(t);
        particle.position.copy(point);
        if (t < 0.28) particle.material.color.setHex(colors.discharge);
        else if (t < 0.52) particle.material.color.setHex(colors.liquid);
        else if (t < 0.76) particle.material.color.setHex(colors.expansion);
        else particle.material.color.setHex(colors.suction);
      });

      if (showLabels) {
        Object.entries(COMPONENTS).forEach(([key, componentInfo]) => {
          const element = labelRefs.current[key];
          if (!element) return;
          const worldPosition = new THREE.Vector3(...componentInfo.position);
          group.localToWorld(worldPosition);
          worldPosition.y += 0.58;
          const { x, y, visible } = projectToScreen(worldPosition, camera, mount);
          element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          element.style.opacity = visible ? '1' : '0';
          element.style.pointerEvents = visible ? 'auto' : 'none';
        });
      }

      controls.update();
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      resetViewRef.current = null;
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [sceneFocus, normalizedParams.bp, normalizedParams.hp, normalizedParams.sh, normalizedParams.sc, showLabels, viewMode]);

  const statusColor = statusLevel === 'danger' ? 'bg-red-500' : statusLevel === 'watch' ? 'bg-amber-400' : 'bg-emerald-400';
  const statusLabel = statusLevel === 'danger' ? 'Alerte' : statusLevel === 'watch' ? 'À surveiller' : 'Nominal';

  return (
    <div className="relative h-full min-h-[460px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.22),rgba(2,6,23,0.98)_62%)] shadow-2xl shadow-black md:min-h-[560px]">
      <div ref={mountRef} className="h-full min-h-[460px] w-full md:min-h-[560px]" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-[11px] text-slate-300 shadow-xl backdrop-blur-md md:left-4 md:top-4">
        <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
        <span className="font-black uppercase tracking-[0.16em] text-white">Circuit 3D</span>
        <span className="hidden text-slate-500 sm:inline">·</span>
        <span className="font-semibold text-slate-300">{statusLabel}</span>
        <span className="hidden text-slate-500 md:inline">·</span>
        <span className="hidden font-mono text-slate-400 md:inline">BP {normalizedParams.bp} bar · HP {normalizedParams.hp} bar · SH {normalizedParams.sh} K · SR {normalizedParams.sc} K</span>
      </div>

      {showLabels && Object.entries(COMPONENTS).map(([key, item]) => {
        const active = sceneFocus === 'all' || sceneFocus === key;
        return (
          <button
            type="button"
            key={key}
            ref={(element) => {
              labelRefs.current[key] = element;
            }}
            onClick={() => {
              setSelectedComponent(key);
              setActivePanel('details');
            }}
            className={`absolute left-0 top-0 z-10 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] shadow-lg backdrop-blur transition hover:scale-105 hover:border-white/80 md:px-3 ${
              active ? 'border-white/60 bg-white/16 text-white' : 'border-slate-700/80 bg-slate-950/55 text-slate-300'
            }`}
          >
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.label.slice(0, 4)}.</span>
          </button>
        );
      })}

      <div className="absolute bottom-3 left-1/2 z-30 flex w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/75 p-2 text-[11px] shadow-2xl backdrop-blur-xl md:bottom-4 md:w-auto md:max-w-[92%]">
        <button
          type="button"
          onClick={() => {
            setViewMode('clean');
            setActivePanel(null);
          }}
          className={`rounded-xl px-3 py-2 font-black uppercase tracking-[0.12em] transition ${viewMode === 'clean' ? 'bg-white text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
          Circuit seul
        </button>
        <button
          type="button"
          onClick={() => setViewMode('formation')}
          className={`rounded-xl px-3 py-2 font-black uppercase tracking-[0.12em] transition ${viewMode === 'formation' ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
          Formation
        </button>
        <button
          type="button"
          onClick={() => setActivePanel((panel) => (panel === 'legend' ? null : 'legend'))}
          className={`rounded-xl px-3 py-2 font-black uppercase tracking-[0.12em] transition ${activePanel === 'legend' ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
          Légende
        </button>
        <button
          type="button"
          onClick={() => setActivePanel((panel) => (panel === 'details' ? null : 'details'))}
          className={`rounded-xl px-3 py-2 font-black uppercase tracking-[0.12em] transition ${activePanel === 'details' ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
          Organe
        </button>
        <button
          type="button"
          onClick={() => setActivePanel((panel) => (panel === 'guide' ? null : 'guide'))}
          className={`rounded-xl px-3 py-2 font-black uppercase tracking-[0.12em] transition ${activePanel === 'guide' ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
          Guide
        </button>
        <button
          type="button"
          onClick={() => resetViewRef.current?.()}
          className="rounded-xl bg-slate-900 px-3 py-2 font-black uppercase tracking-[0.12em] text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          Recentrer
        </button>
      </div>

      {activePanel && (
        <div className="absolute inset-x-3 bottom-[5.4rem] z-20 max-h-[45%] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/88 text-sm text-slate-300 shadow-2xl backdrop-blur-xl md:bottom-20 md:left-auto md:right-4 md:w-[24rem]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
                {activePanel === 'legend' && 'Légende'}
                {activePanel === 'details' && 'Organe sélectionné'}
                {activePanel === 'guide' && 'Visite guidée'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Panneau unique pour garder la 3D lisible.</p>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:border-white/50 hover:text-white"
            >
              Fermer
            </button>
          </div>

          <div className="max-h-[calc(45vh-5rem)] overflow-y-auto p-4">
            {activePanel === 'legend' && (
              <div className="space-y-3">
                {PIPE_LEGEND.map((item) => (
                  <div key={item.id} className="grid grid-cols-[0.75rem_1fr] gap-3 rounded-2xl bg-slate-900/60 p-3">
                    <span className={`mt-1 h-3 w-3 rounded-full ${item.color}`} />
                    <div>
                      <p className="font-black text-white">{item.label} · {item.state}</p>
                      <p className="mt-1 leading-relaxed text-slate-400">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activePanel === 'details' && (
              <div>
                {selectedDetails ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xl font-black text-white">{selectedDetails.label}</p>
                      <p className="mt-2 leading-relaxed text-slate-300">{selectedDetails.role}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-900/70 p-3">
                      <p className="font-black text-blue-300">À contrôler</p>
                      <p className="mt-1 leading-relaxed text-slate-400">{selectedDetails.observe}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-100">
                      <p className="font-black">Attention terrain</p>
                      <p className="mt-1 leading-relaxed text-amber-100/80">{selectedDetails.warning}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-black text-white">Aucun organe sélectionné</p>
                    <p className="mt-2 leading-relaxed text-slate-400">Clique directement sur un organe du circuit ou sur son étiquette.</p>
                  </div>
                )}
                <p className="mt-4 rounded-2xl bg-blue-500/10 p-3 leading-relaxed text-blue-100">{statusText}</p>
                <p className="mt-3 rounded-2xl bg-slate-900/80 p-3 leading-relaxed text-slate-300">{safetyText}</p>
              </div>
            )}

            {activePanel === 'guide' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-blue-500/10 p-4 text-blue-50">
                  <p className="text-lg font-black text-white">{guideStep.title}</p>
                  <p className="mt-2 leading-relaxed text-blue-50/85">{guideStep.text}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setGuideStepIndex((index) => Math.max(0, index - 1))}
                    disabled={guideStepIndex === 0}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-30"
                  >
                    Précédent
                  </button>
                  <span className="font-mono text-xs text-slate-500">{guideStepIndex + 1}/{GUIDE_STEPS.length}</span>
                  <button
                    type="button"
                    onClick={() => setGuideStepIndex((index) => Math.min(GUIDE_STEPS.length - 1, index + 1))}
                    disabled={guideStepIndex === GUIDE_STEPS.length - 1}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-blue-500 disabled:opacity-30"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
