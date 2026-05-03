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

const LEVEL_Y = {
  it: 0,
  cooling: 3.2,
  electrical: 6.4,
  roof: 9.6
}

const FOCUS_ALIASES = {
  all: null,
  compressor: 'chillerAssist',
  condenser: 'adiabaticDrycooler',
  expansionValve: 'chillerAssist',
  evaporator: 'crah'
}

const VIEWS = {
  overview: {
    label: 'Vue étagée',
    hint: 'Lecture par niveaux : salle IT en bas, local froid au-dessus, énergie/supervision séparées, toiture en haut.',
    zones: ['itLevel', 'coolingLevel', 'electricalLevel', 'roofLevel', 'riserShaft'],
    equipment: ['racks', 'crah', 'coldAisle', 'hotAisle', 'plateHx', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'chillerAssist', 'adiabaticWater', 'ups', 'tgbt', 'pdu', 'bms', 'adiabaticDrycooler', 'riser'],
    circuits: ['airCold', 'airHot', 'chwSupply', 'chwReturn', 'glycolHot', 'glycolCold', 'adiabaticWater', 'continuousLoop', 'criticalPower', 'controls']
  },
  air: {
    label: 'N0 · Salle IT',
    hint: 'Salle IT isolée : baies, allée froide, allée chaude et CRAH.',
    zones: ['itLevel'],
    equipment: ['racks', 'crah', 'coldAisle', 'hotAisle'],
    circuits: ['airCold', 'airHot']
  },
  hydraulic: {
    label: 'N1 · Hydraulique',
    hint: 'Local froid espacé : échangeur, ballon tampon, pompes et chiller assist.',
    zones: ['itLevel', 'coolingLevel', 'roofLevel', 'riserShaft'],
    equipment: ['crah', 'plateHx', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'chillerAssist', 'adiabaticDrycooler', 'riser'],
    circuits: ['chwSupply', 'chwReturn', 'glycolHot', 'glycolCold', 'chillerSupply', 'chillerReturn']
  },
  waterTank: {
    label: 'Water Tank',
    hint: 'Ballon tampon isolé : volume, inertie, stabilité et transition.',
    zones: ['coolingLevel'],
    equipment: ['plateHx', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'chillerAssist'],
    circuits: ['chwSupply', 'chwReturn', 'chillerSupply', 'chillerReturn', 'continuousLoop']
  },
  roof: {
    label: 'N3 · Toiture',
    hint: 'Dry cooler sur son propre étage pour clarifier le rejet thermique.',
    zones: ['coolingLevel', 'roofLevel', 'riserShaft'],
    equipment: ['plateHx', 'adiabaticWater', 'adiabaticDrycooler', 'riser'],
    circuits: ['glycolHot', 'glycolCold', 'adiabaticWater', 'outsideAir', 'heatRejection']
  },
  chiller: {
    label: 'Chiller Assist',
    hint: 'Appoint mécanique séparé du free cooling.',
    zones: ['coolingLevel'],
    equipment: ['chillerAssist', 'plateHx', 'bufferTank', 'primaryPumps'],
    circuits: ['chillerSupply', 'chillerReturn', 'refrigerantDischarge', 'refrigerantLiquid', 'refrigerantExpansion', 'refrigerantSuction']
  },
  continuous: {
    label: 'Continuous Cooling',
    hint: 'Ballon tampon + pompes critiques + énergie secourue.',
    zones: ['itLevel', 'coolingLevel', 'electricalLevel', 'riserShaft'],
    equipment: ['crah', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'ups', 'tgbt', 'pdu', 'bms'],
    circuits: ['chwSupply', 'chwReturn', 'continuousLoop', 'criticalPower', 'controls']
  },
  electrical: {
    label: 'N2 · Électricité',
    hint: 'Énergie critique et supervision sur un étage dédié.',
    zones: ['electricalLevel', 'coolingLevel', 'itLevel'],
    equipment: ['ups', 'tgbt', 'pdu', 'bms', 'primaryPumps', 'secondaryPumps', 'crah'],
    circuits: ['criticalPower', 'controls']
  },
  all: {
    label: 'Tout',
    hint: 'Vue complète étagée avec équipements espacés.',
    zones: ['itLevel', 'coolingLevel', 'electricalLevel', 'roofLevel', 'riserShaft'],
    equipment: ['racks', 'crah', 'coldAisle', 'hotAisle', 'plateHx', 'bufferTank', 'primaryPumps', 'secondaryPumps', 'chillerAssist', 'adiabaticWater', 'ups', 'tgbt', 'pdu', 'bms', 'adiabaticDrycooler', 'riser'],
    circuits: ['airCold', 'airHot', 'chwSupply', 'chwReturn', 'glycolHot', 'glycolCold', 'adiabaticWater', 'outsideAir', 'heatRejection', 'chillerSupply', 'chillerReturn', 'refrigerantDischarge', 'refrigerantLiquid', 'refrigerantExpansion', 'refrigerantSuction', 'continuousLoop', 'criticalPower', 'controls']
  }
}

