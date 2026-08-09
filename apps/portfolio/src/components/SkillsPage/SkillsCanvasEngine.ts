import { Clipper, type Path64 } from "clipper2-ts";
import { path64ToPathD } from "../../mesh/meshCore";
import { loadMeshAsync } from "../../mesh/getMesh";
import type { DeviceTypes } from "../../types/DeviceTypes";
import type { sectionProps, sectionsTypes } from "../../types/SectionsTypes";
import type { Theme } from "../../contexts/theme-context/ThemeContext";
import darkCodeImg from "../../assets/pages/skills-page/web/code-dark.svg";
import lightCodeImg from "../../assets/pages/skills-page/web/code-light.svg";
import pacmanCircles from "../../assets/pages/skills-page/game/pacman-circles.svg";
import { 
  RAW_SECTIONS_BLUEPRINT,
  PACMAN_EATABLE_DOTS, 
  PACMAN_BARRIERS, 
  PACMAN_PATH_DATA, 
  ALT_PACMAN_PATH_DATA, 
  GHOSTS_DATA, 
  BRUSH_STROKES,  
  type AnimationPhase,
  type GhostDataType,
  type BrushStrokeType, 
} from "./SkillsStaticData";
import easeInOut from "../../utilities/easeInOut";
import easeOut from "../../utilities/easeOut";
import clamp from "../../utilities/clamp";


export class SkillsCanvasEngine {
  // Core DOM References and Contexts
  private mainCtx: CanvasRenderingContext2D;
  private uiCtx: CanvasRenderingContext2D;
  private glowCtx: CanvasRenderingContext2D;

  // Off-screen canvases contexts
  private webBfrCtx = document.createElement("canvas").getContext("2d")!;
  private webAnimCtx = document.createElement("canvas").getContext("2d")!;
  private gameBfrCtx = document.createElement("canvas").getContext("2d")!;
  private gameAnimCtx = document.createElement("canvas").getContext("2d")!;
  private designAnimCtx = document.createElement("canvas").getContext("2d")!;
  private brushStrCtx = document.createElement("canvas").getContext("2d")!;
  private uiStrCtx = document.createElement("canvas").getContext("2d")!;
  private triAnimCtx = document.createElement("canvas").getContext("2d")!;
  private txtCtx = document.createElement("canvas").getContext("2d")!;
  private txtMaskCtx = document.createElement("canvas").getContext("2d")!;

  // Initialization flag
  private isInitialized = false;

  // Image Buffers
  private webImg = new Image();
  private gameImg = new Image();

  // Engine Physics & Layout States
  private width = 0;
  private height = 0;
  private baseScale = 1024;
  private dpr = 1;
  private rawDpr = 1;
  private theme: Theme = "dark";
  private device: DeviceTypes = "laptop";
  private pointerPos = { x: 0, y: 0 };
  private lastPolygonId: string | null = null;
  private isAnimLock = false;
  private inView = false;
  private activeSection: sectionsTypes | null = null;
  private combinedPath = new Path2D();
  private triggerUIDraw = true;

  // Callback reference for React click event
  private onSectionClickCallback: (e: PointerEvent, id: sectionsTypes, onComplete: () => void) => void;

  // Styling variables (default dark theme)
  private fontColor = "#e6e6e6";
  private fontStrokeColor = "#363636";
  private polyFillColor = "#363636";
  private solidBGColor = "#3f3f3f";
  private bgOpacity = 0;
  private fontSize = 50;

  // Timelines & States
  private phase: AnimationPhase = 'reveal';
  private revealProps = { startTime: null as number | null, duration: 3250, progress: 0 };
  private openCloseProps = { state: 'close' as 'open' | 'close', isRunning: false, startTime: null as number | null, duration: 550, progress: 0 };
  private glowProgress = 0;
  private meshProgress = 0;
  private textProgress = 0;

  // Live Configuration Map
  private liveSections: Record<sectionsTypes, sectionProps>;
  private sectionKeys: sectionsTypes[] = ['web', 'game', 'design'];
  private meshInitialized = false;
  private rafId: number | null = null;

  //====================================================================
  //
  //                     Constructor & Initializers
  //
  //====================================================================

  constructor(
    mainCanvas: HTMLCanvasElement,
    uiCanvas: HTMLCanvasElement,
    glowCanvas: HTMLCanvasElement,
    activeSection: sectionsTypes | null,
    sectionClickEvent: (e: PointerEvent, id: sectionsTypes, onComplete: () => void) => void,
    deviceOptions: { dpr: number; rawDpr: number; theme: Theme; device: DeviceTypes; }
  ) {
    this.liveSections = {} as Record<sectionsTypes, sectionProps>;
    
    this.mainCtx = mainCanvas.getContext("2d")!;
    this.uiCtx = uiCanvas.getContext("2d")!;
    this.glowCtx = glowCanvas.getContext("2d")!;
    
    this.activeSection = activeSection;

    this.onSectionClickCallback = sectionClickEvent;

    this.dpr = deviceOptions.dpr;
    this.rawDpr = deviceOptions.rawDpr;
    this.theme = deviceOptions.theme;
    this.device = deviceOptions.device;

    this.initLiveSectionsMap();
    this.updateStyles();
    this.initEngineLifecycle();
    this.initPointerHandlers();
  }

  // Initialize live section data map based on the static data blueprint
  private initLiveSectionsMap() {
    for (const [id, config] of Object.entries(RAW_SECTIONS_BLUEPRINT)) {
      this.liveSections[id as sectionsTypes] = {
        ...config,
        polygonPath: new Path2D(),
        pathD: "",
        centroid: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        textMetr: { width: 0, height: 0 },
        isHovered: false,
        animStart: false,
        startTime: null,
        mesh: [],
        fontSize: 0,
        revealRad: 0,
      };
    }
  }

  private async initEngineLifecycle() {
    try {
      await this.loadImages();
      
      // Initialize dimensions and paint the buffers
      this.initBufferDimensions();
      this.rebuildWebBuffer();
      this.rebuildGameBuffer();

      this.isInitialized = true;

      this.startLoop();
    } catch (error) {
      console.error("Canvas Engine: Initialization failed:", error);
    }
  }

  private async loadImages(): Promise<void> {
    const webLoad = new Promise<void>((resolve, reject) => {
      this.webImg.onload = () => resolve();
      this.webImg.onerror = () => reject(new Error("Web image failed"));
    });

    const gameLoad = new Promise<void>((resolve, reject) => {
      this.gameImg.onload = () => resolve();
      this.gameImg.onerror = () => reject(new Error("Game image failed"));
    });

    this.webImg.src = this.theme === "dark" ? darkCodeImg : lightCodeImg;
    this.gameImg.src = pacmanCircles;

    await Promise.all([webLoad, gameLoad]);
  }

