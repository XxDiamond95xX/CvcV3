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
  cop: 3.2,
  fault: 'Mode nominal'
};

const VIEWS = {
  overview: {
    label: 'Vue exploitation',
    hint: 'Lecture globale : salle IT, local froid, riser, toiture et énergie critique.',
    zones: ['itRoom', 'coolingRoom', 'electricalRoom', 'riserShaft', 'roof'],
    equipment: ['racks', 'crah', 'coldAisle', 'hotAisle', 'plateHx', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'chillerAssist', 'adiabaticWater', 'adiabaticDrycooler', 'riser', 'ups', 'tgbt', 'pdu', 'bms'],
    circuits: ['airCold', 'airHot', 'chwSupply', 'chwReturn', 'glycolHot', 'glycolCold', 'adiabaticWater', 'criticalPower']
  },
  air: {
    label: 'Air salle IT',
    hint: 'Comprendre la séparation allée froide / allée chaude.',
    zones: ['itRoom'],
    equipment: ['racks', 'crah', 'coldAisle', 'hotAisle'],
    circuits: ['airCold', 'airHot']
  },
  hydraulic: {
    label: 'Hydraulique',
    hint: 'Boucle eau glacée, échangeur, pompes et ballon tampon.',
    zones: ['itRoom', 'coolingRoom', 'riserShaft', 'roof'],
    equipment: ['crah', 'plateHx', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'adiabaticDrycooler', 'riser'],
    circuits: ['chwSupply', 'chwReturn', 'glycolHot', 'glycolCold']
  },
  roof: {
    label: 'Toiture',
    hint: 'Dry adiabatique, eau de pulvérisation et rejet thermique.',
    zones: ['coolingRoom', 'riserShaft', 'roof'],
    equipment: ['plateHx', 'adiabaticWater', 'adiabaticDrycooler', 'riser'],
    circuits: ['glycolHot', 'glycolCold', 'adiabaticWater', 'outsideAir', 'heatRejection']
  },
  chiller: {
    label: 'Chiller assist',
    hint: 'Appoint mécanique quand le free cooling ne suffit plus.',
    zones: ['coolingRoom', 'riserShaft', 'roof'],
    equipment: ['chillerAssist', 'plateHx', 'bufferTank', 'primaryPumps', 'adiabaticDrycooler'],
    circuits: ['chillerSupply', 'chillerReturn', 'refrigerantDischarge', 'refrigerantLiquid', 'refrigerantExpansion', 'refrigerantSuction']
  },
  continuous: {
    label: 'Continuous cooling',
    hint: 'Maintien du débit et de l’inertie pendant les transitions et microcoupures.',
    zones: ['itRoom', 'coolingRoom', 'electricalRoom'],
    equipment: ['crah', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'ups', 'tgbt', 'pdu', 'bms'],
    circuits: ['chwSupply', 'chwReturn', 'continuousLoop', 'criticalPower', 'controls']
  },
  electrical: {
    label: 'Électricité',
    hint: 'Chaîne critique : UPS, TGBT, PDU, pompes et supervision.',
    zones: ['electricalRoom', 'coolingRoom', 'itRoom'],
    equipment: ['ups', 'tgbt', 'pdu', 'bms', 'primaryPumps', 'secondaryPumps', 'crah'],
    circuits: ['criticalPower', 'controls']
  },
  all: {
    label: 'Tout',
    hint: 'Vue complète, réservée aux utilisateurs déjà à l’aise.',
    zones: ['itRoom', 'coolingRoom', 'electricalRoom', 'riserShaft', 'roof'],
    equipment: ['racks', 'crah', 'coldAisle', 'hotAisle', 'plateHx', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'chillerAssist', 'adiabaticWater', 'adiabaticDrycooler', 'riser', 'ups', 'tgbt', 'pdu', 'bms'],
    circuits: ['airCold', 'airHot', 'chwSupply', 'chwReturn', 'glycolHot', 'glycolCold', 'adiabaticWater', 'outsideAir', 'heatRejection', 'chillerSupply', 'chillerReturn', 'refrigerantDischarge', 'refrigerantLiquid', 'refrigerantExpansion', 'refrigerantSuction', 'continuousLoop', 'criticalPower', 'controls']
  }
};

const ZONES = {
  itRoom: {
    label: 'Salle IT',
    subtitle: 'Baies · allée froide · allée chaude',
    color: 0x38bdf8,
    center: [-3.35, 0.02, 0.25],
    size: [3.45, 0.06, 3.15],
    labelPos: [-3.35, 2.22, -1.55]
  },
  coolingRoom: {
    label: 'Local froid',
    subtitle: 'Pompes · échangeur · chiller assist · ballon',
    color: 0x22d3ee,
    center: [0.55, 0.03, -1.0],
    size: [3.5, 0.06, 2.45],
    labelPos: [0.55, 2.18, -2.35]
  },
  electricalRoom: {
    label: 'Local électrique',
    subtitle: 'UPS · TGBT · distribution critique',
    color: 0xfacc15,
    center: [0.55, 0.03, 1.65],
    size: [3.5, 0.06, 1.75],
    labelPos: [0.55, 2.05, 2.55]
  },
  riserShaft: {
    label: 'Riser technique',
    subtitle: 'Montée toiture / descente retour',
    color: 0xa78bfa,
    center: [2.95, 1.65, -0.18],
    size: [0.58, 3.3, 0.78],
    labelPos: [2.95, 3.45, 0.45]
  },
  roof: {
    label: 'Toit terrasse',
    subtitle: 'Adiabatic dry cooler',
    color: 0xf97316,
    center: [1.25, 3.35, -0.85],
    size: [3.85, 0.06, 1.9],
    labelPos: [1.25, 4.08, -1.72]
  }
};