const ZONES = {
  itLevel: { label: 'Niveau 0 · Salle IT', color: 0x38bdf8, center: [0, LEVEL_Y.it, 0], size: [9.5, 0.06, 4.6], labelPos: [-4.25, LEVEL_Y.it + 0.34, -2.58] },
  coolingLevel: { label: 'Niveau 1 · Local froid', color: 0x22d3ee, center: [0, LEVEL_Y.cooling, 0], size: [9.5, 0.06, 4.6], labelPos: [-4.25, LEVEL_Y.cooling + 0.34, -2.58] },
  electricalLevel: { label: 'Niveau 2 · Énergie / supervision', color: 0xfacc15, center: [0, LEVEL_Y.electrical, 0], size: [9.5, 0.06, 4.6], labelPos: [-4.25, LEVEL_Y.electrical + 0.34, -2.58] },
  roofLevel: { label: 'Niveau 3 · Toiture', color: 0xf97316, center: [0, LEVEL_Y.roof, 0], size: [9.5, 0.06, 4.6], labelPos: [-4.25, LEVEL_Y.roof + 0.34, -2.58] },
  riserShaft: { label: 'Riser vertical', color: 0xa78bfa, center: [4.45, 4.8, -1.75], size: [0.42, 9.6, 0.42], labelPos: [4.55, 8.9, -0.95] }
}

