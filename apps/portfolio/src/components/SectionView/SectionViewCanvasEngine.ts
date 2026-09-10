import getMesh from "../../mesh/getMesh";
import type { Theme } from "../../contexts/theme-context/ThemeContext";
import type { MeshPiece, Point } from "../../types/MeshRegenTypes";
import type { Project } from "../../types/SectionsTypes";
import easeOut from "../../utilities/easeOut";
import clamp from "../../utilities/clamp";

type BlastConfig = {
  origin: {
    x: number;
    y: number;
  };
  radius: number;
  force: number;
}[]

type ShardPhysics = {
  // offsets
  ox: number, oy: number, oz: number,
  
  // velocity
  vx: number, vy: number, vz: number,
  
  // rotation
  rx: number, ry: number, rz: number,
  
  // angular velocity
  vrx: number, vry: number, vrz: number,

  // Cache the normalized 3D spin coordinates directly
  axisX: number, axisY: number, axisZ: number,
  
  // --- 3D DIRECTION VECTORS ---
  fX: number, fY: number, fZ: number,
  uX: number, uY: number, uZ: number,

  depthBias: number,
  spinSpeed: number,
}

type GlassPiece = MeshPiece & { withinBounds: boolean, physics: ShardPhysics };

export class SectionViewCanvasEngine {
  // declarations
  private ctx: CanvasRenderingContext2D;

  // Engine Physics & Layout States
  private width = 0;
  private height = 0;
  private virtualMinX = 0;
  private virtualMaxX = 1024;
  private virtualMinY = 0;
  private virtualMaxY = 1024;
  private dpr = 1;
  private activeProject: Project;
  private inView = false;

  // animation specific config
  // wipe animation
  private wipeAngle = 70 * Math.PI / 180;
  private wipeConfig = {
    direction: {
      x: Math.cos(this.wipeAngle),
      y: -Math.sin(this.wipeAngle),
    },
    range: { wipeStart: 0, wipeEnd: 0 },
    wipePos: 0,
    bandWidth: 300,
  };

  // shatter animation
  private blasts: BlastConfig = [
    { origin: { x: 512, y: 512 }, radius: 307.2, force: 1.0 }, // Center
    
    { origin: { x: 899, y: 774 }, radius: 512, force: 1.5 }, // Bottom Right
    { origin: { x: 899, y: 250 }, radius: 512, force: 1.5 }, // Top Right
    { origin: { x: 125, y: 250 }, radius: 512, force: 1.5 }, // Top Left
    { origin: { x: 125, y: 774 }, radius: 512, force: 1.5 },  // Bottom Left

    // { origin: { x: 0, y: 0 }, radius: 512, force: 1.5 }, // Top Left
    // { origin: { x: 0, y: 1024 }, radius: 512, force: 1.5 }, // Bottom Left
    // { origin: { x: 1024, y: 0 }, radius: 512, force: 1.5 }, // Top Right
    // { origin: { x: 1024, y: 1024 }, radius: 512, force: 1.5 }, // Bottom Right
  ]

  // switch animation
  private decayMult = 1;

  // Styling variables (default dark theme)
  private shardOpacity = 0.65;

  // Timelines & States
  private phase: 'reveal' | 'shatter' | 'switch' = 'reveal';
  private isShattered = false;
  private lastPauseTime: number | null = null;
  private globalAnimProps = { startTime: null as number | null, delay: 2000, deltaTime: 0 }
  private revealAnimProps = { startTime: null as number | null, duration: 1500, progress: 0 };
  private switchAnimProps = { startTime: null as number | null, duration: 1000, progress: 0 };
  
  // Live Configuration Map
  private logoShards: GlassPiece[];
  private rafId: number | null = null;

  //====================================================================
  //
  //                     Constructor & Initializers
  //
  //====================================================================

  constructor(
    mainCanvas: HTMLCanvasElement,
    activeProject: Project,
    dpr: number,
  ) {
    this.ctx = mainCanvas.getContext('2d')!;
    this.logoShards = [] as GlassPiece[];

    this.activeProject = activeProject;
    this.dpr = dpr;

    console.log('initiated successfully!');

    // Initialize animation
    this.initAnimationData(activeProject);

    this.startLoop();
    
    this.initPointerHandlers();
  }