const EQUIPMENT = {
  racks: {
    label: 'Baies serveurs',
    color: '#94a3b8',
    position: [-3.05, 0.95, 0.32],
    size: [1.25, 1.45, 1.45],
    summary: 'Charge IT. Elle transforme l’énergie électrique consommée en chaleur à évacuer en continu.',
    observe: 'Température entrée serveur, points chauds, obturateurs, séparation allée froide/allée chaude, charge kW.'
  },
  coldAisle: {
    label: 'Allée froide',
    color: '#38bdf8',
    position: [-3.05, 0.18, -0.78],
    size: [1.85, 0.12, 0.48],
    summary: 'Zone où l’air froid arrive en face avant des baies.',
    observe: 'Température entrée serveur, dalles ouvertes, confinement, absence de recirculation chaude.'
  },
  hotAisle: {
    label: 'Allée chaude',
    color: '#f97316',
    position: [-3.05, 0.18, 1.42],
    size: [1.85, 0.12, 0.48],
    summary: 'Zone où l’air chaud sort des baies avant d’être repris par les unités.',
    observe: 'Température reprise, confinement, bypass, fuite d’air chaud vers l’allée froide.'
  },
  crah: {
    label: 'CRAH / batterie froide',
    color: '#0ea5e9',
    position: [-4.58, 0.72, -0.25],
    size: [0.62, 1.15, 1.5],
    summary: 'Unité de salle qui souffle l’air froid vers les baies et reprend l’air chaud.',
    observe: 'Débit air, filtres, batterie, vanne, condensats, risque antigel, température soufflage/reprise.'
  },
  plateHx: {
    label: 'Échangeur free cooling',
    color: '#67e8f9',
    position: [-0.2, 0.72, -1.12],
    size: [0.74, 0.95, 0.42],
    summary: 'Sépare la boucle glycol extérieure de la boucle eau glacée intérieure.',
    observe: 'Delta T primaire/secondaire, encrassement, vannes, purge, perte de charge.'
  },
  bufferTank: {
    label: 'Ballon tampon',
    color: '#38bdf8',
    position: [1.1, 0.72, -0.45],
    size: [0.62, 1.28, 0.62],
    round: true,
    summary: 'Inertie hydraulique qui aide à maintenir le froid pendant les transitions.',
    observe: 'Température haut/bas, stratification, volume disponible, isolation, purge.'
  },
  primaryPumps: {
    label: 'Pompes primaires',
    color: '#22d3ee',
    position: [0.28, 0.38, -0.15],
    size: [0.68, 0.46, 0.46],
    summary: 'Assurent le débit entre production, échangeur et ballon tampon.',
    observe: 'Débit, pression différentielle, variateur, vibrations, basculement pompe secours.'
  },
  secondaryPumps: {
    label: 'Pompes secondaires critiques',
    color: '#06b6d4',
    position: [0.28, 0.38, 0.48],
    size: [0.68, 0.46, 0.46],
    summary: 'Maintiennent le débit vers les CRAH, y compris pendant les transitions de mode.',
    observe: 'Alimentation secourue, pression différentielle salle, redondance N+1, alarmes variateur.'
  },
  chillerAssist: {
    label: 'Chiller assist',
    color: '#8b5cf6',
    position: [1.58, 0.78, -1.45],
    size: [0.95, 0.72, 0.82],
    summary: 'Appoint mécanique lorsque le dry cooler et l’adiabatique ne suffisent plus.',
    observe: 'Autorisation BMS, démarrage compresseur, HP/BP, charge, intensité, stabilité de consigne.'
  },
  adiabaticWater: {
    label: 'Eau adiabatique',
    color: '#7dd3fc',
    position: [1.62, 0.46, 0.42],
    size: [0.82, 0.5, 0.62],
    summary: 'Alimente les pads ou buses pour pré-refroidir l’air extérieur du dry cooler.',
    observe: 'Qualité d’eau, filtration, conductivité, purge, vanne, risque entartrage et hygiène.'
  },
  adiabaticDrycooler: {
    label: 'Adiabatic dry cooler',
    color: '#f97316',
    position: [1.25, 3.63, -0.85],
    size: [1.72, 0.52, 0.92],
    summary: 'Équipement toiture : dry cooler avec pré-refroidissement adiabatique de l’air.',
    observe: 'Ventilateurs, batteries, pads/buses, débit glycol, propreté, température extérieure, alarme eau.'
  },
  riser: {
    label: 'Riser toiture',
    color: '#a78bfa',
    position: [2.95, 1.68, -0.18],
    size: [0.28, 3.1, 0.28],
    summary: 'Colonne verticale qui relie le local froid au dry cooler en toiture.',
    observe: 'Supports, calorifuge, identification départ/retour, purgeurs hauts, coupe-feu, condensation.'
  },
  ups: {
    label: 'UPS / onduleur',
    color: '#a78bfa',
    position: [-0.72, 0.62, 1.62],
    size: [0.72, 0.82, 0.66],
    summary: 'Alimentation secourue pour charges critiques et auxiliaires nécessaires au maintien du froid.',
    observe: 'Charge %, autonomie, bypass, batterie, alarmes, température local.'
  },
  tgbt: {
    label: 'TGBT critique',
    color: '#facc15',
    position: [0.38, 0.62, 1.62],
    size: [0.72, 0.82, 0.66],
    summary: 'Distribution basse tension vers pompes, CRAH, chiller assist et auxiliaires.',
    observe: 'Départs, échauffement, intensités, sélectivité, identification des circuits.'
  },
  pdu: {
    label: 'PDU / busway',
    color: '#fbbf24',
    position: [-2.15, 1.58, 0.24],
    size: [1.15, 0.22, 0.28],
    summary: 'Distribution finale vers les racks, souvent en double alimentation A/B.',
    observe: 'Charge par phase, charge A/B, déséquilibre, alarmes, marge disponible.'
  },
  bms: {
    label: 'BMS / DCIM',
    color: '#60a5fa',
    position: [1.42, 1.1, 1.66],
    size: [0.72, 0.45, 0.5],
    summary: 'Supervision des modes dry, adiabatique, chiller assist et continuous cooling.',
    observe: 'Tendances, alarmes, séquences, seuils, sondes incohérentes, ordre de démarrage.'
  }
};

