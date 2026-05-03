'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const DEFAULT_PARAMS = {
  bp: 4.5,
  hp: 18.2,
  sh: 5,
  sc: 3,
  evapTemp: 2,
  condTemp: 45,
  cop: 3.2,
  fault: 'Mode nominal'
}

const FOCUS_ALIASES = {
  all: null,
  compressor: 'chillerAssist',
  condenser: 'adiabaticDrycooler',
  expansionValve: 'chillerAssist',
  evaporator: 'crah'
}

const LEVEL_Y = {
  it: 0,
  cooling: 3.8,
  electrical: 7.6,
  roof: 11.4
}

const VIEWS = {
  overview: {
    label: 'Vue étagée',
    hint: 'Vue globale par niveaux, la plus lisible.',
    zones: ['itLevel', 'coolingLevel', 'electricalLevel', 'roofLevel', 'riserShaft'],
    equipment: [
      'racks',
      'crah',
      'coldAisle',
      'hotAisle',
      'plateHx',
      'bufferTank',
      'primaryPumps',
      'secondaryPumps',
      'chillerAssist',
      'adiabaticWater',
      'ups',
      'tgbt',
      'pdu',
      'bms',
      'adiabaticDrycooler',
      'riser'
    ],
    circuits: [
      'airCold',
      'airHot',
      'chwSupply',
      'chwReturn',
      'glycolHot',
      'glycolCold',
      'adiabaticWater',
      'continuousLoop',
      'criticalPower',
      'controls'
    ]
  },
  air: {
    label: 'Niveau 0 · Salle IT',
    hint: 'Lecture de l’air en salle IT.',
    zones: ['itLevel'],
    equipment: ['racks', 'crah', 'coldAisle', 'hotAisle'],
    circuits: ['airCold', 'airHot']
  },
  hydraulic: {
    label: 'Niveau 1 · Hydraulique',
    hint: 'Échangeur, ballon, pompes et appoint mécanique.',
    zones: ['itLevel', 'coolingLevel', 'roofLevel', 'riserShaft'],
    equipment: [
      'crah',
      'plateHx',
      'bufferTank',
      'primaryPumps',
      'secondaryPumps',
      'chillerAssist',
      'adiabaticDrycooler',
      'riser'
    ],
    circuits: ['chwSupply', 'chwReturn', 'glycolHot', 'glycolCold', 'chillerSupply', 'chillerReturn']
  },
  waterTank: {
    label: 'Focus water tank',
    hint: 'Ballon tampon isolé pour une lecture claire.',
    zones: ['coolingLevel'],
    equipment: ['plateHx', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'chillerAssist'],
    circuits: ['chwSupply', 'chwReturn', 'chillerSupply', 'chillerReturn', 'continuousLoop']
  },
  roof: {
    label: 'Niveau 3 · Toiture',
    hint: 'Dry cooler, eau adiabatique et rejet thermique.',
    zones: ['coolingLevel', 'roofLevel', 'riserShaft'],
    equipment: ['plateHx', 'adiabaticWater', 'adiabaticDrycooler', 'riser'],
    circuits: ['glycolHot', 'glycolCold', 'adiabaticWater', 'outsideAir', 'heatRejection']
  },
  chiller: {
    label: 'Chiller assist',
    hint: 'Appoint mécanique et lignes frigorifiques.',
    zones: ['coolingLevel'],
    equipment: ['chillerAssist', 'plateHx', 'bufferTank', 'primaryPumps'],
    circuits: [
      'chillerSupply',
      'chillerReturn',
      'refrigerantDischarge',
      'refrigerantLiquid',
      'refrigerantExpansion',
      'refrigerantSuction'
    ]
  },
  continuous: {
    label: 'Continuous cooling',
    hint: 'Ballon + pompes + énergie secourue.',
    zones: ['itLevel', 'coolingLevel', 'electricalLevel', 'riserShaft'],
    equipment: ['crah', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'ups', 'tgbt', 'pdu', 'bms'],
    circuits: ['chwSupply', 'chwReturn', 'continuousLoop', 'criticalPower', 'controls']
  },
  electrical: {
    label: 'Niveau 2 · Électricité',
    hint: 'Chaîne électrique critique et supervision.',
    zones: ['electricalLevel', 'coolingLevel', 'itLevel'],
    equipment: ['ups', 'tgbt', 'pdu', 'bms', 'primaryPumps', 'secondaryPumps', 'crah'],
    circuits: ['criticalPower', 'controls']
  }
}

