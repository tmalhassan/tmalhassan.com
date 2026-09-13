import type { Path64 } from "clipper2-ts";

export type MeshRegenType = {
  imageData?: ImageData;
  paths?: string[];
  islands: Island[];
  userStep: number;
  offsetMultiplier: number;
  width: number;
  height: number;
}

export type Point = {
  x: number;
  y: number;
};

export type TriangleClass = 'FULLY' | 'PARTLY' | 'OUTSIDE';

export type PolyColorRGB = { r: number; g: number; b: number; a: number }
export type PolyColorHSLA = { h: number; s: number; l: number; a: number }

export type MeshPiece = {
  id: number;
  points: Point[];
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  triangleIndex: number;
  halfedges: number[];
  pointIds: number[];
  neighbors: number[];
  state: TriangleClass;
  centroid: Point;
  color: PolyColorRGB | PolyColorHSLA;
};

export type MeshIslandProps = {
  island: Island;
  innerBuffer: Island;
  outerBfrPts: Point[];
  boundaryPts: Point[];
  interiorPts: Point[];
}

export type IslandDebug = {
  IslandPieces: IslandDebugPoints[];
  // islandPath: Path2D;
}

export type IslandDebugPoints = {
  innerBfrPts: Point[];
  outerBfrPts: Point[];
}

export type Island = {
  outer: Path64;
  holes: Path64[];
};

export type MeshKey = string;

export type MeshCacheEntry = {
  status: 'idle' | 'generating' | 'ready' | 'error';
  pieces?: MeshPiece[];
  promise?: Promise<MeshPiece[]>;
};