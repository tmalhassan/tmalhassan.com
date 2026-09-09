export type DebugChildField = 'outerBuffer' | 'innerBuffer' | 'centroids' | 'neighbors' | 'clipRegions';

export interface debugState {
  enableDebug: boolean;
  outerBuffer: boolean;
  innerBuffer: boolean;
  centroids: boolean;
  neighbors: boolean;
  clipRegions: boolean;
}

export type ToggleMasterAction = {
  type: 'TOGGLE_MASTER';
};

export type ToggleChildAction = {
  type: 'TOGGLE_CHILD';
  field: DebugChildField;
};

export type ResetAction = {
  type: 'RESET';
};

export type DebugAction = ToggleMasterAction | ToggleChildAction | ResetAction;