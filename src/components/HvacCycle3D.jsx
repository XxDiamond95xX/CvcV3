'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const COMPONENTS = {
  compressor: {
    label: 'Compresseur',
    shortLabel: 'Comp.',
    position: [-3.1, 0, 0],
    labelOffset: [0, 0.95, 0],
    color: 0xef4444,
    ring: 'border-red-300/70 bg-red-500/15 text-red-50',
    role: 'Il aspire la vapeur basse pression et la comprime pour créer la haute pression.',
    beginner: 'C’est le moteur du circuit. Il met le fluide en mouvement et élève sa pression.',
    terrain: 'Contrôle la surchauffe, l’intensité, la température de refoulement, les vibrations et les bruits mécaniques.',
    expert: 'Une HP élevée augmente l’effort mécanique. Une SH trop faible expose au retour liquide. Une température de refoulement excessive dégrade l’huile.',
    observe: ['Surchauffe aspiration', 'Intensité absorbée', 'Température de refoulement', 'Bruits / vibrations']
  },
  condenser: {
    label: 'Condenseur',
    shortLabel: 'Cond.',
    position: [0, 2.05, 0],
    labelOffset: [0, 0.82, 0],
    color: 0xf97316,
    ring: 'border-orange-300/70 bg-orange-500/15 text-orange-50',
    role: 'Il rejette la chaleur vers l’extérieur et transforme la vapeur HP en liquide HP.',
    beginner: 'Le fluide arrive très chaud, cède sa chaleur, puis devient liquide.',
    terrain: 'Vérifie l’échange d’air ou d’eau, l’encrassement, la HP, la ventilation et le sous-refroidissement.',
    expert: 'HP élevée + SR variable : manque d’échange, air dans le circuit ou charge inadaptée. Le diagnostic doit croiser HP, SR et conditions extérieures.',
    observe: ['HP', 'État de l’échangeur', 'Ventilation', 'Sous-refroidissement']
  },
  expansionValve: {
    label: 'Détendeur',
    shortLabel: 'Dét.',
    position: [3.1, 0, 0],
    labelOffset: [0, 0.9, 0],
    color: 0x22c55e,
    ring: 'border-emerald-300/70 bg-emerald-500/15 text-emerald-50',
    role: 'Il crée la chute de pression et règle l’alimentation de l’évaporateur.',
    beginner: 'Il fait chuter la pression. Le fluide devient très froid et partiellement vaporisé.',
    terrain: 'Compare BP, surchauffe et stabilité. Trop fermé : évaporateur sous-alimenté. Trop ouvert : risque de retour liquide.',
    expert: 'La SH est l’indicateur principal de l’alimentation évaporateur. Une lecture isolée ne suffit pas : il faut tenir compte de la charge thermique et du débit d’air.',
    observe: ['BP', 'Surchauffe', 'Stabilité', 'Température sortie détendeur']
  },
  evaporator: {
    label: 'Évaporateur',
    shortLabel: 'Évap.',
    position: [0, -2.05, 0],
    labelOffset: [0, 0.82, 0],
    color: 0x38bdf8,
    ring: 'border-sky-300/70 bg-sky-500/15 text-sky-50',
    role: 'Il absorbe la chaleur du local ou du fluide à refroidir et vaporise le fluide frigorigène.',
    beginner: 'C’est ici que l’on produit le froid utile. Le fluide absorbe la chaleur et finit en vapeur.',
    terrain: 'Contrôle le débit d’air, le filtre, le givrage, la BP, la surchauffe et la température de reprise/soufflage.',
    expert: 'BP basse + givre + débit d’air faible : risque antigel. BP basse + SH élevée : évaporateur sous-alimenté ou manque de charge.',
    observe: ['Débit d’air', 'Givrage', 'BP', 'Surchauffe']
  }
};

