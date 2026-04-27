'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const DEFAULT_PARAMS = { bp: 4.5, hp: 18.2, sh: 5, sc: 3 };

const COMPONENTS = {
  compressor: {
    label: 'Compresseur',
    short: 'Compression',
    position: [-3.55, 0, 0],
    labelOffset: [0, 1.05, 0],
    colorClass: 'border-red-400/80 bg-red-500/15 text-red-50',
    accent: 0xef4444
  },
  condenser: {
    label: 'Condenseur',
    short: 'Condensation',
    position: [0, 2.25, 0],
    labelOffset: [0, 1.02, 0],
    colorClass: 'border-orange-300/80 bg-orange-500/15 text-orange-50',
    accent: 0xf97316
  },
  expansionValve: {
    label: 'Détendeur',
    short: 'Détente',
    position: [3.55, 0, 0],
    labelOffset: [0, 1.05, 0],
    colorClass: 'border-emerald-300/80 bg-emerald-500/15 text-emerald-50',
    accent: 0x22c55e
  },
  evaporator: {
    label: 'Évaporateur',
    short: 'Évaporation',
    position: [0, -2.25, 0],
    labelOffset: [0, 1.02, 0],
    colorClass: 'border-sky-300/80 bg-sky-500/15 text-sky-50',
    accent: 0x38bdf8
  }
};

const PIPE_SEGMENTS = {
  discharge: {
    label: 'Refoulement',
    state: 'Vapeur chaude HP',
    shortState: 'Gaz chaud HP',
    phase: 'vapor',
    color: 0xef4444,
    cssColor: 'bg-red-500',
    text: 'Sortie compresseur : vapeur très chaude, haute pression. C’est la ligne où la température de refoulement devient critique en cas de défaut.',
    points: [
      [-3.55, 0, 0],
      [-3.55, 2.25, 0],
      [0, 2.25, 0]
    ],
    labelPosition: [-2.25, 1.86, 0]
  },
  liquid: {
    label: 'Ligne liquide',
    state: 'Liquide HP',
    shortState: 'Liquide HP',
    phase: 'liquid',
    color: 0xfb923c,
    cssColor: 'bg-orange-400',
    text: 'Sortie condenseur : liquide haute pression. Le sous-refroidissement confirme que le liquide est stable avant le détendeur.',
    points: [
      [0, 2.25, 0],
      [3.55, 2.25, 0],
      [3.55, 0, 0]
    ],
    labelPosition: [2.25, 1.86, 0]
  },
  expansion: {
    label: 'Après détente',
    state: 'Mélange liquide-vapeur BP',
    shortState: 'Mélange BP',
    phase: 'mix',
    color: 0x34d399,
    cssColor: 'bg-emerald-400',
    text: 'Après le détendeur : la pression chute, la température chute, et une partie du liquide flashe en vapeur. On obtient un mélange liquide-vapeur.',
    points: [
      [3.55, 0, 0],
      [3.55, -2.25, 0],
      [0, -2.25, 0]
    ],
    labelPosition: [2.25, -1.83, 0]
  },
  suction: {
    label: 'Aspiration',
    state: 'Vapeur BP',
    shortState: 'Gaz BP',
    phase: 'vapor-cold',
    color: 0x38bdf8,
    cssColor: 'bg-sky-400',
    text: 'Retour évaporateur : vapeur basse pression vers le compresseur. La surchauffe doit être suffisante pour éviter le retour liquide.',
    points: [
      [0, -2.25, 0],
      [-3.55, -2.25, 0],
      [-3.55, 0, 0]
    ],
    labelPosition: [-2.25, -1.83, 0]
  }
};

const COMPONENT_DETAILS = {
  compressor: {
    label: 'Compresseur',
    role: 'Il aspire la vapeur basse pression et la comprime pour créer la haute pression. C’est le moteur du cycle.',
    beginner: 'Il transforme un gaz froid basse pression en gaz chaud haute pression. Il ne doit jamais recevoir de liquide.',
    terrain: 'Contrôle : bruit, intensité, température de refoulement, surchauffe à l’aspiration, vibrations, pressostats et alimentation électrique.',
    expert: 'Une HP élevée augmente le taux de compression et la température de refoulement. Une SH trop basse expose au retour liquide ; une SH trop haute indique souvent un manque d’alimentation évaporateur.',
    warning: 'Risque majeur : retour liquide, manque d’huile, HP excessive ou démarrages courts.'
  },
  condenser: {
    label: 'Condenseur',
    role: 'Il rejette la chaleur vers l’extérieur et transforme la vapeur haute pression en liquide haute pression.',
    beginner: 'Il sert à évacuer la chaleur prise dans le local, plus la chaleur produite par la compression.',
    terrain: 'Contrôle : échange d’air/eau, propreté batterie, ventilateurs, température extérieure, HP, sous-refroidissement et présence possible de non-condensables.',
    expert: 'HP élevée + SR élevé peut orienter vers surcharge ou condenseur sous-ventilé. HP élevée après ouverture de circuit peut aussi faire suspecter des non-condensables.',
    warning: 'Condenseur encrassé, ventilateur HS ou air dans le circuit : HP haute, rendement bas, déclenchement sécurité HP.'
  },
  expansionValve: {
    label: 'Détendeur',
    role: 'Il crée la chute de pression et dose l’alimentation de l’évaporateur.',
    beginner: 'C’est le passage étroit qui transforme le liquide HP en mélange froid basse pression.',
    terrain: 'Contrôle : stabilité de la BP, surchauffe, bulbe, égalisation, filtre déshydrateur, givrage anormal et réaction aux variations de charge.',
    expert: 'Trop fermé : BP basse + SH haute. Trop ouvert : SH basse, évaporateur noyé et risque de retour liquide. Une ligne liquide instable perturbe fortement le détendeur.',
    warning: 'Un mauvais réglage ne se corrige jamais au hasard : on vérifie d’abord charge, débit, filtres et conditions de fonctionnement.'
  },
  evaporator: {
    label: 'Évaporateur',
    role: 'Il absorbe la chaleur du local, de l’air ou de l’eau à refroidir et vaporise le fluide frigorigène.',
    beginner: 'C’est ici que le froid est réellement produit côté utilisateur.',
    terrain: 'Contrôle : débit d’air/eau, filtre, batterie, ventilateur, pompe, givrage, BP, surchauffe, température entrée/sortie et évacuation condensats.',
    expert: 'BP basse avec SH haute : évaporateur sous-alimenté. BP basse avec SH basse : manque de débit ou évaporateur trop froid. En eau glacée, la sécurité antigel est prioritaire.',
    warning: 'Risque antigel : débit insuffisant, consigne trop basse, filtre bouché, pompe arrêtée, glycol insuffisant ou sonde mal placée.'
  }
};

