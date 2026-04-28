import type { Path64 } from "clipper2-ts";

export type MeshRegenType = {
  imageData: ImageData;
  paths?: string[]; // ✅ optional now
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

export type PolyColor = { r: number; g: number; b: number; a: number }

export type MeshPiece = {
  id: number;
  points: Point[];
  triangleIndex: number;
  state: TriangleClass;
  centroid: Point;
  color: PolyColor;
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
  islandPath: Path2D;
}

export type IslandDebugPoints = {
  innerBfrPts: Path64;
  outerBfrPts: Path64;
}

export type Island = {
  outer: Path64;
  holes: Path64[];
};

export type LogoId = 'alura' | 'meshregen' | 'hairday' | 'starleap';

export type LogoSpec = {
  id: LogoId;
  paths: string[];
  svgUrl: string;
  width: number;
  height: number;
};

export type MeshVariant = {
  logo: LogoId;
  type: 'wire' | 'glass';
  userStep: number;
  offsetMultiplier: number;
};

export type MeshKey = string;

export type MeshCacheEntry = {
  status: 'idle' | 'generating' | 'ready' | 'error';
  pieces?: MeshPiece[];
  promise?: Promise<MeshPiece[]>;
};