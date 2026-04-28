import type { Path64 } from "clipper2-ts";

export type sectionsTypes = 'web' | 'game' | 'design';

export type sectionProps = {
  id: sectionsTypes;
  name: string;
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
  font: (px: number) => string;
  isHovered: boolean;
  animDuration: number;
  animStart: boolean;
  startTime: number | null;
}

export type SectionViewTypes = {
  sectionView: sectionsTypes | null;
  ToggleSectionView({ state, type }: { state: true; type: sectionsTypes; } | { state: false; type: null; }): void;
}
export type Project = 'alura' | 'hairday' | 'starleap';
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