const GUIDE_STEPS = [
  {
    title: '1. Aspiration',
    component: 'compressor',
    segment: 'suction',
    text: 'Le compresseur aspire une vapeur basse pression venant de l’évaporateur. La ligne bleue doit rester en vapeur : c’est la surchauffe qui protège le compresseur.'
  },
  {
    title: '2. Compression',
    component: 'compressor',
    segment: 'discharge',
    text: 'La pression et la température montent fortement. Le fluide sort en vapeur chaude haute pression vers le condenseur.'
  },
  {
    title: '3. Condensation',
    component: 'condenser',
    segment: 'discharge',
    text: 'Dans le condenseur, le gaz chaud rejette sa chaleur. Il commence à se liquéfier : c’est le changement d’état gaz vers liquide.'
  },
  {
    title: '4. Ligne liquide',
    component: 'condenser',
    segment: 'liquid',
    text: 'Après condensation, on veut un liquide haute pression stable. Le sous-refroidissement permet de vérifier que le détendeur reçoit bien du liquide.'
  },
  {
    title: '5. Détente',
    component: 'expansionValve',
    segment: 'expansion',
    text: 'Le détendeur provoque une chute de pression. Une partie du liquide flashe en vapeur : le fluide devient un mélange très froid.'
  },
  {
    title: '6. Évaporation',
    component: 'evaporator',
    segment: 'expansion',
    text: 'Le mélange absorbe la chaleur dans l’évaporateur. Le liquide finit de s’évaporer : c’est là que l’on produit le froid utile.'
  },
  {
    title: '7. Retour compresseur',
    component: 'evaporator',
    segment: 'suction',
    text: 'En sortie évaporateur, le fluide doit être vapeur. Si la surchauffe est trop faible, il peut rester du liquide : danger pour le compresseur.'
  }
];

const TRAINING_NOTES = [
  {
    title: 'Purge, récupération et tirage au vide',
    text: 'On ne purge pas le fluide frigorigène à l’atmosphère. Si le circuit a été ouvert : récupération, remplacement des éléments nécessaires, tirage au vide profond pour retirer air et humidité, contrôle de tenue au vide, puis recharge conforme.'
  },
  {
    title: 'Air et non-condensables',
    text: 'De l’air dans le circuit ne condense pas comme le fluide. Cela peut faire monter la HP, dégrader le rendement et rendre le diagnostic trompeur. On suspecte surtout ce problème après une intervention mal vidée ou une recharge incorrecte.'
  },
  {
    title: 'Humidité et filtre déshydrateur',
    text: 'L’humidité peut former de l’acidité, de la glace au détendeur ou des boues. Après ouverture du circuit, le filtre déshydrateur est un point de contrôle important.'
  },
  {
    title: 'Antigel évaporateur',
    text: 'Le risque antigel apparaît quand l’évaporateur devient trop froid ou que le débit est insuffisant. Vérifie filtre, ventilateur, pompe, flow switch, glycol, sonde antigel et consigne.'
  },
  {
    title: 'Retour liquide',
    text: 'Une surchauffe trop faible peut indiquer que du liquide revient au compresseur. C’est un défaut dangereux : dilution d’huile, casse mécanique et coups de liquide.'
  },
  {
    title: 'Lecture terrain',
    text: 'On ne conclut pas avec une seule valeur. On croise BP, HP, SH, SR, températures, débits, état des échangeurs et historique d’intervention.'
  }
];

const LEVELS = {
  beginner: { label: 'Débutant', field: 'beginner' },
  terrain: { label: 'Terrain', field: 'terrain' },
  expert: { label: 'Expert', field: 'expert' }
};

