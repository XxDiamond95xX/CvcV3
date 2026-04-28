'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const DEFAULT_PARAMS = { bp: 4.5, hp: 18.2, sh: 5, sc: 3, evapTemp: 2, condTemp: 45, cop: 3.2 };

const EQUIPMENT = {
  compressor: {
    label: 'Compresseur',
    short: 'Froid',
    layer: 'cooling',
    color: '#ef4444',
    position: [2.8, 0.9, -1.9],
    role: 'Aspire la vapeur basse pression et comprime le fluide pour créer la haute pression.',
    observe: 'Surchauffe, retour liquide, intensité, température de refoulement, bruit mécanique, huile.',
    dc: 'En data center, une perte compresseur peut rapidement réduire la capacité froide. On surveille les alarmes, les séquences de secours et la redondance disponible.',
    warning: 'Ne jamais laisser le compresseur aspirer du liquide. Une surchauffe trop faible doit être traitée immédiatement.'
  },
  condenser: {
    label: 'Condenseur / drycooler',
    short: 'Rejet chaleur',
    layer: 'cooling',
    color: '#f97316',
    position: [3.2, 1.6, 1.75],
    role: 'Rejette la chaleur vers l’extérieur. Sur une installation eau glacée, on retrouve souvent drycooler, condenseur ou groupe froid.',
    observe: 'HP, ventilateurs, encrassement, température extérieure, débit d’eau, sous-refroidissement, alarmes HP.',
    dc: 'Le rejet de chaleur est critique : un condenseur sale ou un drycooler sous-débitant augmente la HP et réduit la marge thermique de la salle IT.',
    warning: 'HP élevée = risque sécurité et perte de performance. Contrôler échange, ventilation/eau et présence possible de non-condensables.'
  },
  expansionValve: {
    label: 'Détendeur',
    short: 'Détente',
    layer: 'cooling',
    color: '#22c55e',
    position: [-2.25, 0.75, -1.35],
    role: 'Crée la chute de pression et dose le fluide envoyé vers la batterie froide.',
    observe: 'BP, surchauffe, stabilité, givrage, alimentation de l’évaporateur, chasse ou pompage.',
    dc: 'Un détendeur mal réglé peut provoquer un manque de puissance froide ou un risque de retour liquide dans une salle à forte charge IT.',
    warning: 'Trop fermé : BP basse et surchauffe haute. Trop ouvert : surchauffe faible et danger compresseur.'
  },
  evaporator: {
    label: 'Batterie froide',
    short: 'Évaporation',
    layer: 'cooling',
    color: '#38bdf8',
    position: [-3.15, 0.95, -1.75],
    role: 'Absorbe la chaleur et vaporise le fluide frigorigène dans le cas d’un CRAC à détente directe.',
    observe: 'Débit d’air, filtres, antigel, BP, surchauffe, reprise/soufflage, propreté batterie.',
    dc: 'La batterie froide est le point de transfert vers l’air de la salle. Une batterie sale ou gelée dégrade vite le refroidissement des baies.',
    warning: 'Débit d’air faible + BP basse = risque antigel et perte de capacité.'
  },
  crac: {
    label: 'CRAC',
    short: 'Unité DX',
    layer: 'air',
    color: '#0ea5e9',
    position: [-3.2, 0.85, -0.55],
    role: 'Unité de climatisation de salle informatique, souvent à détente directe : elle traite l’air, filtre, refroidit et souffle vers les allées froides.',
    observe: 'Filtres, ventilateurs, consigne, température reprise/soufflage, alarmes, condensats, batterie, antigel.',
    dc: 'À vérifier en ronde : température soufflage, delta T, état filtre, ventilateurs EC, absence de fuite d’eau ou de fluide, alarmes locales.',
    warning: 'Ne pas modifier une consigne isolée sans comprendre la stratégie globale de redondance et de confinement.'
  },
  crah: {
    label: 'CRAH',
    short: 'Eau glacée',
    layer: 'air',
    color: '#22d3ee',
    position: [-3.2, 0.85, 0.75],
    role: 'Unité de traitement d’air raccordée à un réseau eau glacée. Elle refroidit l’air par batterie hydraulique.',
    observe: 'Débit eau glacée, vanne 2/3 voies, température départ/retour, filtre, ventilateurs, antigel, condensats.',
    dc: 'Très courant en data center : l’unité dépend du réseau eau glacée, des pompes, des vannes et du pilotage BMS/DCIM.',
    warning: 'Un manque de débit eau glacée peut ressembler à un problème d’air : toujours comparer hydraulique, aéraulique et régulation.'
  },
  pump: {
    label: 'Pompes eau glacée',
    short: 'Hydraulique',
    layer: 'cooling',
    color: '#67e8f9',
    position: [-1.95, 0.52, 1.95],
    role: 'Assurent le débit d’eau glacée vers les CRAH ou batteries hydrauliques.',
    observe: 'Pression différentielle, débit, sens de rotation, variateur, bruit, vibrations, vannes, filtres, glycol.',
    dc: 'Une pompe arrêtée ou bridée peut créer un défaut thermique salle même si les groupes froids sont disponibles.',
    warning: 'Avant d’accuser le groupe froid, vérifier que le débit arrive réellement aux unités de salle.'
  },
  racks: {
    label: 'Baies serveurs',
    short: 'Charge IT',
    layer: 'air',
    color: '#94a3b8',
    position: [0, 1.25, -0.05],
    role: 'La charge IT transforme presque toute l’énergie électrique consommée en chaleur à évacuer.',
    observe: 'Température entrée serveur, points chauds, obstruction, panneaux obturateurs, confinement, charge électrique.',
    dc: 'Les sondes utiles sont en face avant des baies, côté allée froide. Le retour chaud doit être correctement séparé.',
    warning: 'Un brassage air chaud/air froid peut créer des alarmes IT même si la puissance froide totale semble suffisante.'
  },
  rmu: {
    label: 'RMU HTA',
    short: 'Arrivée réseau',
    layer: 'electrical',
    color: '#a3e635',
    position: [-3.35, 0.75, 2.45],
    role: 'Cellule de distribution moyenne tension en boucle. Elle alimente les transformateurs du site.',
    observe: 'État disjoncteur/interrupteur, voyants présence tension, alarmes, verrouillages, consignation, environnement.',
    dc: 'La RMU est en amont de la chaîne critique. Toute manœuvre est strictement encadrée et réservée au personnel habilité.',
    warning: 'Pas de manœuvre HTA sans habilitation, procédure, consignation et accord d’exploitation.'
  },
  transformer: {
    label: 'Transformateur',
    short: 'HTA/BT',
    layer: 'electrical',
    color: '#fde68a',
    position: [-2.25, 0.82, 2.45],
    role: 'Abaisse la tension HTA vers la basse tension utilisée par l’installation.',
    observe: 'Température, ventilation, charge, bruit, odeur, protections, local propre et dégagé.',
    dc: 'Un transformateur chaud ou surchargé réduit la marge d’exploitation et peut limiter la continuité de service.',
    warning: 'Respecter les distances, les protections et les procédures de consignation.'
  },
  ups: {
    label: 'Onduleur / UPS',
    short: 'Secours court',
    layer: 'electrical',
    color: '#8b5cf6',
    position: [-0.95, 0.82, 2.45],
    role: 'Maintient l’alimentation des charges critiques pendant les microcoupures et la transition groupe électrogène.',
    observe: 'Charge %, autonomie batterie, température batterie, bypass, alarmes, redondance, tests périodiques.',
    dc: 'L’UPS protège les baies, le réseau et parfois la régulation. Une alarme batterie n’est jamais anodine.',
    warning: 'Ne jamais passer en bypass sans comprendre la perte de protection et sans coordination exploitation.'
  },
  switchboard: {
    label: 'TGBT / tableaux',
    short: 'Distribution BT',
    layer: 'electrical',
    color: '#facc15',
    position: [0.45, 0.8, 2.45],
    role: 'Distribue la basse tension vers les PDU, les auxiliaires, les groupes froids, les pompes et la salle IT.',
    observe: 'Départs, intensités, échauffements, sélectivité, alarmes, étiquetage, réserve de puissance.',
    dc: 'Le TGBT fait le lien entre énergie et continuité de service. Il doit être clair, étiqueté et exploité avec méthode.',
    warning: 'Un mauvais départ ou une surcharge peut impacter simultanément plusieurs équipements critiques.'
  },
  pdu: {
    label: 'PDU / busway',
    short: 'Baies',
    layer: 'electrical',
    color: '#fbbf24',
    position: [1.65, 1.15, 0.75],
    role: 'Distribue l’énergie aux baies, souvent en double alimentation A/B.',
    observe: 'Charge par phase, charge A/B, prises, disjoncteurs, mesure kW, alarmes seuils.',
    dc: 'Un déséquilibre A/B ou une phase trop chargée réduit la marge de maintenance et de bascule.',
    warning: 'Vérifier la redondance réelle avant toute intervention sur alimentation baie.'
  },
  riser: {
    label: 'Riser technique',
    short: 'Vertical',
    layer: 'electrical',
    color: '#eab308',
    position: [2.85, 1.55, 0.35],
    role: 'Colonne verticale de distribution : câbles, busway, parfois eau glacée, contrôle-commande ou fibres.',
    observe: 'Cheminement, repérage, coupe-feu, supports, condensation, accessibilité, séparation courants forts/faibles.',
    dc: 'Un riser mal repéré complique les interventions et augmente le risque de couper le mauvais départ.',
    warning: 'Toujours vérifier repérage, autorisation et impact avant intervention dans une colonne technique.'
  },
  bms: {
    label: 'BMS / DCIM',
    short: 'Supervision',
    layer: 'electrical',
    color: '#60a5fa',
    position: [2.75, 1.05, 2.15],
    role: 'Supervise températures, alarmes, puissances, états équipements, tendances et historiques.',
    observe: 'Alarmes actives, acquittements, tendances, seuils, sondes incohérentes, communication automate.',
    dc: 'C’est l’outil de priorisation : il aide à savoir quoi traiter en premier pendant une dérive thermique ou électrique.',
    warning: 'Une alarme acquittée n’est pas une alarme résolue. Toujours confirmer sur site quand l’impact est critique.'
  }
};

