import { pointInPolygon, PointInPolygonResult, getBounds, ClipperOffset, JoinType, EndType, type Paths64, type Path64, Clipper64, ClipType, FillRule } from "clipper2-ts";
import { Delaunay } from "d3-delaunay";
import PoissonDiskSampling from "poisson-disk-sampling";
import type { MeshRegenType, MeshPiece, MeshIslandProps, Point, Island, PolyColor, TriangleClass } from "../types/MeshRegenTypes";

export const CLIPPER_SCALE = 1024;

export function prepareIslands(
  paths: string[],
  userStep: number
) {
  const subpaths = paths.flatMap(pathD =>
    buildIslandSubpaths(
      splitPathD(
        pathToAbsoluteD(pathD)
      )
    )
  );

  return subpaths.map(island =>
    islandToClipperPoly(island, userStep * 10)
  );
}


export default function generateMeshFromIslands({ islands,  userStep,  offsetMultiplier, imageData }: MeshRegenType): MeshPiece[] {
  const spacing = userStep * 100;

  const clipperIslands = islands;

  const meshIslands: MeshIslandProps[] = clipperIslands.map((island) => {
    const offset = CLIPPER_SCALE * offsetMultiplier * 20 * userStep;

    const { outerBuffer, boundaryBuffer, innerBuffer } = generateBuffers(
      island,
      offset,
      1100,
      (spacing / 1.5) * CLIPPER_SCALE
    );

    const boundaryPts: Point[] = [];
    const outerBfrPts: Point[] = [];

    // boundary points
    boundaryPts.push(
      ...samplePath64ByDistance(boundaryBuffer.outer, spacing, CLIPPER_SCALE)
    );

    for (let i = 0; i < boundaryBuffer.holes.length; i++) {
      boundaryPts.push(
        ...samplePath64ByDistance(
          boundaryBuffer.holes[i],
          spacing,
          CLIPPER_SCALE
        )
      );
    }

    // outer buffer points
    outerBfrPts.push(
      ...samplePath64ByDistance(outerBuffer.outer, spacing, CLIPPER_SCALE)
    );

    for (let i = 0; i < outerBuffer.holes.length; i++) {
      outerBfrPts.push(
        ...samplePath64ByDistance(
          outerBuffer.holes[i],
          spacing,
          CLIPPER_SCALE
        )
      );
    }

    const interiorPts = generateInteriorPoints(innerBuffer, spacing);

    return {
      island,
      innerBuffer,
      outerBfrPts,
      boundaryPts,
      interiorPts
    };
  });

  const pieces: MeshPiece[] = [];
  let id = 0;

  for (const {
    island,
    innerBuffer,
    outerBfrPts,
    boundaryPts,
    interiorPts
  } of meshIslands) {

    const points = [
      ...outerBfrPts,
      ...boundaryPts,
      ...interiorPts
    ];

    const delaunay = Delaunay.from(
      points,
      (p) => p.x,
      (p) => p.y
    );

    const triangles = delaunay.triangles;

    console.log(
      "Generated ",
      triangles.length / 3,
      " triangles!"
    );

    for (let i = 0; i < triangles.length; i += 3) {
      const tri = [
        points[triangles[i]],
        points[triangles[i + 1]],
        points[triangles[i + 2]]
      ];

      const state = classifyTriangle(tri, island, innerBuffer);
      const triCentroid = polygonCentroid(tri);

      if (state === "FULLY") {
        pieces.push({
          id: id++,
          points: tri,
          triangleIndex: i / 3,
          state: "FULLY",
          centroid: triCentroid,
          color: imageData ? bakePieceColors(imageData, tri, triCentroid) : { r: 255, g: 255, b: 255, a: 1 }
        });
        continue;
      }

      const clippedPolys = clipTriangleToIsland(tri, island);

      for (const poly of clippedPolys) {
        const polyCentroid = path64ToPoints(
          [polygonCentroid(poly)],
          CLIPPER_SCALE
        )[0];

        const polyPts = path64ToPoints(poly, CLIPPER_SCALE);

        pieces.push({
          id: id++,
          points: polyPts,
          triangleIndex: i / 3,
          state,
          centroid: polyCentroid,
          color: imageData ? bakePieceColors(imageData, polyPts, polyCentroid) : { r: 255, g: 255, b: 255, a: 1 }
        });
      }
    }
  }

  return pieces;
}


