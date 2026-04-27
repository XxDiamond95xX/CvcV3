export function getDiagnosticAdvice(params) {
  const issues = [];

  if (params.hp >= 21) {
    issues.push({ label: 'HP élevée', detail: 'Vérifier condenseur encrassé, débit d’air/eau, surcharge ou température extérieure.' });
  }

  if (params.bp <= 3.2 && params.sh >= 12) {
    issues.push({ label: 'BP basse + SH élevée', detail: 'Piste : manque de charge, détendeur trop fermé ou restriction ligne liquide.' });
  }

  if (params.sh <= 3) {
    issues.push({ label: 'SH faible', detail: 'Attention au risque de retour liquide au compresseur.' });
  }

  if (params.sc >= 8) {
    issues.push({ label: 'SR élevé', detail: 'Comparer avec charge fluide, condenseur et stockage de liquide.' });
  }

  if (issues.length === 0) {
    issues.push({ label: 'Cycle cohérent', detail: 'Les valeurs restent dans une zone pédagogique normale.' });
  }

  return issues;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