  private initAnimationData(activeProject: Project, isSwitch = false) {
    const { direction, bandWidth } = this.wipeConfig;

    // reset animation progresses
    this.globalAnimProps = { startTime: null as number | null, delay: isSwitch ? 1 : 2000, deltaTime: 0 }
    this.revealAnimProps = { startTime: null as number | null, duration: 1500, progress: 0 };
    this.switchAnimProps = { startTime: null as number | null, duration: 1000, progress: 0 };
    this.isShattered = false;

    console.log(getMesh({ mesh: activeProject, type: "glass" }));

    // reset/init logo shards
    this.logoShards = getMesh({ mesh: activeProject, type: "glass" }).map((p) => ({ ...p, withinBounds: true,
      physics: {
        ox: 0, oy: 0, oz: 0,
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        vrx: 0, vry: 0, vrz: 0,
        
        // --- 3D DIRECTION VECTORS ---
        fX: 1, fY: 0, fZ: 0,
        uX: 0, uY: 1, uZ: 0,

        axisX: 0, axisY: 0, axisZ: 0,
        
        spinSpeed: 0,
        depthBias: (Math.random() - (0.5)) * 0.25,
      }
    }));

    // Reveal (wipe) animation
    this.wipeConfig.range = this.computeWipeRange(this.logoShards, direction, bandWidth);

  }

  //====================================================================
  //
  //                        React State Triggers
  //
  //====================================================================

  public updateInView(inview: boolean) {
    if (inview !== this.inView) {
      if (!inview) {
        this.lastPauseTime = performance.now();
      } else {
        if (this.lastPauseTime !== null) this.calculateMissedFrames();

        this.inView = inview;
        this.startLoop();
      }
    }
    this.inView = inview;
  }

  public updateProject(newProject: Project) {
    if (newProject === this.activeProject) return;

    this.activeProject = newProject;

    // Restart wipe/break animation
    this.phase = 'switch';
  }

  public updateTheme(newTheme: Theme) {
    // if (newTheme === this.theme) return;

    // Update render styles
    this.shardOpacity = newTheme === 'dark' ? 0.65 : 0.8;
  }

  public handleResize(newWidth: number, newHeight: number) {
    this.width = newWidth;
    this.height = newHeight;

    console.log('width: ', newWidth, 'height: ', newHeight);

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

    // force render to stop flickering during resize
    this.render();
  }

  //====================================================================
  //
  //                     Canvas Animation Controllers
  //
  //====================================================================

