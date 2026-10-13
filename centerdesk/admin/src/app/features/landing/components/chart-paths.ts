/** Small SVG helpers for the product previews (no chart library on the public pages). */

export interface Point {
  x: number;
  y: number;
}

/** Points for a series laid out evenly across [left, right], scaled into [top, bottom] by max. */
export function seriesPoints(values: number[], box: { left: number; right: number; top: number; bottom: number }, max: number): Point[] {
  const step = values.length > 1 ? (box.right - box.left) / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: box.left + i * step,
    y: box.bottom - (Math.max(0, v) / max) * (box.bottom - box.top),
  }));
}

/** A smooth line through the points (Catmull–Rom turned into cubic Béziers). */
export function smoothPath(points: Point[], tension = 0.18): string {
  if (points.length === 0) return '';
  const p = points;
  let d = `M${r(p[0].x)},${r(p[0].y)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) * tension, y: p1.y + (p2.y - p0.y) * tension };
    const c2 = { x: p2.x - (p3.x - p1.x) * tension, y: p2.y - (p3.y - p1.y) * tension };
    d += ` C${r(c1.x)},${r(c1.y)} ${r(c2.x)},${r(c2.y)} ${r(p2.x)},${r(p2.y)}`;
  }
  return d;
}

/** The same line closed down to the baseline, for a gradient-filled area. */
export function areaPath(points: Point[], baseline: number, tension = 0.18): string {
  if (points.length === 0) return '';
  const line = smoothPath(points, tension);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${r(last.x)},${r(baseline)} L${r(first.x)},${r(baseline)} Z`;
}

function r(n: number): number {
  return Math.round(n * 10) / 10;
}
