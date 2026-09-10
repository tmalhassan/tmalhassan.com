import { useEffect, useReducer, useRef, useState } from 'react'
import MeshRegenClass from './classes/MeshRegenClass'
import ConfigMenu from './components/ConfigMenu/ConfigMenu';
import './App.css'
import type { SVGNames } from './types/SVGDataTypes';
import type { DebugAction, DebugChildField, debugState } from './types/DebugToolTypes';
import RenderCanvas from './components/RenderCanvas/RenderCanvas';
import type { MeshPiece } from './types/MeshRegenTypes';
import { SVGS_DATA } from './data/SVGsData';
import { rasterizeSVG } from './utilities/rasterizeSVG';

export default function App() {
  const [selectedSVG, setSelectedSVG] = useState<SVGNames>('alura'); // from pre-defined SVGs
  const [spacing, setSpacing] = useState(SVGS_DATA[selectedSVG].spacing);
  const [offsetMultiplier, setOffsetMultiplier] = useState(SVGS_DATA[selectedSVG].offsetMultiplier);
  // const [paths, setPaths] = useState<string[]>([]); // to be extracted from uploaded svg
  const [uploadedSVG, setUploadedSVG] = useState<File | undefined>(undefined); // uploaded SVG file
  // const [imageData, setImageData] = useState<ImageData | undefined>(undefined); // to be processed from selected or uploaded svg if available

  const [colorsActive, setColorsActive] = useState(true);
  const [debugTools, dispatch] = useReducer(debugReducer, initialDebugState);

  const imageDataCacheRef = useRef(new Map<string, ImageData>());
  const meshRegenRef = useRef<MeshRegenClass | null>(null);

  // == Result data (for render) == //
  const meshPiecesRef = useRef<MeshPiece[]>([]);
  const debugDataRef = useRef<string[]>([]);
  // ============================== //

  const [meshVersion, setMeshVersion] = useState(0);
  
  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      const svg = SVGS_DATA[selectedSVG];

      let imageData = imageDataCacheRef.current.get(selectedSVG);

      if (!imageData && svg.src) {
        imageData = await rasterizeSVG(
          svg.src,
          1024,   // svg.width
          1024    // svg.height
        );

        if (cancelled) return;

        imageDataCacheRef.current.set(selectedSVG, imageData);
      }

      if (cancelled) return;

      let meshRegenInstance = meshRegenRef.current;

      if (!meshRegenInstance) {
        meshRegenInstance = new MeshRegenClass(
          spacing,
          offsetMultiplier,
          svg.paths,
          imageData
        );

        meshRegenRef.current = meshRegenInstance;
      } else {
        meshRegenInstance.generateMesh(
          spacing,
          offsetMultiplier,
          svg.paths,
          imageData
        );
      }

      meshPiecesRef.current = meshRegenInstance.meshPieces;
      debugDataRef.current = meshRegenInstance.debugData;

      setMeshVersion(version => version + 1);
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [selectedSVG, spacing, offsetMultiplier]);

  return(
    <>
      <RenderCanvas
        meshPiecesRef={meshPiecesRef}
        debugDataRef={debugDataRef}
        debugTools={debugTools}
        meshVersion={meshVersion}
      />
      <ConfigMenu
        spacing={spacing}
        setSpacing={setSpacing}
        offsetMultiplier={offsetMultiplier}
        setOffsetMultiplier={setOffsetMultiplier}
        selectedSVG={selectedSVG}
        setSelectedSVG={setSelectedSVG}
        uploadedSVG={uploadedSVG}
        setUploadedSVG={setUploadedSVG}
        colorsActive={colorsActive}
        setColorsActive={setColorsActive}
        debugTools={debugTools}
        debugDispatch={dispatch}
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