'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const DEFAULT_PARAMS = {
  bp: 4.5,
  hp: 18.2,
  sh: 5,
  sc: 3,
  evapTemp: 2,
  condTemp: 45,
  cop: 3.2
};

const VIEW_CONFIG = {
  beginner: {
    label: 'Débutant',
    hint: 'Vue bâtiment, flux principaux et zones métier.',
    circuits: ['airCold', 'airHot', 'chwSupply', 'chwReturn', 'dryHot', 'dryCold', 'elecCritical'],
    equipment: ['racks', 'crah', 'crac', 'pumpSkid', 'production', 'drycooler', 'riser', 'ups', 'pdu'],
    zones: ['itRoom', 'coolingPlant', 'roof', 'riserZone', 'electricalRoom']
  },
  cooling: {
    label: 'Froid / eau',
    hint: 'Lecture des boucles froid, eau glacée, glycol et DX.',
    circuits: ['chwSupply', 'chwReturn', 'dryHot', 'dryCold', 'dxDischarge', 'dxLiquid', 'dxExpansion', 'dxSuction'],
    equipment: ['crac', 'crah', 'coil', 'compressor', 'expansionValve', 'pumpSkid', 'production', 'drycooler', 'riser'],
    zones: ['itRoom', 'coolingPlant', 'roof', 'riserZone']
  },
  air: {
    label: 'Air salle IT',
    hint: 'Lecture allée froide, allée chaude, reprise et soufflage.',
    circuits: ['airCold', 'airHot'],
    equipment: ['racks', 'crac', 'crah', 'coil'],
    zones: ['itRoom']
  },
  electrical: {
    label: 'Électricité',
    hint: 'Chaîne énergie critique : HTA, BT, UPS, distribution, baies.',
    circuits: ['elecCritical', 'elecControl'],
    equipment: ['rmu', 'transformer', 'ups', 'switchboard', 'pdu', 'bms', 'riser'],
    zones: ['electricalRoom', 'riserZone', 'itRoom']
  },
  all: {
    label: 'Tout',
    hint: 'Vue complète pour technicien confirmé.',
    circuits: ['airCold', 'airHot', 'chwSupply', 'chwReturn', 'dryHot', 'dryCold', 'dxDischarge', 'dxLiquid', 'dxExpansion', 'dxSuction', 'elecCritical', 'elecControl'],
    equipment: ['racks', 'crac', 'crah', 'coil', 'compressor', 'expansionValve', 'pumpSkid', 'production', 'drycooler', 'riser', 'rmu', 'transformer', 'ups', 'switchboard', 'pdu', 'bms'],
    zones: ['itRoom', 'coolingPlant', 'roof', 'riserZone', 'electricalRoom']
  }
};

const ZONES = {
  itRoom: {
    label: 'Salle IT',
    subtitle: 'baies · allée froide · allée chaude',
    color: 0x38bdf8,
    center: [-2.25, 0.08, -0.25],
    size: [3.85, 0.08, 3.1],
    labelPos: [-2.35, 2.18, -1.75]
  },
  coolingPlant: {
    label: 'Local froid / hydraulique',
    subtitle: 'pompes · échange · production',
    color: 0x22d3ee,
    center: [1.55, 0.09, -1.55],
    size: [3.05, 0.08, 2.35],
    labelPos: [1.25, 2.05, -2.65]
  },
  electricalRoom: {
    label: 'Local électrique',
    subtitle: 'RMU · transfo · UPS · TGBT',
    color: 0xfacc15,
    center: [1.55, 0.1, 1.65],
    size: [3.05, 0.08, 2.25],
    labelPos: [1.7, 2.05, 2.65]
  },
  riserZone: {
    label: 'Riser technique',
    subtitle: 'toiture ↔ salles techniques',
    color: 0xa78bfa,
    center: [3.35, 1.55, 0.15],
    size: [0.55, 3.05, 0.75],
    labelPos: [3.35, 3.18, 0.2]
  },
  roof: {
    label: 'Toit terrasse',
    subtitle: 'drycoolers · rejet de chaleur',
    color: 0xf97316,
    center: [1.95, 3.05, -0.15],
    size: [3.6, 0.08, 2.35],
    labelPos: [2.0, 3.85, -1.45]
  }
};