const CIRCUITS = {
  airCold: {
    label: 'Air froid soufflé',
    color: 0x38bdf8,
    state: 'Air froid depuis CRAH vers face avant des baies',
    kind: 'air',
    radius: 0.16,
    particles: 56,
    speed: 0.075,
    points: [[-4.32, 0.72, -0.72], [-3.86, 0.72, -0.72], [-3.86, 0.72, -0.78], [-1.82, 0.72, -0.78], [-1.82, 0.92, -0.18]]
  },
  airHot: {
    label: 'Air chaud repris',
    color: 0xf97316,
    state: 'Air chaud depuis arrière des baies vers reprise CRAH',
    kind: 'air',
    radius: 0.16,
    particles: 56,
    speed: 0.065,
    points: [[-1.82, 1.48, 1.22], [-1.82, 1.48, 1.42], [-3.86, 1.48, 1.42], [-3.86, 1.1, 0.36], [-4.32, 1.1, 0.36]]
  },
  chwSupply: {
    label: 'Départ eau glacée',
    color: 0x22d3ee,
    state: 'Eau glacée vers CRAH / salle IT',
    kind: 'water',
    radius: 0.085,
    particles: 42,
    speed: 0.06,
    points: [[1.1, 0.76, -0.42], [0.28, 0.76, -0.42], [0.28, 0.76, -0.05], [-4.34, 0.76, -0.05], [-4.34, 0.95, -0.42]]
  },
  chwReturn: {
    label: 'Retour eau glacée',
    color: 0x0ea5e9,
    state: 'Retour plus chaud depuis CRAH',
    kind: 'water',
    radius: 0.085,
    particles: 42,
    speed: 0.055,
    points: [[-4.34, 1.2, 0.1], [-4.34, 1.2, -1.48], [-0.2, 1.2, -1.48], [-0.2, 0.86, -1.12]]
  },
  glycolHot: {
    label: 'Glycol chaud vers toiture',
    color: 0xef4444,
    state: 'Chaleur envoyée au dry cooler via riser',
    kind: 'glycol',
    radius: 0.105,
    particles: 50,
    speed: 0.07,
    points: [[-0.2, 0.98, -1.12], [2.95, 0.98, -1.12], [2.95, 3.58, -1.12], [1.25, 3.58, -1.12], [1.25, 3.64, -0.85]]
  },
  glycolCold: {
    label: 'Glycol refroidi depuis toiture',
    color: 0x06b6d4,
    state: 'Retour refroidi depuis dry cooler vers échangeur',
    kind: 'glycol',
    radius: 0.105,
    particles: 50,
    speed: 0.07,
    points: [[1.25, 3.64, -0.48], [2.55, 3.64, -0.48], [2.55, 3.38, 0.22], [2.95, 3.38, 0.22], [2.95, 0.62, 0.22], [-0.2, 0.62, -0.82]]
  },
  adiabaticWater: {
    label: 'Eau adiabatique',
    color: 0x7dd3fc,
    state: 'Eau vers pads/buses pour pré-refroidir l’air extérieur',
    kind: 'water',
    radius: 0.055,
    particles: 34,
    speed: 0.085,
    points: [[1.62, 0.54, 0.42], [2.72, 0.54, 0.42], [2.72, 3.9, 0.42], [1.25, 3.9, 0.12], [1.25, 3.7, -0.38]]
  },
  outsideAir: {
    label: 'Air extérieur pré-refroidi',
    color: 0x93c5fd,
    state: 'Air extérieur traversant les pads adiabatiques',
    kind: 'air',
    radius: 0.12,
    particles: 34,
    speed: 0.06,
    points: [[0.05, 3.72, -0.85], [0.62, 3.72, -0.85], [1.25, 3.72, -0.85], [1.92, 3.72, -0.85]]
  },
  heatRejection: {
    label: 'Rejet chaleur toiture',
    color: 0xff7a1a,
    state: 'Chaleur évacuée vers l’extérieur',
    kind: 'air',
    radius: 0.14,
    particles: 34,
    speed: 0.08,
    points: [[1.25, 3.96, -0.85], [1.25, 4.32, -0.85], [1.85, 4.32, -0.85]]
  },
  chillerSupply: {
    label: 'Appoint chiller vers ballon',
    color: 0x8b5cf6,
    state: 'Eau refroidie par chiller assist quand le free cooling ne suffit plus',
    kind: 'water',
    radius: 0.075,
    particles: 28,
    speed: 0.055,
    points: [[1.58, 0.82, -1.45], [1.9, 0.82, -1.45], [1.9, 0.82, -0.45], [1.1, 0.82, -0.45]]
  },
  chillerReturn: {
    label: 'Retour vers chiller assist',
    color: 0x6d28d9,
    state: 'Retour chiller après échange avec ballon / boucle',
    kind: 'water',
    radius: 0.075,
    particles: 28,
    speed: 0.052,
    points: [[1.1, 0.48, -0.45], [1.1, 0.48, -1.78], [1.58, 0.48, -1.78], [1.58, 0.82, -1.45]]
  },
  refrigerantDischarge: {
    label: 'Refoulement frigorifique',
    color: 0xef4444,
    state: 'Vapeur chaude HP dans le chiller assist',
    kind: 'refrigerant',
    radius: 0.045,
    particles: 18,
    speed: 0.075,
    points: [[1.35, 1.16, -1.72], [2.12, 1.16, -1.72], [2.12, 1.16, -1.18]]
  },
  refrigerantLiquid: {
    label: 'Ligne liquide frigorifique',
    color: 0xfb923c,
    state: 'Liquide HP après condensation',
    kind: 'refrigerant',
    radius: 0.045,
    particles: 18,
    speed: 0.055,
    points: [[2.12, 0.95, -1.18], [1.34, 0.95, -1.18], [1.34, 0.95, -1.72]]
  },
  refrigerantExpansion: {
    label: 'Après détente frigorifique',
    color: 0x22c55e,
    state: 'Mélange BP dans l’évaporateur du chiller assist',
    kind: 'refrigerant',
    radius: 0.045,
    particles: 16,
    speed: 0.055,
    points: [[1.34, 0.95, -1.72], [1.34, 0.62, -1.72], [1.74, 0.62, -1.72]]
  },
  refrigerantSuction: {
    label: 'Aspiration frigorifique',
    color: 0x38bdf8,
    state: 'Vapeur BP retour compresseur',
    kind: 'refrigerant',
    radius: 0.045,
    particles: 18,
    speed: 0.06,
    points: [[1.74, 0.62, -1.72], [1.74, 0.62, -2.02], [1.35, 0.62, -2.02], [1.35, 1.16, -1.72]]
  },
  continuousLoop: {
    label: 'Boucle continuous cooling',
    color: 0x14b8a6,
    state: 'Débit maintenu par inertie + pompes critiques pendant transition ou microcoupure',
    kind: 'water',
    radius: 0.095,
    particles: 46,
    speed: 0.075,
    points: [[1.1, 1.08, -0.45], [0.28, 1.08, -0.45], [0.28, 1.08, 0.48], [-4.34, 1.08, 0.48], [-4.34, 0.84, -0.42]]
  },
  criticalPower: {
    label: 'Énergie critique',
    color: 0xfacc15,
    state: 'UPS/TGBT vers pompes, CRAH et distribution IT',
    kind: 'power',
    radius: 0.05,
    particles: 42,
    speed: 0.075,
    points: [[-0.72, 0.9, 1.62], [0.38, 0.9, 1.62], [0.38, 1.32, 0.48], [0.28, 1.32, 0.48], [0.28, 1.32, -0.15], [-4.58, 1.32, -0.25]]
  },
  controls: {
    label: 'Supervision BMS/DCIM',
    color: 0x60a5fa,
    state: 'Ordres de mode, alarmes, tendances et sécurités',
    kind: 'signal',
    radius: 0.035,
    particles: 28,
    speed: 0.05,
    points: [[1.42, 1.1, 1.66], [2.95, 1.1, 1.66], [2.95, 3.2, 0.42], [1.25, 3.2, -0.85]]
  }
};

