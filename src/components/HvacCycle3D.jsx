'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Info, MousePointerClick, Thermometer, Wind } from 'lucide-react';

const PIPE_STATES = [
  {
    key: 'discharge',
    label: 'Refoulement',
    color: '#ef4444',
    state: 'Vapeur chaude HP',
    detail: 'Sortie compresseur vers condenseur'
  },
  {
    key: 'liquid',
    label: 'Ligne liquide',
    color: '#f97316',
    state: 'Liquide HP',
    detail: 'Sortie condenseur vers détendeur'
  },
  {
    key: 'twoPhase',
    label: 'Après détente',
    color: '#22c55e',
    state: 'Mélange liquide/vapeur BP',
    detail: 'Entrée évaporateur'
  },
  {
    key: 'suction',
    label: 'Aspiration',
    color: '#38bdf8',
    state: 'Vapeur BP surchauffée',
    detail: 'Retour évaporateur vers compresseur'
  }
];

const COMPONENTS = {
  compressor: {
    label: 'Compresseur',
    className: 'left-[8%] top-[50%]',
    color: '#ef4444',
    role: 'Aspire la vapeur basse pression et la comprime en vapeur haute pression.',
    in: 'Vapeur BP surchauffée',
    out: 'Vapeur chaude HP',
    control: 'Surchauffe, intensité, température de refoulement, bruit, pression d’huile si applicable.'
  },
  condenser: {
    label: 'Condenseur',
    className: 'left-[42%] top-[12%]',
    color: '#f97316',
    role: 'Rejette la chaleur vers l’air ou l’eau et transforme la vapeur HP en liquide HP.',
    in: 'Vapeur chaude HP',
    out: 'Liquide HP sous-refroidi',
    control: 'HP, sous-refroidissement, propreté batterie, ventilateurs, débit d’eau ou d’air.'
  },
  liquidLine: {
    label: 'Ligne liquide',
    className: 'right-[13%] top-[27%]',
    color: '#fb923c',
    role: 'Amène une colonne de liquide stable au détendeur.',
    in: 'Liquide HP',
    out: 'Liquide HP vers détendeur',
    control: 'Voyant liquide, filtre déshydrateur, électrovanne, écart de température avant/après filtre.'
  },
  expansionValve: {
    label: 'Détendeur',
    className: 'right-[8%] top-[52%]',
    color: '#22c55e',
    role: 'Crée la chute de pression et dose le débit de fluide dans l’évaporateur.',
    in: 'Liquide HP',
    out: 'Mélange liquide/vapeur BP',
    control: 'Surchauffe, bulbe, égalisation, alimentation liquide, stabilité de régulation.'
  },
  evaporator: {
    label: 'Évaporateur',
    className: 'left-[42%] bottom-[10%]',
    color: '#38bdf8',
    role: 'Absorbe la chaleur utile et vaporise le fluide basse pression.',
    in: 'Mélange liquide/vapeur BP',
    out: 'Vapeur BP surchauffée',
    control: 'BP, surchauffe, débit d’air ou d’eau, propreté batterie, givrage, filtres.'
  }
};

function componentImpact(component, params = {}) {
  const bp = params.bp ?? 4.5;
  const hp = params.hp ?? 18.2;
  const sh = params.sh ?? 5;
  const sc = params.sc ?? 3;

  if (component === 'compressor') {
    if (sh <= 3) return 'La surchauffe est trop faible : risque de retour liquide. On évite de laisser tourner sans contrôle.';
    if (hp >= 21) return 'La HP élevée augmente le taux de compression : le compresseur chauffe, consomme plus et le COP baisse.';
    if (sh >= 14 && bp <= 3.2) return 'L’aspiration manque de fluide : le compresseur reçoit une vapeur très surchauffée et travaille avec peu de masse aspirée.';
    return 'Le compresseur reçoit une vapeur correctement surchauffée et refoule vers le condenseur.';
  }

  if (component === 'condenser') {
    if (hp >= 21 && sc >= 8) return 'La chaleur s’évacue mal ou le condenseur stocke trop de liquide : HP et SR montent.';
    if (hp >= 21) return 'La HP est haute : vérifier ventilation, encrassement, débit d’eau, température extérieure et charge.';
    return 'Le condenseur rejette la chaleur et forme une ligne liquide exploitable.';
  }

  if (component === 'liquidLine') {
    if (bp <= 3.2 && sh >= 12 && sc <= 3) return 'Le détendeur peut être mal alimenté : manque de charge ou restriction à confirmer par recoupement.';
    if (bp <= 3.2 && sh >= 12) return 'La ligne liquide ou le détendeur peut limiter le débit : l’évaporateur est affamé.';
    return 'La ligne liquide assure l’alimentation du détendeur. On surveille surtout le filtre et le voyant.';
  }

  if (component === 'expansionValve') {
    if (sh >= 14 && bp <= 3.2) return 'Le détendeur semble trop fermé ou mal alimenté : BP basse et surchauffe élevée.';
    if (sh <= 3) return 'Le détendeur peut trop alimenter l’évaporateur : la surchauffe faible expose au retour liquide.';
    return 'Le détendeur crée la chute de pression et maintient une alimentation cohérente de l’évaporateur.';
  }

  if (component === 'evaporator') {
    if (bp <= 3.2 && sh <= 8) return 'La température d’évaporation baisse : vérifier débit d’air/eau, givrage, filtres et charge thermique.';
    if (bp <= 3.2 && sh >= 12) return 'L’évaporateur est affamé : peu de fluide circule, la surchauffe monte.';
    return 'L’évaporateur absorbe la chaleur et renvoie une vapeur basse pression vers le compresseur.';
  }

  return 'Sélectionne un organe pour afficher son rôle et les conséquences visibles.';
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

function makeMaterial(color, highlighted = false, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: options.metalness ?? 0.28,
    roughness: options.roughness ?? 0.42,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: highlighted ? color : 0x000000,
    emissiveIntensity: highlighted ? 0.28 : 0.03
  });
}