const EQUIPMENT = {
  racks: {
    label: 'Baies serveurs',
    layer: 'air',
    color: '#94a3b8',
    position: [-2.15, 0.98, -0.15],
    summary: 'La charge IT transforme presque toute l’énergie consommée en chaleur.',
    observe: 'Température entrée serveur, points chauds, panneaux obturateurs, confinement, charge kW, redondance A/B.',
    beginner: 'Les serveurs chauffent. L’air froid doit arriver devant les baies, puis l’air chaud doit repartir sans se mélanger.'
  },
  crac: {
    label: 'CRAC DX',
    layer: 'cooling',
    color: '#0ea5e9',
    position: [-3.85, 0.78, -1.18],
    summary: 'Unité de salle avec circuit frigorifique à détente directe.',
    observe: 'Filtres, ventilateurs, batterie, détente, compresseur, condensats, antigel, alarmes locales.',
    beginner: 'Le CRAC refroidit l’air de la salle directement avec un circuit frigorifique.'
  },
  crah: {
    label: 'CRAH eau glacée',
    layer: 'cooling',
    color: '#22d3ee',
    position: [-3.85, 0.78, 0.92],
    summary: 'Unité de salle raccordée à une boucle eau glacée.',
    observe: 'Débit eau glacée, vanne, départ/retour, ventilateurs EC, filtre, antigel, condensats.',
    beginner: 'Le CRAH refroidit l’air grâce à de l’eau glacée qui passe dans une batterie.'
  },
  coil: {
    label: 'Batterie froide',
    layer: 'cooling',
    color: '#7dd3fc',
    position: [-3.72, 1.15, 0.0],
    summary: 'Point d’échange entre l’air de la salle et le fluide froid.',
    observe: 'Écart reprise/soufflage, débit air, propreté batterie, risque antigel, humidité, condensats.',
    beginner: 'C’est ici que l’air chaud perd sa chaleur avant de retourner vers les allées froides.'
  },
  compressor: {
    label: 'Compresseur DX',
    layer: 'cooling',
    color: '#ef4444',
    position: [1.62, 0.58, -2.25],
    summary: 'Aspire la vapeur BP et crée la HP du circuit frigorifique DX.',
    observe: 'Surchauffe, retour liquide, intensité, refoulement, huile, bruit, vibrations.',
    beginner: 'Il met le fluide sous pression. Il doit aspirer de la vapeur, jamais du liquide.'
  },
  expansionValve: {
    label: 'Détendeur DX',
    layer: 'cooling',
    color: '#22c55e',
    position: [-3.35, 0.48, -1.72],
    summary: 'Abaisse la pression et dose le fluide vers la batterie.',
    observe: 'BP, surchauffe, stabilité, givrage, alimentation batterie.',
    beginner: 'Il provoque la chute de pression qui permet au fluide de produire du froid.'
  },
  pumpSkid: {
    label: 'Pompes',
    layer: 'cooling',
    color: '#67e8f9',
    position: [0.55, 0.42, -1.45],
    summary: 'Assurent le débit des boucles eau glacée / glycol.',
    observe: 'Pression différentielle, débit, variateur, bruit, vannes, filtres, glycol, purge.',
    beginner: 'Sans débit, la production de froid ne rejoint pas correctement les unités de salle.'
  },
  production: {
    label: 'Production froid',
    layer: 'cooling',
    color: '#38bdf8',
    position: [1.85, 0.64, -1.3],
    summary: 'Ensemble échangeur/groupe froid reliant boucle salle et rejet toiture.',
    observe: 'Départ/retour eau, charge, alarmes, antigel, condenseur, vannes, régulation.',
    beginner: 'C’est le cœur technique qui prépare l’eau froide et évacue la chaleur vers la toiture.'
  },
  drycooler: {
    label: 'Drycooler toiture',
    layer: 'cooling',
    color: '#f97316',
    position: [2.25, 3.28, -0.2],
    summary: 'Rejette la chaleur dehors depuis le toit terrasse.',
    observe: 'Ventilateurs, batterie, glycol, purgeurs, encrassement, température extérieure, débit.',
    beginner: 'La chaleur récupérée dans la salle finit dehors. Ici, les ventilateurs aident à l’évacuer.'
  },
  riser: {
    label: 'Riser toiture',
    layer: 'mixed',
    color: '#a78bfa',
    position: [3.35, 1.55, 0.15],
    summary: 'Colonne verticale entre toit, local froid, local électrique et salle IT.',
    observe: 'Départ/retour, purgeurs, vannes, calorifuge, supports, coupe-feu, repérage, accès toiture.',
    beginner: 'C’est l’autoroute verticale du bâtiment : tuyaux, câbles et supervision passent par ici.'
  },
  rmu: {
    label: 'RMU HTA',
    layer: 'electrical',
    color: '#a3e635',
    position: [0.35, 0.62, 1.98],
    summary: 'Arrivée moyenne tension du site.',
    observe: 'Présence tension, verrouillages, état cellules, environnement, procédure d’exploitation.',
    beginner: 'C’est l’arrivée électrique principale côté haute tension. Intervention réservée aux habilités.'
  },
  transformer: {
    label: 'Transformateur',
    layer: 'electrical',
    color: '#fde68a',
    position: [1.15, 0.68, 1.98],
    summary: 'Transforme la HTA en basse tension utilisable.',
    observe: 'Charge, température, ventilation, bruit, protections, propreté local.',
    beginner: 'Il adapte la tension pour alimenter les équipements du bâtiment.'
  },
  ups: {
    label: 'Onduleur / UPS',
    layer: 'electrical',
    color: '#8b5cf6',
    position: [2.0, 0.74, 1.98],
    summary: 'Maintient l’alimentation critique pendant les coupures ou microcoupures.',
    observe: 'Charge %, autonomie batterie, bypass, température batterie, alarmes, redondance.',
    beginner: 'Il protège les serveurs le temps que la source de secours prenne le relais.'
  },
  switchboard: {
    label: 'TGBT',
    layer: 'electrical',
    color: '#facc15',
    position: [2.85, 0.68, 1.98],
    summary: 'Distribue la basse tension vers les équipements critiques.',
    observe: 'Départs, intensités, échauffements, sélectivité, étiquetage, réserve de puissance.',
    beginner: 'C’est le tableau de distribution principal basse tension.'
  },
  pdu: {
    label: 'PDU / busway',
    layer: 'electrical',
    color: '#fbbf24',
    position: [-0.55, 1.65, 0.85],
    summary: 'Distribue l’énergie aux baies, souvent en double alimentation A/B.',
    observe: 'Charge par phase, charge A/B, disjoncteurs, mesure kW, alarmes seuils.',
    beginner: 'C’est la distribution finale qui nourrit les racks serveurs.'
  },
  bms: {
    label: 'BMS / DCIM',
    layer: 'electrical',
    color: '#60a5fa',
    position: [3.15, 1.15, 1.1],
    summary: 'Supervise alarmes, températures, puissances, tendances et états équipements.',
    observe: 'Alarmes actives, tendances, seuils, sondes incohérentes, communication automate.',
    beginner: 'C’est le tableau de bord d’exploitation. Il aide à savoir où regarder en premier.'
  }
};

