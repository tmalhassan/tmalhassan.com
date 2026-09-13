export type SVGNames = 'alura' | 'meshregen' | 'instagram' | 'apple' | 'windows' | 'spotify' | 'google' | 'cloud';

export type SVGData = {
  spacing: number;
  offset: number;
  paths: string[];
  src?: string;
};

// This represents exactly what your active workspace holds
export interface ActiveSVGState extends SVGData {
  selectedSVG: SVGNames;
}

// Strictly type your actions using standard `payload` structures
export type ChangeSVGAction = {
  type: 'CHANGE_SVG';
  payload: SVGNames; // We pass the name of the new SVG we want to load
};

export type AdjustValueAction = {
  type: 'ADJUST_VALUE';
  payload: {
    field: 'spacing' | 'offset';
    value: number;
  };
};

export type UpdatePathsAction = {
  type: 'UPDATE_PATHS';
  payload: string[];
};

export type ResetAction = {
  type: 'RESET';
};

export type SVGAdjustAction = ChangeSVGAction | AdjustValueAction | UpdatePathsAction | ResetAction;