const PIPE_SEGMENTS = [
  {
    key: 'discharge',
    label: 'Refoulement',
    state: 'Vapeur chaude HP',
    from: 'Compresseur',
    to: 'Condenseur',
    color: 0xef4444,
    colorClass: 'bg-red-500',
    textClass: 'text-red-100',
    points: [[-3.1, 0, 0], [-3.1, 1.08, 0], [-2.2, 2.05, 0], [0, 2.05, 0]],
    description: 'Gaz très chaud en haute pression. C’est la ligne qui montre le plus vite une HP excessive.'
  },
  {
    key: 'liquid',
    label: 'Ligne liquide',
    state: 'Liquide HP',
    from: 'Condenseur',
    to: 'Détendeur',
    color: 0xfb923c,
    colorClass: 'bg-orange-400',
    textClass: 'text-orange-100',
    points: [[0, 2.05, 0], [2.2, 2.05, 0], [3.1, 1.08, 0], [3.1, 0, 0]],
    description: 'Liquide haute pression. Le sous-refroidissement confirme que le liquide est stable avant le détendeur.'
  },
  {
    key: 'expansion',
    label: 'Après détente',
    state: 'Mélange liquide-vapeur BP',
    from: 'Détendeur',
    to: 'Évaporateur',
    color: 0x34d399,
    colorClass: 'bg-emerald-400',
    textClass: 'text-emerald-100',
    points: [[3.1, 0, 0], [3.1, -1.08, 0], [2.2, -2.05, 0], [0, -2.05, 0]],
    description: 'Chute de pression. Le fluide devient froid et une partie se vaporise immédiatement.'
  },
  {
    key: 'suction',
    label: 'Aspiration',
    state: 'Vapeur BP',
    from: 'Évaporateur',
    to: 'Compresseur',
    color: 0x38bdf8,
    colorClass: 'bg-sky-400',
    textClass: 'text-sky-100',
    points: [[0, -2.05, 0], [-2.2, -2.05, 0], [-3.1, -1.08, 0], [-3.1, 0, 0]],
    description: 'Vapeur basse pression. La surchauffe protège le compresseur contre le retour liquide.'
  }
];

const GUIDE_STEPS = [
  {
    title: 'Aspiration',
    focus: 'compressor',
    pipe: 'suction',
    text: 'Le compresseur aspire une vapeur basse pression. Cette vapeur doit être sèche pour protéger la mécanique.'
  },
  {
    title: 'Compression',
    focus: 'compressor',
    pipe: 'discharge',
    text: 'La pression et la température montent. C’est l’étape qui consomme l’énergie électrique/mécanique.'
  },
  {
    title: 'Refoulement',
    focus: 'condenser',
    pipe: 'discharge',
    text: 'Le gaz chaud haute pression part vers le condenseur. Une HP élevée se voit ici très vite.'
  },
  {
    title: 'Condensation',
    focus: 'condenser',
    pipe: 'liquid',
    text: 'Le fluide rejette sa chaleur et devient liquide. L’échange d’air ou d’eau doit être propre et suffisant.'
  },
  {
    title: 'Ligne liquide',
    focus: 'expansionValve',
    pipe: 'liquid',
    text: 'Le liquide HP arrive au détendeur. Le sous-refroidissement confirme que l’alimentation est stable.'
  },
  {
    title: 'Détente',
    focus: 'expansionValve',
    pipe: 'expansion',
    text: 'Le détendeur provoque une chute de pression. Le fluide devient froid et partiellement vaporisé.'
  },
  {
    title: 'Évaporation',
    focus: 'evaporator',
    pipe: 'expansion',
    text: 'Dans l’évaporateur, le fluide absorbe la chaleur du local ou du process et finit de se vaporiser.'
  },
  {
    title: 'Retour compresseur',
    focus: 'compressor',
    pipe: 'suction',
    text: 'Le fluide revient en vapeur BP. La surchauffe doit être suffisante, mais pas excessive.'
  }
];

const FIELD_TOPICS = [
  {
    title: 'Purge / tirage au vide',
    text: 'En pratique, on évacue l’air et l’humidité par un tirage au vide sérieux. On ne rejette pas volontairement le fluide frigorigène : récupération obligatoire avant intervention.'
  },
  {
    title: 'Air et non-condensables',
    text: 'De l’air dans le circuit peut faire monter la HP, perturber la condensation et fausser les diagnostics. C’est une cause classique de fonctionnement instable.'
  },
  {
    title: 'Humidité',
    text: 'L’humidité peut créer de l’acidité, de la glace au détendeur et des pannes répétées. Le filtre déshydrateur et le tirage au vide sont essentiels.'
  },
  {
    title: 'Antigel évaporateur',
    text: 'BP basse, faible débit d’air ou consigne trop basse peuvent provoquer du givre. Sur eau glacée, la protection antigel évite la prise en glace de l’échangeur.'
  }
];

