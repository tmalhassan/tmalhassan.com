import { useEffect, useReducer, useRef, useState } from 'react'
import MeshRegenClass from './classes/MeshRegenClass'
import ConfigMenu from './components/ConfigMenu/ConfigMenu';
import './App.css'
import type { SVGNames } from './types/SVGDataTypes';
import type { DebugAction, DebugChildField, debugState } from './types/DebugToolTypes';

export default function App() {
  const [spacing, setSpacing] = useState(2);
  const [offsetMultiplier, setOffsetMultiplier] = useState(3);
  const [paths, setPaths] = useState<string[]>([]); // to be extracted from uploaded svg
  const [selectedSVG, setSelectedSVG] = useState<SVGNames>('meshregen'); // from pre-defined SVGs
  const [uploadedSVG, setUploadedSVG] = useState<File | undefined>(undefined); // uploaded SVG file
  const [imageData, setImageData] = useState<ImageData | undefined>(undefined); // to be processed from selected or uploaded svg if available

  const [colorsActive, setColorsActive] = useState(true);
  // const [debugActive, setDebugActive] = useState(false);
  const [debugTools, dispatch] = useReducer(debugReducer, initialDebugState);

  const meshRegenRef = useRef<MeshRegenClass | null>(null);

  useEffect(() => {
    const meshRegenInstance = new MeshRegenClass(spacing, offsetMultiplier, paths, imageData);
    meshRegenRef.current = meshRegenInstance;

  }, []);

  return(
    <>
      <ConfigMenu
        spacing={spacing}
        setSpacing={setSpacing}
        offsetMultiplier={offsetMultiplier}
        setOffsetMultiplier={setOffsetMultiplier}
        selectedSVG={selectedSVG}
        setSelectedSVG={setSelectedSVG}
        uploadedSVG={uploadedSVG}
        setUploadedSVG={setUploadedSVG}
        debugTools={debugTools}
        debugDispatch={dispatch}
        colorsActive={colorsActive}
        setColorsActive={setColorsActive}
      />
    </>
  )
}

const initialDebugState: debugState = {
  enableDebug: false, // Parent toggle
  outerBuffer: true,
  innerBuffer: true,
  centroids: true,
  neighbors: true,
  clipRegions: true,
};

function debugReducer(state: debugState, action: DebugAction): debugState {
  switch (action.type) {
    case 'TOGGLE_MASTER': {
      const newValue = !state.enableDebug;
      return {
        enableDebug: newValue,
        outerBuffer: newValue,
        innerBuffer: newValue,
        centroids: newValue,
        neighbors: newValue,
        clipRegions: newValue,
      };
    }

    case 'TOGGLE_CHILD': {
      const newChildValue = !state[action.field];
      
      const newState = {
        ...state,
        [action.field]: newChildValue,
      };

      // check if any childeren are still active 
      const subOptions: DebugChildField[] = [
        'outerBuffer', 'innerBuffer', 'centroids', 'neighbors', 'clipRegions'
      ];
      const activeCount = subOptions.filter(key => newState[key]).length;

      newState.enableDebug = activeCount > 0;
      return newState;
    }

    case 'RESET':
      return initialDebugState;

    default:
      return state;
  }
}