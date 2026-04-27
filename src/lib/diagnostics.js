export function getDiagnosticAdvice(params) {
  const issues = [];

  if (params.hp >= 21) {
    issues.push({
      label: 'HP élevée',
      detail: 'Le compresseur travaille contre une pression de condensation trop haute. Contrôler condenseur encrassé, ventilateurs, débit d’eau, température extérieure, surcharge ou présence d’incondensables.',
      severity: 'warning'
    });
  }

  if (params.bp <= 3.2 && params.sh >= 12 && params.sc <= 3) {
    issues.push({
      label: 'BP basse + SH élevée + SR faible',
      detail: 'Piste fréquente : manque de charge ou défaut d’alimentation liquide. Confirmer avec charge constructeur, voyant, températures de ligne et conditions de fonctionnement.',
      severity: 'danger'
    });
  } else if (params.bp <= 3.2 && params.sh >= 12) {
    issues.push({
      label: 'BP basse + SH élevée',
      detail: 'L’évaporateur est affamé. Pistes : détendeur trop fermé, filtre déshydrateur partiellement bouché, électrovanne, manque de charge ou manque de débit liquide.',
      severity: 'warning'
    });
  }

  if (params.sh <= 3) {
    issues.push({
      label: 'Surchauffe faible',
      detail: 'Attention au retour liquide. Vérifier réglage détendeur, position du bulbe, charge thermique, débit d’air et stabilité de fonctionnement avant toute action.',
      severity: 'danger'
    });
  }

  if (params.sc >= 8 && params.hp >= 21) {
    issues.push({
      label: 'SR élevé avec HP élevée',
      detail: 'Le condenseur peut stocker du liquide ou rejeter difficilement la chaleur. Nettoyage, ventilation et charge sont à vérifier avec méthode.',
      severity: 'warning'
    });
  } else if (params.sc >= 8) {
    issues.push({
      label: 'Sous-refroidissement élevé',
      detail: 'Comparer avec les données constructeur. Cela peut indiquer une charge importante, un condenseur qui stocke du liquide ou certaines conditions de fonctionnement.',
      severity: 'info'
    });
  }

  if (params.bp <= 3.2 && params.sh <= 8) {
    issues.push({
      label: 'BP basse sans forte SH',
      detail: 'Penser aussi au manque de charge thermique : filtre à air sale, batterie givrée, ventilateur évaporateur, débit d’eau faible ou consigne déjà atteinte.',
      severity: 'info'
    });
  }

  if (issues.length === 0) {
    issues.push({
      label: 'Cycle cohérent',
      detail: 'Les valeurs restent dans une zone pédagogique normale. Continuer à vérifier la stabilité, les températures d’air/eau et l’état des échangeurs.',
      severity: 'success'
    });
  }

  return issues;
}

export function getScenarioSummary(params) {
  const advice = getDiagnosticAdvice(params);
  const hasDanger = advice.some((item) => item.severity === 'danger');
  const hasWarning = advice.some((item) => item.severity === 'warning');

  if (hasDanger) return 'Intervention prudente : risque matériel possible. Stabiliser, confirmer les mesures et agir avec méthode.';
  if (hasWarning) return 'Défaut probable : chercher la cause physique avant de modifier la charge ou le réglage.';
  return 'Fonctionnement pédagogiquement cohérent : bon scénario pour comprendre le cycle nominal.';
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
