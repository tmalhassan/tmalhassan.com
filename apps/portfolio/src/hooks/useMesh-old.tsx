import { Delaunay } from "d3-delaunay";
import PoissonDiskSampling from "poisson-disk-sampling";
import { type Path64, type Paths64, ClipperOffset, FillRule, JoinType, EndType, pointInPolygon, getBounds, PointInPolygonResult, Clipper64, ClipType } from 'clipper2-ts';
import type { Island, MeshIslandProps, MeshPiece, Point, PolyColor, TriangleClass, MeshRegenType, LogoSpec, LogoId, MeshVariant, MeshKey, MeshCacheEntry } from '../types/MeshRegenTypes';
import type { DeviceTypes } from "../contexts/device-context/DeviceContext";

//  projects logos  //
import aluraLogo from '../assets/logos/alura.svg';
import meshregenLogo from '../assets/logos/tm.svg';
import hairdayLogo from '../assets/logos/hairday.svg';

export const CLIPPER_SCALE = 1024;

const meshCache = new Map<MeshKey, MeshCacheEntry>();

const DEVICE_TYPE = ((width: number = window.innerWidth): DeviceTypes => {
  if (width < 601) return "mobile";
  if (width < 1025) return "tablet";
  return "laptop";
})();

const LOGOS: Record<LogoId, LogoSpec> = {
  alura: {
    id: 'alura',
    paths: [`M513.5 532.7l-139.5 128.9 139.5-179.7 139.5 179.7-139.5-128.9zM692.3 676.5l94.1-52.5 7.9 52.5h-102zM785.3 623l-94.1 52.5-117.5-130.2 66.7 17.2 144.9 60.5zM766.2 552.1l39.8 32.8-165.6-24-66.7-17.2 74.7-5.1 117.8 13.5zM768.2 552.1l186.2-28.5-146.4 61.4-39.8-32.9zM954.5 522.1l-186.7 28.5-115.3-13 156.1-34.3 145.9 18.8zM906.7 468.8l-257.8 68.8-75 5.2 88.8-76 244 2zM994.9 347.3l-87.5 120-244-2 331.5-118zM237.7 624.1l94 52.5h-101.9l7.9-52.5zM450.2 545.3l-117.5 130.2-94-52.5 144.8-60.5 66.7-17.2zM257.7 552.2l117.7-13.4 74.7 5.1-66.7 17.2-165.6 24 39.9-32.9zM69.5 523.7l186.3 28.5-39.9 32.9-146.4-61.4zM256.2 550.7l-186.7-28.5 145.8-18.9 156.1 34.4-115.2 13zM375.1 537.6l-257.9-68.8 244.1-2 88.8 76-75-5.2zM29.1 347.4l87.5 120 244-2-331.5-118z`],
    svgUrl: aluraLogo,
    width: 1024,
    height: 1024,
  },
  hairday: {
    id: 'hairday',
    paths: [
      `M730.5,359.9c-2.5-26.4-24.7-47.1-51.8-47.1h-37.5v351.4h37.5c3.3,0,6.6-0.3,9.7-0.9V359.9H730.5z`,
      `M688.8,243.5c69.8,0,126.4,56.6,126.4,126.4V607c0,69.8-56.6,126.4-126.4,126.4H557.1l47.8,47.1h129 c70.8,0,128.1-57.4,128.1-128.1V416.7C862,321,784.5,243.5,688.8,243.5`,
      `M688.8,243.5H557.1v489.8h131.7c69.8,0,126.4-56.6,126.4-126.4V369.9C815.2,300.1,758.6,243.5,688.8,243.5 M730.7,612.1c0,28.7-23.3,52-52,52h-37.5V312.7h37.5c28.7,0,52,23.3,52,52V612.1z`,
      `M246.1,243.5v199.3h47.8V290.6L246.1,243.5z M162,733.4l47.1,47.1h84.7V563.9h41.8v-47.3h-89.5v216.8H162z M419.6,243.5l47.3,47.1v489.8h-84.1l-47.1-47.1h84L419.6,243.5L419.6,243.5z`,
      `M162,243.5h84.1v199.3h89.5V243.5h84v489.8h-84V516.6h-89.5v216.8H162V243.5z`,
    ],
    svgUrl: hairdayLogo,
    width: 1024,
    height: 1024,
  },
  meshregen: {
    id: 'meshregen',
    paths: [`M374 231.2h571.3c16 0 21.5 13 12.3 29l-67.1 116.2h-222.9l-240.3 416.4h-125.8c-16 0-21.5-13-12.3-29l206.8-358.3c9.3-16 3.8-29-12.3-29h-164.5c-16 0-21.5-13-12.3-29l67.1-116.3zM251 444.2h125.9c16 0 21.5 13 12.3 29l-184.6 319.6h-125.8c-16 0-21.5-13-12.3-29l184.5-319.6zM696.3 444.2h125.9c16 0 21.5 13 12.3 29l-184.6 319.6h-125.8c-16 0-21.5-13-12.3-29l184.5-319.6z`],
    svgUrl: meshregenLogo,
    width: 1024,
    height: 1024,
  },

};