const CIRCUITS = {
  airCold: {
    label: 'Air froid soufflé',
    type: 'air',
    color: 0x38bdf8,
    state: 'Air froid vers faces avant des baies',
    points: [[-3.65, 0.62, 0.35], [-3.0, 0.42, 0.08], [-2.3, 0.38, -0.08], [-1.45, 0.45, -0.08], [-0.85, 0.62, -0.08]],
    radius: 0.115,
    particles: 36,
    speed: 0.09
  },
  airHot: {
    label: 'Air chaud repris',
    type: 'air',
    color: 0xf97316,
    state: 'Air chaud retour vers CRAC/CRAH',
    points: [[-0.85, 1.72, 0.58], [-1.55, 1.9, 0.8], [-2.35, 1.88, 0.78], [-3.15, 1.55, 0.62], [-3.7, 1.18, 0.55]],
    radius: 0.12,
    particles: 36,
    speed: 0.075
  },
  chwSupply: {
    label: 'Départ eau glacée',
    type: 'water',
    color: 0x22d3ee,
    state: 'Eau froide vers CRAH',
    points: [[0.55, 0.45, -1.45], [-0.45, 0.43, -1.45], [-1.55, 0.43, -1.18], [-2.75, 0.48, -0.85], [-3.65, 0.72, 0.92]],
    radius: 0.07,
    particles: 28,
    speed: 0.065
  },
  chwReturn: {
    label: 'Retour eau glacée',
    type: 'water',
    color: 0x0ea5e9,
    state: 'Eau plus chaude retour production',
    points: [[-3.65, 0.63, 0.92], [-2.6, 0.36, 1.05], [-1.3, 0.35, 0.95], [0.15, 0.38, -0.42], [1.65, 0.52, -1.18]],
    radius: 0.064,
    particles: 26,
    speed: 0.055
  },
  dryHot: {
    label: 'Montée glycol chaud',
    type: 'water',
    color: 0xf97316,
    state: 'Chaleur vers drycooler toiture',
    points: [[1.85, 0.67, -1.3], [2.82, 0.72, -0.82], [3.35, 0.88, -0.24], [3.35, 2.0, -0.24], [3.35, 3.12, -0.24], [2.52, 3.28, -0.22]],
    radius: 0.078,
    particles: 34,
    speed: 0.07
  },
  dryCold: {
    label: 'Descente glycol refroidi',
    type: 'water',
    color: 0x67e8f9,
    state: 'Retour refroidi depuis toiture',
    points: [[2.02, 3.25, 0.15], [3.05, 3.05, 0.18], [3.12, 1.92, 0.18], [3.12, 0.82, 0.18], [2.1, 0.6, -0.82], [0.55, 0.45, -1.45]],
    radius: 0.075,
    particles: 34,
    speed: 0.07
  },
  dxDischarge: {
    label: 'DX refoulement',
    type: 'refrigerant',
    color: 0xef4444,
    state: 'Vapeur chaude HP',
    points: [[1.62, 0.58, -2.25], [0.35, 0.7, -2.35], [-1.55, 0.72, -2.25], [-3.25, 0.72, -1.95]],
    radius: 0.05,
    particles: 20,
    speed: 0.1
  },
  dxLiquid: {
    label: 'DX liquide HP',
    type: 'refrigerant',
    color: 0xfb923c,
    state: 'Liquide haute pression',
    points: [[-3.25, 0.72, -1.95], [-3.55, 0.52, -1.85], [-3.35, 0.48, -1.72]],
    radius: 0.05,
    particles: 12,
    speed: 0.085
  },
  dxExpansion: {
    label: 'DX après détente',
    type: 'refrigerant',
    color: 0x34d399,
    state: 'Mélange liquide-vapeur BP',
    points: [[-3.35, 0.48, -1.72], [-3.72, 0.78, -1.35], [-3.72, 1.05, -0.75]],
    radius: 0.055,
    particles: 14,
    speed: 0.09
  },
  dxSuction: {
    label: 'DX aspiration',
    type: 'refrigerant',
    color: 0x38bdf8,
    state: 'Vapeur BP vers compresseur',
    points: [[-3.72, 1.05, -0.75], [-2.1, 0.52, -2.5], [-0.25, 0.52, -2.55], [1.62, 0.58, -2.25]],
    radius: 0.052,
    particles: 20,
    speed: 0.095
  },
  elecCritical: {
    label: 'Chaîne énergie critique',
    type: 'electrical',
    color: 0xfacc15,
    state: 'RMU → transfo → UPS → TGBT → PDU → racks',
    points: [[0.35, 0.72, 1.98], [1.15, 0.75, 1.98], [2.0, 0.8, 1.98], [2.85, 0.76, 1.98], [3.1, 1.1, 1.15], [1.6, 1.65, 0.86], [-0.55, 1.65, 0.85], [-1.65, 1.38, 0.65]],
    radius: 0.038,
    particles: 24,
    speed: 0.08
  },
  elecControl: {
    label: 'Supervision BMS/DCIM',
    type: 'electrical',
    color: 0x60a5fa,
    state: 'Contrôle commande et alarmes',
    points: [[3.15, 1.15, 1.1], [2.2, 1.25, 0.6], [0.3, 1.35, -0.25], [-3.65, 1.25, 0.35]],
    radius: 0.025,
    particles: 16,
    speed: 0.06
  }
};

const GUIDE_STEPS = [
  {
    title: '1. Le bâtiment se lit par zones',
    text: 'Salle IT à gauche, local froid en bas à droite, local électrique à droite, riser vertical, drycooler en toiture. Commence toujours par identifier la zone impactée avant de toucher un réglage.',
    focus: 'racks',
    view: 'beginner'
  },
  {
    title: '2. Air froid et air chaud',
    text: 'Le bleu montre le soufflage froid vers les faces avant des baies. L’orange montre l’air chaud qui revient vers CRAC/CRAH. Si ces deux flux se mélangent, le data center crée des points chauds.',
    focus: 'racks',
    view: 'air'
  },
  {
    title: '3. Boucle eau glacée',
    text: 'L’eau froide part des pompes/production vers le CRAH. Elle revient plus chaude après avoir récupéré la chaleur de la salle. Débit, vannes et antigel sont prioritaires.',
    focus: 'crah',
    view: 'cooling'
  },
  {
    title: '4. Rejet toiture par riser',
    text: 'La chaleur monte par le riser vers le drycooler toiture. Le retour refroidi redescend ensuite vers le local technique. Le riser doit être repéré, purgé et accessible.',
    focus: 'riser',
    view: 'cooling'
  },
  {
    title: '5. Chaîne électrique critique',
    text: 'La chaîne simplifiée est : RMU HTA, transformateur, UPS, TGBT, PDU/busway, baies. Toute intervention doit tenir compte de la redondance et des procédures.',
    focus: 'ups',
    view: 'electrical'
  }
];