function splitPathD(d: string): string[] {
  return d
    .split(/(?=[Mm])/)
    .map(s => s.trim())
    .filter(Boolean);
}

function generateInteriorPoints(
  interiorBuffer: Island,
  spacing: number,
): Point[] {
  const bbox = getPaddedBoundsWorld(interiorBuffer, CLIPPER_SCALE, spacing);

  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;

  // const baseUnit = Math.max(width, height) * 0.1;

  // console.log(baseUnit);

  const pds = new PoissonDiskSampling({
    shape: [width, height],
    minDistance: (spacing),
    maxDistance: (spacing),
    tries: 30,
  });

  const raw = pds.fill();

  return raw
    .map(([x, y]) => ({
      x: x + bbox.minX,
      y: y + bbox.minY,
    }))
    .filter(point => isValidInteriorPoint(point, interiorBuffer))
}

function isValidInteriorPoint(
  point: Point,
  island: Island
): boolean {
  return pointInIsland(point, island);
}

function pointInIsland(
  pt: Point,
  island: Island
): boolean {
  const p64 = {
    x: Math.round(pt.x * CLIPPER_SCALE),
    y: Math.round(pt.y * CLIPPER_SCALE),
  };

  if (pointInPolygon(p64, island.outer) === PointInPolygonResult.IsOutside) {
    return false;
  }

  for (const hole of island.holes) {
    if (pointInPolygon(p64, hole) !== PointInPolygonResult.IsOutside) {
      return false;
    }
  }

  return true;
}

function getPaddedBoundsWorld(
  island: Island,
  scale: number,
  padding: number
) {
  const b64 = getBounds(island.outer);

  return {
    minX: b64.left / scale - padding,
    minY: b64.top / scale - padding,
    maxX: b64.right / scale + padding,
    maxY: b64.bottom / scale + padding,
  };
}

function ensureWinding(
  ring: { x: number; y: number }[],
  clockwise: boolean
) {
  const area = signedAreaPts(ring);
  const isCW = area < 0;
  return isCW === clockwise ? ring : [...ring].reverse();
}

function buildIslandSubpaths(
  subpaths: string[]
): { outer: string; holes: string[]; islandPath: string }[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const islands: {
    outer: string;
    holes: string[];
  }[] = [];

  for (const subpath of subpaths) {
    const testPoint = getSubpathTestPoint(subpath);

    let assignedAsHole = false;

    // Try to assign as a hole to an existing island
    for (const island of islands) {
      if (isPointInsidePath(ctx, island.outer, testPoint)) {
        island.holes.push(subpath);
        assignedAsHole = true;
        break;
      }
    }

    // Otherwise, this subpath starts a new island
    if (!assignedAsHole) {
      islands.push({
        outer: subpath,
        holes: [],
      });
    }
  }

  // Finalize islandPath strings
  return islands.map(island => ({
    outer: island.outer,
    holes: island.holes,
    islandPath: [island.outer, ...island.holes].join(" "),
  }));
}

function getSubpathTestPoint(d: string): { x: number; y: number } {
  const match = d.match(/M\s*([-\d.]+)[ ,]([-\d.]+)/i);

  if (!match) throw new Error("Invalid subpath");
  return { x: +match[1], y: +match[2] };
}

function isPointInsidePath(
  ctx: CanvasRenderingContext2D,
  pathD: string,
  point: { x: number; y: number }
): boolean {
  const path = new Path2D(pathD);
  return ctx.isPointInPath(path, point.x, point.y, "nonzero");
}

function pathToAbsoluteD(d: string): string {
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  const path = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );

  path.setAttribute("d", d);
  svg.appendChild(path);

  // This forces the browser to resolve all relative commands
  const normalized = path.getAttribute("d");
  if (!normalized) throw new Error("Failed to normalize path");

  return normalized;
}

function signedAreaPts(pts: Point[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += (p.x * q.y - q.x * p.y);
  }
  return a * 0.5;
}