const ZONES = {
  itLevel: {
    label: 'Niveau 0 · Salle IT',
    color: 0x38bdf8,
    center: [0, LEVEL_Y.it, 0],
    size: [12.2, 0.06, 5.8],
    labelPos: [-5.35, LEVEL_Y.it + 0.34, -3.0]
  },
  coolingLevel: {
    label: 'Niveau 1 · Local froid',
    color: 0x22d3ee,
    center: [0, LEVEL_Y.cooling, 0],
    size: [12.2, 0.06, 5.8],
    labelPos: [-5.35, LEVEL_Y.cooling + 0.34, -3.0]
  },
  electricalLevel: {
    label: 'Niveau 2 · Énergie / supervision',
    color: 0xfacc15,
    center: [0, LEVEL_Y.electrical, 0],
    size: [12.2, 0.06, 5.8],
    labelPos: [-5.35, LEVEL_Y.electrical + 0.34, -3.0]
  },
  roofLevel: {
    label: 'Niveau 3 · Toiture',
    color: 0xf97316,
    center: [0, LEVEL_Y.roof, 0],
    size: [12.2, 0.06, 5.8],
    labelPos: [-5.35, LEVEL_Y.roof + 0.34, -3.0]
  },
  riserShaft: {
    label: 'Riser',
    color: 0xa78bfa,
    center: [5.45, 5.7, -2.25],
    size: [0.46, 11.6, 0.46],
    labelPos: [5.55, 10.35, -1.2]
  }
}

const EQUIPMENT = {
  racks: {
    label: 'Baies serveurs',
    color: '#94a3b8',
    position: [-3.6, LEVEL_Y.it + 0.72, 0.6],
    size: [1.2, 1.35, 1.2],
    summary: 'Charge IT qui dissipe de la chaleur.',
    observe: 'Température entrée serveur, points chauds, obturateurs, charge kW.'
  },
  coldAisle: {
    label: 'Allée froide',
    color: '#38bdf8',
    position: [-3.6, LEVEL_Y.it + 0.1, -1.5],
    size: [2.2, 0.1, 0.42],
    summary: 'Zone d’air froid en face avant des baies.',
    observe: 'Température entrée serveurs, confinement, absence de recirculation.'
  },
  hotAisle: {
    label: 'Allée chaude',
    color: '#f97316',
    position: [-3.6, LEVEL_Y.it + 0.1, 2.0],
    size: [2.2, 0.1, 0.42],
    summary: 'Zone de reprise de l’air chaud en sortie des baies.',
    observe: 'Température reprise, confinement et bypass.'
  },
  crah: {
    label: 'CRAH',
    color: '#0ea5e9',
    position: [3.55, LEVEL_Y.it + 0.62, 0.35],
    size: [0.62, 1.05, 1.28],
    summary: 'Unité de salle qui souffle l’air froid et reprend l’air chaud.',
    observe: 'Débit air, filtres, batterie, vannes, soufflage/reprise.'
  },
  plateHx: {
    label: 'Échangeur free cooling',
    color: '#67e8f9',
    position: [-4.45, LEVEL_Y.cooling + 0.55, -1.2],
    size: [0.68, 0.95, 0.48],
    summary: 'Sépare boucle glycol extérieure et boucle eau glacée.',
    observe: 'Delta T, purge, encrassement, perte de charge.'
  },
  bufferTank: {
    label: 'Ballon tampon / water tank',
    color: '#38bdf8',
    position: [-1.35, LEVEL_Y.cooling + 0.72, -1.15],
    size: [0.62, 1.35, 0.62],
    round: true,
    tankDetails: true,
    summary: 'Volume d’eau qui apporte inertie et stabilité.',
    observe: 'Températures haut/bas, stratification, purge, isolation, cohérence départ/retour.',
    learning: [
      'Il ne produit pas de froid.',
      'Il ajoute de l’inertie hydraulique.',
      'Il aide pendant les transitions et microcoupures.',
      'À ne pas confondre avec un vase d’expansion.'
    ]
  },
  primaryPumps: {
    label: 'Pompes primaires',
    color: '#22d3ee',
    position: [1.65, LEVEL_Y.cooling + 0.26, -1.95],
    size: [0.66, 0.42, 0.38],
    summary: 'Débit entre production, échangeur et ballon.',
    observe: 'Débit, ΔP, variateur, vibrations, secours.'
  },
  secondaryPumps: {
    label: 'Pompes secondaires',
    color: '#06b6d4',
    position: [1.65, LEVEL_Y.cooling + 0.26, 1.15],
    size: [0.66, 0.42, 0.38],
    summary: 'Débit vers les CRAH et maintien du service.',
    observe: 'Alimentation secourue, ΔP, redondance N+1.'
  },
  chillerAssist: {
    label: 'Chiller assist',
    color: '#8b5cf6',
    position: [4.25, LEVEL_Y.cooling + 0.55, -1.05],
    size: [0.92, 0.72, 0.82],
    summary: 'Appoint mécanique quand le free cooling ne suffit plus.',
    observe: 'Autorisation BMS, HP/BP, intensité, stabilité de consigne.'
  },
  adiabaticWater: {
    label: 'Eau adiabatique',
    color: '#7dd3fc',
    position: [4.25, LEVEL_Y.cooling + 0.28, 1.85],
    size: [0.76, 0.45, 0.56],
    summary: 'Alimente pads ou buses pour pré-refroidir l’air.',
    observe: 'Qualité d’eau, filtration, conductivité, purge.'
  },
  ups: {
    label: 'UPS',
    color: '#a78bfa',
    position: [-4.15, LEVEL_Y.electrical + 0.46, 0.2],
    size: [0.74, 0.78, 0.62],
    summary: 'Alimentation secourue pour charges critiques et auxiliaires.',
    observe: 'Charge, autonomie, bypass, batterie, alarmes.'
  },
  tgbt: {
    label: 'TGBT',
    color: '#facc15',
    position: [-1.7, LEVEL_Y.electrical + 0.46, 0.2],
    size: [0.74, 0.78, 0.62],
    summary: 'Distribution basse tension critique.',
    observe: 'Départs, intensités, échauffement, sélectivité.'
  },
  pdu: {
    label: 'PDU / busway',
    color: '#fbbf24',
    position: [0.95, LEVEL_Y.electrical + 0.28, 0.2],
    size: [1.0, 0.24, 0.24],
    summary: 'Distribution finale vers les racks.',
    observe: 'Charge par phase, équilibre A/B, marge disponible.'
  },
  bms: {
    label: 'BMS / DCIM',
    color: '#60a5fa',
    position: [4.0, LEVEL_Y.electrical + 0.35, 0.2],
    size: [0.76, 0.42, 0.5],
    summary: 'Supervision des modes et séquences de refroidissement.',
    observe: 'Alarmes, tendances, seuils, cohérence capteurs.'
  },
  adiabaticDrycooler: {
    label: 'Adiabatic dry cooler',
    color: '#f97316',
    position: [-0.4, LEVEL_Y.roof + 0.38, -0.2],
    size: [2.05, 0.5, 0.9],
    summary: 'Dry cooler toiture avec amélioration adiabatique.',
    observe: 'Ventilateurs, batteries, pads/buses, température extérieure.'
  },
  riser: {
    label: 'Riser hydraulique',
    color: '#a78bfa',
    position: [5.45, 5.7, -2.25],
    size: [0.28, 11.2, 0.28],
    summary: 'Colonne verticale entre les niveaux.',
    observe: 'Calorifuge, repérage, purgeurs, condensation.'
  }
}