const FLUID_SEGMENTS = {
  discharge: {
    label: 'Refoulement',
    layer: 'cooling',
    state: 'Vapeur chaude HP',
    color: 0xef4444,
    text: 'Gaz chaud haute pression entre compresseur et condenseur.',
    points: [[2.8, 0.9, -1.9], [3.35, 1.05, -0.7], [3.35, 1.45, 0.8], [3.2, 1.6, 1.75]]
  },
  liquid: {
    label: 'Ligne liquide',
    layer: 'cooling',
    state: 'Liquide HP',
    color: 0xfb923c,
    text: 'Liquide sous-refroidi vers le détendeur.',
    points: [[3.2, 1.5, 1.75], [1.4, 1.18, 1.55], [-0.9, 0.98, 1.35], [-2.25, 0.75, -1.35]]
  },
  expansion: {
    label: 'Après détente',
    layer: 'cooling',
    state: 'Mélange liquide-vapeur BP',
    color: 0x34d399,
    text: 'Mélange froid basse pression envoyé vers la batterie.',
    points: [[-2.25, 0.75, -1.35], [-2.65, 0.7, -1.55], [-3.15, 0.95, -1.75]]
  },
  suction: {
    label: 'Aspiration',
    layer: 'cooling',
    state: 'Vapeur BP',
    color: 0x38bdf8,
    text: 'Vapeur basse pression avec surchauffe de sécurité vers compresseur.',
    points: [[-3.15, 0.95, -1.75], [-1.5, 0.7, -2.35], [0.9, 0.72, -2.3], [2.8, 0.9, -1.9]]
  },
  chilledSupply: {
    label: 'Départ eau glacée',
    layer: 'cooling',
    state: 'Eau glacée vers CRAH',
    color: 0x67e8f9,
    text: 'Départ hydraulique vers les unités CRAH.',
    points: [[-1.95, 0.52, 1.95], [-2.7, 0.52, 1.55], [-3.2, 0.85, 0.75]]
  },
  chilledReturn: {
    label: 'Retour eau glacée',
    layer: 'cooling',
    state: 'Retour plus chaud',
    color: 0x0284c7,
    text: 'Retour hydraulique après échange dans la batterie.',
    points: [[-3.2, 0.78, 0.75], [-2.55, 0.42, 2.15], [-1.95, 0.52, 1.95]]
  }
};

