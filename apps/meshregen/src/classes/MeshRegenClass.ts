import { pointInPolygon, PointInPolygonResult, getBounds, ClipperOffset, JoinType, EndType, type Paths64, type Path64, Clipper64, ClipType, FillRule } from "clipper2-ts";
import { Delaunay } from "d3-delaunay";
import PoissonDiskSampling from "poisson-disk-sampling";
import type { MeshPiece, MeshIslandProps, Point, Island, PolyColorRGB, TriangleClass, PolyColorHSLA, IslandDebugPoints } from "../types/MeshRegenTypes";

export default class MeshRegenClass {
  private CLIPPER_SCALE = 1024;

  private clipperIslands: Island[] = [];
  private islandBuffers: MeshIslandProps[] = [];


  // -- User Defined Values -- //
  private spacing: number = 1;
  private ringOffsetMultiplier: number = 1;
  private rawPathDs: string[] = [];
  private imageData: ImageData | undefined = undefined;
  private colorSpace: 'RGB' | 'HSL' = 'RGB';


  // --- Final Result Data --- //
  public meshPieces: MeshPiece[] = [];
  public buffersData: IslandDebugPoints[] = [];

  
  constructor(
    userSpacing: number,
    ringOffsetMultiplier: number,
    rawPathDs: string[],
    imageData?: ImageData,
    colorSpace: 'RGB' | 'HSL' = 'RGB',
  ) {
    this.spacing = userSpacing * 10;
    this.ringOffsetMultiplier = ringOffsetMultiplier;
    this.rawPathDs = rawPathDs;
    this.imageData = imageData;
    this.colorSpace = colorSpace;

    // -- Initializing Tool -- //
    this.generateMesh(
      userSpacing,
      ringOffsetMultiplier,
      rawPathDs,
      imageData,
      colorSpace
    );
  }

  
  //================================================//
  //              React State Triggers              //
  //================================================//

  public generateMesh = (
    userSpacing: number,
    ringOffsetMultiplier: number,
    rawPathDs: string[],
    imageData?: ImageData,
    colorSpace: 'RGB' | 'HSL' = 'RGB',
  ) => {
    this.spacing = userSpacing * 10;
    this.ringOffsetMultiplier = ringOffsetMultiplier;
    this.rawPathDs = rawPathDs;
    this.imageData = imageData;
    this.colorSpace = colorSpace;

    // 1. Test pathD directions to distinguish islands from holes
    this.prepareIslands();

    // 2. Generate inner, outer and boundary buffers
    this.generateIslandBuffers();

    // 3. Start the triangulation process and clip the triangles
    this.generateMeshPieces();

    // 4. Assimble the debug tools' required data

    console.log('flagged as ready! - Total: ', this.meshPieces.length);
  }

  //================================================//
  //           Main Mesh Assembly Methods           //
  //================================================//
  
  private prepareIslands = () => {
    const { rawPathDs, spacing } = this;

    const subpaths = rawPathDs.flatMap(pathD =>
      this.buildIslandSubpaths(
        this.splitPathD(
          this.pathToAbsoluteD(pathD)
        )
      )
    );

    this.clipperIslands = subpaths.map(island =>
      this.islandToClipperPoly(island, spacing)
    );
  }