function polygonCentroid(pts: Point[]): Point {
  let x = 0, y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

function samplePointsForPiece(points: Point[], centroid: Point): Point[] {
  if (points.length === 3) {
    const [a, b, c] = points;
    return [
      centroid,
      { x: (a.x + centroid.x) / 2, y: (a.y + centroid.y) / 2 },
      { x: (b.x + centroid.x) / 2, y: (b.y + centroid.y) / 2 },
      { x: (c.x + centroid.x) / 2, y: (c.y + centroid.y) / 2 },
    ];
  }

  const samples: Point[] = [centroid];

  for (const p of points) {
    samples.push({
      x: (p.x + centroid.x) * 0.5,
      y: (p.y + centroid.y) * 0.5
    });
  }

  // console.log(samples);

  return samples;
}

function sampleColor(
  imageData: ImageData,
  p: Point
): [number, number, number, number] {
  const x = Math.floor(p.x);
  const y = Math.floor(p.y);

  const i = (y * imageData.width + x) * 4;
  const d = imageData.data;

  return [d[i], d[i + 1], d[i + 2], d[i + 3]];
}

function averageColors(colors: number[][]): PolyColor {
  const n = colors.length;
  let r = 0, g = 0, b = 0, a = 0;

  for (const c of colors) {
    r += c[0];
    g += c[1];
    b += c[2];
    a += c[3];
  }

  return {
    r: r / n,
    g: g / n,
    b: b / n,
    a: a / n
  };
}

function bakePieceColors(
  imageData: ImageData,
  points: Point[],
  centroid: Point
): PolyColor {
  const samples = samplePointsForPiece(points, centroid);

  const colors = samples.map(p => sampleColor(imageData, p));
  return averageColors(colors);
}



// --------------------------------------------------- CLIPPER ---------------------------------------------------

function toIntPoint(p: { x: number; y: number }) {
  return {
    x: Math.round(p.x * CLIPPER_SCALE),
    y: Math.round(p.y * CLIPPER_SCALE),
  };
}

// function fromIntPoint(p: { x: number; y: number }) {
//   return {
//     x: p.x / CLIPPER_SCALE,
//     y: p.y / CLIPPER_SCALE,
//   };
// }

function svgPathToRing(
  d: string,
  spacing: number
): { x: number; y: number }[] {
  const p = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  p.setAttribute("d", d);

  const len = p.getTotalLength();
  if (!isFinite(len) || len === 0) return [];

  const count = Math.max(3, Math.floor(len / spacing));
  const pts: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    const pt = p.getPointAtLength((i / count) * len);
    pts.push({ x: pt.x, y: pt.y });
  }

  return pts;
}

function islandToClipperPoly(
  island: {
    outer: string;
    holes: string[];
  },
  spacing: number
) {
  // --- outer ring ---
  let outer = svgPathToRing(island.outer, spacing);
  outer = ensureWinding(outer, false); // CCW

  // --- holes ---
  const holes = island.holes.map(d => {
    const h = svgPathToRing(d, spacing);
    return ensureWinding(h, true); // CW
  });

  return {
    outer: outer.map(toIntPoint),
    holes: holes.map(r => r.map(toIntPoint)),
  };
}

function generateBuffers(
  island: Island,
  outerDist: number,
  boundaryDist: number,
  innerDist: number
) {
  const co = new ClipperOffset();

  co.addPaths(
    islandToPaths(island),
    JoinType.Round,
    EndType.Polygon
  );

  const outerPaths: Paths64 = [];
  co.execute(outerDist, outerPaths);

  const boundaryPaths: Paths64 = [];
  co.execute(boundaryDist, boundaryPaths);

  const innerPaths: Paths64 = [];
  co.execute(-innerDist, innerPaths);

  return {
    outerBuffer: pathsToIsland(outerPaths),
    boundaryBuffer: pathsToIsland(boundaryPaths),
    innerBuffer: pathsToIsland(innerPaths),
  };
}

function islandToPaths(island: Island): Path64[] {
  return [island.outer, ...island.holes];
}