const EQUIPMENT = {
  racks: { label: 'Baies serveurs', color: '#94a3b8', position: [-2.85, LEVEL_Y.it + 0.78, 0.45], size: [1.45, 1.5, 1.4], summary: 'Charge IT. Elle transforme l'énergie électrique consommée en chaleur à évacuer en continu.', observe: 'Température entrée serveur, points chauds, obturateurs, séparation allée froide/allée chaude, charge kW.' },
  coldAisle: { label: 'Allée froide', color: '#38bdf8', position: [-2.85, LEVEL_Y.it + 0.13, -1.25], size: [2.25, 0.12, 0.5], summary: 'Zone où l'air froid arrive en face avant des baies.', observe: 'Température entrée serveur, dalles ouvertes, confinement, absence de recirculation chaude.' },
  hotAisle: { label: 'Allée chaude', color: '#f97316', position: [-2.85, LEVEL_Y.it + 0.13, 1.75], size: [2.25, 0.12, 0.5], summary: 'Zone où l'air chaud sort des baies avant d'être repris par les unités.', observe: 'Température reprise, confinement, bypass, fuite d'air chaud vers l'allée froide.' },
  crah: { label: 'CRAH / batterie froide', color: '#0ea5e9', position: [2.85, LEVEL_Y.it + 0.68, 0.28], size: [0.78, 1.25, 1.6], summary: 'Unité de salle qui souffle l'air froid vers les baies et reprend l'air chaud.', observe: 'Débit air, filtres, batterie, vanne, condensats, risque antigel, température soufflage/reprise.' },
  plateHx: { label: 'Échangeur free cooling', color: '#67e8f9', position: [-3.55, LEVEL_Y.cooling + 0.58, -1.05], size: [0.85, 1.05, 0.56], summary: 'Sépare la boucle glycol extérieure de la boucle eau glacée intérieure.', observe: 'Delta T primaire/secondaire, encrassement, vannes, purge, perte de charge.' },
  bufferTank: { label: 'Ballon tampon / water tank', color: '#38bdf8', position: [-1.15, LEVEL_Y.cooling + 0.72, -1.05], size: [0.72, 1.45, 0.72], round: true, tankDetails: true, summary: 'Water tank de la boucle eau glacée : il ajoute du volume d'eau, stabilise la température et donne de l'inertie pendant les transitions.', observe: 'Températures haut/bas, stratification, volume disponible, isolation, purge, sondes BMS/DCIM, cohérence départ/retour.', learning: ['Ne produit pas de froid : il stocke temporairement de l'énergie thermique grâce au volume d'eau.', 'Aide le continuous cooling lors d'une bascule de mode, d'un démarrage chiller assist ou d'une microcoupure.', 'Sa marge dépend du volume, du débit et du delta T disponible.', 'À ne pas confondre avec un vase d'expansion.'] },
  primaryPumps: { label: 'Pompes primaires', color: '#22d3ee', position: [1.35, LEVEL_Y.cooling + 0.32, -1.75], size: [0.8, 0.52, 0.5], summary: 'Assurent le débit entre production, échangeur et ballon tampon.', observe: 'Débit, pression différentielle, variateur, vibrations, basculement pompe secours.' },
  secondaryPumps: { label: 'Pompes secondaires critiques', color: '#06b6d4', position: [1.35, LEVEL_Y.cooling + 0.32, 0.85], size: [0.8, 0.52, 0.5], summary: 'Maintiennent le débit vers les CRAH, y compris pendant les transitions de mode.', observe: 'Alimentation secourue, pression différentielle salle, redondance N+1, alarmes variateur.' },
  chillerAssist: { label: 'Chiller assist', color: '#8b5cf6', position: [3.45, LEVEL_Y.cooling + 0.62, -0.95], size: [1.0, 0.85, 0.9], summary: 'Appoint mécanique lorsque le dry cooler et l'adiabatique ne suffisent plus.', observe: 'Autorisation BMS, démarrage compresseur, HP/BP, charge, intensité, stabilité de consigne.' },
  adiabaticWater: { label: 'Eau adiabatique', color: '#7dd3fc', position: [3.45, LEVEL_Y.cooling + 0.36, 1.65], size: [0.9, 0.55, 0.65], summary: 'Alimente les pads ou buses pour pré-refroidir l'air extérieur du dry cooler.', observe: 'Qualité d'eau, filtration, conductivité, purge, vanne, risque entartrage et hygiène.' },
  ups: { label: 'UPS / onduleur', color: '#a78bfa', position: [-3.35, LEVEL_Y.electrical + 0.52, 0.15], size: [0.88, 0.9, 0.75], summary: 'Alimentation secourue pour charges critiques et auxiliaires nécessaires au maintien du froid.', observe: 'Charge %, autonomie, bypass, batterie, alarmes, température local.' },
  tgbt: { label: 'TGBT critique', color: '#facc15', position: [-1.45, LEVEL_Y.electrical + 0.52, 0.15], size: [0.88, 0.9, 0.75], summary: 'Distribution basse tension vers pompes, CRAH, chiller assist et auxiliaires.', observe: 'Départs, échauffement, intensités, sélectivité, identification des circuits.' },
  pdu: { label: 'PDU / busway', color: '#fbbf24', position: [0.65, LEVEL_Y.electrical + 0.35, 0.15], size: [1.15, 0.32, 0.32], summary: 'Distribution finale vers les racks, souvent en double alimentation A/B.', observe: 'Charge par phase, charge A/B, déséquilibre, alarmes, marge disponible.' },
  bms: { label: 'BMS / DCIM', color: '#60a5fa', position: [3.0, LEVEL_Y.electrical + 0.45, 0.15], size: [0.88, 0.55, 0.58], summary: 'Supervision des modes dry, adiabatique, chiller assist et continuous cooling.', observe: 'Tendances, alarmes, séquences, seuils, sondes incohérentes, ordre de démarrage.' },
  adiabaticDrycooler: { label: 'Adiabatic dry cooler', color: '#f97316', position: [-0.25, LEVEL_Y.roof + 0.43, -0.25], size: [2.35, 0.62, 1.0], summary: 'Équipement toiture : dry cooler avec pré-refroidissement adiabatique de l'air.', observe: 'Ventilateurs, batteries, pads/buses, débit glycol, propreté, température extérieure, alarme eau.' },
  riser: { label: 'Riser hydraulique', color: '#a78bfa', position: [4.45, 4.8, -1.75], size: [0.34, 9.4, 0.34], summary: 'Colonne verticale qui rend lisible la liaison entre les étages techniques.', observe: 'Supports, calorifuge, identification départ/retour, purgeurs hauts, coupe-feu, condensation.' }
}

const CIRCUITS = {
  airCold:              { color: 0x38bdf8, kind: 'air',         particles: 32, speed: 0.16, points: [[2.45, LEVEL_Y.it + 0.62, -0.75], [0.45, LEVEL_Y.it + 0.62, -1.15], [-2.85, LEVEL_Y.it + 0.62, -1.25], [-3.55, LEVEL_Y.it + 0.9, -0.25]] },
  airHot:               { color: 0xf97316, kind: 'air',         particles: 32, speed: 0.13, points: [[-3.55, LEVEL_Y.it + 1.18, 1.45], [-1.6, LEVEL_Y.it + 1.18, 1.75], [1.35, LEVEL_Y.it + 1.08, 1.2], [2.45, LEVEL_Y.it + 0.92, 0.65]] },
  chwSupply:            { color: 0x22d3ee, kind: 'water',       particles: 34, speed: 0.11, points: [[-1.15, LEVEL_Y.cooling + 0.78, -1.05], [1.35, LEVEL_Y.cooling + 0.78, 0.85], [4.45, LEVEL_Y.cooling + 0.78, -0.1], [4.45, LEVEL_Y.it + 0.75, -0.1], [2.85, LEVEL_Y.it + 0.75, -0.3]] },
  chwReturn:            { color: 0x0ea5e9, kind: 'water',       particles: 34, speed: 0.10, points: [[2.85, LEVEL_Y.it + 1.05, 0.55], [4.05, LEVEL_Y.it + 1.05, 0.6], [4.05, LEVEL_Y.cooling + 0.95, 0.6], [-3.55, LEVEL_Y.cooling + 0.95, -1.05]] },
  glycolHot:            { color: 0xef4444, kind: 'glycol',      particles: 30, speed: 0.13, points: [[-3.55, LEVEL_Y.cooling + 0.86, -1.35], [4.45, LEVEL_Y.cooling + 0.86, -1.75], [4.45, LEVEL_Y.roof + 0.55, -1.75], [-0.25, LEVEL_Y.roof + 0.55, -0.85]] },
  glycolCold:           { color: 0x06b6d4, kind: 'glycol',      particles: 30, speed: 0.13, points: [[-0.25, LEVEL_Y.roof + 0.36, 0.15], [4.05, LEVEL_Y.roof + 0.36, 0.15], [4.05, LEVEL_Y.cooling + 0.58, 0.15], [-3.55, LEVEL_Y.cooling + 0.58, -0.7]] },
  adiabaticWater:       { color: 0x7dd3fc, kind: 'water',       particles: 24, speed: 0.16, points: [[3.45, LEVEL_Y.cooling + 0.48, 1.65], [3.85, LEVEL_Y.cooling + 0.48, 1.65], [3.85, LEVEL_Y.roof + 0.76, 1.0], [-0.25, LEVEL_Y.roof + 0.76, 0.36]] },
  outsideAir:           { color: 0x93c5fd, kind: 'air',         particles: 22, speed: 0.11, points: [[-2.0, LEVEL_Y.roof + 0.56, -0.25], [-1.25, LEVEL_Y.roof + 0.56, -0.25], [-0.25, LEVEL_Y.roof + 0.56, -0.25], [0.95, LEVEL_Y.roof + 0.56, -0.25]] },
  heatRejection:        { color: 0xff7a1a, kind: 'air',         particles: 22, speed: 0.16, points: [[-0.25, LEVEL_Y.roof + 0.82, -0.25], [-0.25, LEVEL_Y.roof + 1.22, -0.25], [0.7, LEVEL_Y.roof + 1.22, -0.25]] },
  chillerSupply:        { color: 0x8b5cf6, kind: 'water',       particles: 22, speed: 0.10, points: [[3.45, LEVEL_Y.cooling + 0.78, -0.95], [1.35, LEVEL_Y.cooling + 0.78, -0.95], [-1.15, LEVEL_Y.cooling + 0.78, -1.05]] },
  chillerReturn:        { color: 0x6d28d9, kind: 'water',       particles: 22, speed: 0.10, points: [[-1.15, LEVEL_Y.cooling + 0.46, -1.05], [0.8, LEVEL_Y.cooling + 0.46, -1.95], [3.45, LEVEL_Y.cooling + 0.46, -0.95]] },
  refrigerantDischarge: { color: 0xef4444, kind: 'refrigerant', particles: 16, speed: 0.14, points: [[3.2, LEVEL_Y.cooling + 1.05, -1.35], [3.9, LEVEL_Y.cooling + 1.05, -1.35], [3.9, LEVEL_Y.cooling + 0.78, -0.55]] },
  refrigerantLiquid:    { color: 0xfb923c, kind: 'refrigerant', particles: 16, speed: 0.10, points: [[3.9, LEVEL_Y.cooling + 0.62, -0.55], [3.2, LEVEL_Y.cooling + 0.62, -0.55], [3.2, LEVEL_Y.cooling + 0.62, -1.35]] },
  refrigerantExpansion: { color: 0x22c55e, kind: 'refrigerant', particles: 14, speed: 0.10, points: [[3.2, LEVEL_Y.cooling + 0.62, -1.35], [3.2, LEVEL_Y.cooling + 0.35, -1.35], [3.75, LEVEL_Y.cooling + 0.35, -1.35]] },
  refrigerantSuction:   { color: 0x38bdf8, kind: 'refrigerant', particles: 16, speed: 0.11, points: [[3.75, LEVEL_Y.cooling + 0.35, -1.35], [3.75, LEVEL_Y.cooling + 0.35, -1.75], [3.2, LEVEL_Y.cooling + 0.35, -1.75], [3.2, LEVEL_Y.cooling + 1.05, -1.35]] },
  continuousLoop:       { color: 0x14b8a6, kind: 'water',       particles: 34, speed: 0.15, points: [[-1.15, LEVEL_Y.cooling + 1.06, -1.05], [1.35, LEVEL_Y.cooling + 1.06, 0.85], [3.95, LEVEL_Y.cooling + 1.06, 0.45], [3.95, LEVEL_Y.it + 0.96, 0.45], [2.85, LEVEL_Y.it + 0.96, 0.28]] },
  criticalPower:        { color: 0xfacc15, kind: 'power',       particles: 30, speed: 0.14, points: [[-3.35, LEVEL_Y.electrical + 0.82, 0.15], [-1.45, LEVEL_Y.electrical + 0.82, 0.15], [0.65, LEVEL_Y.electrical + 0.7, 0.15], [1.35, LEVEL_Y.cooling + 0.9, 0.85], [2.85, LEVEL_Y.it + 1.05, 0.28]] },
  controls:             { color: 0x60a5fa, kind: 'signal',      particles: 24, speed: 0.08, points: [[3.0, LEVEL_Y.electrical + 0.72, 0.15], [3.85, LEVEL_Y.electrical + 0.72, 0.15], [3.85, LEVEL_Y.cooling + 1.0, -0.95], [-1.15, LEVEL_Y.cooling + 1.05, -1.05], [2.85, LEVEL_Y.it + 1.15, 0.28]] }
}

const GUIDE_STEPS = [
  { title: '1 · Chaleur naît en salle IT', text: 'Les baies sont isolées sur le premier étage. Cela permet de lire clairement air froid, air chaud et CRAH.', view: 'air', focus: 'racks' },
  { title: '2 · CRAH transfère vers l'eau', text: 'Le CRAH reste au niveau IT, mais ses tubes montent vers le niveau hydraulique pour montrer le lien avec le local froid.', view: 'air', focus: 'crah' },
  { title: '3 · Local froid espacé', text: 'Échangeur, ballon tampon, pompes et chiller assist sont séparés pour éviter les superpositions et faciliter la lecture.', view: 'hydraulic', focus: 'bufferTank' },
  { title: '4 · Water tank : inertie hydraulique', text: 'Le ballon tampon ne produit pas de froid : il ajoute du volume d'eau, stabilise la température et donne du temps pendant les transitions.', view: 'waterTank', focus: 'bufferTank' },
  { title: '5 · Rejet en toiture', text: 'Le dry cooler est placé sur sa propre dalle. Le riser montre comment le glycol monte et redescend.', view: 'roof', focus: 'adiabaticDrycooler' },
  { title: '6 · Énergie et supervision', text: 'UPS, TGBT, PDU et BMS/DCIM sont séparés du local froid pour clarifier la chaîne critique.', view: 'electrical', focus: 'bms' },
  { title: '7 · Continuous cooling', text: 'Trio : ballon tampon pour l'inertie, pompes pour le débit, énergie secourue pour maintenir les auxiliaires.', view: 'continuous', focus: 'bufferTank' }
]

function normalizeFocus(key) {
  if (!key || key === 'all') return null
  return FOCUS_ALIASES[key] ?? key
}

function vector3(point) {
  return new THREE.Vector3(point[0], point[1], point[2])
}

// Build orthogonal waypoints: X → Z → Y routing
function makeOrthogonalPoints(rawPoints) {
  const out = [vector3(rawPoints[0])]
  for (let i = 1; i < rawPoints.length; i++) {
    const a = rawPoints[i - 1]
    const b = rawPoints[i]
    const step1 = new THREE.Vector3(b[0], a[1], a[2]) // move X
    const step2 = new THREE.Vector3(b[0], a[1], b[2]) // move Z
    const end   = new THREE.Vector3(b[0], b[1], b[2]) // move Y
    const last = out[out.length - 1]
    if (step1.distanceToSquared(last)   > 1e-5) out.push(step1)
    if (step2.distanceToSquared(out[out.length - 1]) > 1e-5) out.push(step2)
    if (end.distanceToSquared(out[out.length - 1])   > 1e-5) out.push(end)
  }
  return out
}

function createTextSprite(text, options = {}) {
  const { color = '#e0f2fe', background = 'rgba(15, 23, 42, 0.78)', fontSize = 34, padding = 18, scale = [1.45, 0.36, 1] } = options
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const font = `700 ${fontSize}px Inter, system-ui, sans-serif`

  context.font = font
  const textWidth = Math.ceil(context.measureText(text).width)
  canvas.width = Math.max(256, textWidth + padding * 2)
  canvas.height = 78

  context.font = font
  context.fillStyle = background
  context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  context.lineWidth = 2

  const radius = 16
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

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(scale[0] * (canvas.width / 256), scale[1], scale[2])
  sprite.renderOrder = 999
  return sprite
}

function addZone(scene, zone, labelsVisible) {
  const geometry = new THREE.BoxGeometry(zone.size[0], zone.size[1], zone.size[2])
  const material = new THREE.MeshStandardMaterial({ color: zone.color, transparent: true, opacity: 0.14, roughness: 0.8, metalness: 0.05 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...zone.center)
  scene.add(mesh)

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: zone.color, transparent: true, opacity: 0.55 }))
  edges.position.copy(mesh.position)
  scene.add(edges)

  const grid = new THREE.GridHelper(zone.size[0], 8, zone.color, 0x1e293b)
  grid.position.set(zone.center[0], zone.center[1] + 0.035, zone.center[2])
  grid.material.transparent = true
  grid.material.opacity = 0.22
  scene.add(grid)

  if (labelsVisible) {
    const label = createTextSprite(zone.label, { color: '#f8fafc', background: 'rgba(2, 6, 23, 0.8)', fontSize: 28, scale: [1.35, 0.32, 1] })
    label.position.set(...zone.labelPos)
    scene.add(label)
  }
}

function addEquipment(scene, key, item, selected, labelsVisible, clickableObjects) {
  const color = new THREE.Color(item.color)
  const geometry = item.round
    ? new THREE.CylinderGeometry(item.size[0] / 2, item.size[0] / 2, item.size[1], 36)
    : new THREE.BoxGeometry(item.size[0], item.size[1], item.size[2])

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.36,
    metalness: selected ? 0.28 : 0.14,
    emissive: selected ? color.clone().multiplyScalar(0.42) : new THREE.Color(0x000000),
    transparent: true,
    opacity: selected ? 1 : 0.92
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...item.position)
  mesh.userData.equipmentKey = key
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  clickableObjects.push(mesh)

  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: selected ? 0xffffff : color, transparent: true, opacity: selected ? 0.9 : 0.36 }))
  outline.position.copy(mesh.position)
  scene.add(outline)

  if (selected) {
    const haloGeometry = item.round
      ? new THREE.CylinderGeometry(item.size[0] / 2 + 0.12, item.size[0] / 2 + 0.12, item.size[1] + 0.18, 36)
      : new THREE.BoxGeometry(item.size[0] + 0.2, item.size[1] + 0.2, item.size[2] + 0.2)

    const halo = new THREE.Mesh(haloGeometry, new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.2, depthWrite: false }))
    halo.position.copy(mesh.position)
    scene.add(halo)
  }

  if (item.tankDetails) {
    const ringMaterial = new THREE.LineBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: selected ? 0.9 : 0.55 })

    ;[-0.42, 0.42].forEach((offset) => {
      const ring = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CylinderGeometry(item.size[0] / 2 + 0.045, item.size[0] / 2 + 0.045, 0.04, 28)),
        ringMaterial
      )
      ring.position.set(item.position[0], item.position[1] + offset, item.position[2])
      scene.add(ring)
    })

    const sensorMaterial = new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
    ;[0.5, -0.5].forEach((offset) => {
      const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 14), sensorMaterial)
      sensor.position.set(item.position[0] + item.size[0] / 2 + 0.09, item.position[1] + offset, item.position[2])
      scene.add(sensor)
    })

    if (labelsVisible) {
      const tag = createTextSprite('inertie hydraulique', { color: '#bae6fd', background: 'rgba(8, 47, 73, 0.82)', fontSize: 24, scale: [1.05, 0.26, 1] })
      tag.position.set(item.position[0], item.position[1] + 1.02, item.position[2] - 0.48)
      scene.add(tag)
    }
  }

  if (labelsVisible) {
    const label = createTextSprite(item.label, { color: selected ? '#ffffff' : '#e0f2fe', background: selected ? 'rgba(37, 99, 235, 0.86)' : 'rgba(15, 23, 42, 0.78)', fontSize: selected ? 28 : 24, scale: selected ? [1.34, 0.33, 1] : [1.12, 0.29, 1] })
    label.position.set(item.position[0], item.position[1] + item.size[1] / 2 + 0.34, item.position[2])
    scene.add(label)
  }
}