const GUIDE_STEPS = [
  {
    title: '1. La chaleur naît dans la salle IT',
    text: 'Les baies transforment l’électricité en chaleur. Le premier objectif est de conserver une entrée serveur froide et stable.',
    view: 'air',
    focus: 'racks'
  },
  {
    title: '2. Le CRAH sépare l’air froid et l’air chaud',
    text: 'L’air froid doit aller vers l’avant des baies. L’air chaud doit revenir vers les unités sans recirculer.',
    view: 'air',
    focus: 'crah'
  },
  {
    title: '3. L’eau glacée transporte la chaleur',
    text: 'La boucle hydraulique récupère la chaleur côté CRAH et la ramène vers l’échangeur et le ballon.',
    view: 'hydraulic',
    focus: 'bufferTank'
  },
  {
    title: '4. Le dry adiabatique rejette la chaleur en toiture',
    text: 'Le glycol chaud monte par le riser, passe dans le dry cooler, puis redescend refroidi vers l’échangeur.',
    view: 'roof',
    focus: 'adiabaticDrycooler'
  },
  {
    title: '5. L’adiabatique améliore le free cooling',
    text: 'Quand l’air extérieur est trop chaud, l’eau adiabatique pré-refroidit l’air avant son passage dans le dry cooler.',
    view: 'roof',
    focus: 'adiabaticWater'
  },
  {
    title: '6. Le chiller assist prend le relais si nécessaire',
    text: 'Si le free cooling ne suffit plus, le chiller assist ajoute de la puissance frigorifique pour tenir la consigne.',
    view: 'chiller',
    focus: 'chillerAssist'
  },
  {
    title: '7. Le continuous cooling protège la charge',
    text: 'Ballon tampon, pompes critiques et énergie secourue maintiennent le débit pendant les transitions et microcoupures.',
    view: 'continuous',
    focus: 'secondaryPumps'
  }
];

function v(point) {
  return new THREE.Vector3(point[0], point[1], point[2]);
}

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: options.emissive ?? color,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    roughness: options.roughness ?? 0.5,
    metalness: options.metalness ?? 0.12,
    transparent: options.opacity !== undefined,
    opacity: options.opacity ?? 1
  });
}

