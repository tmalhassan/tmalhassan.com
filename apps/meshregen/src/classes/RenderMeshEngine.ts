import type { debugState } from "../types/DebugToolTypes";
import type { DeviceTypes } from "../types/DeviceTypes";
import type { IslandDebugPoints, MeshPiece, Point, PolyColorHSLA } from "../types/MeshRegenTypes";
import easeInOut from "../utilities/easeInOut";

export class RenderMeshEngine {
  // Main canvas context
  private canvasElement: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Layout States
  private device: DeviceTypes = 'laptop';
  private width = 0;
  private height = 0;
  private baseScale = 1024;
  private dpr = 1;
  private virtualMinX = 0;
  private virtualMaxX = 1024;
  private virtualMinY = 0;
  private virtualMaxY = 1024;
  private hasInitializedOffset = false;



  // Tracking variables for input interactions
  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private translateX = 0;
  private translateY = 0;

  private activePointers: PointerEvent[] = [];
  private isDragging = false;
  private lastMidX = 0;
  private lastMidY = 0;
  private lastPinchDist = 0;

  // Render Props
  private colorsActive = true;
  private triOpacity = 1;
  private strokeOpacity = 0.45;
  private DEBUG_COLORS: Record<string, PolyColorHSLA> = {
    FULLY:   { h: 120,  s: 100, l: 62,  a: 0.35 },
    PARTLY:  { h: 61, s: 100, l: 62,  a: 0.35 },
    OUTSIDE: { h: 0, s: 100,  l: 62,  a: 0.35 },
  };

  // Live Configuration Map
  private meshPieces: MeshPiece[];
  private buffersData: IslandDebugPoints[];
  private debugState: debugState;
  private rafId: number | null = null;
  private hoveredPiece: MeshPiece | null = null;
  private selectedPiece: MeshPiece | null = null;
  private neighborPieces: MeshPiece[] = [];

  // Animators
  private neighborPiecesAnim = { startTime: null as number | null, duration: 3000, progress: 0 };

  constructor(
    canvas: HTMLCanvasElement,
    device: DeviceTypes,
    dpr: number,
    meshPices: MeshPiece[],
    buffersData: IslandDebugPoints[],
    debugState: debugState,
    colorActive: boolean,
    strokeOpacity: number,
  ) {
    this.canvasElement = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.device = device;
    this.dpr = dpr;
    this.meshPieces = meshPices;
    this.buffersData = buffersData;
    this.debugState = debugState;
    this.colorsActive = colorActive;
    this.strokeOpacity = strokeOpacity;

    // initialize pointer events
    this.initPointerHandlers();

    // initialize loop
    this.startLoop();
  }
  
  public updateMeshData(meshPieces: MeshPiece[], buffersData: IslandDebugPoints[]) {
    this.meshPieces = meshPieces;
    this.buffersData = buffersData;

    this.selectedPiece = null;
    this.neighborPieces = [];
  }

  //================================================//
  //              React State Triggers              //
  //================================================//

  public handleResize(newWidth: number, newHeight: number) {
    this.width = newWidth;
    this.height = newHeight;

    // console.log('width: ', newWidth, 'height: ', newHeight);

    const { width, height, baseScale, dpr, ctx } = this;

    // calculate aspect-ratio scale based on a 1024x1024 virtual box
    const size = Math.min(width, height);
    const scale = size / baseScale;

    // resize canvas DOM
    ctx.canvas.width = width * dpr;
    ctx.canvas.height = height * dpr;
    ctx.canvas.style.width = `${width}px`;
    ctx.canvas.style.height = `${height}px`;

    // calculate pixel offsets to center the virtual 1024x1024 box
    const offsetX = ((width - size) / 2) * dpr;
    const offsetY = ((height - size) / 2) * dpr;

    // apply transformation matrix
    ctx.setTransform(
      scale * dpr,  // Horizontal scale
      0,            // Horizontal skew
      0,            // Vertical skew
      scale * dpr,  // Vertical scale
      offsetX,      // X Translation (Centered)
      offsetY       // Y Translation (Centered)
    );

    const extraWidthFactor = (width - size) / size;   // > 0 in landscape
    const extraHeightFactor = (height - size) / size; // > 0 in portrait

    // translate physical screen edges backward
    this.virtualMinX = 0 - (extraWidthFactor * baseScale / 2);
    this.virtualMaxX = baseScale + (extraWidthFactor * baseScale / 2);
    this.virtualMinY = 0 - (extraHeightFactor * baseScale / 2);
    this.virtualMaxY = baseScale + (extraHeightFactor * baseScale / 2);

    // console.log('virtualMinX:', this.virtualMinX, '   virtualMaxX:', this.virtualMaxX, '   virtualMinY:', this.virtualMinY, '   virtualMaxY:', this.virtualMaxY);

    if (!this.hasInitializedOffset && this.device === 'laptop') {
      const menuWidth = 500; // Side menu size
      
      const physicalShiftX = menuWidth / 2;
      this.panX = -(physicalShiftX / scale);
      
      this.hasInitializedOffset = true;
    }

    // force render to stop flickering during resize
    this.render(performance.now());
  }