const MODE_LABELS = {
  debutant: 'Débutant',
  terrain: 'Terrain',
  expert: 'Expert'
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

function findComponentKey(object) {
  let current = object;
  while (current) {
    if (current.userData?.component) return current.userData.component;
    current = current.parent;
  }
  return null;
}

function makeCurve(points) {
  return new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.08);
}

function makeMaterial(color, highlighted = false, warning = false) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: highlighted ? 0.1 : 0.22,
    roughness: highlighted ? 0.26 : 0.48,
    emissive: warning ? 0xfacc15 : color,
    emissiveIntensity: highlighted ? 0.36 : warning ? 0.28 : 0.06
  });
}

function addComponentUserData(group, type) {
  group.traverse((child) => {
    child.userData.component = type;
  });
}

function makeComponent(type, isHighlighted, hasAlert = false) {
  const group = new THREE.Group();
  group.userData.component = type;

  if (type === 'compressor') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.9, 44),
      makeMaterial(0xef4444, isHighlighted, hasAlert)
    );
    body.rotation.z = Math.PI / 2;
    group.add(body);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.38, 0.38), makeMaterial(0x991b1b, isHighlighted, hasAlert));
    cap.position.x = -0.48;
    group.add(cap);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.62), makeMaterial(0x334155, isHighlighted));
    foot.position.y = -0.5;
    group.add(foot);
  }

  if (type === 'condenser') {
    const coil = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.46, 0.22), makeMaterial(0xf97316, isHighlighted, hasAlert));
    group.add(coil);
    for (let i = -4; i <= 4; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.75, 0.28), makeMaterial(0xfdba74, isHighlighted, hasAlert));
      fin.position.x = i * 0.22;
      group.add(fin);
    }
  }

  if (type === 'expansionValve') {
    const valve = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), makeMaterial(0x22c55e, isHighlighted, hasAlert));
    group.add(valve);
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.86, 18), makeMaterial(0x86efac, isHighlighted, hasAlert));
    spindle.rotation.z = Math.PI / 2;
    group.add(spindle);
  }

  if (type === 'evaporator') {
    const coil = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.46, 0.22), makeMaterial(0x38bdf8, isHighlighted, hasAlert));
    group.add(coil);
    for (let i = -4; i <= 4; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.75, 0.28), makeMaterial(0x7dd3fc, isHighlighted, hasAlert));
      fin.position.x = i * 0.22;
      group.add(fin);
    }
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, isHighlighted ? 0.035 : 0.018, 14, 88),
    new THREE.MeshBasicMaterial({
      color: hasAlert ? 0xfacc15 : 0xffffff,
      transparent: true,
      opacity: isHighlighted ? 0.82 : hasAlert ? 0.46 : 0.12
    })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  addComponentUserData(group, type);
  return group;
}

function makePipeVisual(segment, active = false, alert = false) {
  const curve = makeCurve(segment.points);
  const group = new THREE.Group();
  group.userData.pipeKey = segment.key;

  const glass = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 96, active ? 0.105 : 0.092, 18, false),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.16,
      roughness: 0.22,
      metalness: 0.1
    })
  );
  group.add(glass);

  const fluid = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 96, active ? 0.064 : 0.052, 16, false),
    new THREE.MeshStandardMaterial({
      color: alert ? 0xfacc15 : segment.color,
      roughness: 0.22,
      metalness: 0.16,
      emissive: alert ? 0xfacc15 : segment.color,
      emissiveIntensity: active ? 0.34 : alert ? 0.3 : 0.16
    })
  );
  group.add(fluid);

  [0.34, 0.68].forEach((t) => {
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(active ? 0.105 : 0.08, active ? 0.28 : 0.22, 24),
      new THREE.MeshBasicMaterial({ color: alert ? 0xfacc15 : segment.color, transparent: true, opacity: active ? 0.95 : 0.68 })
    );
    arrow.position.copy(position);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    group.add(arrow);
  });

  group.userData.curve = curve;
  return group;
}