  private initBufferDimensions() {
    const scale = this.baseScale;
    const { dpr, webBfrCtx, webAnimCtx, gameBfrCtx, gameAnimCtx, designAnimCtx, brushStrCtx } = this;

    webBfrCtx.canvas.width = scale * dpr;
    webBfrCtx.canvas.height = scale * dpr;
    webBfrCtx.scale(dpr, dpr);

    webAnimCtx.canvas.width = scale * dpr;
    webAnimCtx.canvas.height = scale * dpr;

    gameBfrCtx.canvas.width = scale * dpr;
    gameBfrCtx.canvas.height = scale * dpr;
    gameBfrCtx.scale(dpr, dpr);

    gameAnimCtx.canvas.width = scale * dpr;
    gameAnimCtx.canvas.height = scale * dpr;

    designAnimCtx.canvas.width = scale * dpr;
    designAnimCtx.canvas.height = scale * dpr;

    brushStrCtx.canvas.width = scale;
    brushStrCtx.canvas.height = scale;
  }

  private rebuildWebBuffer() {
    const size = this.baseScale; 
    const angle = (-7 * Math.PI) / 180;
    const ctx = this.webBfrCtx;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    
    // Move origin to center, rotate, and stamp the image
    ctx.translate(size / 2, size / 2);
    ctx.rotate(angle);
    ctx.drawImage(this.webImg, -size / 2, -size / 2, size, size);
    
    ctx.restore();
  }

