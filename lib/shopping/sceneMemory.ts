/** Presentation-only state, never media, credentials, transcript or personal data. */
// Entry choice is intentionally per page load; ignore legacy saved `entered` flags.
const key = 'maya-showroom-position-v1';
export interface SceneMemory {
  zone?: string;
  positions?: Record<string, { left: number; top: number }>;
  zoomLevels?: Record<string, number>;
}
export function readScene(): SceneMemory {
  try {
    const raw = JSON.parse(sessionStorage.getItem(key) ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const positions: NonNullable<SceneMemory['positions']> = {};
    const zoomLevels: NonNullable<SceneMemory['zoomLevels']> = {};
    for (const [id, value] of Object.entries(raw.positions ?? {})) {
      const p = value as { left?: unknown; top?: unknown } | null;
      if (/^[a-z][a-z-]*$/.test(id) && p && typeof p.left === 'number' && typeof p.top === 'number' && Number.isFinite(p.left) && Number.isFinite(p.top))
        positions[id] = { left: Math.max(0, p.left), top: Math.max(0, p.top) };
    }
    for (const [id, value] of Object.entries(raw.zoomLevels ?? {})) {
      if (/^[a-z][a-z-]*$/.test(id) && typeof value === 'number' && value >= 1 && value <= 2) zoomLevels[id] = value;
    }
    return { zone: typeof raw.zone === 'string' ? raw.zone : undefined, positions, zoomLevels };
  } catch { return {}; }
}
export function saveScene(patch: SceneMemory) {
  try { sessionStorage.setItem(key, JSON.stringify({ ...readScene(), ...patch })); }
  catch { /* Browsing still works when storage is disabled. */ }
}