const CIRCUITS = {
  airCold: {
    label: 'Air froid',
    color: 0x38bdf8,
    kind: 'air',
    particles: 24,
    speed: 0.12,
    points: [
      [3.0, LEVEL_Y.it + 0.6, -0.95],
      [0.0, LEVEL_Y.it + 0.6, -0.95],
      [-3.6, LEVEL_Y.it + 0.6, -0.95],
      [-3.6, LEVEL_Y.it + 0.6, -1.15]
    ]
  },
  airHot: {
    label: 'Air chaud',
    color: 0xf97316,
    kind: 'air',
    particles: 24,
    speed: 0.1,
    points: [
      [-3.6, LEVEL_Y.it + 1.02, 1.6],
      [-0.2, LEVEL_Y.it + 1.02, 1.6],
      [3.0, LEVEL_Y.it + 1.02, 1.6],
      [3.0, LEVEL_Y.it + 0.95, 0.65]
    ]
  },
  chwSupply: {
    label: 'Départ eau glacée',
    color: 0x22d3ee,
    kind: 'water',
    particles: 28,
    speed: 0.09,
    points: [
      [-1.35, LEVEL_Y.cooling + 0.82, -1.15],
      [1.65, LEVEL_Y.cooling + 0.82, -1.15],
      [5.45, LEVEL_Y.cooling + 0.82, -1.15],
      [5.45, LEVEL_Y.it + 0.78, -1.15],
      [3.55, LEVEL_Y.it + 0.78, -1.15],
      [3.55, LEVEL_Y.it + 0.78, -0.2]
    ]
  },
  chwReturn: {
    label: 'Retour eau glacée',
    color: 0x0ea5e9,
    kind: 'water',
    particles: 28,
    speed: 0.09,
    points: [
      [3.55, LEVEL_Y.it + 0.98, 0.95],
      [5.05, LEVEL_Y.it + 0.98, 0.95],
      [5.05, LEVEL_Y.cooling + 1.0, 0.95],
      [-4.45, LEVEL_Y.cooling + 1.0, 0.95],
      [-4.45, LEVEL_Y.cooling + 0.95, -1.2]
    ]
  },
  glycolHot: {
    label: 'Glycol chaud',
    color: 0xef4444,
    kind: 'glycol',
    particles: 26,
    speed: 0.1,
    points: [
      [-4.45, LEVEL_Y.cooling + 0.85, -1.55],
      [5.45, LEVEL_Y.cooling + 0.85, -1.55],
      [5.45, LEVEL_Y.roof + 0.5, -1.55],
      [-0.4, LEVEL_Y.roof + 0.5, -1.55],
      [-0.4, LEVEL_Y.roof + 0.5, -0.65]
    ]
  },
  glycolCold: {
    label: 'Glycol refroidi',
    color: 0x06b6d4,
    kind: 'glycol',
    particles: 26,
    speed: 0.1,
    points: [
      [-0.4, LEVEL_Y.roof + 0.28, 0.45],
      [5.0, LEVEL_Y.roof + 0.28, 0.45],
      [5.0, LEVEL_Y.cooling + 0.55, 0.45],
      [-4.45, LEVEL_Y.cooling + 0.55, 0.45],
      [-4.45, LEVEL_Y.cooling + 0.55, -0.8]
    ]
  },
  adiabaticWater: {
    label: 'Eau adiabatique',
    color: 0x7dd3fc,
    kind: 'water',
    particles: 18,
    speed: 0.12,
    points: [
      [4.25, LEVEL_Y.cooling + 0.45, 1.85],
      [5.0, LEVEL_Y.cooling + 0.45, 1.85],
      [5.0, LEVEL_Y.roof + 0.72, 1.85],
      [-0.4, LEVEL_Y.roof + 0.72, 1.85],
      [-0.4, LEVEL_Y.roof + 0.72, 0.2]
    ]
  },
  outsideAir: {
    label: 'Air extérieur',
    color: 0x93c5fd,
    kind: 'air',
    particles: 14,
    speed: 0.08,
    points: [
      [-2.4, LEVEL_Y.roof + 0.46, -0.2],
      [-1.5, LEVEL_Y.roof + 0.46, -0.2],
      [-0.4, LEVEL_Y.roof + 0.46, -0.2],
      [0.8, LEVEL_Y.roof + 0.46, -0.2]
    ]
  },
  heatRejection: {
    label: 'Rejet chaleur',
    color: 0xff7a1a,
    kind: 'air',
    particles: 14,
    speed: 0.12,
    points: [
      [-0.4, LEVEL_Y.roof + 0.78, -0.2],
      [-0.4, LEVEL_Y.roof + 1.2, -0.2],
      [0.8, LEVEL_Y.roof + 1.2, -0.2]
    ]
  },
  chillerSupply: {
    label: 'Appoint chiller',
    color: 0x8b5cf6,
    kind: 'water',
    particles: 18,
    speed: 0.08,
    points: [
      [4.25, LEVEL_Y.cooling + 0.76, -1.05],
      [1.65, LEVEL_Y.cooling + 0.76, -1.05],
      [-1.35, LEVEL_Y.cooling + 0.76, -1.05]
    ]
  },
  chillerReturn: {
    label: 'Retour chiller',
    color: 0x6d28d9,
    kind: 'water',
    particles: 18,
    speed: 0.08,
    points: [
      [-1.35, LEVEL_Y.cooling + 0.42, -1.25],
      [1.65, LEVEL_Y.cooling + 0.42, -1.25],
      [4.25, LEVEL_Y.cooling + 0.42, -1.25]
    ]
  },
  refrigerantDischarge: {
    label: 'Refoulement',
    color: 0xef4444,
    kind: 'refrigerant',
    particles: 12,
    speed: 0.11,
    points: [
      [4.0, LEVEL_Y.cooling + 1.0, -1.35],
      [4.9, LEVEL_Y.cooling + 1.0, -1.35],
      [4.9, LEVEL_Y.cooling + 0.75, -0.55]
    ]
  },
  refrigerantLiquid: {
    label: 'Ligne liquide',
    color: 0xfb923c,
    kind: 'refrigerant',
    particles: 12,
    speed: 0.08,
    points: [
      [4.9, LEVEL_Y.cooling + 0.6, -0.55],
      [4.0, LEVEL_Y.cooling + 0.6, -0.55],
      [4.0, LEVEL_Y.cooling + 0.6, -1.35]
    ]
  },
  refrigerantExpansion: {
    label: 'Après détente',
    color: 0x22c55e,
    kind: 'refrigerant',
    particles: 10,
    speed: 0.08,
    points: [
      [4.0, LEVEL_Y.cooling + 0.6, -1.35],
      [4.0, LEVEL_Y.cooling + 0.3, -1.35],
      [4.55, LEVEL_Y.cooling + 0.3, -1.35]
    ]
  },
  refrigerantSuction: {
    label: 'Aspiration',
    color: 0x38bdf8,
    kind: 'refrigerant',
    particles: 12,
    speed: 0.09,
    points: [
      [4.55, LEVEL_Y.cooling + 0.3, -1.35],
      [4.55, LEVEL_Y.cooling + 0.3, -1.8],
      [4.0, LEVEL_Y.cooling + 0.3, -1.8],
      [4.0, LEVEL_Y.cooling + 1.0, -1.8]
    ]
  },
  continuousLoop: {
    label: 'Continuous cooling',
    color: 0x14b8a6,
    kind: 'water',
    particles: 26,
    speed: 0.12,
    points: [
      [-1.35, LEVEL_Y.cooling + 1.02, -1.15],
      [1.65, LEVEL_Y.cooling + 1.02, -1.15],
      [5.05, LEVEL_Y.cooling + 1.02, 0.25],
      [5.05, LEVEL_Y.it + 1.0, 0.25],
      [3.55, LEVEL_Y.it + 1.0, 0.25]
    ]
  },
  criticalPower: {
    label: 'Énergie critique',
    color: 0xfacc15,
    kind: 'power',
    particles: 22,
    speed: 0.11,
    points: [
      [-4.15, LEVEL_Y.electrical + 0.78, 0.15],
      [-1.7, LEVEL_Y.electrical + 0.78, 0.15],
      [0.95, LEVEL_Y.electrical + 0.78, 0.15],
      [1.65, LEVEL_Y.cooling + 0.88, 1.15],
      [3.55, LEVEL_Y.it + 1.02, 0.25]
    ]
  },
  controls: {
    label: 'Contrôle BMS/DCIM',
    color: 0x60a5fa,
    kind: 'signal',
    particles: 18,
    speed: 0.06,
    points: [
      [4.0, LEVEL_Y.electrical + 0.68, 0.15],
      [5.0, LEVEL_Y.electrical + 0.68, 0.15],
      [5.0, LEVEL_Y.cooling + 1.0, -0.85],
      [-1.35, LEVEL_Y.cooling + 1.0, -0.85],
      [3.55, LEVEL_Y.it + 1.1, 0.15]
    ]
  }
}