function normalizeParams(rawParams) {
  return {
    bp: Number(rawParams?.bp ?? DEFAULT_PARAMS.bp),
    hp: Number(rawParams?.hp ?? DEFAULT_PARAMS.hp),
    sh: Number(rawParams?.sh ?? DEFAULT_PARAMS.sh),
    sc: Number(rawParams?.sc ?? DEFAULT_PARAMS.sc)
  };
}

function vectorFromArray(value) {
  return new THREE.Vector3(value[0], value[1], value[2]);
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
    metalness: options.metalness ?? (highlighted ? 0.12 : 0.25),
    roughness: options.roughness ?? (highlighted ? 0.24 : 0.52),
    emissive: highlighted ? color : (options.emissive ?? 0x000000),
    emissiveIntensity: highlighted ? 0.35 : (options.emissiveIntensity ?? 0.04),
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1
  });
}

function makeCurve(points) {
  return new THREE.CatmullRomCurve3(points.map(vectorFromArray), false, 'catmullrom', 0.12);
}

function makePipe(segment, color, highlighted = false) {
  const curve = makeCurve(segment.points);
  const group = new THREE.Group();

  const jacketGeometry = new THREE.TubeGeometry(curve, 170, highlighted ? 0.105 : 0.092, 20, false);
  const jacketMaterial = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.38,
    metalness: 0.55,
    transparent: true,
    opacity: highlighted ? 0.42 : 0.28
  });
  group.add(new THREE.Mesh(jacketGeometry, jacketMaterial));

  const glassGeometry = new THREE.TubeGeometry(curve, 170, highlighted ? 0.074 : 0.064, 18, false);
  const glassMaterial = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: highlighted ? 0.34 : 0.24,
    roughness: 0.16,
    metalness: 0.08,
    emissive: color,
    emissiveIntensity: highlighted ? 0.18 : 0.09,
    depthWrite: false
  });
  group.add(new THREE.Mesh(glassGeometry, glassMaterial));

  const coreGeometry = new THREE.TubeGeometry(curve, 170, highlighted ? 0.042 : 0.036, 14, false);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: highlighted ? 0.52 : 0.36,
    depthWrite: false
  });
  group.add(new THREE.Mesh(coreGeometry, coreMaterial));

  group.userData.curve = curve;
  group.userData.core = group.children[2];
  group.userData.glass = group.children[1];
  return group;
}

function makeArrowOnCurve(curve, color, t, highlighted) {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(highlighted ? 0.13 : 0.105, highlighted ? 0.34 : 0.27, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: highlighted ? 0.92 : 0.62 })
  );
  const point = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t).normalize();
  cone.position.copy(point);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  cone.userData.baseScale = highlighted ? 1.1 : 0.9;
  return cone;
}

function makeComponent(type, isHighlighted, visualState) {
  const group = new THREE.Group();
  group.userData.component = type;

  if (type === 'compressor') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.92, 44),
      makeMaterial(visualState.returnLiquidRisk ? 0xb91c1c : 0xef4444, isHighlighted)
    );
    body.rotation.z = Math.PI / 2;
    group.add(body);

    const crankcase = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.4, 0.38), makeMaterial(0x7f1d1d, isHighlighted));
    crankcase.position.x = -0.52;
    group.add(crankcase);

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.28, 28), makeMaterial(0xfca5a5, isHighlighted));
    motor.rotation.x = Math.PI / 2;
    motor.position.z = 0.48;
    group.add(motor);

    if (visualState.returnLiquidRisk) {
      const slug = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.86 })
      );
      slug.position.set(0.2, -0.28, 0.42);
      group.add(slug);
    }
  }

  if (type === 'condenser') {
    const condenserColor = visualState.hpHigh ? 0xff3b1f : 0xf97316;
    const coil = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.52, 0.24), makeMaterial(condenserColor, isHighlighted));
    group.add(coil);

    for (let i = -5; i <= 5; i += 1) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.034, 0.86, 0.31),
        makeMaterial(visualState.hpHigh ? 0x7c2d12 : 0xfdba74, isHighlighted)
      );
      fin.position.x = i * 0.2;
      group.add(fin);
    }

    if (visualState.nonCondensableSuspicion) {
      for (let i = 0; i < 9; i += 1) {
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(0.035 + (i % 3) * 0.012, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
        );
        bubble.position.set(-0.88 + i * 0.22, 0.39 + Math.sin(i) * 0.04, 0.18);
        group.add(bubble);
      }
    }
  }

  if (type === 'expansionValve') {
    const valve = new THREE.Mesh(new THREE.OctahedronGeometry(0.48), makeMaterial(0x22c55e, isHighlighted));
    group.add(valve);

    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.96, 20), makeMaterial(0x86efac, isHighlighted));
    spindle.rotation.z = Math.PI / 2;
    group.add(spindle);

    const coldMist = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 22, 22),
      new THREE.MeshBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: visualState.underfedEvaporator ? 0.24 : 0.38, depthWrite: false })
    );
    coldMist.position.set(0.28, -0.22, 0.06);
    group.add(coldMist);
  }

  if (type === 'evaporator') {
    const evapColor = visualState.freezeRisk ? 0xdbeafe : 0x38bdf8;
    const coil = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.52, 0.24), makeMaterial(evapColor, isHighlighted));
    group.add(coil);

    for (let i = -5; i <= 5; i += 1) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.034, 0.86, 0.31),
        makeMaterial(visualState.freezeRisk ? 0xe0f2fe : 0x7dd3fc, isHighlighted)
      );
      fin.position.x = i * 0.2;
      group.add(fin);
    }

    if (visualState.freezeRisk) {
      for (let i = 0; i < 14; i += 1) {
        const frost = new THREE.Mesh(
          new THREE.SphereGeometry(0.04 + (i % 3) * 0.012, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.72 })
        );
        frost.position.set(-1 + i * 0.15, 0.38 + Math.sin(i * 1.7) * 0.06, 0.16);
        group.add(frost);
      }
    }
  }

  if (isHighlighted) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.83, 0.026, 12, 96),
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