// Draw orthogonal pipes as cylinder segments + sphere joints
function addCircuit(scene, circuit, particlesBag) {
  const radiusByKind = { air: 0.045, water: 0.035, glycol: 0.04, refrigerant: 0.028, power: 0.026, signal: 0.018 }
  const r = radiusByKind[circuit.kind] ?? 0.03
  const col = circuit.color

  const orthoPoints = makeOrthogonalPoints(circuit.points)

  // Draw each segment as a cylinder
  const segMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 })
  for (let i = 0; i < orthoPoints.length - 1; i++) {
    const a = orthoPoints[i]
    const b = orthoPoints[i + 1]
    const dir = new THREE.Vector3().subVectors(b, a)
    const len = dir.length()
    if (len < 0.001) continue
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), segMat)
    cyl.position.copy(mid)
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    scene.add(cyl)
  }

  // Sphere joints at every waypoint
  const jointMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.65 })
  for (let i = 0; i < orthoPoints.length; i++) {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 7, 7), jointMat)
    joint.position.copy(orthoPoints[i])
    scene.add(joint)
  }

  // Build CurvePath for particle animation
  const path = new THREE.CurvePath()
  for (let i = 0; i < orthoPoints.length - 1; i++) {
    if (orthoPoints[i].distanceTo(orthoPoints[i + 1]) > 0.001) {
      path.add(new THREE.LineCurve3(orthoPoints[i], orthoPoints[i + 1]))
    }
  }

  const particleGeometry = new THREE.SphereGeometry(r * 1.8, 8, 8)
  const particleMaterial = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 })
  const particles = []

  for (let index = 0; index < circuit.particles; index++) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial)
    const progress = index / circuit.particles
    particle.position.copy(path.getPointAt(progress))
    particle.userData.progress = progress
    scene.add(particle)
    particles.push(particle)
  }

  particlesBag.push({ curve: path, particles, speed: circuit.speed })
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