const ELECTRICAL_LINKS = [
  { label: 'HTA', from: 'rmu', to: 'transformer', color: 0xa3e635 },
  { label: 'BT', from: 'transformer', to: 'ups', color: 0xfde68a },
  { label: 'Sortie UPS', from: 'ups', to: 'switchboard', color: 0x8b5cf6 },
  { label: 'Distribution', from: 'switchboard', to: 'pdu', color: 0xfacc15 },
  { label: 'Montée riser', from: 'switchboard', to: 'riser', color: 0xeab308 },
  { label: 'Supervision', from: 'bms', to: 'crac', color: 0x60a5fa },
  { label: 'Supervision', from: 'bms', to: 'ups', color: 0x60a5fa }
];

const GUIDE_STEPS = [
  { title: '1. Charge IT', key: 'racks', layer: 'air', text: 'Les serveurs transforment presque toute l’énergie électrique en chaleur. Le froid sert à maintenir la température d’entrée serveur dans une zone maîtrisée.' },
  { title: '2. Soufflage froid', key: 'crac', layer: 'air', text: 'Le CRAC/CRAH souffle l’air froid vers les allées froides. Le confinement évite le mélange avec l’air chaud de retour.' },
  { title: '3. Évaporation', key: 'evaporator', layer: 'cooling', text: 'Dans un circuit DX, la batterie froide vaporise le fluide. En eau glacée, la batterie échange avec le réseau hydraulique.' },
  { title: '4. Rejet de chaleur', key: 'condenser', layer: 'cooling', text: 'La chaleur prise dans la salle doit être rejetée dehors. Si le rejet est mauvais, la HP monte et la capacité disponible baisse.' },
  { title: '5. Énergie critique', key: 'ups', layer: 'electrical', text: 'L’onduleur maintient l’énergie des charges critiques pendant les défauts réseau et la transition groupe électrogène.' },
  { title: '6. Distribution', key: 'pdu', layer: 'electrical', text: 'Les PDU ou busway distribuent l’énergie aux baies. On contrôle l’équilibrage, la charge et la redondance A/B.' },
  { title: '7. Riser', key: 'riser', layer: 'electrical', text: 'Le riser concentre les distributions verticales. Repérage, coupe-feu et séparation des réseaux sont essentiels.' }
];

function normalizeParams(params) {
  return { ...DEFAULT_PARAMS, ...(params || {}) };
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

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.42,
    metalness: options.metalness ?? 0.18,
    transparent: options.opacity !== undefined,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0
  });
}

function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 0.7 });
}

function setEquipmentKey(group, key) {
  group.userData.equipmentKey = key;
  group.traverse((child) => {
    child.userData.equipmentKey = key;
  });
}

function makeCurve(points) {
  return new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
}

function makeTube(points, color, radius = 0.045, options = {}) {
  const curve = makeCurve(points);
  const geometry = new THREE.TubeGeometry(curve, options.segments ?? 120, radius, options.radial ?? 16, false);
  const mesh = new THREE.Mesh(
    geometry,
    material(color, {
      metalness: options.metalness ?? 0.36,
      roughness: options.roughness ?? 0.3,
      opacity: options.opacity,
      emissive: options.emissive ?? color,
      emissiveIntensity: options.emissiveIntensity ?? 0.08
    })
  );
  mesh.userData.curve = curve;
  return mesh;
}

function makeArrow(color, scale = 1) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.018 * scale, 0.26 * scale, 12), basic(color, 0.7));
  shaft.rotation.z = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.065 * scale, 0.15 * scale, 18), basic(color, 0.88));
  head.rotation.z = -Math.PI / 2;
  head.position.x = 0.19 * scale;
  group.add(shaft, head);
  return group;
}

function orientAlongCurve(object, curve, t) {
  const point = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t).normalize();
  object.position.copy(point);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
}

function makeCabinet(width, height, depth, color, accent = 0xffffff) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color, { roughness: 0.5, metalness: 0.22 }));
  body.position.y = height / 2;
  group.add(body);

  const front = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, height * 0.74, 0.018), basic(accent, 0.18));
  front.position.set(0, height * 0.52, -depth / 2 - 0.011);
  group.add(front);
  return group;
}

function makeCompressor(highlighted, visual) {
  const group = new THREE.Group();
  const bodyColor = visual.returnLiquidRisk ? 0xb91c1c : 0xef4444;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.72, 42), material(bodyColor, { emissive: highlighted ? bodyColor : 0x000000, emissiveIntensity: highlighted ? 0.24 : 0.03 }));
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.34;
  group.add(body);

  const skid = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.72), material(0x334155, { metalness: 0.36 }));
  skid.position.y = 0.08;
  group.add(skid);

  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 28), material(0x7f1d1d));
  motor.rotation.x = Math.PI / 2;
  motor.position.set(-0.48, 0.35, 0.38);
  group.add(motor);
  return group;
}

