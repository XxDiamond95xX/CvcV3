# CVC Academy — cycle frigorifique interactif

Application Next.js conçue pour former de nouveaux arrivants aux bases du circuit frigorifique.

## Ce que contient l'application

- Page d'accueil `/`
- Mode apprentissage `/learn`
  - cours structurés dans `src/data/courses.json`
  - split-screen théorie + pratique
  - focus automatique sur l'organe étudié
  - notes terrain et checkpoints
- Mode expert `/simulator`
  - scénarios de défauts types
  - réglages BP, HP, surchauffe et sous-refroidissement
  - diagnostic assisté
  - diagramme Mollier pédagogique simplifié
- Circuit frigorifique 3D interactif
  - compresseur, condenseur, ligne liquide, détendeur, évaporateur
  - tuyauteries colorées selon l'état du fluide
  - particules animées dans le sens de circulation
  - clic sur les organes pour afficher rôle, entrée, sortie et mesures à contrôler

## Légende des couleurs du circuit 3D

- Rouge : vapeur chaude haute pression, ligne de refoulement
- Orange : liquide haute pression, ligne liquide
- Vert : mélange liquide/vapeur basse pression après détente
- Bleu : vapeur basse pression surchauffée, aspiration compresseur

## Installation locale

```bash
npm install
npm run dev
```

Puis ouvrir :

```bash
http://localhost:3000
```

## Déploiement Vercel

Le projet est prêt pour Vercel avec Next.js 14.2.29.

```bash
npm run build
```

## Modifier les cours

Les contenus sont dans :

```bash
src/data/courses.json
```

Chaque chapitre peut piloter le simulateur avec :

```json
"simulation_preset": {
  "bp": 4.5,
  "hp": 18.2,
  "sh": 5,
  "sc": 3,
  "fault": "Cycle nominal",
  "effect": "Conséquence pédagogique affichée à droite."
}
```

Les champs utiles :

- `content` : explication principale
- `observe` : points à regarder dans la simulation
- `field_notes` : notes terrain pour les techniciens
- `focus_component` : organe mis en avant (`compressor`, `condenser`, `liquidLine`, `expansionValve`, `evaporator`, `all`)
- `checkpoint` : mini-question de validation

## Remarque technique

Le diagramme P-h est volontairement simplifié. Il sert à comprendre les tendances et les relations entre BP, HP, SH et SR. Il ne remplace pas un logiciel de sélection, une table fluide ou les données constructeur.