export default function HvacCycle3D({ highlightedComponent = null, params = DEFAULT_PARAMS, className = '' }) {
  const mountRef = useRef(null)
  const [activeView, setActiveView] = useState('overview')
  const [labelsVisible, setLabelsVisible] = useState(true)
  const [selectedKey, setSelectedKey] = useState(null)
  const [guideIndex, setGuideIndex] = useState(0)
  const [zoomedOut, setZoomedOut] = useState(false)
  const [guideExpanded, setGuideExpanded] = useState(false)
  const [detailExpanded, setDetailExpanded] = useState(false)

  const focusKey = useMemo(() => {
    const guideFocus = GUIDE_STEPS[guideIndex]?.focus
    return normalizeFocus(highlightedComponent) ?? guideFocus ?? null
  }, [guideIndex, highlightedComponent])

  const visible = useMemo(() => {
    const config = VIEWS[activeView] ?? VIEWS.overview
    return { zones: config.zones, equipment: config.equipment, circuits: config.circuits, hint: config.hint }
  }, [activeView])

  const selected = selectedKey ? EQUIPMENT[selectedKey] : focusKey ? EQUIPMENT[focusKey] : null
  const selectedLabel = selectedKey ? 'Équipement sélectionné' : focusKey ? 'Focus pédagogique' : null

  // Auto-expand detail panel when something is selected
  useEffect(() => {
    if (selectedKey || focusKey) setDetailExpanded(true)
  }, [selectedKey, focusKey])

  useEffect(() => {
    const step = GUIDE_STEPS[guideIndex]
    if (step?.view) setActiveView(step.view)
  }, [guideIndex])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth || 900
    const height = mount.clientHeight || 700

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020617)
    scene.fog = new THREE.Fog(0x020617, 18, 34)

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.set(zoomedOut ? 10.5 : 8.4, zoomedOut ? 11.4 : 9.2, zoomedOut ? 15.2 : 12.4)

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
    controls.minDistance = 8
    controls.maxDistance = 24
    controls.target.set(0.2, 4.8, -0.35)

    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x020617, 1.3))

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.35)
    keyLight.position.set(5, 12, 6)
    keyLight.castShadow = true
    scene.add(keyLight)

    const pointLight = new THREE.PointLight(0x38bdf8, 1.15, 16)
    pointLight.position.set(-4, 5.5, 2.8)
    scene.add(pointLight)

    visible.zones.forEach((key) => addZone(scene, ZONES[key], labelsVisible))

    const particleGroups = []
    visible.circuits.forEach((key) => addCircuit(scene, CIRCUITS[key], particleGroups))

    const clickableObjects = []
    visible.equipment.forEach((key) => {
      const item = EQUIPMENT[key]
      const selectedForRender = key === focusKey || key === selectedKey
      addEquipment(scene, key, item, selectedForRender, labelsVisible, clickableObjects)
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(clickableObjects, false)
      if (hits[0]?.object?.userData?.equipmentKey) setSelectedKey(hits[0].object.userData.equipmentKey)
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
          particle.position.copy(group.curve.getPointAt(particle.userData.progress))
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
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [activeView, focusKey, labelsVisible, selectedKey, visible.circuits, visible.equipment, visible.zones, zoomedOut])

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 ${className}`} style={{ height: 740 }}>
      {/* Canvas fills entire container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* ─── TOP OVERLAY ─── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3">
        {/* Row 1: title + action buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/88 px-3 py-1.5 backdrop-blur-sm">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-sky-400">Modèle 3D étagé</p>
            <p className="text-[11px] font-black leading-tight text-white">{VIEWS[activeView]?.label}</p>
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setLabelsVisible((v) => !v)}
            title={labelsVisible ? 'Masquer labels' : 'Afficher labels'}
            className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-bold backdrop-blur-sm transition ${labelsVisible ? 'border-sky-500/40 bg-sky-600/20 text-sky-200' : 'border-slate-700 bg-slate-900/80 text-slate-400'}`}
          >
            🏷
          </button>
          <button
            type="button"
            onClick={() => setZoomedOut((v) => !v)}
            title={zoomedOut ? 'Zoom normal' : 'Dézoomer'}
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 backdrop-blur-sm transition hover:text-white"
          >
            {zoomedOut ? '🔍−' : '🔍+'}
          </button>
          <button
            type="button"
            onClick={() => { setSelectedKey(null); setActiveView('overview') }}
            title="Vue étagée"
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 backdrop-blur-sm transition hover:text-white"
          >
            ↺
          </button>
        </div>

        {/* Row 2: view tabs (compact, scrollable) */}
        <div className="pointer-events-auto flex gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/75 p-1.5 backdrop-blur-sm">
          {Object.entries(VIEWS).map(([key, view]) => (
            <button
              type="button"
              key={key}
              onClick={() => { setActiveView(key); setSelectedKey(null) }}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black transition ${key === activeView ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-900/70 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── BOTTOM OVERLAY ─── */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 flex items-end gap-2.5 p-3">

        {/* Guide — compact strip, expandable */}
        <div className="pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/88 p-3 backdrop-blur-sm" style={{ maxWidth: 300, flex: '1 1 auto' }}>
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate text-[9px] font-black uppercase tracking-widest text-cyan-300">
              {GUIDE_STEPS[guideIndex].title}
            </p>
            <button
              type="button"
              onClick={() => setGuideIndex((i) => Math.max(0, i - 1))}
              disabled={guideIndex === 0}
              className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-100 disabled:opacity-30"
            >←</button>
            <button
              type="button"
              onClick={() => setGuideIndex((i) => Math.min(GUIDE_STEPS.length - 1, i + 1))}
              disabled={guideIndex === GUIDE_STEPS.length - 1}
              className="rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-30"
            >→</button>
          </div>

          {guideExpanded && (
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{GUIDE_STEPS[guideIndex].text}</p>
          )}

          <div className="mt-2 flex items-center gap-1">
            {GUIDE_STEPS.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setGuideIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === guideIndex ? 'w-5 bg-blue-400' : 'w-1.5 bg-slate-700'}`}
              />
            ))}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setGuideExpanded((v) => !v)}
              className="text-[9px] font-bold text-slate-500 hover:text-slate-300 transition"
            >
              {guideExpanded ? 'Réduire ↑' : 'Lire ↓'}
            </button>
          </div>
        </div>

        {/* Equipment detail — compact, expandable */}
        <div className="pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/88 p-3 backdrop-blur-sm" style={{ maxWidth: 300, flex: '1 1 auto' }}>
          {selected ? (
            <>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  {selectedLabel && <p className="text-[8px] font-black uppercase tracking-widest text-blue-400">{selectedLabel}</p>}
                  <p className="text-[11px] font-black text-white leading-tight mt-0.5 truncate">{selected.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailExpanded((v) => !v)}
                  className="shrink-0 text-[9px] font-bold text-slate-500 hover:text-slate-300 transition"
                >
                  {detailExpanded ? '↑' : '↓'}
                </button>
              </div>

              {detailExpanded && (
                <>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-300 line-clamp-3">{selected.summary}</p>
                  <div className="mt-2 rounded-xl border border-white/8 bg-slate-900/80 p-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">À contrôler</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-300 line-clamp-3">{selected.observe}</p>
                  </div>
                  {selected.learning?.length ? (
                    <div className="mt-2 rounded-xl border border-sky-400/20 bg-sky-500/8 p-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-sky-300">Water tank</p>
                      <ul className="mt-1 space-y-0.5">
                        {selected.learning.slice(0, 2).map((pt) => (
                          <li key={pt} className="text-[10px] leading-relaxed text-sky-100/80">· {pt}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <p className="text-[11px] text-slate-500">Clique sur un équipement →</p>
          )}

          {/* Compact KPI row */}
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-xl bg-slate-900/90 py-1.5">
              <p className="text-[8px] text-slate-500">T évap.</p>
              <p className="text-[11px] font-black text-white">{params?.evapTemp ?? DEFAULT_PARAMS.evapTemp}°C</p>
            </div>
            <div className="rounded-xl bg-slate-900/90 py-1.5">
              <p className="text-[8px] text-slate-500">T cond.</p>
              <p className="text-[11px] font-black text-white">{params?.condTemp ?? DEFAULT_PARAMS.condTemp}°C</p>
            </div>
            <div className="rounded-xl bg-slate-900/90 py-1.5">
              <p className="text-[8px] text-slate-500">COP</p>
              <p className="text-[11px] font-black text-white">{params?.cop ?? DEFAULT_PARAMS.cop}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
