// Feather uncertain boundaries while retaining confident face, hair, and clothing.
export function personAlpha(confidence) {
  const t = Math.max(0, Math.min(1, (confidence - 0.35) / 0.45));
  return Math.round(255 * t * t * (3 - 2 * t));
}
