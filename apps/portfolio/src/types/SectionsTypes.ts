import type { Path64 } from "clipper2-ts";
import type { MeshPiece } from "./MeshRegenTypes";

export type sectionsTypes = 'web' | 'game' | 'design';

export type sectionProps = {
  id: sectionsTypes;
  name: string;
  pathD: string;
  polygonPath: Path2D;
  centroid: {
    x: number,
    y: number
  },
  dimensions: {
    width: number,
    height: number
  },
  points: Path64;
  shiftPercentage: {
    x: number;
    y: number;
  },
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  textMetr: {
    width: number;
    height: number;
  };
  isHovered: boolean;
  animDuration: number;
  animStart: boolean;
  startTime: number | null;
  mesh: MeshPiece[];
  revealRad: number;
}

export type SectionViewTypes = {
  sectionView: sectionsTypes | null;
  ToggleSectionView({ state, type }: { state: true; type: sectionsTypes; } | { state: false; type: null; }): void;
}
export type WebProjects = 'alura' | 'hairday' | 'meshregen';
export type GameProjects = 'starleap';
export type Project = WebProjects | GameProjects;

export type AppCategories = 'front-end' | 'back-end' | 'npm packages' | 'design';

export type AppsList = 
  'JavaScript' |
  'HTML' |
  'CSS' |
  'TypeScript' |
  'React' |
  'C#' |
  'Unity' |
  'Node.js' |
  'Express' |
  'MySQL' |
  'GameSparks' |
  'Multer' |
  'Sharp' |
  'Bcrypt' |
  'CORS' |
  'Axios' |
  'Immer' |
  'D3 Delaunay' |
  'Poisson Disk' |
  'Clipper2' |
  'Illustrator' |
  'Photoshop' |
  'Audition' |
  'After Effects'
;

export type IconFileNames = 
  'javascript' |
  'html' |
  'css' |
  'typescript' |
  'react' |
  'c-sharp' |
  'unity' |
  'nodejs' |
  'express' |
  'mysql' |
  'gamesparks' |
  'multer' |
  'sharp' |
  'bcrypt' |
  'cors' |
  'axios' |
  'immer' |
  'd3-delaunay' |
  'poisson-disk' |
  'clipper2-ts' |
  'adobe-illustrator' |
  'adobe-photoshop' |
  'adobe-after-effects' |
  'adobe-audition'
;


export type AppInfo = {
  [name in AppsList]: {
    category: AppCategories;
    src: string;
  };
};
