# CVC Academy — cycle frigorifique interactif

Application Next.js destinée à la formation des nouveaux arrivants en CVC/frigorifique.

## Routes

- `/` : accueil produit
- `/learn` : parcours pédagogique split-screen
- `/simulator` : mode expert terrain avec scénarios et réglages

## Points clés

- Circuit frigorifique 3D interactif
- Fluide visible dans les tuyauteries
- Couleurs par état du fluide
- Vue complète / formation / circuit seul
- Modes Débutant / Terrain / Expert
- Scénarios de panne typiques
- Diagnostic assisté BP / HP / SH / SR
- Notions de récupération fluide, tirage au vide, non-condensables et antigel

## Installation

```bash
npm install
npm run dev
```

Puis ouvrir :

```txt
http://localhost:3000
```

## Fichiers importants

- `src/components/HvacCycle3D.jsx` : circuit 3D, UX de simulation, légendes, visite guidée
- `src/data/courses.json` : contenu pédagogique
- `src/app/learn/page.jsx` : interface de formation
- `src/app/simulator/page.jsx` : simulateur expert
- `src/lib/diagnostics.js` : règles de diagnostic pédagogique

## Note métier

Les diagnostics sont pédagogiques. En intervention réelle, les mesures doivent être confirmées avec le contexte de l’installation, les températures d’air/eau, les conditions extérieures, l’état des échangeurs, les débits et les procédures réglementaires.