function normalizeParams(params) {
  return { ...DEFAULT_PARAMS, ...(params || {}) };
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
  const freezeRisk = bpVeryLow || (p.bp <= 3.7 && p.sh <= 5);
  const returnLiquidRisk = shLow;
  const underfedEvaporator = bpLow && shHigh;

  const warnings = [];
  if (hpVeryHigh) warnings.push('HP très élevée : vérifier drycooler, ventilateurs, débit glycol, encrassement et non-condensables.');
  else if (hpHigh) warnings.push('HP élevée : rejet de chaleur probablement insuffisant.');
  if (underfedEvaporator) warnings.push('BP basse + SH haute : batterie sous-alimentée, détendeur/filtre/charge à contrôler.');
  if (returnLiquidRisk) warnings.push('SH faible : risque de retour liquide compresseur.');
  if (freezeRisk) warnings.push('Risque antigel : contrôler débit air/eau, filtres, pompe, glycol et sonde antigel.');
  if (scLow) warnings.push('SR faible : ligne liquide instable ou manque de liquide disponible.');
  if (!warnings.length) warnings.push('Régime proche du nominal : suivre les flux, les tendances BMS/DCIM et la charge IT.');

  const flowMultiplier = Math.max(0.72, Math.min(1.35, 1 + (p.hp - 18) * 0.012 - (bpLow ? 0.08 : 0) + (returnLiquidRisk ? 0.12 : 0)));
  return { ...p, hpHigh, hpVeryHigh, bpLow, bpVeryLow, shHigh, shLow, scLow, freezeRisk, returnLiquidRisk, underfedEvaporator, warnings, flowMultiplier };
}

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.44,
    metalness: options.metalness ?? 0.14,
    transparent: options.opacity !== undefined,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    depthWrite: options.depthWrite ?? (options.opacity === undefined || options.opacity > 0.65)
  });
}

function basic(color, opacity = 1, depthWrite = opacity > 0.65) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite });
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

function makeCurve(points) {
  return new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
}

function makeTube(points, color, radius, options = {}) {
  const curve = makeCurve(points);
  const geometry = new THREE.TubeGeometry(curve, options.segments ?? 140, radius, options.radial ?? 18, false);
  const mesh = new THREE.Mesh(
    geometry,
    mat(color, {
      opacity: options.opacity ?? 0.9,
      emissive: options.emissive ?? color,
      emissiveIntensity: options.emissiveIntensity ?? 0.16,
      metalness: options.metalness ?? 0.2,
      roughness: options.roughness ?? 0.28,
      depthWrite: false
    })
  );
  mesh.userData.curve = curve;
  return mesh;
}

function makeHaloTube(points, color, radius) {
  return makeTube(points, color, radius, { opacity: 0.12, emissiveIntensity: 0.32, radial: 18, segments: 120 });
}

function makeArrow(color, scale = 1) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.018 * scale, 0.34 * scale, 12), basic(color, 0.72, false));
  shaft.rotation.z = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.075 * scale, 0.18 * scale, 18), basic(color, 0.9, false));
  head.rotation.z = -Math.PI / 2;
  head.position.x = 0.25 * scale;
  group.add(shaft, head);
  return group;
}

function orientAlongCurve(object, curve, t) {
  const point = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t).normalize();
  object.position.copy(point);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
}

function setEquipmentKey(group, key) {
  group.userData.equipmentKey = key;
  group.traverse((child) => {
    child.userData.equipmentKey = key;
  });
}

function makeEdges(mesh, color, opacity = 0.38) {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  mesh.add(line);
  return line;
}

function makeZone(zone) {
  const group = new THREE.Group();
  const [w, h, d] = zone.size;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), basic(zone.color, 0.08, false));
  floor.position.set(...zone.center);
  group.add(floor);
  makeEdges(floor, zone.color, 0.42);

  // Murs transparents en coupe : on voit à travers, mais les volumes sont vraiment séparés.
  if (zone.size[1] < 0.2) {
    const wallMat = basic(zone.color, 0.045, false);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.85, 0.035), wallMat.clone());
    backWall.position.set(zone.center[0], 0.98, zone.center[2] + d / 2);
    group.add(backWall);
    makeEdges(backWall, zone.color, 0.22);

    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.85, d), wallMat.clone());
    sideWall.position.set(zone.center[0] + w / 2, 0.98, zone.center[2]);
    group.add(sideWall);
    makeEdges(sideWall, zone.color, 0.2);
  } else {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), basic(zone.color, 0.065, false));
    shaft.position.set(...zone.center);
    group.add(shaft);
    makeEdges(shaft, zone.color, 0.45);
  }

  return group;
}

function makeCabinet(width, height, depth, color, accent = 0xffffff) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat(color, { roughness: 0.5, metalness: 0.18 }));
  body.position.y = height / 2;
  group.add(body);
  const front = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, height * 0.72, 0.018), basic(accent, 0.22, false));
  front.position.set(0, height * 0.52, -depth / 2 - 0.012);
  group.add(front);
  return group;
}

function makeRacks(visual) {
  const group = new THREE.Group();
  for (let row = -1; row <= 1; row += 2) {
    for (let i = 0; i < 5; i += 1) {
      const rack = makeCabinet(0.42, 1.42, 0.52, 0x111827, row < 0 ? 0x60a5fa : 0xfb923c);
      rack.position.set(-3.02 + i * 0.55, 0, row * 0.44);
      group.add(rack);
      for (let u = 0; u < 5; u += 1) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.018, 0.012), basic(u % 2 ? 0x22c55e : 0x60a5fa, 0.9));
        led.position.set(-3.18 + i * 0.55, 0.32 + u * 0.2, row * 0.44 - Math.sign(row) * 0.275);
        group.add(led);
      }
    }
  }
  const coldAisle = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.035, 0.54), basic(0x38bdf8, 0.2, false));
  coldAisle.position.set(-1.92, 0.045, 0);
  group.add(coldAisle);

  const hotAisle = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.035, 0.32), basic(visual.hpHigh ? 0xef4444 : 0xf97316, 0.16, false));
  hotAisle.position.set(-1.92, 0.05, 0.84);
  group.add(hotAisle);
  return group;
}

