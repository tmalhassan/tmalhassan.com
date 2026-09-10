import type { debugState } from "../types/DebugToolTypes";
import type { DeviceTypes } from "../types/DeviceTypes";
import type { MeshPiece } from "../types/MeshRegenTypes";

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

  private activePointers: PointerEvent[] = [];
  private isDragging = false;
  private lastMidX = 0;
  private lastMidY = 0;
  private lastPinchDist = 0;

  // Render Props
  private triOpacity = 1;

  // Live Configuration Map
  private meshPieces: MeshPiece[];
  private debugData: string[];
  private debugTools: debugState;
  private rafId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    device: DeviceTypes,
    dpr: number,
    meshPices: MeshPiece[],
    debugData: string[],
    debugTools: debugState,
  ) {
    this.canvasElement = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.device = device;
    this.dpr = dpr;
    this.meshPieces = meshPices;
    this.debugData = debugData;
    this.debugTools = debugTools;

    // initialize pointer events
    this.initPointerHandlers();

    // initialize loop
    this.startLoop();
  }
  
  public updateMeshData(meshPieces: MeshPiece[], debugData: string[]) {
    this.meshPieces = meshPieces;
    this.debugData = debugData;
  }

  //================================================//
  //              React State Triggers              //
  //================================================//

  public handleResize(newWidth: number, newHeight: number) {
    this.width = newWidth;
    this.height = newHeight;

    // console.log('width: ', newWidth, 'height: ', newHeight);

    const { width, height, dpr, ctx } = this;

    // calculate aspect-ratio scale based on a 1024x1024 virtual box
    const size = Math.min(width, height);
    const scale = size / 1024;

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
    this.virtualMinX = 0 - (extraWidthFactor * 512);
    this.virtualMaxX = 1024 + (extraWidthFactor * 512);
    this.virtualMinY = 0 - (extraHeightFactor * 512);
    this.virtualMaxY = 1024 + (extraHeightFactor * 512);

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
    
  }

  private render(ts: number) {
    const { width, height, dpr, ctx, meshPieces } = this;
    
    // ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width * dpr, height * dpr);
    this.applyCameraTransform();
    // ctx.restore();
    
    const len = meshPieces.length;
    // console.log('drawing', len, 'triangles');
    for (let i = 0; i < len; i++) {
      const piece = meshPieces[i];

      this.drawTrianglePath(piece);

      const { r, g, b } = piece.color;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.triOpacity})`;
      ctx.strokeStyle = '#35353576';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fill();
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

  // private handlePointerDown = (e: PointerEvent) => {
  //   if (e.button !== 0) return; // Only left click
    
  //   const { ctx } = this;
    
  //   // Map screen click position to canvas coordinate space
  //   const rect = ctx.canvas.getBoundingClientRect();
  //   const posX = (e.clientX - rect.left);
  //   const posY = (e.clientY - rect.top);

  //   // console.log(`Canvas detected a click at X: ${posX}, Y: ${posY}`);


  // };

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
    const index = this.activePointers.findIndex((p) => p.pointerId === e.pointerId);
    if (index === -1) return;
    this.activePointers[index] = e;

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
    }
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

  //================================================//
  //                 Draw Functions                 //
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

  // private drawTrianglePath(tri: MeshPiece) {
  //   const ctx = this.ctx;
  //   const points = tri.points;
  //   const pLen = points.length;
  //   const centroid = tri.centroid;

  //   ctx.beginPath();

  //   for (let i = 0; i < pLen; i++) {
  //     const pt = points[i];
  //     const dx = pt.x - centroid.x;
  //     const dy = pt.y - centroid.y;

  //     const rx = (dx + dy);
  //     const ry = (dx + dy);

  //     const screenX = rx + centroid.x;
  //     const screenY = ry + centroid.y;

  //     if (i === 0) ctx.moveTo(screenX, screenY);
  //     else ctx.lineTo(screenX, screenY);
  //   }

  //   ctx.closePath();
  // }

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

  // private drawTrianglePath (piece: MeshPiece) {
  //   const ctx = this.ctx;

  //   // Use a standard index loop here for a minor micro-optimization over forEach
  //   const points = piece.points;
  //   if (points.length === 0) return;

  //   ctx.moveTo(points[0].x, points[0].y);
  //   for (let i = 1; i < points.length; i++) {
  //     ctx.lineTo(points[i].x, points[i].y);
  //   }

  //   ctx.closePath();
  // }
}