const GUIDE_STEPS = [
  {
    title: '1. Salle IT',
    text: 'La chaleur est générée par les baies puis reprise par le CRAH.',
    view: 'air',
    focus: 'racks'
  },
  {
    title: '2. Lien air / eau',
    text: 'Le CRAH transfère la chaleur vers la boucle eau glacée.',
    view: 'air',
    focus: 'crah'
  },
  {
    title: '3. Local froid',
    text: 'L’étage hydraulique est volontairement espacé pour éviter les superpositions.',
    view: 'hydraulic',
    focus: 'bufferTank'
  },
  {
    title: '4. Water tank',
    text: 'Le ballon tampon apporte de l’inertie et stabilise les transitions.',
    view: 'waterTank',
    focus: 'bufferTank'
  },
  {
    title: '5. Toiture',
    text: 'Le dry cooler rejette la chaleur sur son étage dédié.',
    view: 'roof',
    focus: 'adiabaticDrycooler'
  },
  {
    title: '6. Énergie critique',
    text: 'UPS, TGBT, PDU et BMS sont séparés pour une lecture plus claire.',
    view: 'electrical',
    focus: 'bms'
  },
  {
    title: '7. Continuous cooling',
    text: 'Le trio ballon + pompes + énergie secourue protège la continuité.',
    view: 'continuous',
    focus: 'bufferTank'
  }
]