function makeAirUnit(kind, visual) {
  const group = new THREE.Group();
  const baseColor = kind === 'crac' ? 0x075985 : 0x0f766e;
  const cab = makeCabinet(0.58, 1.15, 0.54, baseColor, 0xe0f2fe);
  group.add(cab);
  const coilColor = visual.freezeRisk ? 0xe0f2fe : 0x7dd3fc;
  const coil = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.035), mat(coilColor, { emissive: coilColor, emissiveIntensity: visual.freezeRisk ? 0.25 : 0.08 }));
  coil.position.set(0, 0.72, -0.29);
  group.add(coil);
  const fan = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 10, 32), basic(0x0f172a, 0.9));
  fan.rotation.x = Math.PI / 2;
  fan.position.set(0, 0.34, -0.29);
  group.add(fan);
  if (visual.freezeRisk) {
    for (let i = 0; i < 7; i += 1) {
      const frost = new THREE.Mesh(new THREE.SphereGeometry(0.026 + (i % 3) * 0.005, 12, 12), basic(0xe0f7ff, 0.75, false));
      frost.position.set(-0.2 + i * 0.065, 0.91 + Math.sin(i) * 0.035, -0.34);
      group.add(frost);
    }
  }
  return group;
}

function makePumpSkid() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.55), mat(0x334155));
  base.position.y = 0.06;
  group.add(base);
  for (let i = -1; i <= 1; i += 2) {
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 28), mat(0x0891b2, { emissive: 0x22d3ee, emissiveIntensity: 0.06 }));
    pump.rotation.z = Math.PI / 2;
    pump.position.set(i * 0.24, 0.28, 0);
    group.add(pump);
  }
  return group;
}

function makeProduction(visual) {
  const group = new THREE.Group();
  const skid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.72), mat(0x1e293b));
  skid.position.y = 0.07;
  group.add(skid);
  const exchanger = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.62, 0.48), mat(visual.hpHigh ? 0x7f1d1d : 0x0f766e, { emissive: visual.hpHigh ? 0xef4444 : 0x22d3ee, emissiveIntensity: visual.hpHigh ? 0.18 : 0.06 }));
  exchanger.position.set(-0.1, 0.45, 0);
  group.add(exchanger);
  const panel = makeCabinet(0.32, 0.74, 0.28, 0x334155, 0x93c5fd);
  panel.position.set(0.5, 0.14, 0.13);
  group.add(panel);
  return group;
}

function makeCompressor(visual) {
  const group = new THREE.Group();
  const color = visual.returnLiquidRisk ? 0xb91c1c : 0xef4444;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.52, 32), mat(color, { emissive: color, emissiveIntensity: visual.returnLiquidRisk ? 0.25 : 0.06 }));
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.28;
  const skid = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.1, 0.42), mat(0x334155));
  skid.position.y = 0.05;
  group.add(body, skid);
  return group;
}

function makeValve() {
  const group = new THREE.Group();
  const valve = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), mat(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 0.16 }));
  valve.position.y = 0.22;
  const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.48, 14), basic(0x86efac, 0.9));
  hand.rotation.z = Math.PI / 2;
  hand.position.y = 0.22;
  group.add(valve, hand);
  return group;
}

function makeDrycooler(visual) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 0.72), mat(visual.hpHigh ? 0x7f1d1d : 0x475569, { emissive: visual.hpHigh ? 0xef4444 : 0xf97316, emissiveIntensity: visual.hpHigh ? 0.2 : 0.06 }));
  body.position.y = 0.28;
  group.add(body);
  for (let i = -1; i <= 1; i += 2) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 10, 32), basic(0x020617, 0.92));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(i * 0.32, 0.31, -0.38);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.018, 0.045), basic(visual.hpHigh ? 0xef4444 : 0xcbd5e1, 0.88));
    blade.position.copy(ring.position);
    blade.rotation.y = Math.PI / 4;
    group.add(ring, blade);
  }
  for (let i = -4; i <= 4; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.48, 0.52), mat(visual.hpHigh ? 0x991b1b : 0xfdba74));
    fin.position.set(i * 0.11, 0.28, 0.36);
    group.add(fin);
  }
  return group;
}

function makeRiser() {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.44, 2.95, 0.55), basic(0xa78bfa, 0.07, false));
  shaft.position.y = 1.48;
  group.add(shaft);
  makeEdges(shaft, 0xa78bfa, 0.36);
  const pipes = [
    { color: 0xf97316, x: -0.12, z: -0.18, r: 0.035 },
    { color: 0x67e8f9, x: 0.12, z: -0.18, r: 0.035 },
    { color: 0xfacc15, x: -0.12, z: 0.18, r: 0.026 },
    { color: 0x60a5fa, x: 0.12, z: 0.18, r: 0.022 }
  ];
  pipes.forEach((pipe) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(pipe.r, pipe.r, 2.9, 16), basic(pipe.color, 0.95, false));
    mesh.position.set(pipe.x, 1.48, pipe.z);
    group.add(mesh);
  });
  return group;
}

function makeElectrical(type) {
  if (type === 'rmu') {
    const group = new THREE.Group();
    for (let i = -1; i <= 1; i += 1) {
      const cell = makeCabinet(0.28, 0.86, 0.38, 0x365314, 0xd9f99d);
      cell.position.x = i * 0.29;
      group.add(cell);
    }
    return group;
  }
  if (type === 'transformer') {
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.48), mat(0x57534e));
    core.position.y = 0.36;
    group.add(core);
    for (let i = -2; i <= 2; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.7, 0.55), mat(0xa8a29e));
      fin.position.set(i * 0.085, 0.36, 0);
      group.add(fin);
    }
    return group;
  }
  if (type === 'ups') {
    const group = new THREE.Group();
    for (let i = -1; i <= 1; i += 1) {
      const cab = makeCabinet(0.28, 0.9, 0.42, i === 0 ? 0x312e81 : 0x1e1b4b, 0xc4b5fd);
      cab.position.x = i * 0.3;
      group.add(cab);
    }
    return group;
  }
  if (type === 'switchboard') {
    const group = new THREE.Group();
    for (let i = -1; i <= 1; i += 1) {
      const cab = makeCabinet(0.28, 0.86, 0.42, 0x3f3f46, 0xfacc15);
      cab.position.x = i * 0.3;
      group.add(cab);
    }
    return group;
  }
  if (type === 'pdu') {
    const group = new THREE.Group();
    const bus = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.65), mat(0xeab308, { emissive: 0xeab308, emissiveIntensity: 0.1 }));
    bus.position.y = 0.1;
    group.add(bus);
    return group;
  }
  const group = new THREE.Group();
  const desk = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.36), mat(0x1e293b));
  desk.position.y = 0.12;
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.03), basic(0x60a5fa, 0.62, false));
  screen.position.set(0, 0.42, -0.16);
  group.add(desk, screen);
  return group;
}

