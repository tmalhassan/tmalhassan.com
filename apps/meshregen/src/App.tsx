import { useEffect, useReducer, useRef, useState } from 'react'
import MeshRegenClass from './classes/MeshRegenClass'
import ConfigMenu from './components/ConfigMenu/ConfigMenu';
import type { ActiveSVGState, SVGAdjustAction } from './types/SVGDataTypes';
import type { DebugAction, DebugChildField, debugState } from './types/DebugToolTypes';
import RenderCanvas from './components/RenderCanvas/RenderCanvas';
import type { IslandDebugPoints, MeshPiece } from './types/MeshRegenTypes';
import { SVG_PRESETS } from './data/SVGsData';
import { rasterizeSVG } from './utilities/rasterizeSVG';
import './App.css'

export default function App() {
  const [activeSVG, dispatchSVG] = useReducer(svgWorkspaceReducer, initialWorkspaceState);
  const [strokeOpacity, setStrokeOpacity] = useState(0.25);
  const [uploadedSVG, setUploadedSVG] = useState<File | undefined>(undefined); // uploaded SVG file
  // const [imageData, setImageData] = useState<ImageData | undefined>(undefined); // to be processed from selected or uploaded svg if available

  const [colorsActive, setColorsActive] = useState(true);
  const [debugTools, dispatch] = useReducer(debugReducer, initialDebugState);

  const imageDataCacheRef = useRef(new Map<string, ImageData>());
  const meshRegenRef = useRef<MeshRegenClass | null>(null);

  // == Result data (for render) == //
  const meshPiecesRef = useRef<MeshPiece[]>([]);
  const buffersDataRef = useRef<IslandDebugPoints[]>([]);
  // ============================== //

  const [meshVersion, setMeshVersion] = useState(0);
  
  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      const svg = activeSVG;

      let imageData = imageDataCacheRef.current.get(activeSVG.selectedSVG);

      if (!imageData && svg.src) {
        imageData = await rasterizeSVG(
          svg.src,
          1024,   // svg.width
          1024    // svg.height
        );

        if (cancelled) return;

        imageDataCacheRef.current.set(activeSVG.selectedSVG, imageData);
      }

      if (cancelled) return;

      let meshRegenInstance = meshRegenRef.current;

      if (!meshRegenInstance) {
        meshRegenInstance = new MeshRegenClass(
          svg.spacing,
          svg.offset,
          svg.paths,
          imageData,
          'HSL'
        );

        meshRegenRef.current = meshRegenInstance;
      } else {
        meshRegenInstance.generateMesh(
          svg.spacing,
          svg.offset,
          svg.paths,
          imageData,
          'HSL'
        );
      }

      meshPiecesRef.current = meshRegenInstance.meshPieces;
      buffersDataRef.current = meshRegenInstance.buffersData;

      setMeshVersion(version => version + 1);
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [activeSVG]);

  return(
    <>
      <RenderCanvas
        meshPiecesRef={meshPiecesRef}
        buffersDataRef={buffersDataRef}
        debugTools={debugTools}
        meshVersion={meshVersion}
        colorsActive={colorsActive}
        strokeOpacity={strokeOpacity}
      />
      <ConfigMenu
        activeSVG={activeSVG}
        dispatchSVG={dispatchSVG}
        strokeOpacity={strokeOpacity}
        setStrokeOpacity={setStrokeOpacity}
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
  outerBuffer: false,
  innerBuffer: false,
  centroids: false,
  neighbors: false,
  clipRegions: false,
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
        clipRegions: false,
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


const initialWorkspaceState: ActiveSVGState = {
  selectedSVG: 'meshregen',
  ...SVG_PRESETS['meshregen'],
};

function svgWorkspaceReducer(state: ActiveSVGState, action: SVGAdjustAction): ActiveSVGState {
  switch (action.type) {
    case 'CHANGE_SVG': {
      const nextSVGName = action.payload;
      const defaultPresets = SVG_PRESETS[nextSVGName];

      // Instantly drop old adjustments and load the new SVG config
      return {
        selectedSVG: nextSVGName,
        ...defaultPresets, 
      };
    }

    case 'ADJUST_VALUE': {
      // Keeps everything intact, but sets 'spacing' or 'offset' safely
      return {
        ...state,
        [action.payload.field]: action.payload.value,
      };
    }

    case 'UPDATE_PATHS': {
      return {
        ...state,
        paths: action.payload,
      };
    }

    case 'RESET': {
      // Resets the workspace back to whatever the default starting point was
      return initialWorkspaceState;
    }

    default:
      return state;
  }
}