function pathsToIsland(paths: Path64[]): Island {
  if (paths.length === 0) {
    return { outer: [], holes: [] };
  }

  let outer = paths[0];
  let maxArea = polygonArea(outer);

  for (const p of paths) {
    const area = polygonArea(p);
    if (area > maxArea) {
      maxArea = area;
      outer = p;
    }
  }

  const holes = paths.filter(p => p !== outer);

  return { outer, holes };
}

function polygonArea(path: Path64): number {
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    area += (a.x * b.y - b.x * a.y);
  }
  return area;
}

function classifyTriangle(
  tri: Point[],
  island: Island,
  innerBuffer: Island,
): TriangleClass {
  let inInnerCount = 0;
  let inIslandCount = 0;

  for (const v of tri) {
    if (pointInIsland(v, innerBuffer)) inInnerCount++;
    if (pointInIsland(v, island)) inIslandCount++;
  }

  // ---- Case 1: fully inside inner buffer ----
  // Guaranteed safe: edges cannot touch the boundary
  if (inInnerCount === 3) {
    return 'FULLY';
  }

  // ---- Case 2: fully outside island ----
  // All verts outside AND centroid outside → guaranteed irrelevant
  if (inIslandCount === 0) {
    const c = triangleCentroid(tri);
    if (!pointInIsland(c, island)) {
      return 'OUTSIDE';
    }
  }

  // ---- Case 3: boundary band ----
  // Any ambiguity → must clip
  return 'PARTLY';
}

function samplePath64ByDistance(
  path: Path64,
  spacing: number,
  scale: number
): Point[] {
  const pts = path64ToPoints(path, scale);
  const result: Point[] = [];

  let acc = 0;

  for (let i = 0; i < pts.length; i++) {
    let a = pts[i];
    const b = pts[(i + 1) % pts.length];

    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let segLen = Math.hypot(dx, dy);

    while (acc + segLen >= spacing && segLen > 0) {
      const t = (spacing - acc) / segLen;

      const nx = a.x + dx * t;
      const ny = a.y + dy * t;

      result.push({ x: nx, y: ny });

      // advance along the segment
      a = { x: nx, y: ny };
      dx = b.x - a.x;
      dy = b.y - a.y;
      segLen = Math.hypot(dx, dy);

      acc = 0;
    }

    acc += segLen;
  }

  return result;
}

function triangleCentroid(tri: Point[]) {
  return {
    x: (tri[0].x + tri[1].x + tri[2].x) / 3,
    y: (tri[0].y + tri[1].y + tri[2].y) / 3,
  };
}

function clipTriangleToIsland(
  tri: Point[],
  island: Island,
): Path64[] {
  const islandPaths = islandToClipperPaths(island);

  const subject: Paths64 = [tri.map((point) => toIntPoint(point))];// [triangleToPath64(tri, CLIPPER_SCALE)];
  const solution: Paths64 = [];

  const clipper = new Clipper64();

  clipper.addSubject(subject);
  clipper.addClip(islandPaths);

  clipper.execute(
    ClipType.Intersection,
    FillRule.NonZero,
    solution
  );

  return solution; // ← polygon fragments, NOT triangles
}

function islandToClipperPaths(island: Island): Paths64 {
  return [island.outer, ...island.holes];
}

export function path64ToPoints(path: Path64, scale: number): Point[] {
  return path.map(p => ({
    x: p.x / scale,
    y: p.y / scale,
  }));
}

/**
 * Converts a Path64 (array of {x, y}) to an SVG path 'd' string.
 * @param {Array} path - The Path64 result from clipper-ts
 * @param {boolean} isClosed - Whether to close the path with 'Z'. defaults to true
 * @returns {string} The formatted 'd' string
 */
export function path64ToPathD(path: Path64, isClosed: boolean = true): string {
  if (!path || path.length === 0) return "";

  // Move to the first point, then draw lines to subsequent points
  const d = path.map((pt, index) => {
    const command = index === 0 ? "M" : "L";
    return `${command}${pt.x},${pt.y}`;
  }).join(" ");

  // Add Z to close the path if it's a polygon
  return isClosed ? `${d} Z` : d;
}