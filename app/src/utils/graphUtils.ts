/**
 * SVG graph utilities
 * Catmull-Rom spline smoothing for line charts
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Create smooth path through points using Catmull-Rom spline
 * Migrated from demo - same algorithm
 */
export function smoothPath(points: Point[]): string {
  if (points.length < 2) return '';
  
  if (points.length === 2) {
    return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let path = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i - 1] || points[i];
    const b = points[i];
    const c = points[i + 1];
    const e = points[i + 2] || points[i + 1];

    const cp1x = b.x + (c.x - a.x) / 6;
    const cp1y = b.y + (c.y - a.y) / 6;
    const cp2x = c.x - (e.x - b.x) / 6;
    const cp2y = c.y - (e.y - b.y) / 6;

    path += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }

  return path;
}

/**
 * Calculate SVG viewBox dimensions with padding
 */
export function calculateViewBox(
  width: number,
  height: number,
  paddingLeft = 6,
  paddingRight = 6,
  paddingTop = 26,
  paddingBottom = 22
): {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  innerWidth: number;
  innerHeight: number;
} {
  return {
    width,
    height,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    innerWidth: width - paddingLeft - paddingRight,
    innerHeight: height - paddingTop - paddingBottom
  };
}