  private generateIslandBuffers = () => {
    const { CLIPPER_SCALE, spacing, clipperIslands, ringOffsetMultiplier, samplePath64ByDistance } = this;

    const debugBuffers: IslandDebugPoints[] = [];

    this.islandBuffers = clipperIslands.map((island) => {
      const offset = CLIPPER_SCALE * ringOffsetMultiplier * 0.2 * spacing;

      const boundaryPts: Point[] = [];
      const outerBfrPts: Point[] = [];
      const innerBfrPts: Point[] = [];
      const interiorPts: Point[] = [];

      const { outerBuffer, boundaryBuffer, innerBuffer } = this.generateBuffers(
        island,
        offset,
        1100,
        spacing * ringOffsetMultiplier * 150 // (spacing * ringOffsetMultiplier * 0.1) * CLIPPER_SCALE
      );

      // boundary points
      boundaryPts.push(
        ...samplePath64ByDistance(boundaryBuffer.outer)
      );

      for (let i = 0; i < boundaryBuffer.holes.length; i++) {
        boundaryPts.push(
          ...samplePath64ByDistance(boundaryBuffer.holes[i])
        );
      }

      // outer buffer points
      outerBfrPts.push(
        ...samplePath64ByDistance(outerBuffer.outer)
      );

      for (let i = 0; i < outerBuffer.holes.length; i++) {
        outerBfrPts.push(
          ...samplePath64ByDistance(outerBuffer.holes[i])
        );
      }

      interiorPts.push(
        ...this.generateInteriorPoints(innerBuffer)
      );

      
      

      // outer buffer points
      innerBfrPts.push(
        ...samplePath64ByDistance(innerBuffer.outer)
      );

      for (let i = 0; i < innerBuffer.holes.length; i++) {
        innerBfrPts.push(
          ...samplePath64ByDistance(
            innerBuffer.holes[i]
          )
        );
      }






      debugBuffers.push({
        innerBfrPts: this.path64ToPoints(innerBfrPts, 1),
        outerBfrPts: this.path64ToPoints(outerBfrPts, 1)
      })

      return {
        island,
        innerBuffer,
        outerBfrPts,
        boundaryPts,
        interiorPts
      };
    });

    this.buffersData = debugBuffers;
  }

  private generateMeshPieces = () => {
    const { CLIPPER_SCALE, imageData } = this;

    const pieces: MeshPiece[] = [];
    let id = 0;
    // Highlight Fix: Track global offsets across detached triangulation meshes
    let globalTriangleOffset = 0; 
    
    for (const {
      island,
      innerBuffer,
      outerBfrPts,
      boundaryPts,
      interiorPts
    } of this.islandBuffers) {

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

      const { triangles, halfedges } = delaunay;

      console.log(
        "Generated ",
        triangles.length / 3,
        " triangles!"
      );

      for (let i = 0; i < triangles.length; i += 3) {
        // Calculate the local index, then offset it to become uniquely global
        const localTriangleIndex = i / 3;
        const currentTriangleIndex = globalTriangleOffset + localTriangleIndex;

        const p0_id = triangles[i];
        const p1_id = triangles[i + 1];
        const p2_id = triangles[i + 2];

        const p0 = points[p0_id];
        const p1 = points[p1_id];
        const p2 = points[p2_id];

        const tri = [p0, p1, p2];

        // Gather raw mesh neighbors cleanly and offset them globally
        const neighborTriangleIds: number[] = [];
        for (let j = 0; j < 3; j++) {
          const oppositeEdge = halfedges[i + j];
          if (oppositeEdge >= 0) {
            const localNeighborIdx = (oppositeEdge / 3) | 0;
            neighborTriangleIds.push(globalTriangleOffset + localNeighborIdx);
          }
        }

        const state = this.classifyTriangle(tri, island, innerBuffer);
        const triCentroid = this.calculateCentroid(tri);

        const sharedMeta = {
          triangleIndex: currentTriangleIndex, // Globally unique across islands!
          halfedges: [i, i + 1, i + 2],
          pointIds: [p0_id, p1_id, p2_id],
          neighbors: neighborTriangleIds,
          state,
        };

        if (state === "FULLY") {
          pieces.push({
            ...sharedMeta,
            id: id++, 
            points: tri,
            centroid: triCentroid,
            color: imageData ? this.bakePieceColors(imageData, tri, triCentroid) : (this.colorSpace === "RGB" ? { r: 255, g: 255, b: 255, a: 1 } : { h: 0, s: 0, l: 100, a: 1 }),
            bbox: {
              minX: Math.min(p0.x, p1.x, p2.x),
              maxX: Math.max(p0.x, p1.x, p2.x),
              minY: Math.min(p0.y, p1.y, p2.y),
              maxY: Math.max(p0.y, p1.y, p2.y),
            }
          });
          continue;
        }

        const clippedPolys = this.clipTriangleToIsland(tri, island);

        for (const poly of clippedPolys) {
          const polyPts = this.path64ToPoints(poly, CLIPPER_SCALE);
          const polyCentroid = this.path64ToPoints([this.calculateCentroid(poly)], CLIPPER_SCALE)[0];

          const polyBbox = {
            minX: Math.min(...polyPts.map(p => p.x)),
            maxX: Math.max(...polyPts.map(p => p.x)),
            minY: Math.min(...polyPts.map(p => p.y)),
            maxY: Math.max(...polyPts.map(p => p.y)),
          };

          pieces.push({
            ...sharedMeta,
            id: id++, 
            points: polyPts,
            centroid: polyCentroid,
            color: imageData ? this.bakePieceColors(imageData, polyPts, polyCentroid) : (this.colorSpace === "RGB" ? { r: 255, g: 255, b: 255, a: 1 } : { h: 0, s: 0, l: 100, a: 1 }),
            bbox: polyBbox,
          });
        }
      }

      // Increment the global offset by the total number of triangles generated for this island
      globalTriangleOffset += (triangles.length / 3);
    }

    this.meshPieces = pieces;
  }