  private rebuildGameBuffer() {
    const size = this.baseScale;
    const ctx = this.gameBfrCtx;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.drawImage(this.gameImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  private updateStyles() {
    if (this.theme === 'dark') {
      this.fontColor = "#e6e6e6";
      this.fontStrokeColor = "#363636";
      this.polyFillColor = "#3f3f3f";
      this.solidBGColor = "#3f3f3f";
    } else {
      this.fontColor = "#353535";
      this.fontStrokeColor = "#efefef";
      this.polyFillColor = "#fff";
      this.solidBGColor = "#fff";
    }
  }

  private async updateImages() {
    await new Promise<void>((resolve, reject) => {
      this.webImg.onload = () => resolve();
      this.webImg.onerror = () => reject(new Error("Updating web image failed"));
      
      this.webImg.src = this.theme === "dark" ? darkCodeImg : lightCodeImg;
    });
  }

  private async checkAndTriggerMeshWorker() {
    // Trigger mesh init ONCE on mount
    if (this.meshInitialized) return;
    this.meshInitialized = true;

    console.log("Canvas Engine: Distributing mesh triangulation to Web Worker...");

    try {
      // Create a promise array for our 3 unique layout configurations
      const meshPromises = Object.values(this.liveSections).map((sec: sectionProps) => {
        return loadMeshAsync({
          id: `${sec.id}poly`,
          paths: [sec.pathD],
          width: sec.dimensions.width,
          height: sec.dimensions.height,
          userStep: this.device === 'mobile' ? 0.35 : 0.5, // this.device === "laptop" ? 0.5 : this.device === 'tablet' ? 0.375 : 0.25,
          offsetMultiplier: 3,
        });
      });

      // Await all background worker threads to finish processing..
      const [webPieces, gamePieces, designPieces] = await Promise.all(meshPromises);

      this.liveSections.web.mesh = webPieces;
      this.liveSections.game.mesh = gamePieces;
      this.liveSections.design.mesh = designPieces;
      
      console.log("Canvas Engine: All polygon mesh pieces successfully generated!");

    } catch (error) {
      console.error("Canvas Engine: Mesh worker generation failed:", error);
    }
  }

  //====================================================================
  //
  //                        React State Triggers
  //
  //====================================================================

  public updateDevice(newDevice: DeviceTypes) {
    this.device = newDevice;
  }

  public async updateTheme(newTheme: "dark" | "light") {
    if (this.theme === newTheme) return;
    
    this.theme = newTheme;
    this.updateStyles();

    if (!this.isInitialized) return;
    
    await this.updateImages();
    this.rebuildWebBuffer();

    this.triggerUIDraw = true;
  }

  public updateInView(inView: boolean) {
    this.inView = inView;
  }

  public handleReactSectionClose() {
    if (this.phase === 'reveal') return;

    this.openCloseProps.state = "close";
    this.openCloseProps.isRunning = true;
  }

  public handleResize(newWidth: number, newHeight: number) {
    this.width = newWidth;
    this.height = newHeight;

    const { 
      width, height, dpr, rawDpr, // values
      mainCtx, uiCtx, glowCtx, // DOM elements
      uiStrCtx, triAnimCtx, txtCtx, txtMaskCtx // off-screen
    } = this;

    // Direct Canvas DOM resizing
    mainCtx.canvas.width = width * dpr;
    mainCtx.canvas.height = height * dpr;
    mainCtx.canvas.style.width = `${width}px`;
    mainCtx.canvas.style.height = `${height}px`;

    uiCtx.canvas.width = width * rawDpr;
    uiCtx.canvas.height = height * rawDpr;
    uiCtx.canvas.style.width = `${width}px`;
    uiCtx.canvas.style.height = `${height}px`;

    glowCtx.canvas.width = width;
    glowCtx.canvas.height = height;
    glowCtx.canvas.style.width = `${width}px`;
    glowCtx.canvas.style.height = `${height}px`;

    uiStrCtx.canvas.width = width * rawDpr;
    uiStrCtx.canvas.height = height * rawDpr;

    triAnimCtx.canvas.width = width * dpr;
    triAnimCtx.canvas.height = height * dpr;

    txtCtx.canvas.width = width * rawDpr;
    txtCtx.canvas.height = height * rawDpr;

    txtMaskCtx.canvas.width = width;
    txtMaskCtx.canvas.height = height;

    mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    uiCtx.setTransform(rawDpr, 0, 0, rawDpr, 0, 0);
    triAnimCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    txtCtx.setTransform(rawDpr, 0, 0, rawDpr, 0, 0);
    uiStrCtx.setTransform(rawDpr, 0, 0, rawDpr, 0, 0);

    this.recalculateClipperGeometry();

    this.triggerUIDraw = true;

    // force draw to fix the skipped frames on resize
    if (this.phase !== 'reveal') this.render(performance.now());
    
    // Trigger Mesh init AFTER clipping. This will run once!
    this.checkAndTriggerMeshWorker();
  }

  private recalculateClipperGeometry() {
    this.combinedPath = new Path2D();

    const { width, height, dpr, baseScale, combinedPath } = this;
    const clipRect = { left: 0, top: 0, right: width, bottom: height };

    const vw = width / 100;
    const isLandscape = width > height;

    this.fontSize = clamp((isLandscape ? 25 : 10) + vw * 1.2, 25, 50);

    // --- SCALE ---
    let scaleX: number;
    let scaleY: number;

    if (isLandscape) {
      // stretch to fill
      scaleX = width / baseScale;
      scaleY = height / baseScale;
    } else {
      // portrait → uniform scale based on height
      const uniformScale = height / baseScale;
      scaleX = uniformScale;
      scaleY = uniformScale;
    }

    // --- CENTERING (in base space) ---
    const scaledWidth = baseScale * scaleX;
    const scaledHeight = baseScale * scaleY;

    let offsetX = (width - scaledWidth) / 2 / scaleX;
    const offsetY = (height - scaledHeight) / 2 / scaleY;

    // --- sligth custom shift for portrait ---
    if (!isLandscape) {
      offsetX += Math.abs(width - height) / (50 / dpr) / scaleX;
    }

    for (let i = 0; i < this.sectionKeys.length; i++) {
      const section = this.liveSections[this.sectionKeys[i]];

      const transformedPoints = section.points.map(p => ({
        x: (p.x + offsetX) * scaleX,
        y: (p.y + offsetY) * scaleY,
      }));

      const clippedPath = Clipper.rectClip(clipRect, transformedPoints)[0];
      const resultPathD = path64ToPathD(clippedPath);
      const resultPath2D = new Path2D(resultPathD);
      const polyDims = this.calculateDimensions(clippedPath);
      const polyCentroid = this.getPolygonCentroid(clippedPath);
      
      const dxMax = Math.max(polyCentroid.x, polyDims.width - polyCentroid.x); // width
      const dyMax = Math.max(polyCentroid.y, polyDims.height - polyCentroid.y); // height
      const revealRad = Math.hypot(dxMax, dyMax);

      section.centroid = polyCentroid;

      section.pathD = resultPathD;
      section.polygonPath = resultPath2D;
      combinedPath.addPath(resultPath2D);

      section.dimensions = polyDims;
      section.revealRad = revealRad;

      // set polygon UI font size
      this.setSectionTextMetrics(section);
    }
  }

  //====================================================================
  //
  //                     Canvas Animation Controllers
  //
  //====================================================================

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
    const { isRunning, duration, state } = this.openCloseProps;

    // Track open/close timeline
    if (isRunning) {
      if (this.openCloseProps.startTime === null) {
        this.openCloseProps.startTime = ts;
      }
      const elapsed = ts - this.openCloseProps.startTime;
      
      // Calculate progress and apply timming
      const progress = Math.min(elapsed / duration, 1);
      this.openCloseProps.progress = easeInOut(progress, 3);

      // Handle the end of the animation
      if (this.openCloseProps.progress === 1) {
        this.openCloseProps.isRunning = false;
        this.openCloseProps.startTime = null;

        if (state === 'close') this.phase = 'default';
      }
    }

    // Track reveal timelines
    if ((this.phase === 'reveal' && this.inView) || this.revealProps.startTime) {
      if (this.revealProps.startTime === null) {
        this.revealProps.startTime = ts;
      }
      const elapsed = ts - this.revealProps.startTime;
      const progress = Math.min(elapsed / this.revealProps.duration, 1);
      this.revealProps.progress = easeOut(progress, 3);
      
      // Transition to 'default' state
      if (this.revealProps.progress === 1) {
        this.phase = 'default';
        this.triggerUIDraw = true;
      }
    }

    this.calculateBgOpacity();
    
    // Calculate specific sub-component steps
    if (this.phase === 'reveal') {
      this.glowProgress = this.getAnimProgress(this.revealProps.progress, 0, 0.8);
      this.meshProgress = this.getAnimProgress(this.revealProps.progress, 0.4, 1);
      this.textProgress = this.getAnimProgress(this.revealProps.progress, 0.5, 0.8);
    }
  }

  private render(ts: number) {
    const { width, height, phase, openCloseProps, solidBGColor, bgOpacity, liveSections } = this;
    
    this.mainCtx.clearRect(0, 0, width, height);
    this.glowCtx.clearRect(0, 0, width, height);

    if (openCloseProps.state === 'open' && openCloseProps.startTime === null) return;

    // Background base rendering
    if (phase === 'reveal') {
      this.mainCtx.fillStyle = solidBGColor;
      this.mainCtx.fillRect(0, 0, width, height);
    }

    // Render the overlaying gradient background using the pre-calculated opacity
    const bgGradient = this.mainCtx.createLinearGradient(0, height, width, 0);
    bgGradient.addColorStop(0, `rgba(157, 122, 255, ${bgOpacity})`);
    bgGradient.addColorStop(0.45, `rgba(255, 185, 157, ${bgOpacity})`);
    bgGradient.addColorStop(0.55, `rgba(255, 219, 187, ${bgOpacity})`);
    this.mainCtx.fillStyle = bgGradient;
    this.mainCtx.fillRect(0, 0, width, height);

    // Reveal phase
    if (phase === 'reveal') {
      this.uiCtx.clearRect(0, 0, width, height);
      
      this.drawRevealGlow(this.glowProgress);
      this.drawPolygonMeshPieces(this.meshProgress);
      this.drawTextWipeReveal(this.textProgress);
    }

    // Default phase or open/close phase
    const progress = openCloseProps.progress;
    
    // Draw the structural polygons
    this.drawPolygon(liveSections.web, progress, () => this.drawWebImage(liveSections.web, ts));
    this.drawPolygon(liveSections.game, progress, () => this.drawGameImage(liveSections.game, ts));
    this.drawPolygon(liveSections.design, progress, () => this.drawDesignImage(liveSections.design, ts));

    if (this.triggerUIDraw) {
      this.drawUIPolygons();
      this.triggerUIDraw = false;
    }

    if (openCloseProps.isRunning) {
      this.drawUIPolygons(progress);
    }
    
    this.drawGlowPipeline();
  }

  public destroy() {
    // Explicit garbage removal for safety
    const canvas = this.uiCtx.canvas;
    
    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerenter", this.handlePointerEnter);
    canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    
    if (this.rafId) cancelAnimationFrame(this.rafId);

    const offscreens = [
      this.mainCtx, this.uiCtx, this.glowCtx,
      this.webBfrCtx, this.webAnimCtx, this.gameBfrCtx, this.gameAnimCtx,
      this.designAnimCtx, this.brushStrCtx, this.uiStrCtx, this.triAnimCtx,
      this.txtCtx, this.txtMaskCtx
    ];

    offscreens.forEach(ctx => {
      ctx.canvas.width = 0;
      ctx.canvas.height = 0;
    });
  }

  //====================================================================
  //
  //                    Handlers and Pointer Events
  //
  //====================================================================

  private initPointerHandlers() {
    const canvas = this.uiCtx.canvas;

    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerenter", this.handlePointerEnter);
    canvas.addEventListener("pointerleave", this.handlePointerLeave);
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (this.phase !== "default") return;
    if (e.button !== 0) return; // Only left click
    
    const { rawDpr, uiCtx } = this;
    
    uiCtx.canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    
    // Map screen click position to canvas coordinate space
    const rect = uiCtx.canvas.getBoundingClientRect();
    const posX = (e.clientX - rect.left) * rawDpr;
    const posY = (e.clientY - rect.top) * rawDpr;

    for (let i = 0; i < this.sectionKeys.length; i++) {
      const section = this.liveSections[this.sectionKeys[i]];

      if (uiCtx.isPointInPath(section.polygonPath, posX, posY)) {
        this.onSectionClickCallback(e, section.id, () => {
          this.phase = "openClose";
          this.openCloseProps.state = "open";
          this.openCloseProps.isRunning = true;

          section.isHovered = false;
        });

        this.lastPolygonId = section.id;
        break;
      }
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    this.evaluatePolygonIntersections(e);
  };

  private handlePointerEnter = (e: PointerEvent) => {
    this.evaluatePolygonIntersections(e);
  };

  private evaluatePolygonIntersections(e: PointerEvent) {
    const { pointerPos, rawDpr, uiCtx } = this;

    const rect = uiCtx.canvas.getBoundingClientRect();
    const posX = (e.clientX - rect.left) * rawDpr;
    const posY = (e.clientY - rect.top) * rawDpr;

    if (this.phase !== "reveal") {
      pointerPos.x = posX / rawDpr;
      pointerPos.y = posY / rawDpr;
    }

    let isCursorOverAnyPolygon = false;

    for (let i = 0; i < this.sectionKeys.length; i++) {
      const section = this.liveSections[this.sectionKeys[i]];

      if (this.uiCtx.isPointInPath(section.polygonPath, posX, posY)) {
        uiCtx.canvas.style.cursor = "pointer";
        isCursorOverAnyPolygon = true;

        if (this.lastPolygonId !== section.id) {
          this.isAnimLock = false;
          this.lastPolygonId = section.id;
        }

        section.isHovered = true;

        // Trigger individual section animation
        if (!section.animStart && !this.isAnimLock) {
          section.animStart = true;
          section.startTime = null;
          this.isAnimLock = true;
        }
      } else {
        section.isHovered = false;
      }
    }

    if (!isCursorOverAnyPolygon) {
      this.clearPolygonHoverStates();
    }
  }

  private handlePointerLeave = () => {
    for (let i = 0; i < this.sectionKeys.length; i++) {
      const section = this.liveSections[this.sectionKeys[i]];

      section.isHovered = false;
    }
    this.clearPolygonHoverStates();
  };

  private clearPolygonHoverStates() {
    this.isAnimLock = false;
    this.uiCtx.canvas.style.cursor = "default";
  }

  //====================================================================
  //
  //                           Draw Functions
  //
  //====================================================================

  //            --------------------------------------------
  //            -           Default Animations             -
  //            --------------------------------------------

  private drawPolygon (props: sectionProps, progress: number, drawImage: () => void) {
    const ctx = this.mainCtx;
    const { phase, theme, activeSection, polyFillColor } = this;
    const { isRunning, state } = this.openCloseProps;
    const { polygonPath, isHovered, shiftPercentage, dimensions: { width, height } } = props;

    const offsetX = shiftPercentage.x * width;
    const offsetY = shiftPercentage.y * height;

    let shiftX = 0;
    let shiftY = 0;
    
    // open/close animation
    if (state === "open" && isRunning) {
      shiftX = offsetX * progress;
      shiftY = offsetY * progress;
    } else if (state === "close" && isRunning) {
      shiftX = offsetX * (1 - progress);
      shiftY = offsetY * (1 - progress);
    }

    ctx.save();

    ctx.translate(shiftX, shiftY);

    // set fill color hovered or not
    if (isHovered && phase !== 'reveal') ctx.fillStyle = theme === "dark" ? "#363636" : "#f9f9f9";
    else ctx.fillStyle = polyFillColor;

    // fill and clip sections polygons
    ctx.fill(polygonPath);
    ctx.clip(polygonPath);

    // draw the animation image
    if (!isRunning && !activeSection && phase === 'default') drawImage();

    ctx.restore();
  }

  private drawUIPolygons (progress: number = 1) {
    const { device, theme, phase, width, height, fontSize, uiCtx, txtCtx, uiStrCtx } = this;
    const { isRunning, state } = this.openCloseProps;

    uiCtx.clearRect(0, 0, width, height);
    txtCtx.clearRect(0, 0, width, height);
    uiStrCtx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.sectionKeys.length; i++) {
      const props = this.liveSections[this.sectionKeys[i]];

      const path = props.polygonPath;
      const isPortrait = width < height;

      const fontStrokeWidth = fontSize / 30;

      const drawX = props.centroid.x;
      const drawY = props.centroid.y;

      // -----------------------
      // COMPUTE SHIFT
      // -----------------------
      const offsetX = props.shiftPercentage.x * width;
      const offsetY = props.shiftPercentage.y * height;

      let shiftX = 0;
      let shiftY = 0;

      if (state === "open" && isRunning) {
        shiftX = offsetX * progress;
        shiftY = offsetY * progress;
      } else if (state === "close" && isRunning) {
        shiftX = offsetX * (1 - progress);
        shiftY = offsetY * (1 - progress);
      }

      // -----------------------
      // Text DRAWING
      // -----------------------
      txtCtx.font = `${props.fontStyle} ${fontSize}px ${props.fontFamily}`
      txtCtx.fillStyle = this.fontColor;
      txtCtx.strokeStyle = theme === "dark" ? "#252525" : "#00000017";

      txtCtx.lineWidth = fontStrokeWidth * 3;
      txtCtx.lineJoin = "round";
      txtCtx.textAlign = "center";
      txtCtx.textBaseline = "middle";

      txtCtx.save();
      txtCtx.translate(drawX, drawY);

      if (isPortrait) {
        txtCtx.rotate((285 * Math.PI) / 180);
      }

      txtCtx.strokeText(props.name, 0, 0);
      txtCtx.fillText(props.name, 0, 0);

      txtCtx.restore();

      // polygon stroke
      if (phase !== 'reveal') {
        txtCtx.lineWidth = 6;
        txtCtx.strokeStyle = this.fontStrokeColor;
        txtCtx.stroke(path);
      }
      
      txtCtx.restore();

      // -----------------------
      // UI DRAWING
      // -----------------------
      uiCtx.save();

      // re-apply transform for open/close animation 
      uiCtx.translate(shiftX, shiftY);

      uiCtx.clip(path);
      
      if (phase !== 'reveal') uiCtx.drawImage(txtCtx.canvas, 0, 0, width, height);

      uiCtx.restore();

      // -----------------------
      // UI STROKES MASK
      // -----------------------
      uiStrCtx.save();

      uiStrCtx.translate(shiftX, shiftY);

      // per-polygon clip (replaces combinedPath)
      uiStrCtx.clip(path);

      // polygon stroke mask
      uiStrCtx.strokeStyle = "white";
      uiStrCtx.lineWidth = 4;
      uiStrCtx.stroke(path);

      // text stroke mask
      if (phase !== 'reveal' && device === 'laptop') {
        uiStrCtx.font = `${props.fontStyle} ${fontSize}px ${props.fontFamily}`
        uiStrCtx.lineJoin = "round";
        uiStrCtx.textAlign = "center";
        uiStrCtx.textBaseline = "middle";
  
        uiStrCtx.lineWidth = fontStrokeWidth + fontStrokeWidth / fontSize;
  
        uiStrCtx.save();
        uiStrCtx.translate(drawX, drawY);
  
        if (isPortrait) {
          uiStrCtx.rotate((285 * Math.PI) / 180);
        }
  
        uiStrCtx.strokeText(props.name, 0, 0);
  
        uiStrCtx.restore();
      }
      
      uiStrCtx.restore();
    }
  };

  private drawGlowPipeline () {
    const { phase, pointerPos, width, height, rawDpr, glowCtx: ctx } = this;

    if (phase !== 'reveal') {
      const glowGradient = ctx.createRadialGradient(
        pointerPos.x,
        pointerPos.y,
        0,
        pointerPos.x,
        pointerPos.y,
        750 / rawDpr,
      );

      glowGradient.addColorStop(0, "rgba(255, 215, 150, 1)");
      glowGradient.addColorStop(0.35, "rgba(235, 192, 106, 0.5)");
      glowGradient.addColorStop(0.7, "rgba(255, 215, 150, 0)");

      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.globalCompositeOperation = "destination-in";

    ctx.drawImage(
      this.uiStrCtx.canvas,
      0,
      0,
      width,
      height,
    );

    ctx.globalCompositeOperation = "source-over";
  }

  //            --------------------------------------------
  //            -             Reveal Animation             -
  //            --------------------------------------------

  private drawRevealGlow (progress: number) {
    const { width, height, fontStrokeColor, glowCtx: ctx } = this;
    const cx = width / 2;
    const cy = height / 2;

    const radius = Math.max(width, height) * progress;

    const glowGradient = ctx.createRadialGradient(
      cx,
      cy,
      radius * (progress / 1.5),
      cx,
      cy,
      radius
    );

    glowGradient.addColorStop(0, fontStrokeColor);
    glowGradient.addColorStop(0.5, "rgba(255, 215, 150, 1)");
    glowGradient.addColorStop(1, "rgba(255, 215, 150, 0)");

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
  }

  private drawPolygonMeshPieces (progress: number) {
    const { device, theme, width, height, triAnimCtx: ctx, uiCtx } = this;

    // clear canvas from last frame
    ctx.clearRect(0, 0, width, height);

    // Define how wide the wave band is in pixels
    const waveWidth = 
      device === 'mobile' ? 250 : 
      device === 'tablet' ? 375 : 500;
    
    for (let i = 0; i < this.sectionKeys.length; i++) {
      const section = this.liveSections[this.sectionKeys[i]];

      const { centroid: { x: originX, y: originY }, mesh, revealRad, polygonPath } = section;

      ctx.save();
      
      ctx.clip(polygonPath);

      // Add waveWidth to the original radius to ensure the trailing edge completely clears the furthest corner at progress = 1
      const currentRadius = progress * (revealRad + waveWidth);
      
      for (const p of mesh) {
        // Get pixel distance from origin to this triangle's center
        const dx = p.centroid.x - originX;
        const dy = p.centroid.y - originY;
        const distance = Math.hypot(dx, dy);

        // color defaults to rgb(255, 215, 150)
        const bgBase = theme === 'dark' ? 63 : 255;
        const baseR = 255;
        const baseG = 215;
        const baseB = 150;

        // Calculate local piece progress based on the wave position
        const localProgress = (currentRadius - distance) / waveWidth;
        
        // Determine Scale and Color using the local progress value
        let scale = 0;
        let fillColor = "rgb(255, 255, 255)"; 

        if (localProgress < 0) {
          // Wave hasn't reached this centroid yet
          scale = 0; 
          fillColor = "rgb(255, 255, 255)";
        } else if (localProgress >= 0 && localProgress <= 1) {
          // Wave is currently passing over this triangle
          // Scale scales up quickly and "pops" slightly up to 1.1
          scale = localProgress * 1.1;

          if (localProgress < 0.5) {
            // Transitioning mesh color from white to selected color (approaching)
            const pFactor = localProgress / 0.5; 
            const r = baseR;
            const g = Math.round(255 + (baseG - 255) * pFactor);
            const b = Math.round(255 + (baseB - 255) * pFactor);
            fillColor = `rgb(${r}, ${g}, ${b})`;
          } else {
            // Transitioning mesh color to bg base color
            const pFactor = (localProgress - 0.5) / 0.5; 
            const r = Math.round(baseR + (bgBase - baseR) * pFactor);
            const g = Math.round(baseG + (bgBase - baseG) * pFactor);
            const b = Math.round(baseB + (bgBase - baseB) * pFactor);
            fillColor = `rgb(${r}, ${g}, ${b})`;
          }
        } else {
          // Wave has completely passed this triangle
          scale = 1.0;
          fillColor = `rgb(${bgBase}, ${bgBase}, ${bgBase})`;
        }

        if (scale <= 0) continue; 

        ctx.save(); 
        
        ctx.translate(p.centroid.x, p.centroid.y);
        ctx.scale(scale, scale);
        ctx.translate(-p.centroid.x, -p.centroid.y);

        ctx.beginPath();
        p.points.forEach((pt, i) =>
          i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)
        );
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = this.solidBGColor;
        ctx.lineWidth = 2;
        
        ctx.fill();
        ctx.stroke();

        ctx.restore(); 
      }

      ctx.restore(); 
    }

    uiCtx.drawImage(ctx.canvas, 0, 0, width, height);
  }
  
  private drawTextWipeReveal (progress: number) {
    const { width, height, fontSize, uiCtx, txtCtx, txtMaskCtx } = this;
    const isPortrait = width < height;
    const rotationAngle = (285 * Math.PI) / 180;

    for (let i = 0; i < this.sectionKeys.length; i++) {
      const props = this.liveSections[this.sectionKeys[i]];

      uiCtx.save();
      uiCtx.clip(props.polygonPath); // Keep everything within polygon section path

      // Core metrics & timeline setup
      const wordWidth = props.textMetr.width;
      const wordHeight = props.textMetr.height;
      const wordProgress = progress;

      const localStartX = -wordWidth / 2;
      const localStartY = -wordHeight / 2;
      const revealWidth = wordWidth * easeInOut(wordProgress, 3);

      txtMaskCtx.clearRect(0, 0, width, height);

      // --------------------------------------------------
      // DRAW THE TEXT ON THE MASK CANVAS (WITH ROTATION)
      // --------------------------------------------------
      txtMaskCtx.save();

      txtMaskCtx.translate(props.centroid.x, props.centroid.y);
      if (isPortrait) txtMaskCtx.rotate(rotationAngle);

      txtMaskCtx.font = `${props.fontStyle} ${fontSize}px ${props.fontFamily}`
      txtMaskCtx.textAlign = "center";
      txtMaskCtx.textBaseline = "middle";
      txtMaskCtx.lineWidth = fontSize / 10;
      txtMaskCtx.lineJoin = "round";
      txtMaskCtx.strokeStyle = "#fff";
      txtMaskCtx.fillStyle = "#fff";

      txtMaskCtx.strokeText(props.name, 0, 0);
      txtMaskCtx.fillText(props.name, 0, 0);

      txtMaskCtx.restore();


      // --------------------------------------------------
      // SLICE THE GLARE GRADIENT (WITH MATCHED ROTATION)
      // --------------------------------------------------
      txtMaskCtx.save();
      txtMaskCtx.translate(props.centroid.x, props.centroid.y);
      if (isPortrait) txtMaskCtx.rotate(rotationAngle);

      txtMaskCtx.globalCompositeOperation = "source-in";

      const glareWidth = wordWidth * 0.6;
      const localGlareStartX = localStartX - glareWidth + ((wordWidth + glareWidth) * wordProgress);

      const glareGrad = txtMaskCtx.createLinearGradient(localGlareStartX, 0, localGlareStartX + glareWidth, 0);

      glareGrad.addColorStop(0, `rgba(255, 255, 255, 0.3)`);
      glareGrad.addColorStop(0.199, `rgba(255, 255, 255, 0.3)`);
      glareGrad.addColorStop(0.2, `rgba(255, 255, 255, 0.6)`);
      glareGrad.addColorStop(0.399, `rgba(255, 255, 255, 0.6)`);
      glareGrad.addColorStop(0.4, `rgba(255, 255, 255, 1)`);
      glareGrad.addColorStop(0.6, `rgba(255, 255, 255, 1)`);
      glareGrad.addColorStop(0.601, `rgba(255, 255, 255, 0.6)`);
      glareGrad.addColorStop(0.8, `rgba(255, 255, 255, 0.6)`);
      glareGrad.addColorStop(0.801, `rgba(255, 255, 255, 0.3)`);
      glareGrad.addColorStop(1, `rgba(255, 255, 255, 0.3)`);

      txtMaskCtx.fillStyle = glareGrad;
      txtMaskCtx.fillRect(localGlareStartX, localStartY, glareWidth, wordHeight);

      txtMaskCtx.restore();


      // ----------------------------------------------------
      // DRAW ON MAIN ON-SCREEN CANVAS (WITH SAME ROTATION)
      // ----------------------------------------------------
      uiCtx.save();

      uiCtx.translate(props.centroid.x, props.centroid.y);
      if (isPortrait) uiCtx.rotate(rotationAngle);

      uiCtx.beginPath();
      uiCtx.rect(localStartX, localStartY, revealWidth, wordHeight);
      uiCtx.clip();

      uiCtx.save();

      if (isPortrait) uiCtx.rotate(-rotationAngle);
      uiCtx.translate(-props.centroid.x, -props.centroid.y);

      uiCtx.drawImage(txtCtx.canvas, 0, 0, width, height);
      uiCtx.drawImage(txtMaskCtx.canvas, 0, 0, width, height);

      uiCtx.restore();
      uiCtx.restore();
      uiCtx.restore();
    }
  }

  //            --------------------------------------------
  //            -              Web Animation               -
  //            --------------------------------------------

  private drawWebImage (props: sectionProps, timestamp: number) {
    if (!props.animStart && props.startTime === null) return;

    const { width, height, baseScale, dpr, mainCtx: ctx } = this;

    if (props.startTime === null) {
      props.animStart = false;
      props.startTime = timestamp;
    }

    // animation progress calculation
    const elapsed = timestamp - props.startTime;
    let progress = Math.min(elapsed / props.animDuration, 1);
    progress = easeOut(progress, 2.5);

    // compute size based on HEIGHT
    const minHeight = baseScale / dpr;

    // square image based on height (clamped)
    const drawSize = Math.max(height, minHeight);

    const drawX = -(drawSize / 2) + props.centroid.x;
    const drawY = -(drawSize / 2) + props.centroid.y;

    const mOffset = (30 * drawSize) / width;
    const centerX = drawX + drawSize / 2 + mOffset;
    const centerY = drawY + drawSize / 2 + mOffset;

    const scale = 1;

    ctx.save();

    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // draw animation progress
    this.drawWebAnimation(progress, drawSize);

    ctx.drawImage(
      this.webAnimCtx.canvas,
      0,
      0,
      baseScale,
      baseScale,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize,
    );

    ctx.restore();

    if (progress === 1) {
      props.startTime = null;
    }
  }

  private drawWebAnimation (progress: number, drawSize: number) {
    const { baseScale, webAnimCtx: ctx } = this;

    ctx.clearRect(0, 0, baseScale, baseScale);

    this.drawWebRippleMask(progress, drawSize);

    ctx.save();

    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(this.webBfrCtx.canvas, 0, 0, baseScale, baseScale);
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();
  }

  private drawWebRippleMask (progress: number, drawSize: number) {
    const ctx = this.webAnimCtx;
    const cx = drawSize;
    const cy = drawSize / 2;
    const radius = drawSize * progress * 3.5;

    const gradient = ctx.createRadialGradient(
      cx,
      cy,
      radius * 0.3,
      cx,
      cy,
      radius
    );

    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.5, "rgba(255,255,255,1)");
    gradient.addColorStop(0.8, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  //            --------------------------------------------
  //            -              Game Animation              -
  //            --------------------------------------------

  private drawGameImage (props: sectionProps, timestamp: number) {
    if (!props.animStart && props.startTime === null) return;

    const { width, height, baseScale, mainCtx: ctx } = this;

    if (props.startTime === null) {
      props.animStart = false;
      props.startTime = timestamp;

      // Reset dots
      PACMAN_EATABLE_DOTS.map((dot) => (dot.eaten = false));

      // Randomize ghosts
      const ofs = [0.1, 0.125, 0.15, 0.175].sort(() => Math.random() - 0.5);

      for (const ghost of GHOSTS_DATA) {
        ghost.offset = ofs[ghost.id];
        ghost.direction = Math.random() < 0.5 ? -1 : 1;
      }
    }

    // animation progress calculation
    const elapsed = timestamp - props.startTime;
    const progress = Math.min(elapsed / props.animDuration, 1);

    const minHeight = 650;

    // square image based on height (clamped)
    const drawSize = Math.max(height, minHeight);

    const drawX = -(drawSize / 2) + props.centroid.x;
    const drawY = -(drawSize / 2) + props.centroid.y;

    const centerX = drawX + drawSize / 2;
    const centerY = drawY + drawSize / 2;

    const scale = clamp(0.85 * (width / drawSize), 0.65, 1.1);

    ctx.save();

    ctx.translate(centerX, centerY);

    ctx.scale(scale, scale);

    if (height > width) {
      ctx.rotate((285 * Math.PI) / 180);
    }

    // draw animation progress
    this.drawGameAnimation(progress);

    ctx.drawImage(
      this.gameAnimCtx.canvas,
      0,
      0,
      baseScale,
      baseScale,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize,
    );

    ctx.restore();

    if (progress === 1) {
      props.startTime = null;
    }
  }

  private drawGameAnimation (progress: number) {
    const { baseScale, gameAnimCtx: ctx } = this;

    let circlesOpacity = this.getTimelineState(progress, 0.1, 0.925, 0.1, 0.1);
    circlesOpacity = easeInOut(circlesOpacity, 3);

    // clear previous frame
    ctx.clearRect(0, 0, baseScale, baseScale);

    ctx.save();

    ctx.globalAlpha = circlesOpacity;

    // draw other circles
    ctx.drawImage(this.gameBfrCtx.canvas, 0, 0, baseScale, baseScale);

    // draw eatable circles
    for (const dot of PACMAN_EATABLE_DOTS) {
      if (progress > dot.pathDist) continue;

      ctx.beginPath();
      ctx.arc(dot.pos.x, dot.pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffce5d";
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // draw barriers
    let bbScaleFactor = this.getTimelineState(progress, 0.05, 1, 0.1, 0.1);
    bbScaleFactor = easeInOut(bbScaleFactor, 3);

    for (const barrier of PACMAN_BARRIERS) {
      ctx.save();

      ctx.translate(barrier.pos.x, barrier.pos.y);
      ctx.scale(bbScaleFactor, bbScaleFactor);
      ctx.translate(-barrier.pos.x, -barrier.pos.y);

      ctx.strokeStyle = `rgba(255, 170, 93, ${bbScaleFactor})`;
      ctx.lineWidth = 3.19;
      ctx.stroke(barrier.path);

      ctx.restore();
    }

    let pacGhostsSF = this.getTimelineState(progress, 0, 1, 0.175, 0.15);
    pacGhostsSF = easeInOut(pacGhostsSF, 3);

    // draw pacman
    this.drawPacman(progress, pacGhostsSF);

    // draw ghosts
    for (const ghost of GHOSTS_DATA) {
      this.drawGhost(ghost, progress, pacGhostsSF);
    }

    ctx.restore();
  }

  private drawPacman (progress: number, fadeFactor: number) {
    const ctx = this.gameAnimCtx;

    const pacmanR = 10;
    const mouthSpeed = 75;

    const cx = pacmanR;
    const cy = 512 - pacmanR / 2;

    const maxMouth = (35 * Math.PI) / 180;

    const t = Math.sin(progress * mouthSpeed);
    const mouth = Math.pow(Math.abs(t), 0.7) * maxMouth;

    const offsetX = -pacmanR * 0.3; // sligth shift in centroid x
    const offsetY = 0;

    const { x, y } = this.getPositionAtProgress(progress, PACMAN_PATH_DATA);
    const angle = this.getDirectionAtProgress(progress, PACMAN_PATH_DATA);

    const posX = cx + x;
    const posY = cy + y;

    ctx.save();

    ctx.translate(posX, posY);
    ctx.rotate(angle);
    ctx.scale(fadeFactor, fadeFactor);

    ctx.beginPath();

    ctx.moveTo(offsetX, offsetY);

    ctx.arc(0, 0, pacmanR, mouth, Math.PI * 2 - mouth);

    ctx.closePath();
    ctx.fillStyle = `rgb(254, 237, 1, ${fadeFactor})`;
    ctx.fill();

    ctx.restore();
  }

  private drawGhost (ghost: GhostDataType, progress: number, scaleFactor: number) {
    const ctx = this.gameAnimCtx;
    const { color, direction, path, offset } = ghost;
    const ghostWidth = 15;
    const ghostHeight = -35;

    const altDirection = direction === -1 ? true : false;

    const cx = ghostWidth;
    const cy = ghostHeight / 2;

    const { x, y } = this.getPositionAtProgress(
      progress - offset,
      altDirection ? ALT_PACMAN_PATH_DATA : PACMAN_PATH_DATA,
    );
    const angle = this.getDirectionAtProgress(
      progress - offset,
      altDirection ? ALT_PACMAN_PATH_DATA : PACMAN_PATH_DATA,
    );

    ctx.save();

    ctx.translate(cx + x, 512 + cy + y);
    ctx.scale(scaleFactor, scaleFactor);

    // BODY
    ctx.fillStyle = color(scaleFactor);
    ctx.fill(path);

    // EYES
    this.drawEyes(angle);

    ctx.restore();
  }

  private drawEyes (angle: number) {
    const ctx = this.gameAnimCtx;

    const eyeOffsetX = Math.cos(angle) * 1.5;
    const eyeOffsetY = Math.sin(angle) * 1.5;
    const eyeR = 3.5;
    const pupilR = 1.75;
    const posX = 5;
    const posY = 9;

    // left eye
    ctx.beginPath();
    ctx.arc(-posX, posY, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      -posX + eyeOffsetX,
      posY + eyeOffsetY,
      pupilR,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#201fff";
    ctx.fill();

    // right eye
    ctx.beginPath();
    ctx.arc(posX, posY, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      posX + eyeOffsetX,
      posY + eyeOffsetY,
      pupilR,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#201fff";
    ctx.fill();
  }

  //            --------------------------------------------
  //            -             Design Animation             -
  //            --------------------------------------------

  private drawDesignImage (props: sectionProps, timestamp: number) {
    if (!props.animStart && props.startTime === null) return;

    const { width, height, baseScale, mainCtx: ctx } = this;

    if (props.startTime === null) {
      props.animStart = false;
      props.startTime = timestamp;
    }

    // animation progress calculation
    const elapsed = timestamp - props.startTime;
    const progress = Math.min(elapsed / props.animDuration, 1);

    const minHeight = 650;

    // square image based on height (clamped)
    const drawSize = Math.max(height, minHeight);

    const drawX = -(drawSize / 2) + props.centroid.x;
    const drawY = -(drawSize / 2) + props.centroid.y;

    const centerX = drawX + drawSize / 2;
    const centerY = drawY + drawSize / 2;

    const scale = clamp(0.85 * (width / drawSize), 0.6, 1.05);

    ctx.save();

    ctx.translate(centerX, centerY);

    ctx.scale(scale, scale);

    if (height > width) {
      ctx.rotate((285 * Math.PI) / 180);
    }

    // draw animation progress
    this.drawDesignAnimation(progress);

    ctx.drawImage(
      this.designAnimCtx.canvas,
      0,
      0,
      baseScale,
      baseScale,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize,
    );

    ctx.restore();

    if (progress === 1) {
      props.startTime = null;
    }
  }

  private drawDesignAnimation (progress: number) {
    const { baseScale, designAnimCtx: ctx } = this;
    const strokeOpacity = this.getTimelineState(progress, 0, 1, 0.1, 0.1);

    ctx.clearRect(0, 0, baseScale, baseScale);

    for (const strokeProps of BRUSH_STROKES) {
      this.drawStroke(strokeProps, strokeOpacity, progress);
    }
  }

  private drawStroke (strokeProps: BrushStrokeType, strokeOpacity: number, progress: number) {
    const { theme, baseScale, brushStrCtx: ctx } = this;
    const {
      path,
      mask,
      pathLength,
      strokeWidth,
      strokeDelay,
      strokeDuration,
      color,
    } = strokeProps;
    const strOpa = (theme === "light" ? 0.6 : 0.75) * strokeOpacity;

    const localProgress = this.getAnimProgress(progress, strokeDelay, strokeDelay + strokeDuration);

    ctx.clearRect(0, 0, baseScale, baseScale);

    // draw brush
    ctx.fillStyle = color(strOpa);
    ctx.fill(path);

    // mask
    ctx.globalCompositeOperation = "destination-in";

    ctx.setLineDash([pathLength]);
    ctx.lineDashOffset = pathLength * (1 - easeOut(localProgress, 5));

    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#fff";

    ctx.stroke(mask);

    ctx.globalCompositeOperation = "source-over";

    // draw to main canvas
    this.designAnimCtx.drawImage(ctx.canvas, 0, 0);
  };

  //====================================================================
  //
  //                              Utilities
  //
  //====================================================================

  private calculateDimensions(points: Path64): { width: number; height: number; } {
    if (!points.length) return { width: 0, height: 0 };

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    return {
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private getPolygonCentroid(points: Path64): { x: number; y: number } {
    let area = 0;
    let cx = 0;
    let cy = 0;
    const n = points.length;

    if (n === 0) return { x: 0, y: 0 };

    for (let i = 0; i < n; i++) {
      const p0 = points[i];
      const p1 = points[(i + 1) % n];

      const factor = p0.x * p1.y - p1.x * p0.y;

      area += factor;
      cx += (p0.x + p1.x) * factor;
      cy += (p0.y + p1.y) * factor;
    }

    area /= 2;

    // Handle lines/points
    if (area === 0) return { x: points[0].x, y: points[0].y };

    return {
      x: cx / (6 * area),
      y: cy / (6 * area),
    };
  }

  private getPolygonVisualCentroid(points: Path64): { x: number; y: number } {
    let x = 0,
      y = 0;
    for (const p of points) {
      x += p.x;
      y += p.y;
    }
    return { x: x / points.length, y: y / points.length };
  }

  private getPositionAtProgress(
    progress: number,
    pathData: {
      segments: {
        start: {
          x: number;
          y: number;
        };
        end: {
          x: number;
          y: number;
        };
        length: number;
      }[];
      totalLength: number;
    },
  ) {
    const { segments, totalLength } = pathData;

    let distance = progress * totalLength;

    for (const seg of segments) {
      if (distance > seg.length) {
        distance -= seg.length;
      } else {
        const t = distance / seg.length;

        const x = seg.start.x + (seg.end.x - seg.start.x) * t;
        const y = seg.start.y + (seg.end.y - seg.start.y) * t;

        return { x, y };
      }
    }

    // fallback: last point
    return segments[segments.length - 1].end;
  }

  private getDirectionAtProgress(
    progress: number,
    pathData: {
      segments: {
        start: {
          x: number;
          y: number;
        };
        end: {
          x: number;
          y: number;
        };
        length: number;
      }[];
      totalLength: number;
    },
  ) {
    const { segments, totalLength } = pathData;

    let distance = progress * totalLength;

    for (const seg of segments) {
      if (distance > seg.length) {
        distance -= seg.length;
      } else {
        const dx = seg.end.x - seg.start.x;
        const dy = seg.end.y - seg.start.y;

        return Math.atan2(dy, dx);
      }
    }

    return 0;
  }

  private getAnimProgress(
    globalProgress: number, // Global timeline progress (0.0 to 1.0)
    start: number,          // Global point where anim starts (e.g., 0.25)
    end: number             // Global point where anim ends (e.g., 0.6)
  ): number {
    // If animation hasn't started yet
    if (globalProgress <= start) return 0;

    // If animation is completely finished
    if (globalProgress >= end) return 1;

    // Handle zero-duration edge case (prevents 0 / 0 -> NaN)
    // If start and end are the same, snap immediately to completion once reached
    if (start === end) return 1;

    // Map the global progress to a local 0.0 - 1.0 range
    return (globalProgress - start) / (end - start);
  }

  private getTimelineState(
    progress: number,         // Current global progress (0.0 to 1.0)
    start: number,            // Global start marker for this animation
    end: number,              // Global end marker for this animation
    fadeInDuration: number,   // Duration of fade-in (0.0 to 1.0)
    fadeOutDuration: number,  // Duration of fade-out (0.0 to 1.0)
    invert: boolean = false,  // If true, idles at 0 and flips the fade behaviors
    debug: boolean = false,   // A debug flag to print logs
  ): number {
    
    if (debug) {
      console.log('progress: ', progress,
        'start: ', start,
        'end: ', end,
        'fadeInDuration: ', fadeInDuration,
        'fadeOutDuration: ', fadeOutDuration,
        'invert: ', invert
      );
    }

    // Outside active bounds
    if (progress <= start || progress > end) return 0;
    

    // Safely calculate total active duration to prevent NaN
    const totalDuration = end - start;
    if (totalDuration <= 0) return 0;

    // Convert absolute progress into local progress (0.0 to 1.0)
    const localProgress = (progress - start) / totalDuration;

    let result = 1; // Default middle active state

    // Fade-In Window
    if (fadeInDuration > 0 && localProgress < fadeInDuration) {
      result = localProgress / fadeInDuration;
    }

    // Fade-Out Window
    const fadeOutStart = 1 - fadeOutDuration;
    if (fadeOutDuration > 0 && localProgress > fadeOutStart) {
      result = (1 - localProgress) / fadeOutDuration;
    }

    // Middle Active State
    return invert ? 1 - result : result;
  }

  private calculateBgOpacity () {
    const { phase, inView, revealProps, openCloseProps } = this;
    let opacity = 0;

    // Always fully visible if the reveal phase is complete
    if (phase !== 'reveal') {
      opacity = 1; 
    } 
    else if (inView || revealProps.startTime) {
      opacity = this.getTimelineState(revealProps.progress, 0.8, 1, 1, 0);
    } 
    
    if (openCloseProps.isRunning) {
      // open/close state animation
      opacity = openCloseProps.state === 'open'
        ? this.getTimelineState(openCloseProps.progress, 0, 0.55, 0.55, 0, true) // Fade out immediately
        : this.getTimelineState(openCloseProps.progress, 0.85, 1, 1, 0);         // Delay, then fade in
    }

    this.bgOpacity = opacity;
  }

  private setSectionTextMetrics (props: sectionProps) {
    const { fontSize, txtCtx: ctx } = this;
    const fontStrokeWidth = fontSize / 10;

    ctx.font = `${props.fontStyle} ${fontSize}px ${props.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    const meas = ctx.measureText(props.name);

    const exactWidth = meas.actualBoundingBoxLeft + meas.actualBoundingBoxRight;
    const exactHeight = meas.actualBoundingBoxAscent + meas.actualBoundingBoxDescent;

    props.textMetr = {
      width: exactWidth + fontStrokeWidth,
      height: (exactHeight + fontStrokeWidth) * 1.1 // slight extend to make sure no clipping happens
    };
  }
}