function makeHighlightRing(color = 0xffffff) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.018, 12, 64), basic(color, 0.72, false));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.035;
  return ring;
}

function buildEquipment(key, visual) {
  switch (key) {
    case 'racks': return makeRacks(visual);
    case 'crac': return makeAirUnit('crac', visual);
    case 'crah': return makeAirUnit('crah', visual);
    case 'coil': return makeAirUnit('coil', visual);
    case 'compressor': return makeCompressor(visual);
    case 'expansionValve': return makeValve();
    case 'pumpSkid': return makePumpSkid();
    case 'production': return makeProduction(visual);
    case 'drycooler': return makeDrycooler(visual);
    case 'riser': return makeRiser();
    case 'rmu': return makeElectrical('rmu');
    case 'transformer': return makeElectrical('transformer');
    case 'ups': return makeElectrical('ups');
    case 'switchboard': return makeElectrical('switchboard');
    case 'pdu': return makeElectrical('pdu');
    case 'bms': return makeElectrical('bms');
    default: return new THREE.Group();
  }
}

function colorForCircuit(key, visual) {
  if (key === 'dryHot' && visual.hpHigh) return 0xef4444;
  if (key === 'airHot' && visual.hpHigh) return 0xef4444;
  if (key === 'chwSupply' && visual.freezeRisk) return 0xe0f2fe;
  if (key === 'dxSuction' && visual.returnLiquidRisk) return 0xbfdbfe;
  if (key === 'dxLiquid' && visual.scLow) return 0xfacc15;
  return CIRCUITS[key].color;
}