function getDiagnostic(params) {
  const bp = Number(params?.bp ?? 4.5);
  const hp = Number(params?.hp ?? 18.2);
  const sh = Number(params?.sh ?? 5);
  const sc = Number(params?.sc ?? 3);

  if (hp >= 21) {
    return {
      level: 'danger',
      title: 'HP élevée',
      focus: 'condenser',
      pipe: 'discharge',
      message: 'Regarde le condenseur : échange insuffisant, encrassement, air/non-condensables ou surcharge possible.',
      className: 'border-red-400/40 bg-red-500/12 text-red-50'
    };
  }
  if (bp <= 3.2 && sh >= 12) {
    return {
      level: 'warning',
      title: 'Évaporateur sous-alimenté',
      focus: 'evaporator',
      pipe: 'expansion',
      message: 'BP basse avec surchauffe élevée : manque de fluide, détendeur trop fermé, filtre bouché ou charge thermique faible.',
      className: 'border-amber-300/40 bg-amber-500/12 text-amber-50'
    };
  }
  if (sh <= 3) {
    return {
      level: 'danger',
      title: 'Risque de retour liquide',
      focus: 'compressor',
      pipe: 'suction',
      message: 'Surchauffe faible : protège le compresseur. Vérifie détendeur, débit d’air et conditions de charge.',
      className: 'border-sky-300/40 bg-sky-500/12 text-sky-50'
    };
  }
  if (sc <= 1) {
    return {
      level: 'warning',
      title: 'Ligne liquide instable',
      focus: 'expansionValve',
      pipe: 'liquid',
      message: 'Sous-refroidissement faible : possible manque de liquide stable avant le détendeur ou charge insuffisante.',
      className: 'border-orange-300/40 bg-orange-500/12 text-orange-50'
    };
  }
  if (bp <= 3.1) {
    return {
      level: 'warning',
      title: 'Risque antigel',
      focus: 'evaporator',
      pipe: 'expansion',
      message: 'BP basse : surveille le débit d’air, le givre, la consigne et la protection antigel évaporateur.',
      className: 'border-cyan-300/40 bg-cyan-500/12 text-cyan-50'
    };
  }
  return {
    level: 'normal',
    title: 'Cycle proche du nominal',
    focus: 'all',
    pipe: null,
    message: 'Les valeurs sont cohérentes pour une lecture pédagogique. Suis les couleurs pour comprendre les changements d’état.',
    className: 'border-emerald-300/35 bg-emerald-500/10 text-emerald-50'
  };
}

function measureState(type, value) {
  if (type === 'bp') {
    if (value <= 3.2) return { label: 'Basse', className: 'text-amber-200' };
    if (value >= 6.5) return { label: 'Haute', className: 'text-amber-200' };
    return { label: 'OK', className: 'text-emerald-200' };
  }
  if (type === 'hp') {
    if (value >= 21) return { label: 'Haute', className: 'text-red-200' };
    if (value <= 12) return { label: 'Basse', className: 'text-amber-200' };
    return { label: 'OK', className: 'text-emerald-200' };
  }
  if (type === 'sh') {
    if (value <= 3) return { label: 'Faible', className: 'text-red-200' };
    if (value >= 12) return { label: 'Élevée', className: 'text-amber-200' };
    return { label: 'OK', className: 'text-emerald-200' };
  }
  if (value <= 1) return { label: 'Faible', className: 'text-amber-200' };
  if (value >= 9) return { label: 'Élevé', className: 'text-blue-200' };
  return { label: 'OK', className: 'text-emerald-200' };
}

function getModeText(componentKey, mode) {
  if (!componentKey) {
    if (mode === 'debutant') return 'Commence par suivre le sens du fluide : rouge, orange, vert, bleu. Chaque couleur correspond à un état différent.';
    if (mode === 'terrain') return 'Lis toujours le circuit avec les mesures : BP, HP, surchauffe et sous-refroidissement. Une seule valeur ne suffit jamais.';
    return 'Analyse croisée : pression, température, charge thermique, échangeurs, débit d’air/eau et stabilité du détendeur.';
  }
  return COMPONENTS[componentKey][mode];
}