const MESH_VARIANTS: MeshVariant[] = [
  { logo: 'alura', type: 'wire', userStep: 0.5, offsetMultiplier: 3 },
  { logo: 'alura', type: 'glass', userStep: 0.1, offsetMultiplier: 3 },
  { logo: 'hairday', type: 'wire', userStep: 0.25, offsetMultiplier: 2 },
  { logo: 'hairday', type: 'glass', userStep: 0.12, offsetMultiplier: 3 },
  { logo: 'meshregen', type: 'wire', userStep: 0.25, offsetMultiplier: 2 },
  { logo: 'meshregen', type: 'glass', userStep: 0.12, offsetMultiplier: 3 },
];

const BASE_SPACING: Record<LogoId, Record<DeviceTypes, number>> = {
  alura: {
    'laptop': 0.1,
    'tablet': 0.13,
    'mobile': 0.2,
  },
  hairday: {
    'laptop': 0.12,
    'tablet': 0,
    'mobile': 0.225,
  },
  meshregen: {
    'laptop': 0.12,
    'tablet': 0,
    'mobile': 0.225,
  },
}

// function optimizeSpacing(userValue: number) {
//   if (DEVICE_TYPE === '')
// }

async function measureDevicePerformance(): Promise<number> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 300;
  canvas.height = 300;

  const start = performance.now();

  for (let i = 0; i < 5000; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 300, Math.random() * 300);
    ctx.lineTo(Math.random() * 300, Math.random() * 300);
    ctx.stroke();
  }

  return performance.now() - start; // lower = faster device
}

export default function useMesh({ logo, type }: { logo: LogoId; type: MeshVariant['type'] }): MeshPiece[] {
  

  const variant = MESH_VARIANTS.find(
    v => v.logo === logo && v.type === type
  );

  if (!variant) return [];

  const logoSpec = LOGOS[logo];
  const key = makeMeshKey(logo, variant, logoSpec);

  const entry = meshCache.get(key);

  return entry?.status === 'ready' ? entry.pieces! : [];
}

function scheduleMeshGeneration(
  key: MeshKey,
  params: MeshRegenType
): Promise<MeshPiece[]> {
  const existing = meshCache.get(key);

  if (existing?.status === 'ready') {
    return Promise.resolve(existing.pieces!);
  }

  if (existing?.status === 'generating') {
    return existing.promise!;
  }

  let resolve!: (v: MeshPiece[]) => void;
  let reject!: (e: unknown) => void;

  const promise = new Promise<MeshPiece[]>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  meshCache.set(key, {
    status: 'generating',
    promise
  });

  const run = () => {
    try {
      const pieces = generateMesh(params);

      meshCache.set(key, {
        status: 'ready',
        pieces
      });

      resolve(pieces);
    } catch (err) {
      meshCache.set(key, { status: 'error' });
      reject(err);
    }
  };

  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 1000 });
    } else {
      setTimeout(run, 0);
    }
  }, 3500);

  return promise;
}



