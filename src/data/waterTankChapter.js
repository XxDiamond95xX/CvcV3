const waterTankChapter = {
  id: 'c_water_tank_buffer',
  title: 'Ballon tampon / water tank : inertie hydraulique et continuité',
  content:
    "Le **ballon tampon**, aussi appelé **water tank**, est un volume d’eau intégré à la boucle hydraulique. Il ne produit pas de froid : il ajoute de l’inertie au circuit.\n\n" +
    "Son rôle principal est de stabiliser la température de la boucle eau glacée et d’éviter les variations trop rapides pendant les changements de mode : free cooling, adiabatique, chiller assist ou continuous cooling.\n\n" +
    "En data center, il peut donner quelques minutes de marge lors d’une transition, d’un démarrage chiller assist, d’une bascule de pompe ou d’une microcoupure. Cette marge dépend du volume d’eau, du débit disponible et du delta T exploitable.\n\n" +
    "**Erreur fréquente :** croire que le ballon tampon est une réserve de froid illimitée. Il stocke temporairement de l’énergie thermique grâce au volume d’eau, mais il finit par se réchauffer si la production ou le débit critique ne suit pas.\n\n" +
    "**Lecture terrain :** surveille les températures haut/bas, l’isolation, les purges, la stratification et la cohérence entre départ eau glacée, retour eau glacée et consigne BMS/DCIM.",
  focus_component: 'bufferTank',
  simulation_preset: {
    bp: 4.5,
    hp: 18.2,
    sh: 5,
    sc: 3,
    evapTemp: 2,
    condTemp: 45,
    cop: 3.2,
    fault: 'Focus ballon tampon — inertie hydraulique et transition'
  },
  checkpoint: {
    question: 'Quel est le rôle principal du ballon tampon dans une boucle eau glacée ?',
    answers: [
      'Augmenter l’inertie hydraulique et stabiliser la température',
      'Compresser le fluide frigorigène',
      'Remplacer les pompes critiques'
    ],
    correct: 0,
    explanation:
      'Le ballon tampon ajoute du volume d’eau. Il stabilise la boucle et donne du temps pendant les transitions, mais il ne produit pas de froid.'
  },
  quiz: [
    {
      question: 'Le ballon tampon produit-il du froid ?',
      answers: [
        'Non, il stocke temporairement de l’énergie thermique grâce au volume d’eau',
        'Oui, comme un évaporateur frigorifique',
        'Oui, uniquement si la HP est élevée'
      ],
      correct: 0,
      explanation:
        'Le ballon tampon ne remplace pas la production frigorifique. Il apporte de l’inertie et de la stabilité.'
    },
    {
      question: 'Pourquoi est-il utile en continuous cooling ?',
      answers: [
        'Il donne une marge pendant les transitions et aide à maintenir une température plus stable',
        'Il supprime le besoin de BMS/DCIM',
        'Il rend les pompes secondaires inutiles'
      ],
      correct: 0,
      explanation:
        'En site critique, le ballon tampon aide à lisser les transitions. Les pompes critiques et la supervision restent indispensables.'
    },
    {
      question: 'Quel contrôle terrain est pertinent sur un ballon tampon ?',
      answers: [
        'Températures haut/bas, purge, isolation et cohérence départ/retour',
        'Tension compresseur uniquement',
        'Couleur des capots uniquement'
      ],
      correct: 0,
      explanation:
        'Les températures haut/bas, la purge, l’isolation et la cohérence hydraulique donnent une lecture utile de son fonctionnement.'
    }
  ],
  estimated_minutes: 8,
  professional_level: 'Exploitation data center',
  competency: 'Hydraulique',
  criticality: 'Élevée',
  role: 'Technicien exploitation CVC / site critique',
  mission: {
    title: 'Identifier le ballon tampon et expliquer son rôle',
    context:
      'Tu es en ronde dans le local froid. Tu dois expliquer à quoi sert le ballon tampon et comment vérifier qu’il participe correctement à la stabilité hydraulique.',
    objective:
      'Relier le water tank à la continuité de refroidissement, au volume d’eau et aux transitions de mode.',
    actions: [
      'Repérer le ballon tampon dans le local froid.',
      'Identifier entrée, sortie, purge, évent, isolation et sondes associées.',
      'Comparer les températures haut/bas avec départ et retour eau glacée.',
      'Vérifier si le BMS/DCIM utilise le ballon dans une séquence continuous cooling.',
      'Conclure sur le rôle du ballon sans le confondre avec une production frigorifique.'
    ],
    success:
      'Tu sais expliquer pourquoi le ballon donne du temps, quelles mesures le confirment et pourquoi il ne remplace pas la production ni les pompes critiques.'
  },
  fieldChecklist: [
    'Repérer le ballon tampon et son sens hydraulique.',
    'Contrôler températures haut/bas et cohérence départ/retour.',
    'Vérifier purge d’air, évent, isolation et absence de fuite.',
    'Identifier les sondes utilisées par le BMS/DCIM.',
    'Confirmer que le volume disponible correspond au besoin de transition.'
  ],
  commonMistakes: [
    'Confondre ballon tampon et vase d’expansion.',
    'Croire que le ballon produit du froid.',
    'Oublier que sa capacité dépend du volume, du débit et du delta T.',
    'Ignorer une stratification ou une mauvaise purge.',
    'Penser que le ballon compense une pompe critique indisponible.'
  ],
  proTip:
    'Sur site critique, le ballon tampon sert surtout à gagner du temps et à lisser une transition. Il ne remplace jamais une séquence BMS claire, des pompes disponibles et une production frigorifique maîtrisée.'
}

export default waterTankChapter