function normalizeFocus(key) {
  if (!key || key === 'all') return null
  return FOCUS_ALIASES[key] ?? key
}

function vector3(point) {
  return new THREE.Vector3(point[0], point[1], point[2])
}

function createTextSprite(text, options = {}) {
  const {
    color = '#e0f2fe',
    background = 'rgba(15, 23, 42, 0.76)',
    fontSize = 28,
    padding = 16,
    scale = [1.0, 0.24, 1]
  } = options

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const font = `700 ${fontSize}px Inter, system-ui, sans-serif`

  context.font = font
  const textWidth = Math.ceil(context.measureText(text).width)
  canvas.width = Math.max(220, textWidth + padding * 2)
  canvas.height = 64

  context.font = font
  context.fillStyle = background
  context.strokeStyle = 'rgba(255,255,255,0.14)'
  context.lineWidth = 2

  const radius = 14
  const w = canvas.width
  const h = canvas.height

  context.beginPath()
  context.moveTo(radius, 1)
  context.lineTo(w - radius, 1)
  context.quadraticCurveTo(w - 1, 1, w - 1, radius)
  context.lineTo(w - 1, h - radius)
  context.quadraticCurveTo(w - 1, h - 1, w - radius, h - 1)
  context.lineTo(radius, h - 1)
  context.quadraticCurveTo(1, h - 1, 1, h - radius)
  context.lineTo(1, radius)
  context.quadraticCurveTo(1, 1, radius, 1)
  context.closePath()
  context.fill()
  context.stroke()

  context.fillStyle = color
  context.textBaseline = 'middle'
  context.fillText(text, padding, h / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false
  })

  const sprite = new THREE.Sprite(material)
  sprite.scale.set(scale[0] * (canvas.width / 220), scale[1], scale[2])
  sprite.renderOrder = 999

  return sprite
}

function polylineLengths(points) {
  const vectors = points.map(vector3)
  const lengths = []
  let total = 0

  for (let i = 0; i < vectors.length - 1; i += 1) {
    const len = vectors[i].distanceTo(vectors[i + 1])
    lengths.push(len)
    total += len
  }

  return { vectors, lengths, total }
}