  private startLoop() {
    if (this.rafId) return;
    const tick = (timestamp: number) => {
      if (!this.inView) {
        this.rafId = null;
        return;
      }
       
      this.update(timestamp);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private update(ts: number) {
    const { phase } = this;
    
    if (this.globalAnimProps.startTime === null) {
      this.globalAnimProps.startTime = ts;
    }

    const { delay, startTime } = this.globalAnimProps;

    this.globalAnimProps.deltaTime = ts - startTime;

    if (this.globalAnimProps.deltaTime < delay) return;
    
    if (phase === 'reveal') {
      const { duration } = this.revealAnimProps;
      const { range: { wipeStart, wipeEnd } } = this.wipeConfig;
      
      if (this.revealAnimProps.startTime === null) {
        this.revealAnimProps.startTime = ts;
      }

      const elapsed = ts - this.revealAnimProps.startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const progress = easeOut(rawProgress, 3);
      this.revealAnimProps.progress = progress;

      // update wipe position at progress along reveal slope
      this.wipeConfig.wipePos = wipeStart + progress * (wipeEnd - wipeStart);

      if (progress >= 0.85) {
        this.phase = 'shatter';
      }
    }

    if (phase === 'switch') {
      const { duration } = this.switchAnimProps;

      if (this.switchAnimProps.startTime === null) {
        this.switchAnimProps.startTime = ts;
      }

      const elapsed = ts - this.switchAnimProps.startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const progress = easeOut(rawProgress, 3);
      this.switchAnimProps.progress = progress;

      this.decayMult = 1 - rawProgress;

      if (progress === 1) {
        this.initAnimationData(this.activeProject, true);
        this.phase = 'reveal';
      }
    }
  }

  private render() {
    if (this.globalAnimProps.deltaTime < this.globalAnimProps.delay) return;

    const { phase, ctx, logoShards, width, height, dpr, isShattered } = this;
    const { direction, bandWidth, wipePos } = this.wipeConfig;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width * dpr, height * dpr);
    ctx.restore();

    // --- REVEAL PHASE ---
    if (phase === 'reveal') {
      const len = logoShards.length;
      for (let i = 0; i < len; i++) {
        const shard = logoShards[i];
        
        const wipeAlpha = this.computeRevealAlpha(shard.centroid, wipePos, direction, bandWidth);
        if (wipeAlpha <= 0) continue;
        
        const glareAlpha = this.computeGlareAlpha(shard.centroid, wipePos, direction, bandWidth * 0.6);

        this.drawShardPath(shard, 1);

        const { r, g, b } = shard.color;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.shardOpacity * wipeAlpha})`;
        ctx.fill();
        
        if (glareAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * glareAlpha})`;
          ctx.fill();
        }
      }
    } else { // --- SHATTER / SWITCH PHASE ---
      const len = logoShards.length;
      for (let i = 0; i < len; i++) {
        const shard = logoShards[i];
        const baseScale = clamp(1 - (shard.physics.oz * 0.001), 0.9, 1.1);
        const scale = phase === 'switch' ? baseScale * this.decayMult : baseScale;
        const opa = phase === 'switch' ? scale * this.decayMult : 1;

        if (!shard.withinBounds) continue;

        // apply burst wave ONCE
        if (!isShattered) this.applyShatterForce(shard);

        this.updateShardPhysics(shard);
        this.drawShardPath(shard, scale);


        this.fillShatterShardStyle(shard, scale, opa);
      }

      if (!isShattered) this.isShattered = true;
    }
  }

  public destroy() {
    this.ctx.canvas.width = 0;
    this.ctx.canvas.height = 0;

    window.removeEventListener("pointerdown", this.handlePointerDown);

    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  //====================================================================
  //
  //                    Handlers and Pointer Events
  //
  //====================================================================

  private initPointerHandlers() {
    window.addEventListener("pointerdown", this.handlePointerDown);
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (this.phase !== "shatter") return;
    if (e.button !== 0) return; // Only left click
    
    const { ctx } = this;
    
    // Map screen click position to canvas coordinate space
    const rect = ctx.canvas.getBoundingClientRect();
    const posX = (e.clientX - rect.left);
    const posY = (e.clientY - rect.top);

    // console.log(`Canvas detected a click at X: ${posX}, Y: ${posY}`);

    this.applyClickForce({ x: posX, y: posY });
  };

  //====================================================================
  //
  //                           Draw Functions
  //
  //====================================================================

  private applyShatterForce(shard: GlassPiece) {
    for (const { origin, radius, force } of this.blasts) {
      const dx = shard.centroid.x - origin.x;
      const dy = shard.centroid.y - origin.y;
      const distance = Math.hypot(dx, dy);

      if (distance < radius) {
        this.calculateShardPhysics(shard, dx, dy, distance, radius, force, false, false);
      } else {
        this.calculateShardPhysics(shard, dx, dy, distance, radius, force, false, true);
      }
    }
  }

  private applyClickForce(clickPos: { x: number, y: number }) {
    if (!this.isShattered) return;

    const { width, height, logoShards } = this
    const size = Math.min(width, height);
    const scaleMultiplier = 1024 / size;
    
    // calculate relative offset centers
    const virtualCenterX = (clickPos.x - (width - size) / 2) * scaleMultiplier;
    const virtualCenterY = (clickPos.y - (height - size) / 2) * scaleMultiplier;

    // click burst configuration parameters
    const radius = 80 * (scaleMultiplier);
    const force = 1000;

    const len = logoShards.length;
    for (let i = 0; i < len; i++) {
      const shard = logoShards[i];

      if (!shard.withinBounds) continue;

      const dx = shard.centroid.x + shard.physics.ox - virtualCenterX;
      const dy = shard.centroid.y + shard.physics.oy - virtualCenterY;
      const distance = Math.hypot(dx, dy);

      if (distance < radius) {
        this.calculateShardPhysics(shard, dx, dy, distance, radius, force, true, false);
      }
    }
  }

  private calculateShardPhysics(
    shard: GlassPiece, 
    dx: number, 
    dy: number, 
    distance: number, 
    radius: number, 
    force: number, 
    ignoreFalloff = false,
    globalForce = false
  ) {
    const p = shard.physics;
    const depthBias = p.depthBias || 1.0;

    // calculate dropoff curves
    const t = 1 - distance / radius;
    const safeT = Math.max(0, t); // prevent negative values (fallsafe)
    const falloff = ignoreFalloff ? 1 : (safeT * safeT) * 0.5;
    const impulse = force * falloff;

    const safeDistance = Math.max(0.0001, distance);
    const invDistance = 1 / safeDistance;

    // set up direction
    const dirX = dx * invDistance;
    const dirY = dy * invDistance;
    const impulseScalar = 1 + (impulse * 0.001);

    let pushX = 0; let pushY = 0; let pushZ = 0;

    if (globalForce) {
      // ambient fallback push configurations (out of blast radius)
      pushX = invDistance * impulseScalar + (Math.random() - 0.5) * 0.1;
      pushY = invDistance * impulseScalar + (Math.random() - 0.5) * 0.1;
      pushZ = impulse * 0.4 * depthBias;
    } else {
      // punchy directional blast vector processing
      pushX = dirX * impulseScalar + (Math.random() - 0.5) * 0.1;
      pushY = dirY * impulseScalar + (Math.random() - 0.5) * 0.1;
      pushZ = impulse * 0.8 * depthBias;
    }

    // add force vectors to the shard's current velocities
    p.vx += pushX;
    p.vy += pushY;
    p.vz += pushZ;

    // update the 3D rotation axis based on the newly measured forces
    const rawAxisX = p.vy * (Math.random() - 0.5);
    const rawAxisY = p.vx * (Math.random() - 0.5);
    const rawAxisZ = (Math.random() - 0.5) * 1.5;
    const axisLen = Math.hypot(rawAxisX, rawAxisY, rawAxisZ) || 1;

    p.axisX = rawAxisX / axisLen;
    p.axisY = rawAxisY / axisLen;
    p.axisZ = rawAxisZ / axisLen;

    // update spin speed
    p.spinSpeed = Math.hypot(p.vx, p.vy) * 0.05;
  }

  private updateShardPhysics(shard: GlassPiece) {
    const p = shard.physics;
    const decay = 0.99975;

    // step positions forward
    p.ox += p.vx; p.oy += p.vy; p.oz += p.vz;

    // linear Friction Damping
    const speedSquared = (p.vx * p.vx) + (p.vy * p.vy);
    if (speedSquared > 0.015) {
      p.vx *= decay; p.vy *= decay; p.vz *= decay;
      p.spinSpeed *= decay;
    }

    const theta = p.spinSpeed;
    if (theta > 0.0001) {
      const crossFX = p.axisY * p.fZ - p.axisZ * p.fY;
      const crossFY = p.axisZ * p.fX - p.axisX * p.fZ;
      const crossFZ = p.axisX * p.fY - p.axisY * p.fX;

      const crossUX = p.axisY * p.uZ - p.axisZ * p.uY;
      const crossUY = p.axisZ * p.uX - p.axisX * p.uZ;
      const crossUZ = p.axisX * p.uY - p.axisY * p.uX;

      // apply the fast incremental rotational adjustments step
      p.fX += crossFX * theta; p.fY += crossFY * theta; p.fZ += crossFZ * theta;
      p.uX += crossUX * theta; p.uY += crossUY * theta; p.uZ += crossUZ * theta;

      // re-normalize tracking structures to maintain crisp geometric shapes
      const fLen = Math.hypot(p.fX, p.fY, p.fZ) || 1;
      p.fX /= fLen; p.fY /= fLen; p.fZ /= fLen;

      const uLen = Math.hypot(p.uX, p.uY, p.uZ) || 1;
      p.uX /= uLen; p.uY /= uLen; p.uZ /= uLen;
    }

    // responsive View Bounds Culling
    this.checkWithinScreenBounds(shard);
  }

  private drawShardPath(shard: GlassPiece, scale: number) {
    const ctx = this.ctx;
    const points = shard.points;
    const pLen = points.length;
    const p = shard.physics;
    const centroid = shard.centroid;

    ctx.beginPath();

    for (let i = 0; i < pLen; i++) {
      const pt = points[i];
      const dx = pt.x - centroid.x;
      const dy = pt.y - centroid.y;

      // 3D directional projection mapping using pure vector scales
      const rx = (dx * p.fX + dy * p.uX) * scale;
      const ry = (dx * p.fY + dy * p.uY) * scale;

      const screenX = rx + centroid.x + p.ox;
      const screenY = ry + centroid.y + p.oy;

      if (i === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    }

    ctx.closePath();
  }

  private fillShatterShardStyle(shard: GlassPiece, scale: number, opacityModif = 1) {
    const ctx = this.ctx;
    const p = shard.physics;

    // matching the old TOP-LEFT FRONT LIGHT setup: normalize({ x: -0.6, y: -0.4, z: 1 })
    const lx = -0.48507;
    const ly = -0.32338;
    const lz = 0.82; // 0.80845;

    const nx = p.fY * p.uZ - p.fZ * p.uY;
    const ny = p.fZ * p.uX - p.fX * p.uZ;
    const nz = p.fX * p.uY - p.fY * p.uX;

    const dot = nx * lx + ny * ly + nz * lz;

    const maxDot = Math.max(0, dot);
    const dot2 = maxDot * maxDot;     // power 2
    const dot4 = dot2 * dot2;         // power 4
    const dot8 = dot4 * dot4;         // power 8
    const glare = dot8 * dot4 * dot2; // power 14

    let { r, g, b } = shard.color;

    if (glare > 0.02) {
      const boost = glare * 1.5;
      r += clamp(255 * boost, 0, 255);
      g += clamp(255 * boost, 0, 255);
      b += clamp(255 * boost, 0, 255);
    }

    const localOpacity = this.shardOpacity * opacityModif * (scale * 0.9);
    
    ctx.fillStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${localOpacity})`;
    ctx.fill();
  }

  //====================================================================
  //
  //                              Utilities
  //
  //====================================================================

  private computeWipeRange(mesh: MeshPiece[], wipeDir: Point, bandWidth: number) {
    let minPoint = Infinity;  // Earliest point on the axis
    let maxPoint = -Infinity; // Latest point on the axis

    for (const piece of mesh) {
      for (const vert of piece.points) {
        // Find where this vertex sits along the wipe direction axis
        const positionOnAxis = this.getPositionAlongAxis(vert, wipeDir);
        
        minPoint = Math.min(minPoint, positionOnAxis);
        maxPoint = Math.max(maxPoint, positionOnAxis);
      }
    }

    return {
      // take into account the width of the band to make sure it fully exits
      wipeStart: minPoint - bandWidth, 
      wipeEnd: maxPoint + bandWidth 
    };
  }

  private getPositionAlongAxis(point: Point, axisDirection: Point): number {
    // Calculates the dot product to project a point onto a directional vector
    return (point.x * axisDirection.x) + (point.y * axisDirection.y);
  }

  private computeRevealAlpha(pos: Point, wipePos: number, dir: Point, bandWidth: number) {
    const posOnAxis = this.getPositionAlongAxis(pos, dir);
    const posDelta = wipePos - posOnAxis;

    // positive => fully revealed
    if (posDelta >= bandWidth) return 1;

    // negative => fully hidden
    if (posDelta <= 0) return 0;

    // smooth fade
    return posDelta / bandWidth;
  }

  private computeGlareAlpha(pos: Point, wipePos: number,  wipeDir: Point, bandWidth: number) {
    const posOnAxis = this.getPositionAlongAxis(pos, wipeDir);

    const posDelta = Math.abs(posOnAxis - wipePos);

    if (posDelta > bandWidth) return 0;

    const t = 1 - posDelta / bandWidth; // 0 → 1

    return t * t; // soften falloff
  }

  private calculateMissedFrames() {
    const totalTimeAsleep = performance.now() - this.lastPauseTime!;
        
    // Calculate the exact number of missed frames (1 frame ≈ 16.67ms)
    const missedFrames = Math.floor(totalTimeAsleep / 16.67);

    if (missedFrames > 0) {
      this.fastForwardPhysics(missedFrames);
    }

    this.lastPauseTime = null;
  }

  private fastForwardPhysics(missedFrames: number) {
    const len = this.logoShards.length;
    const decay = 0.99975;

    const velDampMult = Math.pow(decay, missedFrames);
    const DistanceMult = (1 - velDampMult) * 4000;

    for (let i = 0; i < len; i++) {
      const shard = this.logoShards[i];
      const p = shard.physics;

      if (!shard.withinBounds) continue;

      p.ox += p.vx * DistanceMult;
      p.oy += p.vy * DistanceMult;
      p.oz += p.vz * DistanceMult;

      p.vx *= velDampMult;
      p.vy *= velDampMult;
      p.vz *= velDampMult;
      p.spinSpeed *= velDampMult;

      // responsive View Bounds Culling Check
      this.checkWithinScreenBounds(shard);
    }
  }

  private checkWithinScreenBounds(shard: GlassPiece) {
    const p = shard.physics;
    
    const safetyRadius = 50;
    const currentX = shard.centroid.x + p.ox;
    const currentY = shard.centroid.y + p.oy;

    if (
      currentX < this.virtualMinX - safetyRadius || 
      currentX > this.virtualMaxX + safetyRadius ||
      currentY < this.virtualMinY - safetyRadius || 
      currentY > this.virtualMaxY + safetyRadius
    ) {
      shard.withinBounds = false;
    }
  }
}