function makeCondenser(highlighted, visual) {
  const group = new THREE.Group();
  const caseColor = visual.hpHigh ? 0x7f1d1d : 0x475569;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.78, 0.62), material(caseColor, { emissive: highlighted ? 0xf97316 : 0x000000, emissiveIntensity: highlighted ? 0.18 : 0 }));
  body.position.y = 0.39;
  group.add(body);

  for (let i = -1; i <= 1; i += 2) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.018, 12, 40), basic(0x111827, 0.95));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(i * 0.36, 0.43, -0.33);
    const fan = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.018, 0.045), basic(visual.hpHigh ? 0xef4444 : 0x94a3b8, 0.82));
    fan.position.copy(ring.position);
    fan.rotation.y = Math.PI / 4;
    group.add(ring, fan);
  }

  for (let i = -4; i <= 4; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.7, 0.48), material(visual.hpHigh ? 0x991b1b : 0xfdba74));
    fin.position.set(i * 0.14, 0.39, 0.31);
    group.add(fin);
  }
  return group;
}

function makeValve(highlighted) {
  const group = new THREE.Group();
  const valve = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), material(0x22c55e, { emissive: highlighted ? 0x22c55e : 0x000000, emissiveIntensity: highlighted ? 0.26 : 0.04 }));
  valve.position.y = 0.26;
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 16), material(0x86efac));
  spindle.rotation.z = Math.PI / 2;
  spindle.position.y = 0.26;
  group.add(valve, spindle);
  return group;
}

function makeCoilUnit(type, highlighted, visual) {
  const group = new THREE.Group();
  const isCrah = type === 'crah';
  const baseColor = isCrah ? 0x0f766e : 0x0369a1;
  const unit = makeCabinet(0.74, 1.25, 0.58, baseColor, 0xe0f2fe);
  group.add(unit);

  const coilColor = visual.freezeRisk ? 0xe0f2fe : (isCrah ? 0x22d3ee : 0x38bdf8);
  const coil = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.38, 0.035), material(coilColor, { emissive: highlighted ? coilColor : 0x000000, emissiveIntensity: highlighted ? 0.25 : 0.05 }));
  coil.position.set(0, 0.72, -0.31);
  group.add(coil);

  for (let i = -2; i <= 2; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.42, 0.055), material(visual.freezeRisk ? 0xf0f9ff : 0x7dd3fc));
    fin.position.set(i * 0.095, 0.72, -0.35);
    group.add(fin);
  }

  if (visual.freezeRisk) {
    for (let i = 0; i < 9; i += 1) {
      const frost = new THREE.Mesh(new THREE.SphereGeometry(0.028 + (i % 3) * 0.006, 12, 12), basic(0xe0f7ff, 0.72));
      frost.position.set(-0.25 + i * 0.06, 0.91 + Math.sin(i) * 0.03, -0.39);
      group.add(frost);
    }
  }
  return group;
}

function makePump(highlighted) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.42), material(0x334155));
  base.position.y = 0.05;
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 28), material(0x0891b2, { emissive: highlighted ? 0x22d3ee : 0x000000, emissiveIntensity: highlighted ? 0.22 : 0.02 }));
  pump.rotation.z = Math.PI / 2;
  pump.position.y = 0.27;
  group.add(base, pump);
  return group;
}

function makeRackRow() {
  const group = new THREE.Group();
  for (let row = -1; row <= 1; row += 2) {
    for (let i = -2; i <= 2; i += 1) {
      const rack = makeCabinet(0.42, 1.45, 0.52, 0x111827, row < 0 ? 0x60a5fa : 0xef4444);
      rack.position.set(i * 0.54, 0, row * 0.48);
      group.add(rack);

      for (let u = 0; u < 5; u += 1) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.015), basic(0x475569, 0.9));
        blade.position.set(i * 0.54, 0.32 + u * 0.19, row * 0.48 - Math.sign(row) * 0.27);
        group.add(blade);
      }
    }
  }
  const coldAisle = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.035, 0.62), basic(0x38bdf8, 0.16));
  coldAisle.position.set(0, 0.04, 0);
  group.add(coldAisle);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.035, 0.62), basic(0x93c5fd, 0.13));
  roof.position.set(0, 1.57, 0);
  group.add(roof);
  return group;
}

function makeRMU() {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const cell = makeCabinet(0.34, 1.05, 0.42, 0x365314, 0xd9f99d);
    cell.position.x = (i - 1) * 0.36;
    group.add(cell);
  }
  return group;
}

function makeTransformer(highlighted) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.82, 0.58), material(0x57534e, { emissive: highlighted ? 0xfde68a : 0x000000, emissiveIntensity: highlighted ? 0.18 : 0 }));
  core.position.y = 0.41;
  group.add(core);
  for (let i = -2; i <= 2; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.78, 0.66), material(0xa8a29e));
    fin.position.set(i * 0.11, 0.42, 0);
    group.add(fin);
  }
  return group;
}

function makeUPS(highlighted) {
  const group = new THREE.Group();
  for (let i = -1; i <= 1; i += 1) {
    const cab = makeCabinet(0.36, 1.05, 0.5, i === 0 ? 0x312e81 : 0x1e1b4b, 0xc4b5fd);
    cab.position.x = i * 0.38;
    group.add(cab);
  }
  if (highlighted) {
    const glow = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.16, 0.58), basic(0x8b5cf6, 0.12));
    glow.position.y = 0.58;
    group.add(glow);
  }
  return group;
}

function makeSwitchboard(highlighted) {
  const group = new THREE.Group();
  for (let i = -1; i <= 1; i += 1) {
    const cab = makeCabinet(0.38, 0.98, 0.46, 0x3f3f46, 0xfacc15);
    cab.position.x = i * 0.39;
    group.add(cab);
  }
  if (highlighted) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.04, 0.5), basic(0xfacc15, 0.7));
    strip.position.y = 1.04;
    group.add(strip);
  }
  return group;
}