function pointOnPolyline(data, progress) {
  const target = data.total * progress
  let traveled = 0

  for (let i = 0; i < data.lengths.length; i += 1) {
    const segmentLength = data.lengths[i]
    const nextTravel = traveled + segmentLength

    if (target <= nextTravel || i === data.lengths.length - 1) {
      const localT = segmentLength === 0 ? 0 : (target - traveled) / segmentLength
      return data.vectors[i].clone().lerp(data.vectors[i + 1], localT)
    }

    traveled = nextTravel
  }

  return data.vectors[data.vectors.length - 1].clone()
}

function createOrthogonalPipe(points, color, radius) {
  const group = new THREE.Group()
  const vectors = points.map(vector3)

  const segmentMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.45
  })

  const jointMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.58
  })

  for (let i = 0; i < vectors.length - 1; i += 1) {
    const start = vectors[i]
    const end = vectors[i + 1]
    const direction = end.clone().sub(start)
    const length = direction.length()

    if (length <= 0.0001) continue

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 10),
      segmentMaterial
    )

    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5))
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    )

    group.add(mesh)

    if (i < vectors.length - 2) {
      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.16, 10, 10),
        jointMaterial
      )
      joint.position.copy(end)
      group.add(joint)
    }
  }

  return group
}

function addZone(scene, zone, labelsVisible) {
  const geometry = new THREE.BoxGeometry(zone.size[0], zone.size[1], zone.size[2])
  const material = new THREE.MeshStandardMaterial({
    color: zone.color,
    transparent: true,
    opacity: 0.11,
    roughness: 0.85,
    metalness: 0.03
  })

  const slab = new THREE.Mesh(geometry, material)
  slab.position.set(...zone.center)
  scene.add(slab)

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: zone.color,
      transparent: true,
      opacity: 0.42
    })
  )
  edges.position.copy(slab.position)
  scene.add(edges)

  const grid = new THREE.GridHelper(zone.size[0], 10, zone.color, 0x1e293b)
  grid.position.set(zone.center[0], zone.center[1] + 0.035, zone.center[2])
  grid.material.transparent = true
  grid.material.opacity = 0.16
  scene.add(grid)

  if (labelsVisible) {
    const label = createTextSprite(zone.label, {
      fontSize: 24,
      scale: [0.95, 0.22, 1],
      color: '#f8fafc',
      background: 'rgba(2, 6, 23, 0.72)'
    })
    label.position.set(...zone.labelPos)
    scene.add(label)
  }
}

function addEquipment(scene, key, item, selected, labelsVisible, clickableObjects, reducedLabels) {
  const color = new THREE.Color(item.color)
  const geometry = item.round
    ? new THREE.CylinderGeometry(item.size[0] / 2, item.size[0] / 2, item.size[1], 30)
    : new THREE.BoxGeometry(item.size[0], item.size[1], item.size[2])

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: selected ? 0.25 : 0.12,
    emissive: selected ? color.clone().multiplyScalar(0.35) : new THREE.Color(0x000000),
    transparent: true,
    opacity: selected ? 1 : 0.94
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...item.position)
  mesh.userData.equipmentKey = key
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  clickableObjects.push(mesh)

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: selected ? 0xffffff : color,
      transparent: true,
      opacity: selected ? 0.85 : 0.3
    })
  )
  outline.position.copy(mesh.position)
  scene.add(outline)

  if (selected) {
    const haloGeometry = item.round
      ? new THREE.CylinderGeometry(item.size[0] / 2 + 0.1, item.size[0] / 2 + 0.1, item.size[1] + 0.14, 30)
      : new THREE.BoxGeometry(item.size[0] + 0.14, item.size[1] + 0.14, item.size[2] + 0.14)

    const halo = new THREE.Mesh(
      haloGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.18,
        depthWrite: false
      })
    )
    halo.position.copy(mesh.position)
    scene.add(halo)
  }

  if (item.tankDetails) {
    const ringMat = new THREE.LineBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: selected ? 0.9 : 0.55
    })

    ;[-0.38, 0.38].forEach((offset) => {
      const ring = new THREE.LineSegments(
        new THREE.EdgesGeometry(
          new THREE.CylinderGeometry(item.size[0] / 2 + 0.035, item.size[0] / 2 + 0.035, 0.03, 24)
        ),
        ringMat
      )
      ring.position.set(item.position[0], item.position[1] + offset, item.position[2])
      scene.add(ring)
    })

    ;[0.46, -0.46].forEach((offset) => {
      const sensor = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
      )
      sensor.position.set(item.position[0] + item.size[0] / 2 + 0.075, item.position[1] + offset, item.position[2])
      scene.add(sensor)
    })
  }

  const shouldShowLabel = labelsVisible && (!reducedLabels || selected)

  if (shouldShowLabel) {
    const label = createTextSprite(item.label, {
      color: selected ? '#ffffff' : '#e0f2fe',
      background: selected ? 'rgba(37, 99, 235, 0.84)' : 'rgba(15, 23, 42, 0.72)',
      fontSize: selected ? 26 : 22,
      scale: selected ? [1.02, 0.24, 1] : [0.88, 0.2, 1]
    })

    label.position.set(
      item.position[0],
      item.position[1] + item.size[1] / 2 + 0.28,
      item.position[2]
    )
    scene.add(label)
  }
}