function particleAppearance(key, visual, index) {
  const base = colorForCircuit(key, visual);
  if (key === 'airCold') return { color: 0x7dd3fc, radius: 0.055 + (index % 3) * 0.008, opacity: 0.58 };
  if (key === 'airHot') return { color: visual.hpHigh ? 0xef4444 : 0xfb923c, radius: 0.058 + (index % 3) * 0.009, opacity: 0.62 };
  if (key.startsWith('dx')) {
    if (key === 'dxExpansion') return { color: index % 3 === 0 ? 0xe0f2fe : base, radius: index % 3 === 0 ? 0.034 : 0.05, opacity: 0.88 };
    if (key === 'dxSuction' && visual.returnLiquidRisk && index % 4 === 0) return { color: 0xdbeafe, radius: 0.064, opacity: 0.95 };
    return { color: base, radius: 0.04, opacity: 0.9 };
  }
  if (key.startsWith('elec')) return { color: base, radius: 0.032, opacity: 0.95 };
  return { color: base, radius: 0.043, opacity: 0.86 };
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

function statusClass(kind) {
  if (kind === 'danger') return 'border-red-400/35 bg-red-500/10 text-red-100';
  if (kind === 'watch') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
}

function measureStatus(key, visual) {
  if (key === 'HP') return visual.hpVeryHigh ? 'danger' : visual.hpHigh ? 'watch' : 'ok';
  if (key === 'BP') return visual.bpVeryLow ? 'danger' : visual.bpLow ? 'watch' : 'ok';
  if (key === 'SH') return visual.shLow ? 'danger' : visual.shHigh ? 'watch' : 'ok';
  if (key === 'SR') return visual.scLow ? 'watch' : 'ok';
  return 'ok';
}

function layerForHighlighted(component) {
  if (!component || component === 'all') return null;
  const layer = EQUIPMENT[component]?.layer;
  if (layer === 'air') return 'air';
  if (layer === 'electrical') return 'electrical';
  if (layer === 'cooling' || layer === 'mixed') return 'cooling';
  return null;
}

export default function HvacCycle3D({ highlightedComponent = 'all', params, simulationParams }) {
  const mountRef = useRef(null);
  const labelRefs = useRef({});
  const resetViewRef = useRef(null);
  const [activeView, setActiveView] = useState(layerForHighlighted(highlightedComponent) || 'beginner');
  const [selectedKey, setSelectedKey] = useState(highlightedComponent !== 'all' && EQUIPMENT[highlightedComponent] ? highlightedComponent : 'riser');
  const [drawer, setDrawer] = useState(null);
  const [guideIndex, setGuideIndex] = useState(0);
  const [labelsOn, setLabelsOn] = useState(true);

  const normalizedParams = useMemo(() => normalizeParams(params ?? simulationParams), [params, simulationParams]);
  const visual = useMemo(
    () => getVisualState(normalizedParams),
    [normalizedParams.bp, normalizedParams.hp, normalizedParams.sh, normalizedParams.sc]
  );

  const selected = EQUIPMENT[selectedKey];
  const view = VIEW_CONFIG[activeView] || VIEW_CONFIG.beginner;
  const guideStep = GUIDE_STEPS[guideIndex];
  const effectiveFocus = drawer === 'guide' ? guideStep.focus : selectedKey;

  useEffect(() => {
    if (highlightedComponent && highlightedComponent !== 'all' && EQUIPMENT[highlightedComponent]) {
      setSelectedKey(highlightedComponent);
      const nextView = layerForHighlighted(highlightedComponent);
      if (nextView) setActiveView(nextView);
    }
  }, [highlightedComponent]);

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

    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(6.6, 5.4, 7.9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 5.2;
    controls.maxDistance = 15.5;
    controls.target.set(-0.15, 1.35, 0.1);

    resetViewRef.current = () => {
      camera.position.set(6.6, 5.4, 7.9);
      controls.target.set(-0.15, 1.35, 0.1);
      controls.update();
    };

    scene.add(new THREE.AmbientLight(0x94a3b8, 1.15));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.65);
    keyLight.position.set(4.8, 7.2, 5.8);
    scene.add(keyLight);
    const blueLight = new THREE.PointLight(0x38bdf8, 2.0, 7.5);
    blueLight.position.set(-3.4, 1.8, -0.8);
    scene.add(blueLight);
    const orangeLight = new THREE.PointLight(0xf97316, 1.5, 8);
    orangeLight.position.set(2.8, 3.2, -0.2);
    scene.add(orangeLight);

    const root = new THREE.Group();
    scene.add(root);

    // Socle général, pour donner une vraie sensation de coupe bâtiment.
    const buildingBase = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.06, 5.8), basic(0x0f172a, 0.42, false));
    buildingBase.position.set(-0.15, -0.03, 0.05);
    root.add(buildingBase);
    makeEdges(buildingBase, 0x475569, 0.28);

    view.zones.forEach((zoneKey) => {
      const zone = ZONES[zoneKey];
      if (zone) root.add(makeZone(zone));
    });

    const labelAnchors = {};
    const labelVisibility = {};

    Object.entries(ZONES).forEach(([key, zone]) => {
      labelAnchors[`zone:${key}`] = new THREE.Vector3(...zone.labelPos);
      labelVisibility[`zone:${key}`] = labelsOn && view.zones.includes(key);
    });

    const visibleEquipment = new Set(view.equipment);
    Object.entries(EQUIPMENT).forEach(([key, item]) => {
      if (!visibleEquipment.has(key)) return;
      const group = buildEquipment(key, visual);
      group.position.set(...item.position);
      setEquipmentKey(group, key);
      root.add(group);

      if (key === effectiveFocus || key === selectedKey) {
        const color = new THREE.Color(item.color).getHex();
        group.add(makeHighlightRing(color));
      }

      labelAnchors[`eq:${key}`] = new THREE.Vector3(item.position[0], item.position[1] + 0.72, item.position[2]);
      const importantInBeginner = ['racks', 'crah', 'drycooler', 'riser', 'ups', 'pdu', 'pumpSkid'].includes(key);
      labelVisibility[`eq:${key}`] = labelsOn && (activeView !== 'beginner' || importantInBeginner || key === selectedKey);
    });

    const pipeObjects = [];
    view.circuits.forEach((circuitKey) => {
      const circuit = CIRCUITS[circuitKey];
      if (!circuit) return;
      const color = colorForCircuit(circuitKey, visual);
      const main = makeTube(circuit.points, color, circuit.radius, {
        opacity: circuit.type === 'air' ? 0.38 : 0.82,
        emissiveIntensity: circuit.type === 'air' ? 0.42 : 0.18,
        radial: circuit.type === 'air' ? 20 : 16
      });
      const halo = makeHaloTube(circuit.points, color, circuit.radius * (circuit.type === 'air' ? 2.25 : 1.85));
      root.add(halo, main);

      const curve = main.userData.curve;
      const particles = [];
      const particleCount = circuit.particles + (activeView === 'beginner' && circuit.type !== 'electrical' ? 8 : 0);
      for (let i = 0; i < particleCount; i += 1) {
        const style = particleAppearance(circuitKey, visual, i);
        const particle = new THREE.Mesh(new THREE.SphereGeometry(style.radius, 14, 14), basic(style.color, style.opacity, false));
        particle.userData.offset = i / particleCount;
        particle.userData.baseScale = 1;
        root.add(particle);
        particles.push(particle);
      }

      const arrowCount = circuit.type === 'air' ? 7 : circuit.type === 'electrical' ? 4 : 6;
      const arrows = [];
      for (let i = 0; i < arrowCount; i += 1) {
        const arrow = makeArrow(color, circuit.type === 'air' ? 1.28 : 1.0);
        orientAlongCurve(arrow, curve, (i + 0.5) / arrowCount);
        root.add(arrow);
        arrows.push(arrow);
      }
      pipeObjects.push({ key: circuitKey, curve, particles, arrows, speed: circuit.speed, type: circuit.type });
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

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      pipeObjects.forEach(({ key, curve, particles, arrows, speed, type }) => {
        const multiplier = type === 'electrical' ? 1 : visual.flowMultiplier;
        particles.forEach((particle, index) => {
          const t = (particle.userData.offset + elapsed * speed * multiplier * (1 + (index % 4) * 0.025)) % 1;
          particle.position.copy(curve.getPointAt(t));
          const pulse = 1 + Math.sin(elapsed * (type === 'air' ? 4.5 : 6.2) + index) * (type === 'air' ? 0.22 : 0.14);
          particle.scale.setScalar(pulse);
        });
        arrows.forEach((arrow, index) => {
          const t = ((index + 0.5) / arrows.length + elapsed * speed * multiplier * 0.14) % 1;
          orientAlongCurve(arrow, curve, t);
          arrow.scale.setScalar(1 + Math.sin(elapsed * 3.5 + index) * 0.05);
        });
      });

      Object.entries(labelRefs.current).forEach(([id, element]) => {
        const anchor = labelAnchors[id];
        if (!element || !anchor) return;
        const projected = projectToScreen(anchor, camera, mount);
        element.style.transform = `translate3d(${projected.x}px, ${projected.y}px, 0) translate(-50%, -50%)`;
        element.style.opacity = projected.visible && labelVisibility[id] ? '1' : '0';
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
  }, [activeView, labelsOn, selectedKey, effectiveFocus, drawer, guideIndex, visual.bp, visual.hp, visual.sh, visual.sc, visual.flowMultiplier, visual.freezeRisk, visual.hpHigh, visual.returnLiquidRisk, visual.scLow]);

  const measures = [
    ['BP', visual.bp, 'bar'],
    ['HP', visual.hp, 'bar'],
    ['SH', visual.sh, 'K'],
    ['SR', visual.sc, 'K']
  ];

  const zoneLabels = Object.entries(ZONES).filter(([key]) => view.zones.includes(key));
  const equipmentLabels = Object.entries(EQUIPMENT).filter(([key]) => view.equipment.includes(key));
  const circuitRows = view.circuits.map((key) => [key, CIRCUITS[key]]).filter(([, circuit]) => circuit);

  return (
    <div className="relative h-full min-h-[560px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.18),rgba(2,6,23,0.98)_65%)] shadow-2xl shadow-black sm:min-h-[640px] lg:min-h-[720px]">
      <div ref={mountRef} className="h-full min-h-[560px] w-full sm:min-h-[640px] lg:min-h-[720px]" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[72%] rounded-2xl border border-slate-700/70 bg-slate-950/72 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 backdrop-blur md:left-4 md:top-4 md:max-w-none">
        Coupe bâtiment · {view.label}
        <span className="ml-2 hidden normal-case tracking-normal text-slate-500 md:inline">{view.hint}</span>
      </div>

      <div className="absolute right-3 top-3 z-20 grid grid-cols-2 gap-2 md:right-4 md:top-4 md:grid-cols-4">
        {measures.map(([label, value, unit]) => (
          <div key={label} className={`rounded-2xl border px-2.5 py-2 text-right backdrop-blur md:px-3 ${statusClass(measureStatus(label, visual))}`}>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-75 md:text-[9px]">{label}</p>
            <p className="font-mono text-xs font-black text-white md:text-base">{value}<span className="ml-1 text-[9px] opacity-65 md:text-[10px]">{unit}</span></p>
          </div>
        ))}
      </div>

      {labelsOn ? zoneLabels.map(([key, zone]) => (
        <div
          key={`zone:${key}`}
          ref={(node) => { if (node) labelRefs.current[`zone:${key}`] = node; }}
          className="pointer-events-none absolute left-0 top-0 z-10 rounded-2xl border border-white/10 bg-slate-950/66 px-3 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-xl backdrop-blur transition-opacity md:text-[10px]"
        >
          <span className="block">{zone.label}</span>
          <span className="hidden text-[8px] font-bold normal-case tracking-normal text-slate-400 md:block">{zone.subtitle}</span>
        </div>
      )) : null}

      {labelsOn ? equipmentLabels.map(([key, item]) => {
        const isSelected = key === selectedKey || key === effectiveFocus;
        const importantInBeginner = activeView !== 'beginner' || ['racks', 'crah', 'drycooler', 'riser', 'ups', 'pdu', 'pumpSkid'].includes(key) || key === selectedKey;
        if (!importantInBeginner) return null;
        return (
          <button
            key={`eq:${key}`}
            ref={(node) => { if (node) labelRefs.current[`eq:${key}`] = node; }}
            type="button"
            onClick={() => {
              setSelectedKey(key);
              setDrawer('selected');
            }}
            className={`absolute left-0 top-0 z-10 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.11em] backdrop-blur transition hover:scale-105 md:px-3 md:text-[10px] ${
              isSelected
                ? 'border-white/70 bg-white/18 text-white shadow-[0_0_24px_rgba(255,255,255,0.18)]'
                : 'border-slate-700 bg-slate-950/66 text-slate-300 hover:border-blue-300'
            }`}
          >
            {item.label}
          </button>
        );
      }) : null}

      <div className="absolute bottom-3 left-3 right-3 z-30 rounded-3xl border border-slate-700/70 bg-slate-950/84 p-2 shadow-2xl backdrop-blur md:bottom-4 md:left-4 md:right-4">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
            {Object.entries(VIEW_CONFIG).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={`shrink-0 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${activeView === key ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                {config.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setLabelsOn((value) => !value)} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-slate-800 hover:text-white">
              {labelsOn ? 'Masquer labels' : 'Afficher labels'}
            </button>
            <button type="button" onClick={() => setDrawer(drawer === 'legend' ? null : 'legend')} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-slate-800 hover:text-white">Légende</button>
            <button type="button" onClick={() => setDrawer(drawer === 'guide' ? null : 'guide')} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-slate-800 hover:text-white">Guide</button>
            <button type="button" onClick={() => setDrawer(drawer === 'risks' ? null : 'risks')} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-slate-800 hover:text-white">Risques</button>
            <button type="button" onClick={() => resetViewRef.current?.()} className="rounded-2xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-blue-100">Recentrer</button>
          </div>
        </div>
      </div>

      {drawer ? (
        <div className="absolute bottom-[8.6rem] left-3 right-3 z-30 max-h-[46%] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950/94 p-5 text-sm text-slate-300 shadow-2xl backdrop-blur md:left-auto md:right-4 md:w-[27rem] xl:bottom-[6.4rem]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
                {drawer === 'selected' ? 'Équipement sélectionné' : drawer === 'legend' ? 'Lecture des circuits' : drawer === 'guide' ? 'Visite guidée' : 'Risques exploitation'}
              </p>
              <h3 className="mt-1 text-xl font-black text-white">
                {drawer === 'selected' ? selected?.label : drawer === 'guide' ? guideStep.title : drawer === 'legend' ? 'Flux séparés par fonction' : 'Priorités terrain'}
              </h3>
            </div>
            <button type="button" onClick={() => setDrawer(null)} className="rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-300 hover:bg-slate-700">Fermer</button>
          </div>

          {drawer === 'selected' && selected ? (
            <div className="space-y-4">
              <p className="leading-relaxed text-slate-300">{selected.summary}</p>
              <div className="rounded-2xl bg-blue-500/10 p-4 text-blue-100">
                <p className="font-black">Explication débutant</p>
                <p className="mt-1 leading-relaxed text-blue-100/80">{selected.beginner}</p>
              </div>
              <div className="rounded-2xl bg-slate-900/80 p-4">
                <p className="font-black text-blue-300">À contrôler sur site</p>
                <p className="mt-1 leading-relaxed text-slate-400">{selected.observe}</p>
              </div>
            </div>
          ) : null}

          {drawer === 'legend' ? (
            <div className="space-y-3">
              {circuitRows.map(([key, circuit]) => (
                <div key={key} className="grid grid-cols-[0.9rem_1fr] gap-3 rounded-2xl bg-slate-900/72 p-3">
                  <span className="mt-1 h-3.5 w-3.5 rounded-full shadow-[0_0_18px_currentColor]" style={{ backgroundColor: `#${colorForCircuit(key, visual).toString(16).padStart(6, '0')}` }} />
                  <div>
                    <p className="font-black text-white">{circuit.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{circuit.state}</p>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl bg-slate-900/80 p-4 text-xs leading-relaxed text-slate-400">
                Lecture conseillée : commence par la vue Débutant, puis isole Air salle IT, Froid/eau ou Électricité. Le riser est la liaison verticale entre toiture, local technique et salle IT.
              </div>
            </div>
          ) : null}

          {drawer === 'guide' ? (
            <div className="space-y-4">
              <p className="leading-relaxed text-slate-300">{guideStep.text}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView(guideStep.view);
                    setSelectedKey(guideStep.focus);
                  }}
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-500"
                >
                  Afficher cette étape
                </button>
              </div>
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
                <p className="mt-1">Identifier l’impact client, vérifier la redondance disponible, prévenir l’exploitation, sécuriser l’énergie, puis intervenir sur le froid, l’air ou l’électricité.</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