  //================================================//
  //            Clipper2 Implementations            //
  //================================================//

  private islandToClipperPoly = (
    island: {
      outer: string;
      holes: string[];
    },
    spacing: number
  ): Island => {
    // --- outer ring ---
    let outer = this.svgPathToRing(island.outer, spacing);
    outer = this.ensureWinding(outer, false); // CCW

    // --- holes ---
    const holes = island.holes.map(d => {
      const h = this.svgPathToRing(d, spacing);
      return this.ensureWinding(h, true); // CW
    });

    return {
      outer: outer.map(this.toIntPoint),
      holes: holes.map(r => r.map(this.toIntPoint)),
    };
  }

  private generateBuffers = (
    island: Island,
    outerDist: number,
    boundaryDist: number,
    innerDist: number
  ) => {
    const { islandToPaths, pathsToIsland } = this;

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

  private generateInteriorPoints = (interiorBuffer: Island): Point[] => {
    const { CLIPPER_SCALE, spacing } = this;

    const bbox = this.getPaddedBoundsWorld(interiorBuffer, CLIPPER_SCALE, spacing);

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
      .filter(point => this.pointInIsland(point, interiorBuffer))
  }

  private pointInIsland = (
    pt: Point,
    island: Island
  ): boolean => {
    const { CLIPPER_SCALE } = this;

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

  private clipTriangleToIsland = (
    tri: Point[],
    island: Island,
  ): Path64[] => {
    const islandPaths = this.islandToClipperPaths(island);

    const subject: Paths64 = [tri.map(this.toIntPoint)];// [triangleToPath64(tri, CLIPPER_SCALE)];
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

  private islandToClipperPaths = (island: Island): Paths64 => {
    return [island.outer, ...island.holes];
  }

  //================================================//
  //                   D3 Delaunay                  //
  //================================================//

  private samplePath64ByDistance = (path: Path64): Point[] => {
    const { spacing, CLIPPER_SCALE } = this;

    const pts = this.path64ToPoints(path, CLIPPER_SCALE);
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

  //================================================//
  //                General Utilities               //
  //================================================//

  private splitPathD = (d: string): string[] => {
    return d
      .split(/(?=[Mm])/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  private isPointInsidePath = (
    ctx: CanvasRenderingContext2D,
    pathD: string,
    point: Point
  ): boolean => {
    const path = new Path2D(pathD);
    return ctx.isPointInPath(path, point.x, point.y, "nonzero");
  }

  private buildIslandSubpaths = (
    subpaths: string[]
  ): { outer: string; holes: string[]; islandPath: string }[] => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const islands: {
      outer: string;
      holes: string[];
    }[] = [];

    for (const subpath of subpaths) {
      const testPoint = this.getSubpathTestPoint(subpath);

      let assignedAsHole = false;

      // Try to assign as a hole to an existing island
      for (const island of islands) {
        if (this.isPointInsidePath(ctx, island.outer, testPoint)) {
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

  private getSubpathTestPoint = (d: string): Point => {
    const match = d.match(/M\s*([-\d.]+)[ ,]([-\d.]+)/i);

    if (!match) throw new Error("Invalid subpath");
    return { x: +match[1], y: +match[2] };
  }

  private pathToAbsoluteD = (d: string): string => {
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

  private svgPathToRing = (d: string, spacing: number): Point[] => {
    const p = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    p.setAttribute("d", d);

    const len = p.getTotalLength();
    if (!isFinite(len) || len === 0) return [];

    const count = Math.max(3, Math.floor(len / spacing * 10));
    const pts: Point[] = [];

    for (let i = 0; i < count; i++) {
      const pt = p.getPointAtLength((i / count) * len);
      pts.push({ x: pt.x, y: pt.y });
    }

    return pts;
  }

  private getPaddedBoundsWorld = (
    island: Island,
    scale: number,
    padding: number
  ) => {
    const b64 = getBounds(island.outer);

    return {
      minX: b64.left / scale - padding,
      minY: b64.top / scale - padding,
      maxX: b64.right / scale + padding,
      maxY: b64.bottom / scale + padding,
    };
  }

  private ensureWinding = (ring: Point[], clockwise: boolean) => {
    const area = this.calculateSignedArea(ring);
    const isCW = area < 0;

    return isCW === clockwise ? ring : [...ring].reverse();
  }

  private toIntPoint = (p: Point): Point => {
    const { CLIPPER_SCALE } = this;

    return {
      x: Math.round(p.x * CLIPPER_SCALE),
      y: Math.round(p.y * CLIPPER_SCALE),
    };
  }

  private calculateSignedArea = (pts: Point[]): number => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      a += (p.x * q.y - q.x * p.y);
    }
    return a * 0.5;
  }

  private path64ToPoints = (path: Path64, scale: number): Point[] => {
    return path.map(p => ({
      x: p.x / scale,
      y: p.y / scale,
    }));
  }

  private islandToPaths = (island: Island): Path64[] => {
    return [island.outer, ...island.holes];
  }

  private pathsToIsland = (paths: Path64[]): Island => {
    if (paths.length === 0) {
      return { outer: [], holes: [] };
    }

    let outer = paths[0];
    let maxArea = Math.abs(this.calculateSignedArea(outer));

    for (const p of paths) {
      const area = Math.abs(this.calculateSignedArea(p));
      if (area > maxArea) {
        maxArea = area;
        outer = p;
      }
    }

    const holes = paths.filter(p => p !== outer);
    return { outer, holes };
  }

  private classifyTriangle = (
    tri: Point[],
    island: Island,
    innerBuffer: Island,
  ): TriangleClass => {
    let inInnerCount = 0;
    let inIslandCount = 0;

    for (const v of tri) {
      if (this.pointInIsland(v, innerBuffer)) inInnerCount++;
      if (this.pointInIsland(v, island)) inIslandCount++;
    }

    // ---- Case 1: fully inside inner buffer ----
    // Guaranteed safe: edges cannot touch the boundary
    if (inInnerCount === 3) {
      return 'FULLY';
    }

    // ---- Case 2: fully outside island ----
    // All verts outside AND centroid outside → guaranteed irrelevant
    if (inIslandCount === 0) {
      const c = this.calculateCentroid(tri);
      if (!this.pointInIsland(c, island)) {
        return 'OUTSIDE';
      }
    }

    // ---- Case 3: boundary band ----
    // Any ambiguity → must clip
    return 'PARTLY';
  }

  private calculateCentroid = (pts: Point[]): Point => {
    if (!pts || pts.length < 3) {
      throw new Error("A polygon must have at least 3 vertices.");
    }

    let cx = 0;
    let cy = 0;
    let area = 0;

    const numPoints = pts.length;

    for (let i = 0; i < numPoints; i++) {
      const p1 = pts[i];
      // The next point, wrapping around to the first point at the end
      const p2 = pts[(i + 1) % numPoints];

      // Common factor used in both area and centroid calculations
      const factor = (p1.x * p2.y) - (p2.x * p1.y);

      area += factor;
      cx += (p1.x + p2.x) * factor;
      cy += (p1.y + p2.y) * factor;
    }

    // Avoid division by zero for degenerate polygons (collinear points / zero area)
    if (area === 0) {
      // Fall back to vertex average if the polygon has no area
      let xSum = 0, ySum = 0;
      for (const p of pts) {
        xSum += p.x;
        ySum += p.y;
      }
      return { x: xSum / numPoints, y: ySum / numPoints };
    }

    cx = cx / (3 * area);
    cy = cy / (3 * area);

    return { x: cx, y: cy };
  }

  private samplePointsForPiece = (points: Point[], centroid: Point): Point[] => {
    const shrinkFactor = 0.25; 

    if (points.length === 3) {
      const [a, b, c] = points;
      return [
        centroid,
        { x: centroid.x + (a.x - centroid.x) * shrinkFactor, y: centroid.y + (a.y - centroid.y) * shrinkFactor },
        { x: centroid.x + (b.x - centroid.x) * shrinkFactor, y: centroid.y + (b.y - centroid.y) * shrinkFactor },
        { x: centroid.x + (c.x - centroid.x) * shrinkFactor, y: centroid.y + (c.y - centroid.y) * shrinkFactor },
      ];
    }

    const samples: Point[] = [centroid];
    for (const p of points) {
      samples.push({
        x: centroid.x + (p.x - centroid.x) * shrinkFactor,
        y: centroid.y + (p.y - centroid.y) * shrinkFactor
      });
    }
    return samples;
  }

  private sampleColor = (
    imageData: ImageData,
    p: Point
  ): [number, number, number, number] => {
    const x = Math.max(0, Math.min(imageData.width - 1, Math.floor(p.x)));
    const y = Math.max(0, Math.min(imageData.height - 1, Math.floor(p.y)));

    const i = (y * imageData.width + x) * 4;
    const d = imageData.data;

    return [d[i], d[i + 1], d[i + 2], d[i + 3]];
  }

  // Keep averaging in RGBA to ensure math/blending stays perfectly accurate
  private averageColorsToRgba = (colors: number[][]) => {
    let totalWeight = 0;
    let r = 0, g = 0, b = 0, a = 0;

    for (const c of colors) {
      const alphaWeight = c[3] / 255;

      if (alphaWeight === 0) continue; 

      r += c[0] * alphaWeight;
      g += c[1] * alphaWeight;
      b += c[2] * alphaWeight;
      a += c[3];               
      totalWeight += alphaWeight;
    }

    if (totalWeight === 0) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }

    return {
      r: r / totalWeight,
      g: g / totalWeight,
      b: b / totalWeight,
      a: (a / colors.length) / 255 // Normalized to 0-1 for standard HSLA usage
    };
  }

  // New helper method to handle the math transformation
  private rgbaToHsla = (r: number, g: number, b: number, a: number): PolyColorHSLA => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);

    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
      a: Number(a.toFixed(2)) // Clean up floating point alpha decimals
    };
  }

  // The master function now seamlessly produces HSLA data
  private bakePieceColors = (
    imageData: ImageData,
    points: Point[],
    centroid: Point
  ): PolyColorRGB | PolyColorHSLA => {
    const samples = this.samplePointsForPiece(points, centroid);
    const colors = samples.map(p => this.sampleColor(imageData, p));
    
    const avgRgba = this.averageColorsToRgba(colors);

    if (this.colorSpace === 'RGB') return avgRgba
    return this.rgbaToHsla(avgRgba.r, avgRgba.g, avgRgba.b, avgRgba.a);
  }
}