export async function bakeLogoColors(
  logo: LogoSpec
): Promise<ImageData> {
  const canvas = document.createElement('canvas');
  canvas.width = logo.width;
  canvas.height = logo.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = new Image();

  img.src = logo.svgUrl;
  await img.decode();

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export async function bakeAllLogoColors(): Promise<Record<LogoId, ImageData>> {
  const entries = await Promise.all(
    (Object.entries(LOGOS) as [LogoId, LogoSpec][]).map(
      async ([logo, specs]) => {
        const imageData = await bakeLogoColors(specs);
        return [logo, imageData] as const;
      }
    )
  );

  return Object.fromEntries(entries) as Record<LogoId, ImageData>;
}

function adjustSpacingForPerformance(score: number, baseSpacing: number, multiplier = 1) {
  if (score <= 6) multiplier = 1;
  else if (score <= 12) multiplier = 1.25;
  else if (score <= 20) multiplier = 1.75;
  else multiplier = 2;

  return baseSpacing * multiplier
}

export async function preloadMeshes(colorCanvases: Record<LogoId, ImageData>) {
  const deviceScore = await measureDevicePerformance();

  console.warn('Performance Score: ', deviceScore);

  for (const variant of MESH_VARIANTS) {
    const logoSpec = LOGOS[variant.logo];

    const key = makeMeshKey(variant.logo, variant, logoSpec);

    scheduleMeshGeneration(key, {
      paths: logoSpec.paths,
      userStep: variant.type === 'glass' ? adjustSpacingForPerformance(deviceScore, BASE_SPACING[variant.logo][DEVICE_TYPE]) : variant.userStep,
      offsetMultiplier: variant.offsetMultiplier,
      width: logoSpec.width,
      height: logoSpec.height,
      imageData: colorCanvases[variant.logo]
    });
  }
}

function makeMeshKey(
  logo: LogoId,
  variant: MeshVariant,
  logoSpec: LogoSpec
): MeshKey {
  return [
    logo,
    variant.type,
    variant.userStep,
    variant.offsetMultiplier,
    logoSpec.width,
    logoSpec.height
  ].join('|');
}


// --------------------------------------------------- Mesh Regen Logic ---------------------------------------------------

function generateMesh({ paths, userStep, width, height, offsetMultiplier, imageData }: MeshRegenType): MeshPiece[] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  // const debugArr: IslandDebug[] = [];

  const spacing = userStep * 100; // userStep here is of value 0.25

  // const subpaths = buildIslandSubpaths(splitPathD(pathToAbsoluteD(pathD)));

  const subpaths = paths.flatMap(pathD =>
    buildIslandSubpaths(
      splitPathD(
        pathToAbsoluteD(pathD)
      )
    )
  );

  const clipperIslands = subpaths.map(island => ({
    ...islandToClipperPoly(island, userStep * 10),
    islandPath: island.islandPath
  }));

  console.log('subpaths: ', subpaths);

  const islands: MeshIslandProps[] = clipperIslands.map((island) => {
    const offset = CLIPPER_SCALE * offsetMultiplier * 20 * userStep;

    const { outerBuffer, boundaryBuffer, innerBuffer } = generateBuffers(island, offset, 1100, spacing / 1.5 * CLIPPER_SCALE);

    const boundaryPts: Point[] = [];
    const outerBfrPts: Point[] = [];

    // outer ring
    boundaryPts.push(
      ...samplePath64ByDistance(boundaryBuffer.outer, spacing, CLIPPER_SCALE)
    );
    for (let i = 0; i < boundaryBuffer.holes.length; i++) {
      boundaryPts.push(
        ...samplePath64ByDistance(boundaryBuffer.holes[i], spacing, CLIPPER_SCALE)
      );
    }

    outerBfrPts.push(
      ...samplePath64ByDistance(outerBuffer.outer, spacing, CLIPPER_SCALE)
    );
    for (let i = 0; i < outerBuffer.holes.length; i++) {
      outerBfrPts.push(
        ...samplePath64ByDistance(outerBuffer.holes[i], spacing, CLIPPER_SCALE)
      );
    }

    const interiorPts = generateInteriorPoints(
      innerBuffer,
      spacing
    )

    return { island, innerBuffer, outerBfrPts, boundaryPts, interiorPts }
  });


  const pieces: MeshPiece[] = [];
  let id = 0;

  for (const { island, innerBuffer, outerBfrPts, boundaryPts, interiorPts } of Object.values(islands)) {
    // feed Delaunay
    const points = [
      ...outerBfrPts,
      ...boundaryPts,
      ...interiorPts,
    ];

    const delaunay = Delaunay.from(
      points,
      p => p.x,
      p => p.y
    );

    const triangles = delaunay.triangles;
    console.log('Generated ', triangles.length / 3, ' triangles!  -   Total Verts: ', triangles.length);

    for (let i = 0; i < triangles.length; i += 3) {
      const tri = [
        points[triangles[i]],
        points[triangles[i + 1]],
        points[triangles[i + 2]]
      ];

      const state = classifyTriangle(tri, island, innerBuffer);

      const triCentroid = polygonCentroid(tri);

      // if (state === 'OUTSIDE') continue;

      // FULLY: no clipping needed
      if (state === 'FULLY') { // 
        pieces.push({
          id: id++,
          points: tri,
          triangleIndex: i / 3,
          state: 'FULLY',
          centroid: triCentroid,
          color: bakePieceColors(
            imageData,
            tri,
            triCentroid
          )
        });
        continue;
      }

      // PARTLY/OUTSIDE: clip to polygon
      const clippedPolys = clipTriangleToIsland(tri, island);
      
      for (const poly of clippedPolys) {
        const polyCentroid = path64ToPoints([polygonCentroid(poly)], CLIPPER_SCALE)[0];
        const polyPts = path64ToPoints(poly, CLIPPER_SCALE);

        pieces.push({
          id: id++,
          points: polyPts,
          triangleIndex: i / 3,
          state,
          centroid: polyCentroid,
          color: bakePieceColors(
            imageData,
            polyPts,
            polyCentroid
          )
        });
      }
    }
  }

  // console.log(pieces.filter((p) => p.state === 'OUTSIDE'));
  // console.log('Displayed Mesh pieces: ', pieces.length);

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

// function sampleColor(
//   ctx: CanvasRenderingContext2D,
//   p: Point
// ): [number, number, number, number] {
//   // console.log(ctx.canvas);

//   const d = ctx.getImageData(
//     Math.floor(p.x),
//     Math.floor(p.y),
//     1,
//     1
//   ).data;

//   // console.log(d);
  
//   return [d[0], d[1], d[2], d[3]];
// }

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

// function bakePieceColors(
//   colorCanvas: HTMLCanvasElement,
//   points: Point[],
//   centroid: Point
// ): PolyColor {
//   const ctx = colorCanvas.getContext('2d')!;
//   const samples = samplePointsForPiece(points, centroid);

//   const colors = samples.map(p => sampleColor(ctx, p));
//   return averageColors(colors);
// }

function bakePieceColors(
  imageData: ImageData,
  points: Point[],
  centroid: Point
): PolyColor {
  // const ctx = colorCanvas.getContext('2d')!;
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