function getVisualState(params) {
  const hp = Number(params.hp);
  const bp = Number(params.bp);
  const sh = Number(params.sh);
  const sc = Number(params.sc);

  const hpHigh = hp >= 21;
  const hpVeryHigh = hp >= 24;
  const hpLow = hp <= 13;
  const bpLow = bp <= 3.3;
  const bpVeryLow = bp <= 2.7;
  const bpHigh = bp >= 6.5;
  const shHigh = sh >= 12;
  const shLow = sh <= 3;
  const scLow = sc <= 1.5;
  const scHigh = sc >= 8;
  const freezeRisk = bpVeryLow || (bp <= 3.7 && sh <= 5);
  const returnLiquidRisk = shLow;
  const underfedEvaporator = bpLow && shHigh;
  const nonCondensableSuspicion = hpHigh && sc >= 5;
  const liquidLineUnstable = scLow;

  let speed = 0.115;
  if (underfedEvaporator || liquidLineUnstable) speed = 0.078;
  if (returnLiquidRisk) speed = 0.142;
  if (hpHigh) speed += 0.015;
  if (hpLow && bpLow) speed = 0.07;

  const warnings = [];
  if (hpVeryHigh) warnings.push('HP très élevée : risque sécurité HP. Contrôler condenseur, ventilation/eau, charge et non-condensables.');
  else if (hpHigh) warnings.push('HP élevée : échange condenseur, ventilation, charge ou non-condensables à contrôler.');
  if (underfedEvaporator) warnings.push('BP basse + surchauffe haute : évaporateur probablement sous-alimenté.');
  if (returnLiquidRisk) warnings.push('Surchauffe faible : risque de retour liquide au compresseur.');
  if (liquidLineUnstable) warnings.push('Sous-refroidissement faible : ligne liquide instable ou manque de liquide disponible.');
  if (freezeRisk) warnings.push('Risque antigel : vérifier débit d’air/eau, filtres, pompe/ventilateur, glycol et sonde antigel.');
  if (nonCondensableSuspicion) warnings.push('Non-condensables possibles : après ouverture, récupération, tirage au vide et recharge conforme.');
  if (bpHigh && shLow) warnings.push('BP haute + SH faible : évaporateur possiblement noyé ou détendeur trop ouvert.');
  if (!warnings.length) warnings.push('Fonctionnement proche du nominal : suis la circulation et les changements d’état du fluide.');

  return {
    hp,
    bp,
    sh,
    sc,
    hpHigh,
    hpVeryHigh,
    hpLow,
    bpLow,
    bpVeryLow,
    bpHigh,
    shHigh,
    shLow,
    scLow,
    scHigh,
    freezeRisk,
    returnLiquidRisk,
    underfedEvaporator,
    nonCondensableSuspicion,
    liquidLineUnstable,
    speed,
    warnings
  };
}

function getSegmentColor(segmentKey, visualState) {
  if (segmentKey === 'discharge') return visualState.hpHigh ? 0xff2626 : PIPE_SEGMENTS.discharge.color;
  if (segmentKey === 'liquid') {
    if (visualState.scLow) return 0xfacc15;
    if (visualState.scHigh) return 0xfdba74;
    return PIPE_SEGMENTS.liquid.color;
  }
  if (segmentKey === 'expansion') return visualState.underfedEvaporator ? 0x16a34a : PIPE_SEGMENTS.expansion.color;
  if (segmentKey === 'suction') return visualState.returnLiquidRisk ? 0x93c5fd : PIPE_SEGMENTS.suction.color;
  return PIPE_SEGMENTS[segmentKey].color;
}

function getParticleStyle(segmentKey, visualState, index) {
  if (segmentKey === 'discharge') {
    return {
      color: visualState.hpHigh ? 0xff1f1f : 0xff7043,
      radius: 0.04 + (index % 4) * 0.008,
      opacity: 0.92,
      phase: 'hot-vapor'
    };
  }

  if (segmentKey === 'liquid') {
    return {
      color: visualState.scLow && index % 5 === 0 ? 0xffffff : 0xfacc15,
      radius: 0.035,
      opacity: visualState.scLow && index % 5 === 0 ? 0.72 : 0.94,
      phase: visualState.scLow && index % 5 === 0 ? 'flash-bubble' : 'liquid'
    };
  }

  if (segmentKey === 'expansion') {
    return {
      color: index % 3 === 0 ? 0xe0f2fe : 0x34d399,
      radius: index % 3 === 0 ? 0.032 : 0.048,
      opacity: 0.88,
      phase: index % 3 === 0 ? 'flash-vapor' : 'liquid-droplet'
    };
  }

  if (segmentKey === 'suction') {
    if (visualState.returnLiquidRisk && index % 4 === 0) {
      return { color: 0xdbeafe, radius: 0.056, opacity: 0.95, phase: 'liquid-slug' };
    }
    return { color: 0x7dd3fc, radius: 0.04 + (index % 2) * 0.006, opacity: 0.88, phase: 'cold-vapor' };
  }

  return { color: 0xffffff, radius: 0.04, opacity: 0.8, phase: 'neutral' };
}

