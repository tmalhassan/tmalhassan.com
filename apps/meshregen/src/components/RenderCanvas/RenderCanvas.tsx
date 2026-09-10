import { useEffect, useRef } from 'react';
import type { debugState } from '../../types/DebugToolTypes';
import type { MeshPiece } from '../../types/MeshRegenTypes';
import { RenderMeshEngine } from '../../classes/RenderMeshEngine';
import './RenderCanvas.css';
import { useDevice } from '../../contexts/device-context/useDevice';

interface RenderCanvasProps{
  meshPiecesRef: React.RefObject<MeshPiece[]>;
  debugDataRef: React.RefObject<string[]>;
  debugTools: debugState;
  meshVersion: number
}

export default function RenderCanvas({ meshPiecesRef, debugDataRef, debugTools, meshVersion }: RenderCanvasProps) {
  const { device } = useDevice();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const engineRef = useRef<RenderMeshEngine | null>(null);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  useEffect(() => {


  }, [debugTools]);

  useEffect(() => {
    engineRef.current?.updateMeshData(meshPiecesRef.current, debugDataRef.current);
  }, [meshVersion]);
  
  useEffect(() => {
    const canvasElm = canvasRef.current;
    const containerElm = containerRef.current;

    if (!containerElm || !canvasElm) return;
    
    const renderEngine = new RenderMeshEngine(canvasElm, device, dpr, meshPiecesRef.current, debugDataRef.current, debugTools);
    engineRef.current = renderEngine;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      renderEngine.handleResize(width, height);
    });

    if (containerElm) resizeObserver.observe(containerElm)

    return () => {
      resizeObserver.disconnect();
      renderEngine.destroy();
      
      if (engineRef.current === renderEngine) {
        engineRef.current = null;
      }
    };
  }, [])

  return(
    <div ref={containerRef} style={{ width: "100%", height: "100svh", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas ref={canvasRef} style={{ touchAction: 'none' }}/>
    </div>
  )
}


// export default function RenderCanvas({ meshPiecesRef, isReady }: any) {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const containerRef = useRef<HTMLDivElement | null>(null);
//   const rafRef = useRef<number | null>(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const container = containerRef.current;
//     if (!canvas || !container) return;

//     // 1. Fixed, manual sizing to eliminate any layout loops
//     const width = 800;
//     const height = 800;
//     canvas.width = width * 2; // Fixed DPR of 2
//     canvas.height = height * 2;
//     canvas.style.width = `${width}px`;
//     canvas.style.height = `${height}px`;

//     const ctx = canvas.getContext("2d", { willReadFrequently: false });
//     if (!ctx) return;

//     // Scale up once for DPR and leave it fixed
//     ctx.setTransform(2, 0, 0, 2, 0, 0);

//     const tick = () => {
//       // 2. Clear using explicit numeric boundaries
//       ctx.clearRect(0, 0, width, height);

//       // 3. Localize data references to prevent state/proxy tracking
//       const pieces = aluraMesh || [];
//       const len = pieces.length;

//       for (let i = 0; i < len; i++) {
//         const piece = pieces[i];
//         const points = piece.points;
//         if (!points || points.length === 0) continue;

//         // 4. Clean path allocation isolated to this specific item
//         ctx.beginPath();
//         ctx.moveTo(points[0].x, points[0].y);
//         for (let j = 1; j < points.length; j++) {
//           ctx.lineTo(points[j].x, points[j].y);
//         }
//         ctx.closePath();

//         // 5. Hardcoded fill color to bypass dynamic string construction
//         const { r, g, b } = piece.color;
//         ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
//         ctx.fill();
//       }

//       // Continue standard frame progression
//       rafRef.current = requestAnimationFrame(tick);
//     };

//     // Kickstart the loop safely
//     rafRef.current = requestAnimationFrame(tick);

//     return () => {
//       if (rafRef.current) {
//         cancelAnimationFrame(rafRef.current);
//       }
//     };
//   }, [isReady]); // Re-run only when data signals readiness

//   return (
//     <div ref={containerRef} style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#111" }}>
//       <canvas ref={canvasRef} />
//     </div>
//   );
// }