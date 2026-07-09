/** World size in logical pixels (pannable canvas). */
export const MESH_WORLD_SIZE = 1600;

/** Decorative node count (stable index → green count from neighborCount). */
export const MESH_NODE_COUNT = 36;

const MESH_SEED = 0x9e37_79b1;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MeshPoint = { x: number; y: number };

export type MeshEdge = { i: number; j: number; pathD: string };

function buildNodes(seed: number, count: number, world: number): MeshPoint[] {
  const rand = mulberry32(seed);
  const pad = world * 0.08;
  const span = world - pad * 2;
  const nodes: MeshPoint[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: pad + rand() * span,
      y: pad + rand() * span,
    });
  }
  return nodes;
}

function dist2(a: MeshPoint, b: MeshPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Undirected edges: each node linked to k nearest neighbors. */
function buildEdges(nodes: MeshPoint[], kNearest: number): [number, number][] {
  const n = nodes.length;
  const set = new Set<string>();
  const edges: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    const dists: { j: number; d2: number }[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      dists.push({ j, d2: dist2(nodes[i], nodes[j]) });
    }
    dists.sort((a, b) => a.d2 - b.d2);
    for (let t = 0; t < Math.min(kNearest, dists.length); t++) {
      const j = dists[t].j;
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      const key = `${a},${b}`;
      if (!set.has(key)) {
        set.add(key);
        edges.push([a, b]);
      }
    }
  }
  return edges;
}

function pairOffset01(seed: number, i: number, j: number): number {
  const a = Math.min(i, j);
  const b = Math.max(i, j);
  const rand = mulberry32(seed + a * 12_989 + b * 78_497);
  return rand();
}

export function cubicEdgePathD(
  seed: number,
  nodes: MeshPoint[],
  i: number,
  j: number
): string {
  const p0 = nodes[i];
  const p1 = nodes[j];
  const x0 = p0.x;
  const y0 = p0.y;
  const x1 = p1.x;
  const y1 = p1.y;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * 1;
  const py = (dx / len) * 1;
  const u = pairOffset01(seed, i, j);
  const mag = 36 + u * 72;
  const sign = u > 0.5 ? 1 : -1;
  const off = sign * mag;
  const c1x = x0 + dx * 0.28 + px * off;
  const c1y = y0 + dy * 0.28 + py * off;
  const c2x = x0 + dx * 0.72 - px * off * 0.45;
  const c2y = y0 + dy * 0.72 - py * off * 0.45;
  return `M ${x0} ${y0} C ${c1x} ${c1y} ${c2x} ${c2y} ${x1} ${y1}`;
}

/** Single-control-point arc; swap with `cubicEdgePathD` in `buildMeshGraph`. */
export function quadEdgePathD(
  seed: number,
  nodes: MeshPoint[],
  i: number,
  j: number
): string {
  const p0 = nodes[i];
  const p1 = nodes[j];
  const x0 = p0.x;
  const y0 = p0.y;
  const x1 = p1.x;
  const y1 = p1.y;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * 1;
  const py = (dx / len) * 1;
  const u = pairOffset01(seed, i, j);
  const mag = 36 + u * 72;
  const sign = u > 0.5 ? 1 : -1;
  const off = sign * mag;
  const cx = (x0 + x1) * 0.5 + px * off;
  const cy = (y0 + y1) * 0.5 + py * off;
  return `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`;
}

export function buildMeshGraph(seed = MESH_SEED): {
  nodes: MeshPoint[];
  edges: MeshEdge[];
} {
  const nodes = buildNodes(seed, MESH_NODE_COUNT, MESH_WORLD_SIZE);
  const pairs = buildEdges(nodes, 6);
  const edges: MeshEdge[] = pairs.map(([i, j]) => ({
    i,
    j,
    pathD: quadEdgePathD(seed, nodes, i, j), // quadEdgePathD
  }));
  return { nodes, edges };
}