function isSegmentActiveForFocus(segmentKey, sceneFocus) {
  if (!sceneFocus || sceneFocus === 'all') return true;
  if (sceneFocus === 'compressor') return segmentKey === 'suction' || segmentKey === 'discharge';
  if (sceneFocus === 'condenser') return segmentKey === 'discharge' || segmentKey === 'liquid';
  if (sceneFocus === 'expansionValve') return segmentKey === 'liquid' || segmentKey === 'expansion';
  if (sceneFocus === 'evaporator') return segmentKey === 'expansion' || segmentKey === 'suction';
  return false;
}

function qualityClass(status) {
  if (status === 'danger') return 'border-red-400/40 bg-red-500/12 text-red-100';
  if (status === 'watch') return 'border-amber-400/40 bg-amber-500/12 text-amber-100';
  return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
}

function getMeasureStatus(key, visualState) {
  if (key === 'hp') {
    if (visualState.hpVeryHigh) return 'danger';
    if (visualState.hpHigh || visualState.hpLow) return 'watch';
    return 'ok';
  }
  if (key === 'bp') {
    if (visualState.bpVeryLow) return 'danger';
    if (visualState.bpLow || visualState.bpHigh) return 'watch';
    return 'ok';
  }
  if (key === 'sh') {
    if (visualState.shLow) return 'danger';
    if (visualState.shHigh) return 'watch';
    return 'ok';
  }
  if (key === 'sc') {
    if (visualState.scLow) return 'watch';
    if (visualState.scHigh) return 'watch';
    return 'ok';
  }
  return 'ok';
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
  const pipeLabelRefs = useRef({});
  const threeApiRef = useRef(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(highlightedComponent === 'all' ? null : highlightedComponent);
  const [viewMode, setViewMode] = useState('formation');
  const [trainingLevel, setTrainingLevel] = useState('terrain');
  const [guideActive, setGuideActive] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);

  const normalizedParams = useMemo(() => normalizeParams(params ?? simulationParams ?? DEFAULT_PARAMS), [params, simulationParams]);
  const visualState = useMemo(
    () => getVisualState(normalizedParams),
    [normalizedParams.bp, normalizedParams.hp, normalizedParams.sh, normalizedParams.sc]
  );

  const guideStep = GUIDE_STEPS[guideStepIndex];
  const guideComponent = guideActive ? guideStep.component : null;
  const guideSegment = guideActive ? guideStep.segment : null;
  const sceneFocus = guideComponent || selectedComponent || highlightedComponent || 'all';
  const selectedDetails = selectedComponent ? COMPONENT_DETAILS[selectedComponent] : (guideComponent ? COMPONENT_DETAILS[guideComponent] : null);
  const textVisible = viewMode !== 'circuit';
  const pipeTextVisible = viewMode === 'complete';
  const componentLabelsVisible = viewMode !== 'circuit';

  useEffect(() => {
    if (highlightedComponent !== 'all') {
      setSelectedComponent(highlightedComponent);
      setDetailOpen(true);
    }
  }, [highlightedComponent]);

  const resetView = () => {
    const api = threeApiRef.current;
    if (!api) return;
    api.camera.position.set(0, 6.9, 12.6);
    api.controls.target.set(0, 0, 0);
    api.controls.update();
  };

  const startGuide = () => {
    setGuideActive(true);
    setGuideStepIndex(0);
    setViewMode('formation');
    setDetailOpen(false);
    setLegendOpen(false);
  };

  const stopGuide = () => {
    setGuideActive(false);
  };

  const nextGuideStep = () => {
    setGuideStepIndex((index) => {
      if (index >= GUIDE_STEPS.length - 1) {
        setGuideActive(false);
        return index;
      }
      return index + 1;
    });
  };

  const prevGuideStep = () => {
    setGuideStepIndex((index) => Math.max(0, index - 1));
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 9, 25);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(41, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 6.9, 12.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 7.4;
    controls.maxDistance = 16.5;
    controls.target.set(0, 0, 0);

    threeApiRef.current = { camera, controls };

    const ambient = new THREE.AmbientLight(0x94a3b8, 1.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(4, 6.4, 5.5);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x38bdf8, 1.65, 11);
    fillLight.position.set(-4.8, -2.2, 4);
    scene.add(fillLight);

    const warmLight = new THREE.PointLight(0xf97316, 1.25, 10);
    warmLight.position.set(3.8, 3, 4);
    scene.add(warmLight);

    const group = new THREE.Group();
    scene.add(group);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(4.9, 4.9, 0.055, 128),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, transparent: true, opacity: 0.68, roughness: 0.76 })
    );
    platform.position.y = -2.65;
    group.add(platform);

    const grid = new THREE.GridHelper(9.3, 22, 0x1e293b, 0x0f172a);
    grid.position.y = -2.61;
    grid.material.transparent = true;
    grid.material.opacity = 0.38;
    group.add(grid);

    const segmentCurves = {};
    const particles = [];
    const pulsePipes = [];
    const arrows = [];

    Object.entries(PIPE_SEGMENTS).forEach(([segmentKey, segment]) => {
      const activeSegment = guideSegment ? segmentKey === guideSegment : isSegmentActiveForFocus(segmentKey, sceneFocus);
      const color = getSegmentColor(segmentKey, visualState);
      const pipeGroup = makePipe(segment, color, activeSegment);
      group.add(pipeGroup);
      segmentCurves[segmentKey] = pipeGroup.userData.curve;
      if (activeSegment) {
        pulsePipes.push(pipeGroup.userData.core);
        pulsePipes.push(pipeGroup.userData.glass);
      }

      [0.18, 0.36, 0.54, 0.72, 0.88].forEach((t) => {
        const arrow = makeArrowOnCurve(pipeGroup.userData.curve, color, t, activeSegment);
        group.add(arrow);
        arrows.push(arrow);
      });

      const particleCount = segmentKey === 'expansion' ? 34 : 28;
      for (let i = 0; i < particleCount; i += 1) {
        const style = getParticleStyle(segmentKey, visualState, i);
        const geometry = style.phase === 'liquid' || style.phase === 'liquid-droplet' || style.phase === 'liquid-slug'
          ? new THREE.SphereGeometry(style.radius, 14, 14)
          : new THREE.SphereGeometry(style.radius, 12, 12);
        const particle = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({ color: style.color, transparent: true, opacity: activeSegment ? style.opacity : style.opacity * 0.72, depthWrite: false })
        );
        particle.userData.segmentKey = segmentKey;
        particle.userData.offset = i / particleCount;
        particle.userData.jitter = (i % 6) * 0.0055;
        particle.userData.phase = style.phase;
        particle.userData.baseRadius = style.radius;
        group.add(particle);
        particles.push(particle);
      }
    });

    Object.entries(COMPONENTS).forEach(([type, item]) => {
      const isHighlighted = sceneFocus === 'all' || sceneFocus === type || guideComponent === type;
      const component = makeComponent(type, isHighlighted, visualState);
      component.position.set(...item.position);
      if (type === 'condenser' || type === 'evaporator') component.rotation.x = -0.12;
      group.add(component);
    });

    const dangerMarkers = [];
    if (visualState.returnLiquidRisk) {
      const marker = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.022, 12, 68),
        new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.78 })
      );
      marker.position.set(-3.55, -0.8, 0);
      marker.rotation.x = Math.PI / 2;
      group.add(marker);
      dangerMarkers.push(marker);
    }

    if (visualState.hpHigh) {
      const marker = new THREE.Mesh(
        new THREE.TorusGeometry(1.08, 0.02, 12, 90),
        new THREE.MeshBasicMaterial({ color: 0xff3b1f, transparent: true, opacity: 0.66 })
      );
      marker.position.set(0, 2.25, 0);
      marker.rotation.x = Math.PI / 2;
      group.add(marker);
      dangerMarkers.push(marker);
    }

    if (visualState.freezeRisk) {
      const marker = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.018, 12, 90),
        new THREE.MeshBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.62 })
      );
      marker.position.set(0, -2.25, 0);
      marker.rotation.x = Math.PI / 2;
      group.add(marker);
      dangerMarkers.push(marker);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(group.children, true);
      const hit = intersections.find((intersection) => intersection.object.userData.component);
      if (hit?.object?.userData?.component) {
        setSelectedComponent(hit.object.userData.component);
        setDetailOpen(true);
        setGuideActive(false);
        setViewMode((current) => (current === 'circuit' ? 'formation' : current));
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    let raf = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      particles.forEach((particle) => {
        const segmentKey = particle.userData.segmentKey;
        const curve = segmentCurves[segmentKey];
        const localSpeed = guideSegment && guideSegment !== segmentKey ? visualState.speed * 0.45 : visualState.speed;
        const t = (elapsed * localSpeed + particle.userData.offset) % 1;
        const point = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
        const jitter = Math.sin(elapsed * 7 + particle.userData.offset * 24) * particle.userData.jitter;
        point.addScaledVector(normal, jitter);
        particle.position.copy(point);

        if (particle.userData.phase === 'hot-vapor') {
          particle.scale.setScalar(0.86 + Math.abs(Math.sin(elapsed * 4 + particle.userData.offset * 18)) * 0.32);
        } else if (particle.userData.phase === 'liquid') {
          particle.scale.set(1.12, 0.82 + Math.sin(elapsed * 3 + particle.userData.offset * 9) * 0.06, 0.9);
        } else if (particle.userData.phase === 'flash-vapor' || particle.userData.phase === 'flash-bubble') {
          particle.scale.setScalar(0.72 + Math.abs(Math.sin(elapsed * 6 + particle.userData.offset * 18)) * 0.85);
        } else if (particle.userData.phase === 'liquid-droplet') {
          particle.scale.setScalar(0.9 + Math.abs(Math.sin(elapsed * 5 + particle.userData.offset * 12)) * 0.42);
        } else if (particle.userData.phase === 'liquid-slug') {
          particle.scale.setScalar(1.05 + Math.abs(Math.sin(elapsed * 5.5 + particle.userData.offset * 10)) * 0.5);
        } else {
          particle.scale.setScalar(0.9 + Math.sin(elapsed * 3 + particle.userData.offset * 10) * 0.1);
        }
      });

      pulsePipes.forEach((pipe, index) => {
        if (!pipe?.material) return;
        pipe.material.opacity = 0.32 + Math.sin(elapsed * 3.3 + index) * 0.14;
      });

      arrows.forEach((arrow, index) => {
        const scale = arrow.userData.baseScale ?? 1;
        arrow.scale.setScalar(scale + Math.sin(elapsed * 3 + index * 0.4) * 0.08);
      });

      dangerMarkers.forEach((marker, index) => {
        marker.scale.setScalar(1 + Math.sin(elapsed * 2.7 + index) * 0.09);
      });

      Object.entries(COMPONENTS).forEach(([key, item]) => {
        const label = labelRefs.current[key];
        if (!label || !mount) return;
        const position = vectorFromArray(item.position).add(vectorFromArray(item.labelOffset));
        const screen = projectToScreen(position, camera, mount);
        label.style.transform = `translate(-50%, -50%) translate(${screen.x}px, ${screen.y}px)`;
        label.style.opacity = screen.visible && componentLabelsVisible ? '1' : '0';
      });

      Object.entries(PIPE_SEGMENTS).forEach(([key, item]) => {
        const label = pipeLabelRefs.current[key];
        if (!label || !mount) return;
        const position = vectorFromArray(item.labelPosition);
        const screen = projectToScreen(position, camera, mount);
        label.style.transform = `translate(-50%, -50%) translate(${screen.x}px, ${screen.y}px)`;
        label.style.opacity = screen.visible && pipeTextVisible ? '1' : '0';
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
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      threeApiRef.current = null;
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [sceneFocus, guideComponent, guideSegment, componentLabelsVisible, pipeTextVisible, visualState]);

  const measureCards = [
    { key: 'bp', label: 'BP', value: `${visualState.bp.toFixed(1)} bar` },
    { key: 'hp', label: 'HP', value: `${visualState.hp.toFixed(1)} bar` },
    { key: 'sh', label: 'SH', value: `${visualState.sh.toFixed(1)} K` },
    { key: 'sc', label: 'SR', value: `${visualState.sc.toFixed(1)} K` }
  ];

  const levelField = LEVELS[trainingLevel].field;

  return (
    <div className="relative h-full min-h-[590px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.26),rgba(2,6,23,0.98)_62%)] shadow-2xl shadow-black">
      <div ref={mountRef} className="h-full min-h-[590px] w-full" />

      {Object.entries(COMPONENTS).map(([key, item]) => {
        const active = sceneFocus === 'all' || sceneFocus === key || guideComponent === key;
        return (
          <button
            type="button"
            key={key}
            ref={(element) => {
              if (element) labelRefs.current[key] = element;
            }}
            onClick={() => {
              setSelectedComponent(key);
              setDetailOpen(true);
              setGuideActive(false);
              setViewMode((current) => (current === 'circuit' ? 'formation' : current));
            }}
            className={`absolute left-0 top-0 z-10 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] backdrop-blur transition duration-200 hover:scale-105 hover:border-white/80 hover:bg-white/20 ${
              active ? `${item.colorClass} shadow-lg shadow-black/40` : 'border-slate-700 bg-slate-950/60 text-slate-400'
            }`}
          >
            {item.label}
          </button>
        );
      })}

      {Object.entries(PIPE_SEGMENTS).map(([key, item]) => {
        const active = guideSegment === key || (!guideSegment && isSegmentActiveForFocus(key, sceneFocus));
        return (
          <div
            key={key}
            ref={(element) => {
              if (element) pipeLabelRefs.current[key] = element;
            }}
            className={`pointer-events-none absolute left-0 top-0 z-10 rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-black/40 backdrop-blur ${
              active ? 'border-white/25 bg-slate-950/80' : 'border-white/10 bg-slate-950/55'
            }`}
          >
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${item.cssColor}`} />
            {item.shortState}
          </div>
        );
      })}

      <div className="absolute left-4 top-4 z-20 flex max-w-[21rem] flex-col gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/82 text-xs text-slate-300 shadow-2xl backdrop-blur">
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
              {Object.entries(PIPE_SEGMENTS).map(([key, item]) => (
                <div key={key} className="grid grid-cols-[0.75rem_1fr] gap-3">
                  <span className={`mt-1 h-3 w-3 rounded-full ${item.cssColor}`} />
                  <div>
                    <p className="font-black text-white">{item.label} · {item.state}</p>
                    <p className="mt-1 leading-relaxed text-slate-400">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/82 p-3 text-xs text-slate-300 shadow-2xl backdrop-blur">
          <p className="mb-2 font-black uppercase tracking-[0.16em] text-slate-200">Niveau d’explication</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(LEVELS).map(([key, level]) => (
              <button
                type="button"
                key={key}
                onClick={() => setTrainingLevel(key)}
                className={`rounded-xl border px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                  trainingLevel === key
                    ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                    : 'border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 flex max-w-[22rem] flex-col gap-3">
        <div className="rounded-2xl border border-blue-500/20 bg-slate-950/82 text-xs text-slate-300 shadow-2xl backdrop-blur">
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
                    <p className="font-black text-blue-300">Lecture {LEVELS[trainingLevel].label}</p>
                    <p className="mt-1 leading-relaxed text-slate-400">{selectedDetails[levelField]}</p>
                  </div>
                  <div className="mt-3 rounded-2xl bg-amber-500/10 p-3 text-amber-100">
                    <p className="font-black">Attention terrain</p>
                    <p className="mt-1 leading-relaxed text-amber-100/85">{selectedDetails.warning}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-black text-white">Cycle complet</p>
                  <p className="mt-2 leading-relaxed text-slate-400">Clique sur un organe ou démarre la visite guidée. Le circuit montre la circulation du fluide et ses changements d’état.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/82 p-3 text-xs text-slate-300 shadow-2xl backdrop-blur">
          <p className="mb-2 font-black uppercase tracking-[0.16em] text-slate-200">Mesures en direct</p>
          <div className="grid grid-cols-2 gap-2">
            {measureCards.map((card) => (
              <div key={card.key} className={`rounded-xl border px-3 py-2 ${qualityClass(getMeasureStatus(card.key, visualState))}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-80">{card.label}</p>
                <p className="mt-1 font-mono text-sm font-black">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 rounded-2xl bg-blue-500/10 p-3 leading-relaxed text-blue-100">
            {visualState.warnings.slice(0, 3).map((warning) => (
              <p key={warning}>• {warning}</p>
            ))}
          </div>
        </div>
      </div>

      {guideActive && (
        <div className="absolute bottom-24 left-1/2 z-30 w-[min(44rem,calc(100%-2rem))] -translate-x-1/2 rounded-3xl border border-blue-400/30 bg-slate-950/90 p-5 text-slate-200 shadow-2xl shadow-black/60 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">Visite guidée du cycle</p>
              <h3 className="mt-1 text-2xl font-black text-white">{guideStep.title}</h3>
              <p className="mt-2 max-w-2xl leading-relaxed text-slate-300">{guideStep.text}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-400">
              Étape <span className="font-black text-white">{guideStepIndex + 1}</span> / {GUIDE_STEPS.length}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button type="button" onClick={prevGuideStep} disabled={guideStepIndex === 0} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-300 transition hover:border-slate-500 disabled:opacity-35">
              Précédent
            </button>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={stopGuide} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-300 transition hover:border-slate-500">
                Quitter
              </button>
              <button type="button" onClick={nextGuideStep} className="rounded-2xl border border-blue-400 bg-blue-600 px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-blue-500">
                {guideStepIndex === GUIDE_STEPS.length - 1 ? 'Terminer' : 'Suivant'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-20 max-w-[31rem] rounded-2xl border border-slate-800 bg-slate-950/82 text-xs text-slate-300 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={() => setSafetyOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-black uppercase tracking-[0.16em] text-slate-200"
        >
          Purge, antigel et sécurité
          <span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400">{safetyOpen ? 'Réduire' : 'Ouvrir'}</span>
        </button>
        {safetyOpen && (
          <div className="grid max-h-[22rem] gap-3 overflow-y-auto border-t border-slate-800 px-4 py-4 md:grid-cols-2">
            {TRAINING_NOTES.map((note) => (
              <div key={note.title} className="rounded-2xl bg-slate-900/80 p-3">
                <p className="font-black text-white">{note.title}</p>
                <p className="mt-1 leading-relaxed text-slate-400">{note.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 z-20 flex max-w-[34rem] flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={startGuide}
          className="rounded-2xl border border-blue-400 bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white backdrop-blur transition hover:bg-blue-500"
        >
          Visite guidée
        </button>
        <button
          type="button"
          onClick={resetView}
          className="rounded-2xl border border-slate-700 bg-slate-950/82 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-300 backdrop-blur transition hover:border-blue-400 hover:text-white"
        >
          Recentrer
        </button>
        {[
          ['complete', 'Vue complète'],
          ['formation', 'Vue formation'],
          ['circuit', 'Circuit seul']
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            onClick={() => setViewMode(key)}
            className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.16em] backdrop-blur transition ${
              viewMode === key
                ? 'border-blue-400 bg-blue-500/20 text-white'
                : 'border-slate-700 bg-slate-950/82 text-slate-300 hover:border-blue-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {textVisible && !guideActive && (
        <div className="pointer-events-none absolute left-1/2 bottom-[5.8rem] z-10 hidden -translate-x-1/2 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-center text-[11px] text-slate-400 backdrop-blur md:block">
          Fluide visible en continu : vapeur chaude HP → liquide HP → mélange BP → vapeur BP. Les défauts modifient la vitesse, la couleur et les alertes.
        </div>
      )}
    </div>
  );
}