function makePipe(points, color, radius = 0.055, highlighted = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geometry = new THREE.TubeGeometry(curve, 120, radius, 18, false);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.24,
    metalness: 0.55,
    emissive: highlighted ? color : 0x000000,
    emissiveIntensity: highlighted ? 0.2 : 0.02
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.curve = curve;
  return mesh;
}

function setClickable(group, component) {
  group.userData.component = component;
  group.traverse((child) => {
    child.userData.component = component;
  });
}

function makeFan(radius = 0.34, highlighted = false) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.018, 10, 64),
    makeMaterial(0x94a3b8, highlighted, { metalness: 0.4, roughness: 0.25 })
  );
  group.add(ring);

  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.9, 0.055, 0.015),
      makeMaterial(0xcbd5e1, highlighted, { metalness: 0.2, roughness: 0.3 })
    );
    blade.position.x = radius * 0.22;
    blade.rotation.z = (Math.PI * 2 * i) / 3;
    group.add(blade);
  }
  return group;
}

function makeComponent(type, isHighlighted) {
  const group = new THREE.Group();
  setClickable(group, type);

  if (type === 'compressor') {
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.95, 48),
      makeMaterial(0xef4444, isHighlighted)
    );
    shell.rotation.z = Math.PI / 2;
    group.add(shell);

    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 0.42), makeMaterial(0x991b1b, isHighlighted));
    motor.position.x = -0.52;
    group.add(motor);

    const suction = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 18), makeMaterial(0x38bdf8, isHighlighted));
    suction.rotation.x = Math.PI / 2;
    suction.position.set(-0.05, -0.42, 0);
    group.add(suction);

    const discharge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.46, 18), makeMaterial(0xfca5a5, isHighlighted));
    discharge.rotation.x = Math.PI / 2;
    discharge.position.set(0.25, 0.44, 0);
    group.add(discharge);
  }

  if (type === 'condenser') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.55, 0.2), makeMaterial(0x7c2d12, isHighlighted));
    group.add(frame);
    for (let i = -4; i <= 4; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.84, 0.28), makeMaterial(0xfdba74, isHighlighted));
      fin.position.x = i * 0.22;
      group.add(fin);
    }
    const fan = makeFan(0.32, isHighlighted);
    fan.position.set(0, 0, 0.22);
    group.add(fan);
  }

  if (type === 'liquidLine') {
    const drier = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.75, 32), makeMaterial(0xfb923c, isHighlighted));
    drier.rotation.z = Math.PI / 2;
    group.add(drier);

    const sight = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 16), makeMaterial(0x93c5fd, isHighlighted, { transparent: true, opacity: 0.72, metalness: 0.05, roughness: 0.08 }));
    sight.position.x = 0.55;
    group.add(sight);
  }

  if (type === 'expansionValve') {
    const valve = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), makeMaterial(0x22c55e, isHighlighted));
    group.add(valve);

    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.9, 18), makeMaterial(0xbbf7d0, isHighlighted));
    spindle.rotation.z = Math.PI / 2;
    group.add(spindle);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 14), makeMaterial(0x86efac, isHighlighted));
    bulb.position.set(-0.1, -0.62, 0.1);
    group.add(bulb);
  }

  if (type === 'evaporator') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.55, 0.2), makeMaterial(0x075985, isHighlighted));
    group.add(frame);
    for (let i = -4; i <= 4; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.84, 0.28), makeMaterial(0x7dd3fc, isHighlighted));
      fin.position.x = i * 0.22;
      group.add(fin);
    }
    const fan = makeFan(0.32, isHighlighted);
    fan.position.set(0, 0, 0.22);
    group.add(fan);

    const drain = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.26), makeMaterial(0x0f172a, false));
    drain.position.y = -0.43;
    group.add(drain);
  }

  if (isHighlighted) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.022, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  setClickable(group, type);
  return group;
}