function cylinderBetween(start, end, radius, material) {
  const a = v(start);
  const b = v(end);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 18);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pointOnPolyline(points, progress) {
  const vectors = points.map(v);
  const lengths = [];
  let total = 0;

  for (let i = 0; i < vectors.length - 1; i += 1) {
    const length = vectors[i].distanceTo(vectors[i + 1]);
    lengths.push(length);
    total += length;
  }

  if (!total) return vectors[0] ?? new THREE.Vector3();

  let target = ((progress % 1) + 1) % 1;
  target *= total;

  for (let i = 0; i < lengths.length; i += 1) {
    if (target <= lengths[i]) {
      return vectors[i].clone().lerp(vectors[i + 1], target / lengths[i]);
    }
    target -= lengths[i];
  }

  return vectors[vectors.length - 1];
}

function addBox(scene, item, selected = false) {
  const color = new THREE.Color(item.color);
  const material = makeMaterial(color, {
    emissive: color,
    emissiveIntensity: selected ? 0.25 : 0.02,
    roughness: 0.58,
    metalness: 0.16
  });

  let mesh;
  if (item.round) {
    const geometry = new THREE.CylinderGeometry(item.size[0] / 2, item.size[0] / 2, item.size[1], 28);
    mesh = new THREE.Mesh(geometry, material);
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(...item.size), material);
  }

  mesh.position.set(...item.position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const outlineGeometry = item.round
    ? new THREE.CylinderGeometry(item.size[0] / 2 + 0.015, item.size[0] / 2 + 0.015, item.size[1] + 0.02, 28)
    : new THREE.BoxGeometry(item.size[0] + 0.02, item.size[1] + 0.02, item.size[2] + 0.02);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(outlineGeometry),
    new THREE.LineBasicMaterial({
      color: selected ? 0xffffff : color,
      transparent: true,
      opacity: selected ? 0.75 : 0.25
    })
  );
  outline.position.copy(mesh.position);
  scene.add(outline);

  return mesh;
}

function addRacks(scene, selected) {
  const rackMaterial = makeMaterial(0x64748b, { roughness: 0.55, metalness: 0.25 });
  const doorMaterial = makeMaterial(0x0f172a, { roughness: 0.44, metalness: 0.25 });
  const positions = [-3.65, -3.15, -2.65, -2.15];

  positions.forEach((x) => {
    [-0.03, 0.68].forEach((z) => {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.42, 0.52), rackMaterial);
      rack.position.set(x, 0.76, z);
      rack.castShadow = true;
      rack.receiveShadow = true;
      scene.add(rack);

      const front = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.18, 0.03), doorMaterial);
      front.position.set(x, 0.76, z - 0.28);
      scene.add(front);

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 1.42, 0.52)),
        new THREE.LineBasicMaterial({ color: selected ? 0xffffff : 0xffffff, transparent: true, opacity: selected ? 0.45 : 0.16 })
      );
      edge.position.copy(rack.position);
      scene.add(edge);
    });
  });
}

function addDrycooler(scene, selected) {
  const base = addBox(scene, EQUIPMENT.adiabaticDrycooler, selected);
  const fanMaterial = makeMaterial(0x0f172a, { roughness: 0.4, metalness: 0.35 });

  [-0.52, 0, 0.52].forEach((offset) => {
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.055, 32), fanMaterial);
    fan.position.set(base.position.x + offset, base.position.y + 0.29, base.position.z);
    fan.rotation.x = Math.PI / 2;
    scene.add(fan);
  });
}

function addZone(scene, zone, active = true) {
  const material = new THREE.MeshStandardMaterial({
    color: zone.color,
    transparent: true,
    opacity: active ? 0.105 : 0.025,
    roughness: 0.8,
    metalness: 0
  });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(...zone.size), material);
  floor.position.set(...zone.center);
  floor.receiveShadow = true;
  scene.add(floor);

  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(...zone.size)),
    new THREE.LineBasicMaterial({ color: zone.color, transparent: true, opacity: active ? 0.55 : 0.14 })
  );
  line.position.copy(floor.position);
  scene.add(line);

  const wallMaterial = new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: active ? 0.04 : 0.012, side: THREE.DoubleSide });
  const [w, , d] = zone.size;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.9), wallMaterial);
  back.position.set(zone.center[0], 0.95, zone.center[2] + d / 2);
  scene.add(back);

  const side = new THREE.Mesh(new THREE.PlaneGeometry(d, 1.9), wallMaterial);
  side.rotation.y = Math.PI / 2;
  side.position.set(zone.center[0] - w / 2, 0.95, zone.center[2]);
  scene.add(side);
}

function riskState(params) {
  const hp = Number(params?.hp ?? DEFAULT_PARAMS.hp);
  const bp = Number(params?.bp ?? DEFAULT_PARAMS.bp);
  const sh = Number(params?.sh ?? DEFAULT_PARAMS.sh);
  const sc = Number(params?.sc ?? DEFAULT_PARAMS.sc);
  const evapTemp = Number(params?.evapTemp ?? DEFAULT_PARAMS.evapTemp);

  const warnings = [];
  if (hp >= 22) warnings.push('HP élevée : vérifier dry cooler, débit glycol, encrassement, mode adiabatique et non-condensables.');
  if (bp <= 3.2 || evapTemp <= -2) warnings.push('Risque antigel : vérifier débit eau, filtres, vanne, pompe et sécurité antigel.');
  if (sh <= 2) warnings.push('Surchauffe faible : risque de retour liquide côté chiller assist.');
  if (sh >= 10) warnings.push('Surchauffe haute : évaporateur/chiller ou batterie probablement sous-alimenté.');
  if (sc <= 2) warnings.push('Sous-refroidissement faible : ligne liquide instable ou charge à contrôler.');
  if (!warnings.length) warnings.push('État global cohérent : poursuivre la ronde avec les tendances BMS/DCIM.');

  return { hp, bp, sh, sc, evapTemp, warnings, hpHigh: hp >= 22, freezeRisk: bp <= 3.2 || evapTemp <= -2, lowSh: sh <= 2, lowSc: sc <= 2 };
}