function addCircuit(scene, circuit, particlesBag) {
  const radiusByKind = {
    air: 0.038,
    water: 0.032,
    glycol: 0.036,
    refrigerant: 0.024,
    power: 0.022,
    signal: 0.016
  }

  const radius = radiusByKind[circuit.kind] ?? 0.03
  const pipe = createOrthogonalPipe(circuit.points, circuit.color, radius)
  scene.add(pipe)

  const polyline = polylineLengths(circuit.points)

  const particleGeometry = new THREE.SphereGeometry(radius * 1.55, 10, 10)
  const particleMaterial = new THREE.MeshBasicMaterial({
    color: circuit.color,
    transparent: true,
    opacity: 0.95
  })

  const particles = []

  for (let i = 0; i < circuit.particles; i += 1) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial)
    const progress = i / circuit.particles
    particle.position.copy(pointOnPolyline(polyline, progress))
    particle.userData.progress = progress
    scene.add(particle)
    particles.push(particle)
  }

  particlesBag.push({
    polyline,
    particles,
    speed: circuit.speed
  })
}

function disposeObject(object) {
  if (object.geometry) object.geometry.dispose()

  if (object.material) {
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (material.map) material.map.dispose()
      material.dispose()
    })
  }
}

export default function HvacCycle3D({
  highlightedComponent = null,
  params = DEFAULT_PARAMS,
  className = ''
}) {
  const mountRef = useRef(null)
  const [activeView, setActiveView] = useState('overview')
  const [labelsVisible, setLabelsVisible] = useState(false)
  const [selectedKey, setSelectedKey] = useState(null)
  const [guideIndex, setGuideIndex] = useState(0)
  const [zoomedOut, setZoomedOut] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [showInspector, setShowInspector] = useState(true)
  const [reducedLabels, setReducedLabels] = useState(true)

  const focusKey = useMemo(() => {
    const guideFocus = GUIDE_STEPS[guideIndex]?.focus
    return normalizeFocus(highlightedComponent) ?? guideFocus ?? null
  }, [guideIndex, highlightedComponent])

  const visible = useMemo(() => {
    const config = VIEWS[activeView] ?? VIEWS.overview
    return {
      zones: config.zones,
      equipment: config.equipment,
      circuits: config.circuits,
      hint: config.hint
    }
  }, [activeView])

  const selected = selectedKey ? EQUIPMENT[selectedKey] : focusKey ? EQUIPMENT[focusKey] : null
  const selectedLabel = selectedKey ? 'Équipement sélectionné' : focusKey ? 'Focus pédagogique' : 'Sélection'

  useEffect(() => {
    const step = GUIDE_STEPS[guideIndex]
    if (step?.view) setActiveView(step.view)
  }, [guideIndex])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth || 1100
    const height = mount.clientHeight || 820

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020617)
    scene.fog = new THREE.Fog(0x020617, 22, 42)

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120)
    camera.position.set(
      zoomedOut ? 12.8 : 10.0,
      zoomedOut ? 14.5 : 11.8,
      zoomedOut ? 17.6 : 14.2
    )

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.enablePan = true
    controls.minDistance = 9
    controls.maxDistance = 28
    controls.target.set(0.2, 5.7, -0.4)

    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x020617, 1.28))

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3)
    keyLight.position.set(6, 15, 8)
    keyLight.castShadow = true
    scene.add(keyLight)

    const pointLight = new THREE.PointLight(0x38bdf8, 1.05, 20)
    pointLight.position.set(-4.5, 7.0, 3.2)
    scene.add(pointLight)

    visible.zones.forEach((key) => addZone(scene, ZONES[key], labelsVisible))

    const particleGroups = []
    visible.circuits.forEach((key) => addCircuit(scene, CIRCUITS[key], particleGroups))

    const clickableObjects = []
    visible.equipment.forEach((key) => {
      addEquipment(
        scene,
        key,
        EQUIPMENT[key],
        key === focusKey || key === selectedKey,
        labelsVisible,
        clickableObjects,
        reducedLabels
      )
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(clickableObjects, false)

      if (hits[0]?.object?.userData?.equipmentKey) {
        setSelectedKey(hits[0].object.userData.equipmentKey)
        setShowInspector(true)
      } else {
        setSelectedKey(null)
      }
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown)

    const handleResize = () => {
      const nextWidth = mount.clientWidth || width
      const nextHeight = mount.clientHeight || height
      camera.aspect = nextWidth / nextHeight
      camera.updateProjectionMatrix()
      renderer.setSize(nextWidth, nextHeight)
    }

    window.addEventListener('resize', handleResize)

    let animationFrame = 0
    const clock = new THREE.Clock()

    const animate = () => {
      const delta = clock.getDelta()

      particleGroups.forEach((group) => {
        group.particles.forEach((particle) => {
          particle.userData.progress = (particle.userData.progress + delta * group.speed) % 1
          particle.position.copy(pointOnPolyline(group.polyline, particle.userData.progress))
        })
      })

      controls.update()
      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', handleResize)
      controls.dispose()
      scene.traverse(disposeObject)
      renderer.dispose()

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [activeView, focusKey, labelsVisible, reducedLabels, selectedKey, visible.circuits, visible.equipment, visible.zones, zoomedOut])

  return (
    <div className={`relative min-h-[760px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 ${className}`}>
      <div ref={mountRef} className="h-[900px] w-full min-h-[760px]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto max-w-[340px] rounded-2xl border border-white/10 bg-slate-950/72 px-3 py-2 shadow-xl backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Modèle 3D
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-blue-500/20 px-2 py-1 text-[11px] font-bold text-blue-100">
                {VIEWS[activeView]?.label}
              </span>
              <span className="text-[11px] text-slate-300">{visible.hint}</span>
            </div>
          </div>

          <div className="pointer-events-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLabelsVisible((v) => !v)}
              className="rounded-xl border border-slate-700 bg-slate-900/78 px-3 py-2 text-[11px] font-bold text-slate-100"
            >
              {labelsVisible ? 'Masquer labels' : 'Afficher labels'}
            </button>
            <button
              type="button"
              onClick={() => setReducedLabels((v) => !v)}
              className="rounded-xl border border-slate-700 bg-slate-900/78 px-3 py-2 text-[11px] font-bold text-slate-100"
            >
              {reducedLabels ? 'Labels complets' : 'Labels réduits'}
            </button>
            <button
              type="button"
              onClick={() => setZoomedOut((v) => !v)}
              className="rounded-xl border border-slate-700 bg-slate-900/78 px-3 py-2 text-[11px] font-bold text-slate-100"
            >
              {zoomedOut ? 'Vue rapprochée' : 'Vue large'}
            </button>
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="rounded-xl border border-slate-700 bg-slate-900/78 px-3 py-2 text-[11px] font-bold text-slate-100"
            >
              {showGuide ? 'Masquer guide' : 'Guide'}
            </button>
          </div>
        </div>

        <div className="pointer-events-auto mt-2 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/58 p-2 backdrop-blur">
          {Object.entries(VIEWS).map(([key, view]) => (
            <button
              type="button"
              key={key}
              onClick={() => {
                setActiveView(key)
                setSelectedKey(null)
              }}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                key === activeView
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {showGuide ? (
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[340px]">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/74 p-3 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Guide 3D
                </p>
                <h3 className="mt-1 text-sm font-black text-white">
                  {GUIDE_STEPS[guideIndex].title}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGuideIndex((i) => Math.max(0, i - 1))}
                  className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-100 disabled:opacity-40"
                  disabled={guideIndex === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setGuideIndex((i) => Math.min(GUIDE_STEPS.length - 1, i + 1))}
                  className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-40"
                  disabled={guideIndex === GUIDE_STEPS.length - 1}
                >
                  →
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {GUIDE_STEPS[guideIndex].text}
            </p>
          </div>
        </div>
      ) : null}

      {showInspector && selected ? (
        <div className="pointer-events-none absolute bottom-3 right-3 max-w-[360px]">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/78 p-3 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
                  {selectedLabel}
                </p>
                <h3 className="mt-1 text-sm font-black text-white">{selected.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInspector(false)}
                className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {selected.summary}
            </p>

            <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                À contrôler sur site
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-200">
                {selected.observe}
              </p>
            </div>

            {selected.learning?.length ? (
              <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-500/10 p-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">
                  Notions water tank
                </h4>
                <ul className="mt-2 space-y-1 text-xs text-sky-50/90">
                  {selected.learning.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-xl bg-slate-900/90 p-2">
                <p className="text-slate-500">T évap.</p>
                <p className="font-black text-white">{params?.evapTemp ?? DEFAULT_PARAMS.evapTemp}°C</p>
              </div>
              <div className="rounded-xl bg-slate-900/90 p-2">
                <p className="text-slate-500">T cond.</p>
                <p className="font-black text-white">{params?.condTemp ?? DEFAULT_PARAMS.condTemp}°C</p>
              </div>
              <div className="rounded-xl bg-slate-900/90 p-2">
                <p className="text-slate-500">COP</p>
                <p className="font-black text-white">{params?.cop ?? DEFAULT_PARAMS.cop}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