function makePDU() {
  const group = new THREE.Group();
  const bus = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 2.1), material(0xeab308, { emissive: 0xeab308, emissiveIntensity: 0.08 }));
  bus.position.y = 1.55;
  group.add(bus);
  for (let i = -2; i <= 2; i += 1) {
    const tap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), basic(0xfacc15, 0.9));
    tap.position.set(-0.24, 1.52, i * 0.35);
    group.add(tap);
  }
  return group;
}

function makeRiser() {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.3, 0.38), material(0x292524, { opacity: 0.72 }));
  shaft.position.y = 1.15;
  group.add(shaft);
  const colors = [0xfacc15, 0x60a5fa, 0x22d3ee];
  colors.forEach((color, i) => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 14), basic(color, 0.95));
    cable.position.set(-0.11 + i * 0.11, 1.15, -0.21);
    group.add(cable);
  });
  return group;
}

function makeBMS() {
  const group = new THREE.Group();
  const desk = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.28, 0.42), material(0x1e293b));
  desk.position.y = 0.14;
  group.add(desk);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.035), basic(0x60a5fa, 0.58));
  screen.position.set(0, 0.53, -0.18);
  screen.rotation.x = -0.12;
  group.add(screen);
  return group;
}

function makeHighlightRing(color = 0xffffff) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.022, 12, 72), basic(color, 0.75));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  return ring;
}

function getVisualState(params) {
  const p = normalizeParams(params);
  const hpHigh = p.hp >= 21;
  const hpVeryHigh = p.hp >= 24;
  const bpLow = p.bp <= 3.3;
  const bpVeryLow = p.bp <= 2.7;
  const shHigh = p.sh >= 12;
  const shLow = p.sh <= 3;
  const scLow = p.sc <= 1.5;
  const scHigh = p.sc >= 8;
  const freezeRisk = bpVeryLow || (p.bp <= 3.7 && p.sh <= 5);
  const returnLiquidRisk = shLow;
  const underfedEvaporator = bpLow && shHigh;
  const nonCondensables = hpHigh && p.sc >= 5;

  const warnings = [];
  if (hpVeryHigh) warnings.push('HP très élevée : risque déclenchement sécurité. Contrôler condenseur/drycooler, ventilation, débit eau, charge et non-condensables.');
  else if (hpHigh) warnings.push('HP élevée : échange extérieur insuffisant ou non-condensables possibles.');
  if (underfedEvaporator) warnings.push('BP basse + surchauffe haute : batterie sous-alimentée, filtre/détendeur/charge à contrôler.');
  if (returnLiquidRisk) warnings.push('Surchauffe faible : risque de retour liquide compresseur. Situation prioritaire.');
  if (freezeRisk) warnings.push('Risque antigel : vérifier débit d’air/eau, filtres, pompe/ventilateur, glycol et sonde antigel.');
  if (scLow) warnings.push('Sous-refroidissement faible : ligne liquide instable ou manque de liquide disponible.');
  if (!warnings.length) warnings.push('Fonctionnement proche du nominal : suivre la charge IT, la circulation du fluide et les alarmes BMS/DCIM.');

  let flowSpeed = 0.115;
  if (underfedEvaporator || scLow) flowSpeed = 0.075;
  if (returnLiquidRisk) flowSpeed = 0.145;
  if (hpHigh) flowSpeed += 0.015;

  return { ...p, hpHigh, hpVeryHigh, bpLow, bpVeryLow, shHigh, shLow, scLow, scHigh, freezeRisk, returnLiquidRisk, underfedEvaporator, nonCondensables, flowSpeed, warnings };
}

function colorForSegment(key, visual) {
  if (key === 'discharge') return visual.hpHigh ? 0xff2626 : FLUID_SEGMENTS[key].color;
  if (key === 'liquid') return visual.scLow ? 0xfacc15 : FLUID_SEGMENTS[key].color;
  if (key === 'expansion') return visual.underfedEvaporator ? 0x16a34a : FLUID_SEGMENTS[key].color;
  if (key === 'suction') return visual.returnLiquidRisk ? 0x93c5fd : FLUID_SEGMENTS[key].color;
  return FLUID_SEGMENTS[key].color;
}

function particleStyle(segmentKey, visual, index) {
  if (segmentKey === 'discharge') return { color: visual.hpHigh ? 0xff1f1f : 0xff6b35, radius: 0.038 + (index % 3) * 0.006, opacity: 0.9 };
  if (segmentKey === 'liquid') return { color: visual.scLow && index % 4 === 0 ? 0xffffff : 0xfacc15, radius: 0.034, opacity: visual.scLow && index % 4 === 0 ? 0.68 : 0.95 };
  if (segmentKey === 'expansion') return { color: index % 3 === 0 ? 0xe0f2fe : 0x34d399, radius: index % 3 === 0 ? 0.027 : 0.046, opacity: 0.88 };
  if (segmentKey === 'suction') {
    if (visual.returnLiquidRisk && index % 4 === 0) return { color: 0xdbeafe, radius: 0.055, opacity: 0.94 };
    return { color: 0x7dd3fc, radius: 0.037, opacity: 0.86 };
  }
  if (segmentKey === 'chilledSupply') return { color: 0x67e8f9, radius: 0.034, opacity: 0.82 };
  if (segmentKey === 'chilledReturn') return { color: 0x0ea5e9, radius: 0.034, opacity: 0.76 };
  return { color: 0xffffff, radius: 0.035, opacity: 0.8 };
}

function layerMatches(key, activeLayer) {
  if (activeLayer === 'all') return true;
  return EQUIPMENT[key]?.layer === activeLayer;
}

function segmentMatches(key, activeLayer) {
  if (activeLayer === 'all') return true;
  return FLUID_SEGMENTS[key]?.layer === activeLayer;
}

function projectToScreen(position, camera, mount) {
  const projected = position.clone().project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * mount.clientWidth,
    y: (-projected.y * 0.5 + 0.5) * mount.clientHeight,
    visible: projected.z > -1 && projected.z < 1
  };
}

function findEquipmentFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.equipmentKey) return current.userData.equipmentKey;
    current = current.parent;
  }
  return null;
}

function makeElectricalCable(from, to, color) {
  return makeTube([from, [(from[0] + to[0]) / 2, 1.72, (from[2] + to[2]) / 2], to], color, 0.025, { opacity: 0.86, emissiveIntensity: 0.12, radial: 10, segments: 64 });
}

function statusClass(kind) {
  if (kind === 'danger') return 'border-red-400/35 bg-red-500/10 text-red-100';
  if (kind === 'watch') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
}

function measureStatus(key, visual) {
  if (key === 'HP') return visual.hpVeryHigh ? 'danger' : visual.hpHigh ? 'watch' : 'ok';
  if (key === 'BP') return visual.bpVeryLow ? 'danger' : visual.bpLow ? 'watch' : 'ok';
  if (key === 'SH') return visual.shLow ? 'danger' : visual.shHigh ? 'watch' : 'ok';
  if (key === 'SR') return visual.scLow || visual.scHigh ? 'watch' : 'ok';
  return 'ok';
}

export default function HvacCycle3D({ highlightedComponent = 'all', params, simulationParams }) {
  const mountRef = useRef(null);
  const labelRefs = useRef({});
  const resetViewRef = useRef(null);
  const [selectedKey, setSelectedKey] = useState(highlightedComponent === 'all' ? 'racks' : highlightedComponent);
  const [activeLayer, setActiveLayer] = useState('all');
  const [viewMode, setViewMode] = useState('formation');
  const [drawer, setDrawer] = useState(null);
  const [guideIndex, setGuideIndex] = useState(0);

  const normalizedParams = useMemo(() => normalizeParams(params ?? simulationParams), [params, simulationParams]);
  const visual = useMemo(() => getVisualState(normalizedParams), [normalizedParams.bp, normalizedParams.hp, normalizedParams.sh, normalizedParams.sc]);
  const selected = EQUIPMENT[selectedKey] || null;
  const guideStep = GUIDE_STEPS[guideIndex];
  const guidedKey = drawer === 'guide' ? guideStep.key : null;
  const effectiveFocus = guidedKey || (highlightedComponent !== 'all' ? highlightedComponent : selectedKey);
  const labelsVisible = viewMode !== 'circuit';
  const showOnlyTechnicalLayer = viewMode === 'circuit' ? 'cooling' : activeLayer;

  useEffect(() => {
    if (highlightedComponent && highlightedComponent !== 'all' && EQUIPMENT[highlightedComponent]) {
      setSelectedKey(highlightedComponent);
    }
  }, [highlightedComponent]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 6, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(5.6, 4.4, 6.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 4.9;
    controls.maxDistance = 11.5;
    controls.target.set(0, 0.75, 0.25);

    resetViewRef.current = () => {
      camera.position.set(5.6, 4.4, 6.4);
      controls.target.set(0, 0.75, 0.25);
      controls.update();
    };

    scene.add(new THREE.AmbientLight(0x94a3b8, 1.22));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);
    const coolLight = new THREE.PointLight(0x38bdf8, 1.9, 8);
    coolLight.position.set(-3.5, 1.8, -1.2);
    scene.add(coolLight);
    const warmLight = new THREE.PointLight(0xf97316, 1.4, 7);
    warmLight.position.set(3.5, 2, 1.8);
    scene.add(warmLight);

    const root = new THREE.Group();
    scene.add(root);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.06, 5.8), material(0x0f172a, { roughness: 0.68, metalness: 0.05 }));
    floor.position.y = -0.03;
    root.add(floor);

    for (let x = -3.8; x <= 3.81; x += 0.6) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 5.8), basic(0x334155, 0.42));
      line.position.set(x, 0.01, 0);
      root.add(line);
    }
    for (let z = -2.9; z <= 2.91; z += 0.6) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.012, 0.008), basic(0x334155, 0.42));
      line.position.set(0, 0.012, z);
      root.add(line);
    }

    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.8, 0.05), basic(0x1e293b, 0.23));
    wallBack.position.set(0, 0.9, 2.92);
    root.add(wallBack);
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.8, 5.8), basic(0x1e293b, 0.18));
    wallLeft.position.set(-3.82, 0.9, 0);
    root.add(wallLeft);

    const coldArrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 24), basic(0x38bdf8, 0.38));
    coldArrow.rotation.z = -Math.PI / 2;
    coldArrow.position.set(-1.95, 0.38, 0);
    root.add(coldArrow);
    const hotArrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 24), basic(0xef4444, 0.28));
    hotArrow.rotation.z = Math.PI / 2;
    hotArrow.position.set(1.95, 1.1, 0.92);
    root.add(hotArrow);

    const equipmentGroups = {};
    const addEquipment = (key, group) => {
      const [x, y, z] = EQUIPMENT[key].position;
      group.position.set(x, y - 0.1, z);
      setEquipmentKey(group, key);
      const isFocused = effectiveFocus === key;
      if (isFocused) {
        const ring = makeHighlightRing(new THREE.Color(EQUIPMENT[key].color).getHex());
        ring.position.y += 0.02;
        group.add(ring);
      }
      root.add(group);
      equipmentGroups[key] = group;
    };

    addEquipment('compressor', makeCompressor(effectiveFocus === 'compressor', visual));
    addEquipment('condenser', makeCondenser(effectiveFocus === 'condenser', visual));
    addEquipment('expansionValve', makeValve(effectiveFocus === 'expansionValve'));
    addEquipment('evaporator', makeCoilUnit('crac', effectiveFocus === 'evaporator', visual));
    addEquipment('crac', makeCoilUnit('crac', effectiveFocus === 'crac', visual));
    addEquipment('crah', makeCoilUnit('crah', effectiveFocus === 'crah', visual));
    addEquipment('pump', makePump(effectiveFocus === 'pump'));
    addEquipment('racks', makeRackRow());
    addEquipment('rmu', makeRMU());
    addEquipment('transformer', makeTransformer(effectiveFocus === 'transformer'));
    addEquipment('ups', makeUPS(effectiveFocus === 'ups'));
    addEquipment('switchboard', makeSwitchboard(effectiveFocus === 'switchboard'));
    addEquipment('pdu', makePDU());
    addEquipment('riser', makeRiser());
    addEquipment('bms', makeBMS());

    const pipeObjects = [];
    Object.entries(FLUID_SEGMENTS).forEach(([key, segment]) => {
      const layerAlpha = segmentMatches(key, showOnlyTechnicalLayer) ? 1 : 0.18;
      const focusAlpha = effectiveFocus && ['compressor', 'condenser', 'expansionValve', 'evaporator', 'crac', 'crah', 'pump'].includes(effectiveFocus) && segment.layer === 'cooling' ? 1 : layerAlpha;
      const color = colorForSegment(key, visual);
      const pipe = makeTube(segment.points, color, key.startsWith('chilled') ? 0.04 : 0.052, { opacity: focusAlpha < 1 ? 0.26 : undefined, emissiveIntensity: focusAlpha < 1 ? 0.03 : 0.12 });
      root.add(pipe);

      const curve = pipe.userData.curve;
      for (let t = 0.22; t <= 0.82; t += 0.3) {
        const arrow = makeArrow(color, key.startsWith('chilled') ? 0.72 : 0.82);
        orientAlongCurve(arrow, curve, t);
        root.add(arrow);
      }

      const particles = [];
      const count = key.startsWith('chilled') ? 10 : 16;
      for (let i = 0; i < count; i += 1) {
        const style = particleStyle(key, visual, i);
        const particle = new THREE.Mesh(new THREE.SphereGeometry(style.radius, 14, 14), basic(style.color, style.opacity));
        particle.userData.offset = i / count;
        particle.userData.segmentKey = key;
        root.add(particle);
        particles.push(particle);
      }
      pipeObjects.push({ key, curve, particles });
    });

    ELECTRICAL_LINKS.forEach((link) => {
      const from = EQUIPMENT[link.from].position;
      const to = EQUIPMENT[link.to].position;
      const cable = makeElectricalCable([from[0], from[1] + 0.28, from[2]], [to[0], to[1] + 0.28, to[2]], link.color);
      cable.visible = showOnlyTechnicalLayer === 'all' || showOnlyTechnicalLayer === 'electrical';
      root.add(cable);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clickable = [];
    root.traverse((child) => {
      if (child.isMesh && child.userData?.equipmentKey) clickable.push(child);
    });

    const onPointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickable, true);
      if (hits.length) {
        const key = findEquipmentFromObject(hits[0].object);
        if (key) {
          setSelectedKey(key);
          setDrawer('selected');
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const labelAnchors = Object.fromEntries(Object.entries(EQUIPMENT).map(([key, item]) => [key, new THREE.Vector3(item.position[0], item.position[1] + 0.75, item.position[2])])) ;
    let frame = 0;
    let raf = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      frame += 1;
      pipeObjects.forEach(({ key, curve, particles }) => {
        const reverse = false;
        particles.forEach((particle, index) => {
          const speed = (key.startsWith('chilled') ? 0.065 : visual.flowSpeed) * (1 + (index % 3) * 0.05);
          const t = (particle.userData.offset + elapsed * speed * (reverse ? -1 : 1)) % 1;
          const safeT = t < 0 ? t + 1 : t;
          const pos = curve.getPointAt(safeT);
          particle.position.copy(pos);
          const pulse = 1 + Math.sin(elapsed * 5 + index) * 0.12;
          particle.scale.setScalar(pulse);
        });
      });

      Object.entries(labelRefs.current).forEach(([key, element]) => {
        const anchor = labelAnchors[key];
        if (!element || !anchor) return;
        const projected = projectToScreen(anchor, camera, mount);
        element.style.transform = `translate3d(${projected.x}px, ${projected.y}px, 0) translate(-50%, -50%)`;
        element.style.opacity = projected.visible ? '1' : '0';
      });

      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      resetViewRef.current = null;
      disposeObject(root);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [effectiveFocus, showOnlyTechnicalLayer, viewMode, visual.bp, visual.hp, visual.sh, visual.sc, visual.flowSpeed, visual.freezeRisk, visual.hpHigh, visual.returnLiquidRisk, visual.underfedEvaporator, visual.scLow]);

  const labelItems = Object.entries(EQUIPMENT).filter(([key]) => labelsVisible && layerMatches(key, activeLayer));
  const measures = [
    ['BP', visual.bp, 'bar'],
    ['HP', visual.hp, 'bar'],
    ['SH', visual.sh, 'K'],
    ['SR', visual.sc, 'K']
  ];

  return (
    <div className="relative h-full min-h-[520px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.20),rgba(2,6,23,0.98)_62%)] shadow-2xl shadow-black md:min-h-[620px]">
      <div ref={mountRef} className="h-full min-h-[520px] w-full md:min-h-[620px]" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-2xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 backdrop-blur md:left-4 md:top-4">
        Data center · froid · électricité · flux d’air
      </div>

      {labelItems.map(([key, item]) => {
        const isActive = key === selectedKey || key === effectiveFocus;
        const muted = activeLayer !== 'all' && item.layer !== activeLayer;
        return (
          <button
            key={key}
            ref={(node) => { if (node) labelRefs.current[key] = node; }}
            type="button"
            onClick={() => {
              setSelectedKey(key);
              setDrawer('selected');
            }}
            className={`absolute left-0 top-0 z-10 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] backdrop-blur transition hover:scale-105 md:px-3 md:text-[10px] ${
              isActive
                ? 'border-white/70 bg-white/18 text-white shadow-[0_0_24px_rgba(255,255,255,0.18)]'
                : muted
                  ? 'border-slate-800 bg-slate-950/45 text-slate-600'
                  : 'border-slate-700 bg-slate-950/68 text-slate-300 hover:border-blue-300'
            }`}
          >
            {item.label}
          </button>
        );
      })}

      <div className="absolute right-3 top-3 z-20 grid grid-cols-2 gap-2 md:right-4 md:top-4 md:grid-cols-4">
        {measures.map(([label, value, unit]) => (
          <div key={label} className={`rounded-2xl border px-3 py-2 text-right backdrop-blur ${statusClass(measureStatus(label, visual))}`}>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-75">{label}</p>
            <p className="font-mono text-sm font-black text-white md:text-base">{value}<span className="ml-1 text-[10px] opacity-65">{unit}</span></p>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 right-3 z-30 rounded-3xl border border-slate-700/70 bg-slate-950/82 p-2 shadow-2xl backdrop-blur md:bottom-4 md:left-4 md:right-4">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'Tout'],
              ['cooling', 'Froid'],
              ['air', 'Salle IT'],
              ['electrical', 'Élec']
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveLayer(key)}
                className={`rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition ${activeLayer === key ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ['formation', 'Formation'],
              ['circuit', 'Circuit seul']
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewMode(key)}
                className={`rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition ${viewMode === key ? 'bg-white text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setDrawer(drawer === 'legend' ? null : 'legend')} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-300 transition hover:bg-slate-800 hover:text-white">Légende</button>
            <button type="button" onClick={() => setDrawer(drawer === 'guide' ? null : 'guide')} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-300 transition hover:bg-slate-800 hover:text-white">Guide</button>
            <button type="button" onClick={() => setDrawer(drawer === 'risks' ? null : 'risks')} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-300 transition hover:bg-slate-800 hover:text-white">Risques</button>
            <button type="button" onClick={() => resetViewRef.current?.()} className="rounded-2xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white transition hover:bg-blue-500">Recentrer</button>
          </div>
        </div>
      </div>

      {drawer ? (
        <div className="absolute bottom-[7.6rem] left-3 right-3 z-30 max-h-[48%] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950/92 p-5 text-sm text-slate-300 shadow-2xl backdrop-blur md:left-auto md:right-4 md:w-[26rem] xl:bottom-[6.2rem]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
                {drawer === 'selected' ? 'Équipement sélectionné' : drawer === 'legend' ? 'Légende technique' : drawer === 'guide' ? 'Visite guidée' : 'Risques exploitation'}
              </p>
              <h3 className="mt-1 text-xl font-black text-white">
                {drawer === 'selected' ? selected?.label || 'Sélectionne un élément' : drawer === 'guide' ? guideStep.title : drawer === 'legend' ? 'Lire la scène sans surcharge' : 'Priorités terrain'}
              </h3>
            </div>
            <button type="button" onClick={() => setDrawer(null)} className="rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-300 hover:bg-slate-700">Fermer</button>
          </div>

          {drawer === 'selected' && selected ? (
            <div className="space-y-4">
              <p className="leading-relaxed text-slate-300">{selected.role}</p>
              <div className="rounded-2xl bg-slate-900/80 p-4">
                <p className="font-black text-blue-300">À contrôler sur site</p>
                <p className="mt-1 leading-relaxed text-slate-400">{selected.observe}</p>
              </div>
              <div className="rounded-2xl bg-blue-500/10 p-4">
                <p className="font-black text-blue-100">Contexte data center</p>
                <p className="mt-1 leading-relaxed text-blue-100/80">{selected.dc}</p>
              </div>
              <div className="rounded-2xl bg-amber-500/10 p-4 text-amber-100">
                <p className="font-black">Attention</p>
                <p className="mt-1 leading-relaxed text-amber-100/80">{selected.warning}</p>
              </div>
            </div>
          ) : null}

          {drawer === 'legend' ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                {Object.entries(FLUID_SEGMENTS).map(([key, segment]) => (
                  <div key={key} className="grid grid-cols-[0.8rem_1fr] gap-3 rounded-2xl bg-slate-900/70 p-3">
                    <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: `#${colorForSegment(key, visual).toString(16).padStart(6, '0')}` }} />
                    <div>
                      <p className="font-black text-white">{segment.label} · {segment.state}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{segment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="rounded-2xl bg-slate-900/80 p-4 text-xs leading-relaxed text-slate-400">Les câbles jaunes/violets représentent la chaîne électrique critique : RMU, transformateur, onduleur, TGBT, PDU, riser et supervision.</p>
            </div>
          ) : null}

          {drawer === 'guide' ? (
            <div className="space-y-4">
              <p className="leading-relaxed text-slate-300">{guideStep.text}</p>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setGuideIndex((value) => Math.max(0, value - 1))} disabled={guideIndex === 0} className="rounded-2xl bg-slate-800 px-4 py-2 font-black text-white disabled:opacity-35">Précédent</button>
                <p className="text-xs font-black text-slate-500">{guideIndex + 1} / {GUIDE_STEPS.length}</p>
                <button type="button" onClick={() => setGuideIndex((value) => Math.min(GUIDE_STEPS.length - 1, value + 1))} disabled={guideIndex === GUIDE_STEPS.length - 1} className="rounded-2xl bg-blue-600 px-4 py-2 font-black text-white disabled:opacity-35">Suivant</button>
              </div>
            </div>
          ) : null}

          {drawer === 'risks' ? (
            <div className="space-y-3">
              {visual.warnings.map((warning) => (
                <div key={warning} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-100">
                  {warning}
                </div>
              ))}
              <div className="rounded-2xl bg-slate-900/80 p-4 text-xs leading-relaxed text-slate-400">
                <p className="font-black text-slate-200">Méthode data center</p>
                <p className="mt-1">Avant d’intervenir : identifier l’impact client, vérifier la redondance disponible, prévenir l’exploitation, sécuriser l’énergie, puis seulement agir sur le froid ou l’électricité.</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
