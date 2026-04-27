# CVC Academy — Application d'apprentissage frigorifique

Projet Next.js complet pour apprendre le cycle frigorifique avec une interface split-screen : cours structuré à gauche, simulateur 3D et diagramme Mollier pédagogique à droite.

## Routes

- `/` : page d'accueil avec choix du mode
- `/learn` : mode apprentissage, cours + simulation synchronisée
- `/simulator` : mode expert, réglage manuel BP/HP/SH/SR + diagnostic

## Stack

- Next.js `14.2.29`
- React `18.3.1`
- Three.js `0.160.0`
- Zustand
- Tailwind CSS + PostCSS + Autoprefixer
- Lucide React

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

1. Pousser ce dossier sur GitHub.
2. Importer le repo dans Vercel.
3. Framework preset : `Next.js`.
4. Build command : `npm run build`.
5. Output directory : laisser vide / défaut Next.js.

## Où modifier les cours

Les contenus pédagogiques sont dans :

```bash
src/data/courses.json
```

Chaque chapitre pilote automatiquement :

- le texte du cours,
- le composant mis en avant dans le circuit 3D,
- les valeurs simulées BP, HP, SH, SR,
- le checkpoint de validation.

## Structure principale

```bash
src/
  app/
    page.jsx
    learn/page.jsx
    simulator/page.jsx
  components/
    HvacCycle3D.jsx
    MollierDiagram.jsx
    DiagnosticPanel.jsx
    CheckpointQuiz.jsx
    MetricCard.jsx
    TechnicalText.jsx
  data/
    courses.json
  lib/
    diagnostics.js
  store/
    useLearningStore.js
```

## Note métier

Le diagramme Mollier est volontairement simplifié : il sert à la pédagogie et à la compréhension des tendances, pas au dimensionnement réglementaire ou au calcul de charge réel.