function circuitColor(key, risk) {
  if ((key === 'glycolHot' || key === 'heatRejection') && risk.hpHigh) return 0xff2d16;
  if ((key === 'chwSupply' || key === 'continuousLoop') && risk.freezeRisk) return 0x93c5fd;
  if (key === 'refrigerantSuction' && risk.lowSh) return 0x22c55e;
  if (key === 'refrigerantLiquid' && risk.lowSc) return 0xffbf69;
  return CIRCUITS[key].color;
}

function addCircuit(scene, key, circuit, risk) {
  const color = circuitColor(key, risk);
  const material = makeMaterial(color, { emissive: color, emissiveIntensity: circuit.kind === 'air' ? 0.5 : 0.35, roughness: 0.32, metalness: 0.1 });
  const group = new THREE.Group();

  for (let i = 0; i < circuit.points.length - 1; i += 1) {
    group.add(cylinderBetween(circuit.points[i], circuit.points[i + 1], circuit.radius, material));

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(circuit.radius * 1.45, 18, 18), material);
    elbow.position.copy(v(circuit.points[i]));
    group.add(elbow);
  }

  const last = new THREE.Mesh(new THREE.SphereGeometry(circuit.radius * 1.45, 18, 18), material);
  last.position.copy(v(circuit.points[circuit.points.length - 1]));
  group.add(last);

  const arrowMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.96 });
  for (let i = 0; i < circuit.points.length - 1; i += 1) {
    const start = v(circuit.points[i]);
    const end = v(circuit.points[i + 1]);
    const direction = end.clone().sub(start);
    if (direction.length() < 0.55) continue;

    const count = direction.length() > 2 ? 2 : 1;
    for (let a = 0; a < count; a += 1) {
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(circuit.radius * 2.25, circuit.radius * 5.4, 20), arrowMaterial);
      arrow.position.copy(start.clone().lerp(end, count === 2 ? 0.38 + a * 0.34 : 0.62));
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      group.add(arrow);
    }
  }

  const particleMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.98 });
  const particleScale = circuit.kind === 'air' ? 0.92 : 0.72;
  for (let i = 0; i < circuit.particles; i += 1) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(circuit.radius * particleScale, 12, 12), particleMaterial);
    particle.userData.flowParticle = true;
    particle.userData.points = circuit.points;
    particle.userData.offset = i / circuit.particles;
    particle.userData.speed = circuit.speed;
    group.add(particle);
  }

  group.userData.circuitKey = key;
  scene.add(group);
}

function statusClass(status) {
  if (status === 'danger') return 'border-red-400/50 bg-red-500/15 text-red-100';
  if (status === 'warning') return 'border-amber-400/45 bg-amber-500/15 text-amber-100';
  return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
}

function metricStatus(label, risk) {
  if (label === 'HP' && risk.hpHigh) return 'danger';
  if (label === 'BP' && risk.freezeRisk) return 'warning';
  if (label === 'SH' && (risk.lowSh || risk.sh >= 10)) return 'warning';
  if (label === 'SR' && risk.lowSc) return 'warning';
  return 'ok';
}