export default function HvacCycle3D({ highlightedComponent = 'all', params, size = 'default', className = '' }) {
  const mountRef = useRef(null);
  const labelRefs = useRef({});
  const threeApiRef = useRef(null);
  const [selectedComponent, setSelectedComponent] = useState(highlightedComponent === 'all' ? null : highlightedComponent);
  const [viewMode, setViewMode] = useState('formation');
  const [infoLevel, setInfoLevel] = useState('terrain');
  const [guideActive, setGuideActive] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [activePanel, setActivePanel] = useState('details');

  useEffect(() => {
    if (highlightedComponent !== 'all') {
      setSelectedComponent(highlightedComponent);
      setActivePanel('details');
    }
  }, [highlightedComponent]);

  const safeParams = useMemo(() => ({
    bp: Number(params?.bp ?? 4.5),
    hp: Number(params?.hp ?? 18.2),
    sh: Number(params?.sh ?? 5),
    sc: Number(params?.sc ?? 3)
  }), [params?.bp, params?.hp, params?.sh, params?.sc]);

  const diagnostic = useMemo(() => getDiagnostic(safeParams), [safeParams]);
  const currentGuide = guideActive ? GUIDE_STEPS[guideStep] : null;
  const sceneFocus = currentGuide?.focus || selectedComponent || highlightedComponent || diagnostic.focus;
  const activePipe = currentGuide?.pipe || diagnostic.pipe;
  const selectedDetails = selectedComponent ? COMPONENTS[selectedComponent] : null;
  const selectedModeText = getModeText(selectedComponent, infoLevel);
  const isCircuitOnly = viewMode === 'circuit';
  const showLabels = viewMode !== 'circuit';
  const sizeClass = size === 'expert'
    ? 'min-h-[540px] sm:min-h-[620px] lg:min-h-[680px] xl:min-h-[740px]'
    : size === 'compact'
      ? 'min-h-[480px] sm:min-h-[560px] lg:min-h-[620px]'
      : 'min-h-[520px] sm:min-h-[600px] lg:min-h-[680px]';

  const measures = [
    { key: 'bp', label: 'BP', value: safeParams.bp, unit: 'bar' },
    { key: 'hp', label: 'HP', value: safeParams.hp, unit: 'bar' },
    { key: 'sh', label: 'SH', value: safeParams.sh, unit: 'K' },
    { key: 'sc', label: 'SR', value: safeParams.sc, unit: 'K' }
  ];

  const panelGridClass = viewMode === 'complete'
    ? 'lg:grid-cols-[1.08fr_0.88fr_1.04fr]'
    : 'lg:grid-cols-[1.15fr_0.85fr]';

  const resetView = () => {
    const api = threeApiRef.current;
    if (!api) return;
    api.camera.position.set(0, api.compact ? 5.8 : 5.15, api.compact ? 11.6 : 9.8);
    api.controls.target.set(0, 0, 0);
    api.controls.update();
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 8, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.rotateSpeed = 0.58;
    controls.zoomSpeed = 0.72;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x94a3b8, 1.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.75);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 2.2, 11);
    rimLight.position.set(-3.8, -2.6, 3.8);
    scene.add(rimLight);

    const warmLight = new THREE.PointLight(0xf97316, 1.7, 10);
    warmLight.position.set(3.2, 2.8, 3.2);
    scene.add(warmLight);

    const group = new THREE.Group();
    scene.add(group);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(4.45, 4.45, 0.06, 112),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, transparent: true, opacity: 0.68, roughness: 0.78 })
    );
    platform.position.y = -2.55;
    group.add(platform);

    const grid = new THREE.GridHelper(8.7, 16, 0x1e293b, 0x0f172a);
    grid.position.y = -2.5;
    grid.material.transparent = true;
    grid.material.opacity = 0.28;
    group.add(grid);

    const pipeGroups = [];
    PIPE_SEGMENTS.forEach((segment) => {
      const isActive = activePipe === segment.key;
      const isAlert = diagnostic.pipe === segment.key && diagnostic.level !== 'normal';
      const pipe = makePipeVisual(segment, isActive, isAlert);
      group.add(pipe);
      pipeGroups.push({ segment, group: pipe, curve: pipe.userData.curve });
    });

    const componentObjects = [];
    Object.entries(COMPONENTS).forEach(([key, componentData]) => {
      const isHighlighted = sceneFocus === 'all' || sceneFocus === key;
      const hasAlert = diagnostic.focus === key && diagnostic.level !== 'normal';
      const component = makeComponent(key, isHighlighted, hasAlert);
      component.position.set(...componentData.position);
      if (key === 'condenser' || key === 'evaporator') component.rotation.x = -0.13;
      group.add(component);
      componentObjects.push(component);
    });

    const particles = [];
    pipeGroups.forEach(({ segment, group: pipeGroup, curve }) => {
      const count = segment.key === 'expansion' ? 16 : 13;
      for (let i = 0; i < count; i += 1) {
        const isBubble = segment.key === 'expansion' && i % 3 === 0;
        const material = new THREE.MeshBasicMaterial({
          color: isBubble ? 0xeaffff : segment.color,
          transparent: true,
          opacity: isBubble ? 0.92 : 0.98
        });
        const particle = new THREE.Mesh(new THREE.SphereGeometry(isBubble ? 0.052 : 0.04, 12, 12), material);
        particle.userData.offset = i / count;
        particle.userData.curve = curve;
        particle.userData.segmentKey = segment.key;
        pipeGroup.add(particle);
        particles.push(particle);
      }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(componentObjects, true);
      if (!intersects.length) return;
      const componentKey = findComponentKey(intersects[0].object);
      if (componentKey) {
        setSelectedComponent(componentKey);
        setActivePanel('details');
        setViewMode((value) => (value === 'circuit' ? 'formation' : value));
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const setResponsiveCamera = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      const compact = width < 720;
      camera.aspect = width / height;
      camera.fov = compact ? 50 : 40;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      controls.minDistance = compact ? 7.5 : 6.5;
      controls.maxDistance = compact ? 15.5 : 13.5;
      const api = threeApiRef.current;
      const wasCompact = api?.compact;
      threeApiRef.current = { camera, controls, compact };
      if (api?.initialized && wasCompact === compact) return;
      camera.position.set(0, compact ? 5.8 : 5.15, compact ? 11.6 : 9.8);
      controls.target.set(0, 0, 0);
      controls.update();
      threeApiRef.current.initialized = true;
    };

    setResponsiveCamera();

    const resizeObserver = new ResizeObserver(setResponsiveCamera);
    resizeObserver.observe(mount);

    let raf = 0;
    const clock = new THREE.Clock();
    const projector = new THREE.Vector3();

    const updateLabels = () => {
      Object.entries(COMPONENTS).forEach(([key, componentData]) => {
        const labelNode = labelRefs.current[key];
        if (!labelNode) return;
        projector.set(
          componentData.position[0] + componentData.labelOffset[0],
          componentData.position[1] + componentData.labelOffset[1],
          componentData.position[2] + componentData.labelOffset[2]
        );
        projector.project(camera);
        const x = (projector.x * 0.5 + 0.5) * mount.clientWidth;
        const y = (-projector.y * 0.5 + 0.5) * mount.clientHeight;
        const behind = projector.z > 1;
        labelNode.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        labelNode.style.opacity = behind ? '0' : '1';
      });
    };

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      particles.forEach((particle) => {
        const speed = particle.userData.segmentKey === 'liquid' ? 0.13 : particle.userData.segmentKey === 'expansion' ? 0.16 : 0.145;
        const t = (elapsed * speed + particle.userData.offset) % 1;
        const point = particle.userData.curve.getPointAt(t);
        particle.position.copy(point);
        const pulse = 0.86 + Math.sin(elapsed * 5 + particle.userData.offset * 10) * 0.14;
        particle.scale.setScalar(pulse);
      });

      pipeGroups.forEach(({ group: pipeGroup, segment }) => {
        const active = activePipe === segment.key;
        pipeGroup.children.forEach((child) => {
          if (child.material?.emissiveIntensity !== undefined && active) {
            child.material.emissiveIntensity = 0.22 + Math.sin(elapsed * 3.2) * 0.08;
          }
        });
      });

      controls.update();
      updateLabels();
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [activePipe, diagnostic.focus, diagnostic.level, diagnostic.pipe, sceneFocus]);

  return (
    <div className={`relative isolate h-full w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#020617] shadow-2xl shadow-black/70 ${sizeClass} ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.22),rgba(2,6,23,0.98)_58%)]" />
      <div ref={mountRef} className="absolute inset-0" />

      {showLabels && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {Object.entries(COMPONENTS).map(([key, item]) => {
          const active = sceneFocus === 'all' || sceneFocus === key || selectedComponent === key;
          return (
            <button
              key={key}
              ref={(node) => {
                labelRefs.current[key] = node;
              }}
              type="button"
              onClick={() => {
                setSelectedComponent(key);
                setActivePanel('details');
                setViewMode('formation');
              }}
              className={`pointer-events-auto absolute left-0 top-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-2xl backdrop-blur transition hover:scale-105 sm:text-[11px] ${
                active ? `${item.ring} shadow-white/10` : 'border-slate-700/80 bg-slate-950/70 text-slate-300'
              }`}
            >
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.shortLabel}</span>
            </button>
          );
          })}
        </div>
      )}

      {!isCircuitOnly && (
        <header className="absolute left-3 right-3 top-3 z-30 flex flex-wrap items-center justify-between gap-2 rounded-[1.4rem] border border-white/10 bg-slate-950/72 p-2.5 text-slate-100 shadow-2xl backdrop-blur-xl sm:left-4 sm:right-4 sm:top-4 sm:p-3">
        <div className="min-w-0 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200/80">Simulateur CVC</p>
          <h2 className="truncate text-sm font-black text-white sm:text-base">Circuit frigorifique 3D interactif</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-2xl border px-3 py-2 text-[11px] font-bold ${diagnostic.className}`}>
            {diagnostic.title}
          </span>
          <button
            type="button"
            onClick={resetView}
            className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-blue-300 hover:text-white"
          >
            Recentrer
          </button>
          <div className="flex rounded-2xl border border-slate-700 bg-slate-900/80 p-1" aria-label="Mode d'affichage">
            {[
              ['complete', 'Complet'],
              ['formation', 'Formation'],
              ['circuit', 'Circuit']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setViewMode(value)}
                className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                  viewMode === value ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        </header>
      )}

      {!isCircuitOnly && (
        <div className="absolute left-3 top-[6.2rem] z-30 flex max-w-[calc(100%-1.5rem)] gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/55 p-2 backdrop-blur-xl sm:left-4 sm:top-[6.6rem]">
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setInfoLevel(key)}
              className={`shrink-0 rounded-2xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition ${
                infoLevel === key ? 'bg-white text-slate-950' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!isCircuitOnly && (
        <section className="absolute bottom-3 left-3 right-3 z-30 sm:bottom-4 sm:left-4 sm:right-4">
          <div className="mb-2 flex gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/55 p-2 backdrop-blur-xl lg:hidden">
            {['details', 'mesures', 'legende', 'terrain'].map((panel) => (
              <button
                key={panel}
                type="button"
                onClick={() => setActivePanel(panel)}
                className={`shrink-0 rounded-2xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition ${
                  activePanel === panel ? 'bg-white text-slate-950' : 'bg-slate-900/80 text-slate-300'
                }`}
              >
                {panel === 'details' ? 'Détail' : panel === 'mesures' ? 'Mesures' : panel === 'legende' ? 'Légende' : 'Terrain'}
              </button>
            ))}
          </div>

          <div className={`max-h-[46vh] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-slate-950/86 p-3 text-slate-200 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:grid lg:max-h-[19rem] ${panelGridClass} lg:gap-3 lg:overflow-visible`}>
            <div className={`${activePanel !== 'details' ? 'hidden lg:block' : ''} rounded-3xl border border-white/10 bg-white/[0.03] p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/80">Lecture pédagogique</p>
                  <h3 className="mt-1 text-lg font-black text-white">
                    {selectedDetails ? selectedDetails.label : currentGuide ? currentGuide.title : 'Cycle complet'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGuideActive((value) => !value);
                    setGuideStep(0);
                  }}
                  className={`rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                    guideActive ? 'bg-blue-400 text-slate-950' : 'bg-blue-500/15 text-blue-100 hover:bg-blue-500/25'
                  }`}
                >
                  {guideActive ? 'Stop' : 'Visite'}
                </button>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {currentGuide ? currentGuide.text : selectedDetails ? selectedDetails.role : diagnostic.message}
              </p>
              <p className="mt-3 rounded-2xl border border-blue-300/15 bg-blue-500/10 p-3 text-sm leading-relaxed text-blue-50">
                {selectedModeText}
              </p>

              {selectedDetails && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedDetails.observe.map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-[11px] text-slate-300">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {guideActive && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-300">Étape {guideStep + 1} / {GUIDE_STEPS.length}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setGuideStep((value) => Math.max(0, value - 1))}
                        className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 disabled:opacity-30"
                        disabled={guideStep === 0}
                      >
                        Préc.
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuideStep((value) => Math.min(GUIDE_STEPS.length - 1, value + 1))}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-950 disabled:opacity-30"
                        disabled={guideStep === GUIDE_STEPS.length - 1}
                      >
                        Suiv.
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${((guideStep + 1) / GUIDE_STEPS.length) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className={`${activePanel !== 'mesures' ? 'hidden lg:block' : ''} rounded-3xl border border-white/10 bg-white/[0.03] p-4`}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Mesures instantanées</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {measures.map((measure) => {
                  const state = measureState(measure.key, measure.value);
                  return (
                    <div key={measure.key} className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{measure.label}</p>
                        <span className={`text-[11px] font-black ${state.className}`}>{state.label}</span>
                      </div>
                      <p className="mt-1 font-mono text-xl font-black text-white">{measure.value}<span className="ml-1 text-xs text-slate-400">{measure.unit}</span></p>
                    </div>
                  );
                })}
              </div>
              <div className={`mt-3 rounded-2xl border p-3 text-sm leading-relaxed ${diagnostic.className}`}>
                <p className="font-black">{diagnostic.title}</p>
                <p className="mt-1 opacity-90">{diagnostic.message}</p>
              </div>
            </div>

            <div className={`${viewMode !== 'complete' ? 'lg:hidden' : ''} ${activePanel === 'details' || activePanel === 'mesures' ? 'hidden lg:block' : ''} rounded-3xl border border-white/10 bg-white/[0.03] p-4`}>
              <div className={`${activePanel !== 'legende' ? 'hidden lg:block' : ''}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">États du fluide</p>
                <div className="mt-3 space-y-2.5">
                  {PIPE_SEGMENTS.map((segment) => (
                    <button
                      type="button"
                      key={segment.key}
                      onClick={() => setActivePanel('details')}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        activePipe === segment.key ? 'border-white/30 bg-white/10' : 'border-white/10 bg-slate-900/65 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${segment.colorClass}`} />
                        <p className="text-xs font-black text-white">{segment.label} · <span className={segment.textClass}>{segment.state}</span></p>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{segment.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${activePanel !== 'terrain' ? 'hidden lg:hidden' : ''}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Notions terrain</p>
                <div className="mt-3 space-y-2.5">
                  {FIELD_TOPICS.map((topic) => (
                    <div key={topic.title} className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                      <p className="text-sm font-black text-white">{topic.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{topic.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 hidden rounded-2xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-50 lg:block">
                <p className="font-black">Purge et sécurité</p>
                <p className="mt-1 text-amber-50/85">On parle surtout d’évacuer l’air et l’humidité par tirage au vide. Le fluide frigorigène se récupère : on ne le relâche pas dans l’atmosphère.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {isCircuitOnly && (
        <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-3xl border border-white/10 bg-slate-950/70 p-2 text-[11px] font-bold text-slate-300 shadow-2xl backdrop-blur-xl">
          <span className="hidden sm:inline">Vue circuit seul</span>
          <button type="button" onClick={resetView} className="rounded-2xl bg-white px-3 py-2 font-black text-slate-950">Recentrer</button>
          <button type="button" onClick={() => setViewMode('formation')} className="rounded-2xl bg-blue-500 px-3 py-2 font-black text-white">Afficher infos</button>
        </div>
      )}
    </div>
  );
}