function makeArrow(color, position, rotationZ = 0) {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.24, 24),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.14, roughness: 0.3 })
  );
  cone.position.set(...position);
  cone.rotation.z = rotationZ;
  return cone;
}

export default function HvacCycle3D({ highlightedComponent = 'all', params, onComponentSelect }) {
  const mountRef = useRef(null);
  const [selectedComponent, setSelectedComponent] = useState('compressor');

  useEffect(() => {
    if (highlightedComponent && highlightedComponent !== 'all' && highlightedComponent !== 'diagnostic') {
      setSelectedComponent(highlightedComponent);
    }
  }, [highlightedComponent]);

  const activeKey = selectedComponent || (highlightedComponent !== 'all' ? highlightedComponent : 'compressor');
  const activeDetails = COMPONENTS[activeKey] ?? COMPONENTS.compressor;
  const impact = useMemo(() => componentImpact(activeKey, params), [activeKey, params]);

  const selectComponent = (key) => {
    setSelectedComponent(key);
    onComponentSelect?.(key);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 5.5, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 3.9, 6.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 4.2;
    controls.maxDistance = 9.5;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x94a3b8, 1.25);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 2.2, 9);
    rimLight.position.set(-3.5, -2, 2.4);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const hp = params?.hp ?? 18.2;
    const bp = params?.bp ?? 4.5;
    const sh = params?.sh ?? 5;
    const sc = params?.sc ?? 3;

    const dischargeColor = hp >= 21 ? 0xff2a16 : 0xef4444;
    const liquidColor = sc >= 8 ? 0xff9f1a : 0xf97316;
    const twoPhaseColor = sh >= 14 && bp <= 3.2 ? 0x84cc16 : 0x22c55e;
    const suctionColor = bp <= 3.2 ? 0x0ea5e9 : 0x38bdf8;

    const segmentData = [
      {
        key: 'discharge',
        color: dischargeColor,
        points: [[-2.95, -0.15, 0], [-2.72, 1.52, 0], [-1.1, 1.84, 0.05], [-0.35, 1.78, 0]]
      },
      {
        key: 'liquid',
        color: liquidColor,
        points: [[0.55, 1.78, 0], [1.25, 1.7, 0.05], [1.85, 1.28, 0.05], [2.75, 0.08, 0]]
      },
      {
        key: 'twoPhase',
        color: twoPhaseColor,
        points: [[2.95, -0.35, 0], [2.55, -1.42, 0], [1.1, -1.78, 0], [0.42, -1.78, 0]]
      },
      {
        key: 'suction',
        color: suctionColor,
        points: [[-0.55, -1.78, 0], [-1.6, -1.78, -0.05], [-2.85, -1.2, 0], [-3.05, -0.2, 0]]
      }
    ];

    const pipes = segmentData.map((segment) => {
      const pipe = makePipe(segment.points, segment.color, 0.06, segment.key === activeKey);
      pipe.userData.pipeState = segment.key;
      group.add(pipe);
      return { ...segment, pipe, curve: pipe.userData.curve };
    });

    group.add(makeArrow(dischargeColor, [-1.45, 1.78, 0.04], -Math.PI / 2));
    group.add(makeArrow(liquidColor, [1.95, 1.1, 0.04], -2.55));
    group.add(makeArrow(twoPhaseColor, [1.7, -1.72, 0.04], Math.PI / 2));
    group.add(makeArrow(suctionColor, [-2.0, -1.58, 0.04], 2.05));

    const components = [
      ['compressor', [-3.05, -0.18, 0]],
      ['condenser', [0.1, 1.78, 0]],
      ['liquidLine', [1.75, 1.35, 0.04]],
      ['expansionValve', [2.95, -0.22, 0]],
      ['evaporator', [-0.05, -1.78, 0]]
    ];

    const clickable = [];
    components.forEach(([type, position]) => {
      const isHighlighted = highlightedComponent === 'all' || highlightedComponent === type || selectedComponent === type;
      const component = makeComponent(type, isHighlighted);
      component.position.set(...position);
      if (type === 'condenser' || type === 'evaporator') component.rotation.x = -0.1;
      group.add(component);
      clickable.push(component);
    });

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(4.05, 4.05, 0.05, 120),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, transparent: true, opacity: 0.7, roughness: 0.8 })
    );
    platform.position.y = -2.2;
    group.add(platform);

    const titlePlate = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.04, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, transparent: true, opacity: 0.65 })
    );
    titlePlate.position.set(0, 0.02, -0.62);
    group.add(titlePlate);

    const particles = [];
    const baseSpeed = 0.045 + Math.min(0.05, Math.max(0, (hp - bp) / 600));
    for (let i = 0; i < 34; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(i % 5 === 0 ? 0.052 : 0.04, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      particle.userData.offset = i / 34;
      group.add(particle);
      particles.push(particle);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = null;

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerDown = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const handlePointerUp = (event) => {
      if (!pointerDown) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const moved = Math.hypot(x - pointerDown.x, y - pointerDown.y);
      pointerDown = null;
      if (moved > 6) return;

      pointer.x = (x / rect.width) * 2 - 1;
      pointer.y = -(y / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickable, true);
      const component = hits.find((hit) => hit.object.userData.component)?.object.userData.component;
      if (component) selectComponent(component);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      group.rotation.y = Math.sin(elapsed * 0.18) * 0.06;

      particles.forEach((particle) => {
        const global = (elapsed * baseSpeed + particle.userData.offset) % 1;
        const scaled = global * pipes.length;
        const index = Math.min(pipes.length - 1, Math.floor(scaled));
        const localT = scaled - index;
        const segment = pipes[index];
        const point = segment.curve.getPointAt(localT);
        particle.position.copy(point);
        particle.material.color.set(segment.color);
        const pulse = 1 + Math.sin(elapsed * 4 + particle.userData.offset * 12) * 0.08;
        particle.scale.setScalar(pulse);
      });

      group.children.forEach((child) => {
        if (child.userData.component === selectedComponent) {
          child.rotation.y += 0.003;
        }
      });

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
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [highlightedComponent, selectedComponent, params?.bp, params?.hp, params?.sh, params?.sc]);

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.25),rgba(2,6,23,0.98)_62%)] shadow-2xl shadow-black">
      <div ref={mountRef} className="h-[560px] w-full" />

      <div className="absolute left-4 top-4 max-w-[19rem] rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-xs text-slate-300 shadow-xl backdrop-blur">
        <div className="mb-3 flex items-center gap-2 font-black uppercase tracking-[0.18em] text-blue-200">
          <MousePointerClick size={15} /> Circuit 3D interactif
        </div>
        <p className="leading-relaxed text-slate-400">Clique un organe ou une étiquette pour afficher son rôle, ses mesures clés et l’impact des réglages actuels.</p>
      </div>

      {Object.entries(COMPONENTS).map(([key, item]) => {
        const active = selectedComponent === key || highlightedComponent === 'all' || highlightedComponent === key;
        return (
          <button
            key={key}
            onClick={() => selectComponent(key)}
            className={`absolute ${item.className} rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition ${
              active ? 'border-white/70 bg-white/15 text-white shadow-glow' : 'border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-400 hover:text-white'
            }`}
            type="button"
          >
            {item.label}
          </button>
        );
      })}

      <div className="absolute bottom-4 left-4 right-4 grid gap-3 lg:grid-cols-[1fr_1.08fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 backdrop-blur">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
            <Thermometer size={14} /> Légende des tuyauteries
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PIPE_STATES.map((item) => (
              <div key={item.key} className="flex items-start gap-3 rounded-xl bg-slate-900/70 p-2">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <div>
                  <p className="text-xs font-black text-white">{item.label}</p>
                  <p className="text-[11px] leading-snug text-slate-400">{item.state}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/25 bg-slate-950/90 p-4 backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Organe sélectionné</p>
              <h3 className="text-lg font-black text-white">{activeDetails.label}</h3>
            </div>
            <Info className="shrink-0 text-blue-300" size={20} />
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{activeDetails.role}</p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-slate-900/80 p-3">
              <p className="font-black text-slate-500">Entrée</p>
              <p className="mt-1 text-white">{activeDetails.in}</p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-3">
              <p className="font-black text-slate-500">Sortie</p>
              <p className="mt-1 text-white">{activeDetails.out}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
            <p className="mb-1 flex items-center gap-2 font-black text-amber-200"><Wind size={14} /> Conséquence actuelle</p>
            {impact}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400"><span className="font-black text-slate-300">À contrôler :</span> {activeDetails.control}</p>
        </div>
      </div>
    </div>
  );
}