  public updateConfig(
    colorsActive: boolean,
    strokeOpacity: number,
    debugState: debugState
  ) {
    this.colorsActive = colorsActive;
    this.strokeOpacity = strokeOpacity;
    this.debugState = debugState;
  }

  //================================================//
  //          Canvas Animation Controllers          //
  //================================================//

  private startLoop() {
    if (this.rafId) return;
    const tick = (timestamp: number) => {
      this.update(timestamp);
      this.render(timestamp);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private update(ts: number) {
    const { selectedPiece } = this;

    this.neighborPieces = [];

    if (!selectedPiece) {
      this.neighborPiecesAnim.startTime = null;
      this.neighborPiecesAnim.progress = 0;
      return;
    }

    const anim = this.neighborPiecesAnim;

    if (anim.startTime === null) {
      anim.startTime = ts;
    }

    const elapsed = ts - anim.startTime;

    // Loops forever between 0 and 1
    const cycleProgress = (elapsed % anim.duration) / anim.duration;

    // 0 → 1 → 0 during each cycle
    const breathProgress =
      cycleProgress <= 0.5
        ? cycleProgress * 2
        : (1 - cycleProgress) * 2;

    anim.progress = easeInOut(breathProgress, 3);
  }

  private render(ts: number) {
    const { width, height, dpr, ctx, meshPieces, debugState, buffersData, DEBUG_COLORS } = this;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width * dpr, height * dpr);
    this.applyCameraTransform();
    
    const len = meshPieces.length;
    for (let i = 0; i < len; i++) {
      const piece = meshPieces[i];
      const isHovered = piece === this.hoveredPiece;
      const isSelected = piece === this.selectedPiece;
      let isNeighbor = false;
      if (debugState.neighbors) {
        if (this.selectedPiece?.neighbors.find((p) => p === piece.triangleIndex))
          isNeighbor = true;
      }

      this.drawTrianglePath(piece);

      // Compute base colors
      const { h, s, l } = !this.colorsActive 
        ? { h: 0, s: 0, l: 100 } 
        : (debugState.clipRegions && DEBUG_COLORS[piece.state]) || piece.color as PolyColorHSLA;

      const baseAlpha = (debugState.clipRegions && DEBUG_COLORS[piece.state]?.a) ?? piece.color.a;
      const opa = !debugState.enableDebug ? this.triOpacity : (debugState.clipRegions ? baseAlpha : 0.6);

      let fillStyle;
      let strStyle = `rgba(53, 53, 53, ${this.strokeOpacity})`;

      if (isSelected) {
        fillStyle = `hsla(${h}, ${s * 1.35}%, ${l * 1.25}%, 1)`;
        strStyle = `rgba(255, 255, 255, 0.6)`;
      }
      else if (isNeighbor) {
        const { progress } = this.neighborPiecesAnim;

        const strS = 1 + progress * 0.4;
        const strL = 1 + progress * 0.2;
        const opaStr = 1 + progress * 0.2;

        fillStyle = `hsla(${h}, ${s * strS}%, ${l * strL}%, ${(opa || 0) * opaStr})`;
      }
      else if (isHovered) {
        fillStyle = `hsla(${h}, ${s * 1.35}%, ${l * 1.25}%, ${opa})`;
      }
      else {
        fillStyle = `hsla(${h}, ${s}%, ${l}%, ${opa})`;
      }

      
      ctx.lineWidth = 1;
      ctx.strokeStyle = strStyle;
      

      // ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opa})`;
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.stroke();

      

      if (debugState.centroids) {
        ctx.beginPath();
        ctx.fillStyle = '#ffffffbf'; // rgba(255, 0, 0, 0.75)
        ctx.arc(piece.centroid.x, piece.centroid.y, 1 / this.zoom * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      
    }

    // render buffers...
    if (debugState.innerBuffer) {
      this.drawBufferRings(buffersData.map(b => b.innerBfrPts), 'rgba(255, 0, 0, 0.7)');
    }

    if (debugState.outerBuffer) {
      this.drawBufferRings(buffersData.map(b => b.outerBfrPts), 'rgba(0, 0, 255, 0.7)');
    }
  }

  public destroy() {
    const canvas = this.canvasElement;
    this.ctx.canvas.width = 0;
    this.ctx.canvas.height = 0;

    // window.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("wheel", this.handleWheel);
    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerup", this.handlePointerUp);


    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  //================================================//
  //           Handlers and Pointer Events          //
  //================================================//

  private initPointerHandlers() {
    const canvas = this.canvasElement;
    
    canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerup", this.handlePointerUp);
  }

  public handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect = this.ctx.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const size = Math.min(this.width, this.height);
    const baseScale = size / 1024;
    const baseOffsetX = (this.width - size) / 2;
    const baseOffsetY = (this.height - size) / 2;

    const virtualMouseX = (mouseX - baseOffsetX) / baseScale;
    const virtualMouseY = (mouseY - baseOffsetY) / baseScale;

    const worldX = (virtualMouseX - this.panX) / this.zoom;
    const worldY = (virtualMouseY - this.panY) / this.zoom;

    const zoomFactor = 1.1;
    const nextZoom = e.deltaY < 0 ? this.zoom * zoomFactor : this.zoom / zoomFactor;
    
    this.zoom = Math.max(0.5, Math.min(10, nextZoom));

    this.panX = virtualMouseX - worldX * this.zoom;
    this.panY = virtualMouseY - worldY * this.zoom;
  }

  public handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return; // Only left click
    this.activePointers.push(e);

    if (this.activePointers.length === 1) {
      this.isDragging = true;
      this.lastMidX = e.clientX;
      this.lastMidY = e.clientY;
      this.setSelectedPiece(e);
    } else if (this.activePointers.length === 2) {
      this.isDragging = false; // Turn off single-finger rules
      
      const p1 = this.activePointers[0];
      const p2 = this.activePointers[1];
      
      // Set up our initial dynamic baselines
      this.lastPinchDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      this.lastMidX = (p1.clientX + p2.clientX) / 2;
      this.lastMidY = (p1.clientY + p2.clientY) / 2;
    }
  }

  public handlePointerMove = (e: PointerEvent) => {
    const index = this.activePointers.findIndex(p => p.pointerId === e.pointerId);
    if (index !== -1) {
      this.activePointers[index] = e;
    }

    const size = Math.min(this.width, this.height);
    const baseScale = size / 1024;

    // --- CASE 1: LIVE SINGLE POINTER PANNING ---
    if (this.activePointers.length === 1 && this.isDragging) {
      const dx = e.clientX - this.lastMidX;
      const dy = e.clientY - this.lastMidY;

      this.panX += dx / baseScale;
      this.panY += dy / baseScale;

      this.lastMidX = e.clientX;
      this.lastMidY = e.clientY;

      return;
    } 
    // --- CASE 2: LIVE SIMULTANEOUS PINCH-ZOOM & PANNING ---
    else if (this.activePointers.length === 2) {
      const p1 = this.activePointers[0];
      const p2 = this.activePointers[1];

      const currentDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const currentMidX = (p1.clientX + p2.clientX) / 2;
      const currentMidY = (p1.clientY + p2.clientY) / 2;

      if (this.lastPinchDist === 0) return;

      const rect = this.ctx.canvas.getBoundingClientRect();
      const canvasMidX = currentMidX - rect.left;
      const canvasMidY = currentMidY - rect.top;

      const baseOffsetX = (this.width - size) / 2;
      const baseOffsetY = (this.height - size) / 2;

      const virtualMidX = (canvasMidX - baseOffsetX) / baseScale;
      const virtualMidY = (canvasMidY - baseOffsetY) / baseScale;

      const worldX = (virtualMidX - this.panX) / this.zoom;
      const worldY = (virtualMidY - this.panY) / this.zoom;

      const deltaScaleFactor = currentDist / this.lastPinchDist;
      this.zoom = Math.max(0.5, Math.min(10, this.zoom * deltaScaleFactor));

      const dragDx = currentMidX - this.lastMidX;
      const dragDy = currentMidY - this.lastMidY;

      this.panX = (virtualMidX - worldX * this.zoom) + (dragDx / baseScale);
      this.panY = (virtualMidY - worldY * this.zoom) + (dragDy / baseScale);

      this.lastPinchDist = currentDist;
      this.lastMidX = currentMidX;
      this.lastMidY = currentMidY;

      return;
    }

    this.checkHoveredPiece(e);
  }

  public handlePointerUp = (e: PointerEvent) => {
    this.activePointers = this.activePointers.filter((p) => p.pointerId !== e.pointerId);

    if (this.activePointers.length === 0) {
      this.isDragging = false;
      this.lastPinchDist = 0;
    } else if (this.activePointers.length === 1) {
      this.isDragging = true;
      const remaining = this.activePointers[0];
      this.lastMidX = remaining.clientX;
      this.lastMidY = remaining.clientY;
      this.lastPinchDist = 0;
    }
  }

  private checkHoveredPiece(e: PointerEvent) {
    const canvas = this.canvasElement;
    const { worldX, worldY } = this.getWorldCoords(e);

    this.hoveredPiece = null;

    // Search backwards so we highlight top-layered pieces first
    for (let i = this.meshPieces.length - 1; i >= 0; i--) {
      const piece = this.meshPieces[i];
      const { minX, maxX, minY, maxY } = piece.bbox;

      // Stage 1: Ultra-fast Bounding Box check
      if (worldX < minX || worldX > maxX || worldY < minY || worldY > maxY) {
        continue;
      }

      // Stage 2: Precise mathematical point-in-polygon ray-casting test
      if (this.isPointInPolygon(worldX, worldY, piece.points)) {
        canvas.style.cursor = `pointer`;
        this.hoveredPiece = piece;
        break; 
      } else {
        canvas.style.cursor = `auto`;
      }
    }
  }

  private setSelectedPiece(e: PointerEvent) {
    const { worldX, worldY } = this.getWorldCoords(e);

    // reset the selected piece and neighbors first
    this.selectedPiece = null;
    this.neighborPieces = [];
    this.neighborPiecesAnim = { ...this.neighborPiecesAnim, startTime: null, progress: 0 };

    // Search backwards so we highlight top-layered pieces first
    for (let i = this.meshPieces.length - 1; i >= 0; i--) {
      const piece = this.meshPieces[i];
      const { minX, maxX, minY, maxY } = piece.bbox;

      // Stage 1: Ultra-fast Bounding Box check
      if (worldX < minX || worldX > maxX || worldY < minY || worldY > maxY) {
        continue;
      }

      // Stage 2: Precise mathematical point-in-polygon ray-casting test
      if (this.isPointInPolygon(worldX, worldY, piece.points)) {
        this.selectedPiece = piece;
        break; 
      }
    }
  }

  private getWorldCoords(e: PointerEvent) {
    const { width, height, dpr, baseScale, zoom, panX, panY } = this;

    // 1. Calculate the aspect ratio scale and offsets exactly like handleResize
    const size = Math.min(width, height);
    const scale = size / baseScale;
    const offsetX = ((width - size) / 2) * dpr;
    const offsetY = ((height - size) / 2) * dpr;

    // 2. Convert CSS client coordinates to raw canvas buffer pixels
    const canvasX = e.offsetX * dpr;
    const canvasY = e.offsetY * dpr;

    // 3. Un-center: Subtract the initial letterboxing offsets
    const baseScaledX = canvasX - offsetX;
    const baseScaledY = canvasY - offsetY;

    // 4. Un-scale: Divide by the base aspect-ratio scale factoring the DPR
    const virtualCanvasX = baseScaledX / (scale * dpr);
    const virtualCanvasY = baseScaledY / (scale * dpr);

    // 5. Un-pan and Un-zoom: Account for camera pan (panX/panY) and camera zoom (zoom)
    // Assuming your camera application translates by panX/panY and then multiplies by zoom:
    return {
      worldX: (virtualCanvasX - panX) / zoom,
      worldY: (virtualCanvasY - panY) / zoom
    }
  }

  //================================================//
  //                 Camera Controls                //
  //================================================//

  public applyCameraTransform() {
    const { width, height, dpr, ctx, zoom, panX, panY } = this;
    const size = Math.min(width, height);
    const baseScale = size / 1024;

    const baseOffsetX = ((width - size) / 2) * dpr;
    const baseOffsetY = ((height - size) / 2) * dpr;

    // 1. Reset matrix to identity
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 2. Apply your existing responsive centering
    ctx.translate(baseOffsetX, baseOffsetY);
    ctx.scale(baseScale * dpr, baseScale * dpr);

    // 3. Apply the user's custom Pan and Zoom
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);
  }

  //================================================//
  //                 Draw Functions                 //
  //================================================//

  private drawTrianglePath(tri: MeshPiece) {
    const ctx = this.ctx;
    const points = tri.points;
    const pLen = points.length;

    ctx.beginPath();

    for (let i = 0; i < pLen; i++) {
      const pt = points[i];

      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }

    ctx.closePath();
  }

  private drawBufferRings(rings: Point[][], color: string) {
    const ctx = this.ctx;
    const ringsLength = rings.length;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < ringsLength; i++) {
      const points = rings[i];
      const pointsLength = points.length;
      
      if (pointsLength === 0) continue;

      // Move to the start of this specific ring
      ctx.moveTo(points[0].x, points[0].y);

      // Draw the remaining lines for this ring
      for (let j = 1; j < pointsLength; j++) {
        ctx.lineTo(points[j].x, points[j].y);
      }
      
      // Close the path for this sub-ring
      ctx.closePath();
    }

    // One single draw call for all rings of this color
    ctx.stroke();
  }

  private isPointInPolygon(x: number, y: number, points: Point[]): boolean {
    let inside = false;
    const len = points.length;
    
    for (let i = 0, j = len - 1; i < len; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          
      if (intersect) inside = !inside;
    }
    
    return inside;
  }
}