export default function HvacCycle3D({ highlightedComponent = 'all', params = DEFAULT_PARAMS }) {
  const mountRef = useRef(null);
  const labelsRef = useRef({});
  const cameraToolsRef = useRef({});
  const [activeView, setActiveView] = useState('overview');
  const [drawer, setDrawer] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [guideIndex, setGuideIndex] = useState(0);

  const view = VIEWS[activeView];
  const risk = useMemo(() => riskState(params), [params]);
  const guide = GUIDE_STEPS[guideIndex];
  const focusKey = selectedKey || (EQUIPMENT[highlightedComponent] ? highlightedComponent : null);
  const selected = selectedKey ? EQUIPMENT[selectedKey] : null;

  const zones = useMemo(() => Object.entries(ZONES).filter(([key]) => view.zones.includes(key)), [view]);
  const equipment = useMemo(() => Object.entries(EQUIPMENT).filter(([key]) => view.equipment.includes(key)), [view]);
  const circuits = useMemo(() => Object.entries(CIRCUITS).filter(([key]) => view.circuits.includes(key)), [view]);

  useEffect(() => {
    if (!mountRef.current) return undefined;

    const mount = mountRef.current;
    mount.innerHTML = '';

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 620;
    const isMobile = width < 700;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    const camera = new THREE.PerspectiveCamera(isMobile ? 58 : 46, width / height, 0.1, 120);
    const widePosition = isMobile ? new THREE.Vector3(9.2, 6.4, 9.4) : new THREE.Vector3(7.3, 5.1, 7.1);
    const detailPosition = isMobile ? new THREE.Vector3(6.8, 4.9, 6.8) : new THREE.Vector3(5.4, 4.0, 5.4);
    camera.position.copy(widePosition);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-0.55, 1.45, -0.1);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.2;
    controls.maxDistance = isMobile ? 26 : 20;
    controls.maxPolarAngle = Math.PI * 0.5;

    cameraToolsRef.current = {
      reset: () => {
        camera.position.copy(widePosition);
        controls.target.set(-0.55, 1.45, -0.1);
        controls.update();
      },
      dezoom: () => {
        camera.position.copy(isMobile ? new THREE.Vector3(11.5, 7.5, 11.5) : new THREE.Vector3(9.2, 6.2, 9.2));
        controls.target.set(-0.55, 1.45, -0.1);
        controls.update();
      },
      detail: () => {
        camera.position.copy(detailPosition);
        controls.target.set(-0.55, 1.45, -0.1);
        controls.update();
      }
    };

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));

    const sun = new THREE.DirectionalLight(0xffffff, 1.85);
    sun.position.set(6, 8, 5);
    sun.castShadow = true;
    scene.add(sun);

    const blueFill = new THREE.PointLight(0x38bdf8, 1.6, 9);
    blueFill.position.set(-4.2, 2.2, -2.2);
    scene.add(blueFill);

    const warmFill = new THREE.PointLight(0xf97316, 1.1, 8);
    warmFill.position.set(2.2, 4.3, -1.1);
    scene.add(warmFill);

    const grid = new THREE.GridHelper(8.5, 17, 0x334155, 0x172033);
    grid.position.y = -0.015;
    scene.add(grid);

    const labelTargets = {};
    const clickables = [];

    zones.forEach(([, zone]) => addZone(scene, zone, true));

    equipment.forEach(([key, item]) => {
      const isSelected = focusKey === key;
      if (key === 'racks') {
        addRacks(scene, isSelected);
      } else if (key === 'adiabaticDrycooler') {
        addDrycooler(scene, isSelected);
      } else {
        const mesh = addBox(scene, item, isSelected);
        mesh.userData.equipmentKey = key;
        clickables.push(mesh);
      }

      labelTargets[`eq:${key}`] = v(item.position).add(new THREE.Vector3(0, item.size?.[1] ? item.size[1] / 2 + 0.18 : 0.8, 0));
    });

    zones.forEach(([key, zone]) => {
      labelTargets[`zone:${key}`] = v(zone.labelPos);
    });

    circuits.forEach(([key, circuit]) => addCircuit(scene, key, circuit, risk));

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onPointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(clickables, true).find((item) => item.object.userData.equipmentKey);
      if (hit) {
        setSelectedKey(hit.object.userData.equipmentKey);
        setDrawer('equipment');
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointer);

    const clock = new THREE.Clock();

    function updateLabels() {
      const w = mount.clientWidth || width;
      const h = mount.clientHeight || height;
      Object.entries(labelTargets).forEach(([key, position]) => {
        const node = labelsRef.current[key];
        if (!node) return;
        const projected = position.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * w;
        const y = (-projected.y * 0.5 + 0.5) * h;
        const visible = projected.z < 1 && labelsVisible;
        node.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        node.style.opacity = visible ? '1' : '0';
      });
    }

    let frame;
    function animate() {
      const time = clock.getElapsedTime();
      scene.traverse((object) => {
        if (object.userData.flowParticle) {
          object.position.copy(pointOnPolyline(object.userData.points, object.userData.offset + time * object.userData.speed));
        }
      });
      controls.update();
      updateLabels();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }
    animate();

    function onResize() {
      const nextWidth = mount.clientWidth || width;
      const nextHeight = mount.clientHeight || height;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    }

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointer);
      renderer.dispose();
      mount.innerHTML = '';
      cameraToolsRef.current = {};
    };
  }, [activeView, circuits, equipment, focusKey, labelsVisible, risk, zones]);

  const metrics = [
    ['BP', risk.bp, 'bar'],
    ['HP', risk.hp, 'bar'],
    ['SH', risk.sh, 'K'],
    ['SR', risk.sc, 'K']
  ];

  return (
    <div className="relative min-h-[580px] overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 shadow-2xl sm:min-h-[640px]">
      <div ref={mountRef} className="h-[580px] w-full sm:h-[640px] xl:h-[720px]" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[18rem] rounded-3xl border border-slate-700/70 bg-slate-950/78 p-3 shadow-2xl backdrop-blur sm:left-4 sm:top-4 sm:max-w-[24rem] sm:p-4">
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-blue-300 sm:text-[10px]">Système réel</p>
        <h3 className="mt-1 text-base font-black text-white sm:text-xl">Dry adiabatique + chiller assist + continuous cooling</h3>
        <p className="mt-2 hidden text-xs leading-relaxed text-slate-400 sm:block">Coupe bâtiment compartimentée, circuits droits et flux volontairement accentués.</p>
      </div>

      <div className="absolute right-3 top-3 z-20 grid grid-cols-2 gap-2 sm:right-4 sm:top-4 sm:grid-cols-4">
        {metrics.map(([label, value, unit]) => (
          <div key={label} className={`rounded-2xl border px-2.5 py-2 text-right backdrop-blur ${statusClass(metricStatus(label, risk))}`}>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-75">{label}</p>
            <p className="font-mono text-xs font-black text-white sm:text-base">{value}<span className="ml-1 text-[9px] opacity-65">{unit}</span></p>
          </div>
        ))}
      </div>

      {labelsVisible && zones.map(([key, zone]) => (
        <div
          key={`zone:${key}`}
          ref={(node) => {
            if (node) labelsRef.current[`zone:${key}`] = node;
          }}
          className="pointer-events-none absolute left-0 top-0 z-10 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-[0.12em] text-white shadow-xl backdrop-blur transition-opacity sm:text-[10px]"
        >
          <span className="block">{zone.label}</span>
          <span className="hidden text-[8px] font-bold normal-case tracking-normal text-slate-400 md:block">{zone.subtitle}</span>
        </div>
      ))}

      {labelsVisible && equipment.map(([key, item]) => {
        const selected = focusKey === key || selectedKey === key;
        return (
          <button
            key={`eq:${key}`}
            ref={(node) => {
              if (node) labelsRef.current[`eq:${key}`] = node;
            }}
            type="button"
            onClick={() => {
              setSelectedKey(key);
              setDrawer('equipment');
            }}
            className={`absolute left-0 top-0 z-10 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] backdrop-blur transition hover:scale-105 sm:px-3 sm:text-[10px] ${
              selected
                ? 'border-white/70 bg-white/20 text-white shadow-[0_0_24px_rgba(255,255,255,0.22)]'
                : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-blue-300'
            }`}
          >
            {item.label}
          </button>
        );
      })}

      <div className="absolute bottom-3 left-3 right-3 z-30 rounded-3xl border border-slate-700/70 bg-slate-950/88 p-2 shadow-2xl backdrop-blur sm:bottom-4 sm:left-4 sm:right-4">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
            {Object.entries(VIEWS).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={`shrink-0 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                  activeView === key ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setLabelsVisible((value) => !value)} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-slate-800 hover:text-white">
              {labelsVisible ? 'Sans labels' : 'Labels'}
            </button>
            <button type="button" onClick={() => setDrawer(drawer === 'legend' ? null : 'legend')} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-slate-800 hover:text-white">Légende</button>
            <button type="button" onClick={() => setDrawer(drawer === 'guide' ? null : 'guide')} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-slate-800 hover:text-white">Guide</button>
            <button type="button" onClick={() => setDrawer(drawer === 'risks' ? null : 'risks')} className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-slate-800 hover:text-white">Risques</button>
            <button type="button" onClick={() => cameraToolsRef.current.dezoom?.()} className="rounded-2xl bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-slate-700">Dézoom +</button>
            <button type="button" onClick={() => cameraToolsRef.current.reset?.()} className="rounded-2xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-blue-100">Recentrer</button>
          </div>
        </div>
      </div>

      {drawer ? (
        <div className="absolute bottom-[9.2rem] left-3 right-3 z-30 max-h-[48%] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950/95 p-5 text-sm text-slate-300 shadow-2xl backdrop-blur sm:left-auto sm:right-4 sm:w-[29rem] xl:bottom-[6.6rem]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
                {drawer === 'equipment' ? 'Équipement' : drawer === 'legend' ? 'Lecture des flux' : drawer === 'guide' ? 'Visite guidée' : 'Risques'}
              </p>
              <h3 className="mt-1 text-xl font-black text-white">
                {drawer === 'equipment' ? selected?.label : drawer === 'guide' ? guide.title : drawer === 'legend' ? view.label : 'Points de vigilance'}
              </h3>
            </div>
            <button type="button" onClick={() => setDrawer(null)} className="rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-300 hover:bg-slate-700">Fermer</button>
          </div>

          {drawer === 'equipment' && selected ? (
            <div className="space-y-4">
              <p className="leading-relaxed text-slate-300">{selected.summary}</p>
              <div className="rounded-2xl bg-blue-500/10 p-4">
                <p className="font-black text-blue-200">À contrôler sur site</p>
                <p className="mt-1 leading-relaxed text-blue-100/80">{selected.observe}</p>
              </div>
            </div>
          ) : null}

          {drawer === 'legend' ? (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-slate-400">{view.hint}</p>
              {circuits.map(([key, circuit]) => (
                <div key={key} className="grid grid-cols-[0.9rem_1fr] gap-3 rounded-2xl bg-slate-900/70 p-3">
                  <span className="mt-1 h-3.5 w-3.5 rounded-full shadow-[0_0_18px_currentColor]" style={{ backgroundColor: `#${circuitColor(key, risk).toString(16).padStart(6, '0')}` }} />
                  <div>
                    <p className="font-black text-white">{circuit.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{circuit.state}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {drawer === 'guide' ? (
            <div className="space-y-4">
              <p className="leading-relaxed text-slate-300">{guide.text}</p>
              <button
                type="button"
                onClick={() => {
                  setActiveView(guide.view);
                  setSelectedKey(guide.focus);
                  setDrawer('equipment');
                }}
                className="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-500"
              >
                Afficher sur le modèle
              </button>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setGuideIndex((value) => Math.max(0, value - 1))} disabled={guideIndex === 0} className="rounded-2xl bg-slate-800 px-4 py-2 font-black text-white disabled:opacity-35">Précédent</button>
                <p className="text-xs font-black text-slate-500">{guideIndex + 1} / {GUIDE_STEPS.length}</p>
                <button type="button" onClick={() => setGuideIndex((value) => Math.min(GUIDE_STEPS.length - 1, value + 1))} disabled={guideIndex === GUIDE_STEPS.length - 1} className="rounded-2xl bg-blue-600 px-4 py-2 font-black text-white disabled:opacity-35">Suivant</button>
              </div>
            </div>
          ) : null}

          {drawer === 'risks' ? (
            <div className="space-y-3">
              {risk.warnings.map((warning) => (
                <div key={warning} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-100">{warning}</div>
              ))}
              <div className="rounded-2xl bg-slate-900/80 p-4 text-xs leading-relaxed text-slate-400">
                <p className="font-black text-slate-200">Ordre professionnel</p>
                <p className="mt-1">Impact IT → redondance disponible → mode de fonctionnement → tendance BMS/DCIM → intervention contrôlée. En data center, on stabilise avant de réparer.</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
