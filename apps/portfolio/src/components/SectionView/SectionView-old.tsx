import { Fragment, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { AppCategories, AppInfo, AppsList, IconFileNames, Project, sectionsTypes, SectionViewTypes } from "../../types/SectionsTypes";
import { useTheme } from '../../contexts/theme-context/useTheme';
import WebDeveloperPage from "../WebDevPage/WebDevPage.tsx";
import './SectionView.css';

import BackArrow from "../SVGs/BackArrow";
import GlassGlareButton from "../GlassGlareButton/GlassGlareButton.tsx";
import useImagesReady from "../../hooks/useImagesReady.tsx";
import getMesh from "../../mesh/getMesh";
import type { GeneratedMesh, MeshPiece, MeshRegenType, Point } from "../../types/MeshRegenTypes.ts";
import clamp from "../../utilities/clamp.ts";
import lerp from "../../utilities/lerp.ts";
import easeInOut from "../../utilities/easeInOut.ts";

const rawIcons = import.meta.glob('../../assets/icons/*.svg', {
  eager: true,
  import: 'default'
});

const FILE_TO_TOOL_NAME: Record<IconFileNames, AppsList> = {
  'javascript': 'JavaScript',
  'html': 'HTML',
  'css': 'CSS',
  'typescript': 'TypeScript',
  'react': 'React',
  'c-sharp': 'C#',
  'unity': 'Unity',

  'nodejs': 'Node.js',
  'express': 'Express',
  'mysql': 'MySQL',
  'gamesparks': 'GameSparks',

  'multer': 'Multer',
  'sharp': 'Sharp',
  'bcrypt': 'Bcrypt',
  'cors': 'CORS',
  'axios': 'Axios',
  'immer': 'Immer',

  'adobe-illustrator': 'Illustrator',
  'adobe-photoshop': 'Photoshop',
  'adobe-after-effects': 'After Effects',
  'adobe-audition': 'Audition'
};

const TOOLBAR_CATEGORIES: Record<AppCategories, AppsList[]> = {
  'front-end': [
    'JavaScript',
    'HTML',
    'CSS',
    'TypeScript',
    'React',
    'C#',
    'Unity'
  ],
  'back-end': [
    'Node.js',
    'Express',
    'MySQL',
    'GameSparks'
  ],
  'npm packages': [
    'Multer',
    'Sharp',
    'Bcrypt',
    'CORS',
    'Axios',
    'Immer'
  ],
  design: [
    'Illustrator',
    'Photoshop',
    'Audition',
    'After Effects'
  ]
} as const;

const FULL_APPS_INFO = Object.fromEntries(
  Object.entries(rawIcons).map(([fullPath, src]) => {
    const filename = fullPath.split('/').pop()!.replace('.svg', '') as IconFileNames;
    const appName = FILE_TO_TOOL_NAME[filename] as AppsList;

    const category = Object.entries(TOOLBAR_CATEGORIES).find(([, apps]) => apps.includes(appName))?.[0] as AppCategories;

    return [
      appName,
      {
        category,
        src: src as string,
      },
    ];
  })
) satisfies Partial<AppInfo>;


const PROJECTS_TOOLS: Record<Project | 'design', AppsList[]> = {
  alura: [
    'JavaScript',
    'HTML',
    'CSS',
    'React',
    'TypeScript',

    'Node.js',
    'MySQL',
    'Express',

    'Axios',
    'Bcrypt',
    'Immer',
    'Multer',
    'Sharp',

    'Illustrator'
  ],
  hairday: [
    'JavaScript',
    'HTML',
    'CSS',

    'Illustrator',
    'Photoshop'
  ],
  starleap: [
    'C#',
    'Unity',
    'GameSparks',

    'Node.js',

    'Photoshop',
    'Illustrator',
    'Audition',
    'After Effects'
  ],
  design: [
    'Photoshop',
    'Illustrator',
    'After Effects'
  ]
}

export default function SectionViewPage({ sectionView, ToggleSectionView }: SectionViewTypes) {
  const { theme } = useTheme();
  const [barsHidden, setBarsHidden] = useState(false);
  const [isNavBarColl, setIsNavBarColl] = useState(false);
  const [activeProject, setActiveProject] = useState<Project>("alura");
  const [usedTools, setUsedTools] = useState<{ currProject: string[], nextProject: string[] | null }>({ currProject: PROJECTS_TOOLS[activeProject], nextProject: null });
  const [projectInView, setProjectInView] = useState(false);
  // const [isActive, setIsActive] = useState(true);
  const sectionViewPageRef = useRef<HTMLDivElement | null>(null);
  const scrollEndPosRef = useRef<number>(0);
  const firstCollapseGraceRef = useRef(true);

  const SCROLL_DEADZONE = 1;

  const sectionNames = {
    web: 'Web Developer',
    game: 'Game Developer',
    design: 'Designer'
  }

  useEffect(() => {
    const sectionViewElement = sectionViewPageRef.current;

    if (!sectionViewElement) return;

    let scrollRafId: number | null = null;
    let firstCollapseTimeout: number | null = null;

    const onScroll = () => {
      if (scrollRafId) return;

      scrollRafId = requestAnimationFrame(() => {
        const scrollDis = sectionViewElement.scrollTop;

        if (!projectInView) {
          setBarsHidden(true);
        } else {
          if (firstCollapseGraceRef.current) {
            setBarsHidden(false);
            firstCollapseGraceRef.current = false;

            firstCollapseTimeout = setTimeout(() => {
              setBarsHidden(true);
              firstCollapseTimeout = null;
            }, 3500);
          }
          else if (firstCollapseTimeout === null) {
            const delta = scrollDis - scrollEndPosRef.current;

            if (Math.abs(delta) > SCROLL_DEADZONE) {
              const scrollingDown = delta > 0;
              setBarsHidden(scrollingDown);
            }
          }
        }

        setIsNavBarColl(scrollDis > 50);
        // introDiv.style.setProperty('--bg-elem-scroll', `${(clamp(0, (scrollDis / 2.5 / pageHeight), 0.2) * 100)}%`);
        // aboutMeDiv.style.setProperty('--about-me-opacity', `${(clamp(0, (scrollDis / (pageHeight / 2)), 1) * 100)}%`);

        scrollEndPosRef.current = scrollDis;
        scrollRafId = null;
      });
    };

    sectionViewElement.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      sectionViewElement.removeEventListener('scroll', onScroll);
      if (firstCollapseTimeout) clearTimeout(firstCollapseTimeout);
    }
  }, [projectInView]);

  useEffect(() => {
    // if (usedTools.currProject === PROJECTS_TOOLS[activeProject]) return;

    setUsedTools(curr => ({ ...curr, nextProject: PROJECTS_TOOLS[activeProject] }));
  }, [activeProject]);

  const handleCloseButtonClick = () => {
    ToggleSectionView({ state: false, type: null });
  };

  const handleRedirectButtonClick = () => {
    // Open a specific URL in a new tab
    let link = '';
    if (activeProject === 'alura') link = 'https://tmalhassan.me/alura';
    else if (activeProject === 'hairday') link = 'https://tmalhassan.me/hairday';
    // else if (activeProject === 'starleap') link = 'https://tmalhassan.me/alura';

    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // const getUsedTools = () => {
  //   if (sectionView === 'web') {
  //     if (activeProject === 'alura')
  //       return ['JavaScript', 'HTML', 'CSS', 'React', 'TypeScript', 'Node.js', 'MySQL', 'Express', 'Axios', 'Bcrypt', 'Immer', 'Multer', 'Sharp', 'Illustrator']
  //     else return ['JavaScript', 'HTML', 'CSS', 'Illustrator', 'Photoshop']
  //   } else if (sectionView === 'game') return ['C#', 'Unity', 'GameSparks', 'Node.js', 'Photoshop', 'Illustrator', 'Audition', 'After Effects']
  //     else return ['Photoshop', 'Illustrator', 'After Effects']
  // }

  return (
    <div className="section-view" ref={sectionViewPageRef} data-activeproj={activeProject}>
      <div className="sv-nav-bar" data-navbarstate={barsHidden && projectInView ? 'hidden' : isNavBarColl ? 'collapsed' : 'active'}>
        <button className="sv-close-button" title="Back button" onClick={handleCloseButtonClick}>
          <BackArrow stroke={theme === 'dark' ? 'white' : 'rgba(77, 77, 77, 1)'} />
          <span className="sv-section-name">{sectionView ? sectionNames[sectionView] : undefined}</span>
        </button>
        <GlassGlareButton
          textLable={activeProject === 'starleap' ? 'Download' : 'View Website'}
          buttonStyle={{ height: '35px' }}
          onClickHandler={handleRedirectButtonClick}
          willAnimate={true}
          triggerAnim={projectInView}
          animDelay={0}
        />
      </div>
      {sectionView === 'web' && <WebDeveloperPage sectionViewPageRef={sectionViewPageRef} activeProject={activeProject} setActiveProject={setActiveProject} setProjectInView={setProjectInView} />}
      <div className="filler one" />
      <div className="filler two" />
      <div className="filler three" />
      <UsedToolsBar collapseBars={barsHidden} projectInView={projectInView} usedTools={usedTools} setUsedTools={setUsedTools} activeProject={activeProject} />
    </div>
  )
}



function GameDeveloperPage() {
  return (
    <div>

    </div>
  )
}

function DesignerPage() {
  return (
    <div>

    </div>
  )
}

interface UsedToolsBarType {
  usedTools: {
    currProject: string[],
    nextProject: string[] | null
  };
  setUsedTools: Dispatch<SetStateAction<{
    currProject: string[],
    nextProject: string[] | null
  }>>;
  collapseBars: boolean;
  projectInView: boolean;
  activeProject: Project;
}

export function UsedToolsBar({ usedTools, setUsedTools, collapseBars, projectInView, activeProject }: UsedToolsBarType) {
  const { theme } = useTheme();
  // const { filteredApps, filteredPaths } = visibleApps(usedTools.currProject);
  // const [currentProject, setCurrentProject] = useState(generateAppPaths(usedTools.currProject));
  // const [nextProject, setNextProject] = useState(usedTools.nextProject ? generateAppPaths(usedTools.nextProject) : null);
  const [phase, setPhase] = useState<'idle' | 'switching'>('idle');
  const [delayDone, setDelayDone] = useState(false);
  const [forceHide, setForceHide] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapseDelayRef = useRef<number | null>(null);
  // const switchDelayRef = useRef<number | null>(null);
  const isFirstRenderRef = useRef(true);

  const COLLAPSE_DELAY = 2500;
  const SWITCH_DELAY = 400;

  const nextProject = useMemo(() => {
    return splitIntoCategories((PROJECTS_TOOLS[activeProject]) as AppsList[]);
  }, [activeProject]);

  const [displayedApps, setDisplayedApps] = useState(nextProject);

  const imagePaths = useMemo(() => {
    return PROJECTS_TOOLS[activeProject].map((currTool) => FULL_APPS_INFO[currTool].src);
  }, [activeProject]);

  const { imagesReady } = useImagesReady(imagePaths);

  useEffect(() => {
    if (!projectInView) return

    setCollapseTimer();

    return () => { clearCollapseTimer(); }
  }, []);

  useEffect(() => {
    if (!projectInView) return

    if (!forceHide) {
      setIsCollapsed(false);
      setCollapseTimer();
    } else {
      HandlePointerOver();
      setCollapseTimer();
    }
  }, [forceHide, projectInView]);


  useEffect(() => {
    setPhase('switching');
    // setDelayDone(false);

    setTimeout(() => {
      setDelayDone(true);
    }, SWITCH_DELAY);
  }, [activeProject]);

  useEffect(() => {
    console.log('imagesReady: ', imagesReady)
  }, [imagesReady]);

  useEffect(() => {
    if (phase !== "switching") return;
    if (!delayDone || !imagesReady) return;

    setDisplayedApps(nextProject);
    setPhase("idle");
    setDelayDone(false);
  }, [phase, delayDone, imagesReady, nextProject]);

  function HandlePointerOver() {
    clearCollapseTimer();

    if (!isCollapsed) return;
    setIsCollapsed(false);
  }

  function HandlePointerOut() {
    if (isCollapsed) return;
    setCollapseTimer();
  }

  function setCollapseTimer() {
    collapseDelayRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, COLLAPSE_DELAY);
  }

  function clearCollapseTimer() {
    if (collapseDelayRef.current) {
      clearTimeout(collapseDelayRef.current);
      collapseDelayRef.current = null;
    }
  }

  function splitIntoCategories(usedToolsList: AppsList[], theOrder: AppCategories[] = ['front-end', 'back-end', 'npm packages', 'design']): [AppCategories, Partial<AppInfo>][] {
    return theOrder.map((currCategory) => {
      const filteredApps = Object.fromEntries(
        Object.entries(FULL_APPS_INFO)
          .filter(([appName, appInfo]) => (usedToolsList.includes(appName as AppsList) && appInfo.category === currCategory))
      )
      return Object.keys(filteredApps).length > 0
        ? [currCategory, filteredApps]
        : null;
    }).filter((entry): entry is [AppCategories, Partial<AppInfo>] => entry !== null);
  }

  const shouldHide = forceHide || collapseBars || !projectInView || phase === 'switching';

  return (
    <div className="pp-tools-bar-wrapper" data-hidebar={shouldHide} data-isvisible={projectInView}>
      <div className='pp-tools-bar' onPointerOver={HandlePointerOver} onPointerOut={HandlePointerOut}>
        {displayedApps.map(([category, apps], i, arr) => {
          return (
            <Fragment key={category}>
              <div className='tb-category'>
                <div className="tb-category-title" data-iscollapsed={isCollapsed}>
                  <span>{category}</span>
                </div>
                <div className='tb-icons-wrapper'>
                  {Object.entries(apps).map(([name, { src }]) => (
                    <button key={name}>
                      <img src={src} alt={`${name} icon`} />
                      <div className="tb-icon-name">
                        <span>{name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {i < arr.length - 1 && <hr />}
            </Fragment>
          )
        })}
      </div>
      <button className='tb-show-hide-button' data-isswitching={phase === 'switching'} onClick={() => setForceHide(prev => !prev)}>
        <span>{`${forceHide ? 'Show' : 'Hide'} tools`}</span>
        <span className='pp-show-hide-img' data-iscollapsed={!forceHide}>
          <BackArrow stroke={theme === 'dark' ? 'white' : 'rgba(77, 77, 77, 1)'} />
        </span>
      </button>
    </div>
  )
}

type Shard = {
  piece: MeshPiece;

  // position offsets from original
  ox: number;
  oy: number;
  oz: number;

  // velocity
  vx: number;
  vy: number;
  vz: number;

  // rotation
  rx: number;
  ry: number;
  rz: number;

  vrx: number;
  vry: number;
  vrz: number;

  // idle rotation seed
  spinPhase: number;

  // spin
  spin: {
    x: number;
    y: number;
    z: number;
  };
  spinVelInfluence: number;

  // depth
  depthBias: number;

  // spin time
  spinTime: number;

  cosX: number;
  sinX: number;
  cosY: number;
  sinY: number;
  cosZ: number;
  sinZ: number;
};

export function LogoShatter({ activeProject }: { activeProject: Project | 'meshregen' }) {
  const { theme } = useTheme();
  
  const wireMesh = getMesh({ mesh: activeProject, type: "wire" });
  const glassMesh = getMesh({ mesh: activeProject, type: "glass" });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const LOGO_SIZE = 1024;


  const isVisibleRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const delayRef = useRef<number>(performance.now());

  const wipeRef = useRef(0);
  const WIPE_ANGLE = 70 * Math.PI / 180;
  const wipeDir = {
    x: Math.cos(WIPE_ANGLE),
    y: -Math.sin(WIPE_ANGLE),
  };

  
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = (width: number, height: number) => {
      const size = Math.min(width, height);
      const scale = size / LOGO_SIZE;
      const offset = (size - LOGO_SIZE * scale) / 2;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(
        scale * dpr,
        0,
        0,
        scale * dpr,
        (width - LOGO_SIZE * scale) / 2 * dpr,
        (height - LOGO_SIZE * scale) / 2 * dpr
      );
    };

    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      resize(width, height);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  console.log('Glass Mesh: ', glassMesh.length, ' pieces.');

  

  useEffect(() => {
    if (!canvasRef.current || !wireMesh || !glassMesh) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    const size = Math.min(canvas.width, canvas.height);
    const scale = size / LOGO_SIZE;

    // ctx.globalCompositeOperation = "lighter";

    // IntersectionObserver - pause when offscreen
    const observer = new IntersectionObserver(
      (entries) => {
        const vis = entries[0]?.isIntersecting ?? true;
        isVisibleRef.current = vis;
        if (vis) {
          lastTimeRef.current = performance.now();
          if (rafRef.current == null) {
            rafRef.current = requestAnimationFrame(draw);
          }
        } else {
          if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);


    // ---- flare state ----
    const flareRadius = 250;
    const flareSpeed = 6;

    const MIN_FLARE_DISTANCE = LOGO_SIZE * 0.6; // tune this
    const MAX_TRIES = 10;

    const logoBounds = {
      minX: (flareRadius / 2),
      maxX: LOGO_SIZE - (flareRadius / 2),
      minY: (flareRadius),
      maxY: LOGO_SIZE - (flareRadius),
    };

    console.log(logoBounds, 'scale: ', scale);

    const flare = {
      from: { x: flareRadius / 2, y: flareRadius / 2 },
      to: randomPoint(),
      t: 0,
      duration: 0,     // computed per segment
      life: 0,         // total elapsed frames
      maxLife: 105,    // 4s @ 60fps
      active: true,
    };

    const dx = flare.to.x - flare.from.x;
    const dy = flare.to.y - flare.from.y;
    flare.duration = Math.max(1, Math.hypot(dx, dy) / flareSpeed);

    console.log(flare);

    const { min, max } = computeWipeRange(glassMesh, wipeDir);
    const fadeWidth = 300;
    const speed = 0.025; // reveal speed

    function randomPoint() {
      return {
        x: lerp(logoBounds.minX, logoBounds.maxX, Math.random()),
        y: lerp(logoBounds.minY, logoBounds.maxY, Math.random()),
      };
    }

    function randomPointFarEnough(from: { x: number; y: number }) {
      const midX = (logoBounds.minX + logoBounds.maxX) * 0.5;
      const midY = (logoBounds.minY + logoBounds.maxY) * 0.5;

      let p = from;

      for (let i = 0; i < MAX_TRIES; i++) {
        p = {
          x: lerp(logoBounds.minX, logoBounds.maxX, Math.random()),
          y: lerp(logoBounds.minY, logoBounds.maxY, Math.random()),
        };

        const dx = p.x - from.x;
        const dy = p.y - from.y;

        if (Math.hypot(dx, dy) >= MIN_FLARE_DISTANCE) {
          return p;
        }
      }

      // fallback: force opposite side
      return {
        x: from.x < midX ? logoBounds.maxX : logoBounds.minX,
        y: from.y < midY ? logoBounds.maxY : logoBounds.minY,
      };
    }

    function drawFlare(x: number, y: number, radius: number, alpha: number) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `rgba(255,255,255,${0.05 * alpha})`);
      g.addColorStop(0.3, `rgba(255,255,255,${0.025 * alpha})`);
      g.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function computeRevealAlpha(
      pos: Point,
      wipePos: number,
      dir: Point,
      fadeWidth: number
    ) {
      const t = project(pos, dir);
      const d = wipePos - t;

      // fully revealed
      if (d >= fadeWidth) return 1;

      // fully hidden
      if (d <= 0) return 0;

      // smooth fade
      return d / fadeWidth;
    }

    function computeGlareAlpha(
      pos: Point,
      wipePos: number,
      wipeDir: { x: number; y: number },
      glareWidth: number
    ) {
      const proj =
        pos.x * wipeDir.x +
        pos.y * wipeDir.y;

      const d = Math.abs(proj - wipePos);

      if (d > glareWidth) return 0;

      const t = 1 - d / glareWidth; // 0 → 1
      return t * t; // soften falloff
    }

    function computeWipeRange(mesh: MeshPiece[], dir: Point) {
      let min = Infinity;
      let max = -Infinity;

      for (const piece of mesh) {
        for (const p of piece.points) {
          const t = project(p, dir);
          min = Math.min(min, t);
          max = Math.max(max, t);
        }
      }

      return { min, max };
    }

    function project(p: Point, dir: Point) {
      return p.x * dir.x + p.y * dir.y;
    }

    const shards: Shard[] = glassMesh.map(p => ({
      piece: p,
      ox: 0, oy: 0, oz: 0,
      vx: 0, vy: 0, vz: 0,
      rx: 0, ry: 0, rz: 0,
      vrx: 0, vry: 0, vrz: 0,
      spinPhase: Math.random() * Math.PI * 2,
      depthBias: clamp(Math.random() - 0.5, 0.25, 0.75),
      spinTime: 0,
      spin: {
        x: Math.random() * 0.05 - 0.025,
        y: Math.random() * 0.05 - 0.025,
        z: Math.random() * 0.024 - 0.012,
      },
      spinVelInfluence: Math.random() * 0.0015 - 0.0035,

      cosX: 0,
      sinX: 0,
      cosY: 0,
      sinY: 0,
      cosZ: 0,
      sinZ: 0,
    }));

    let revealDone = false;

    function draw(now: number) {
      if (!isVisibleRef.current) {
        lastTimeRef.current = now; // reset timing baseline
        rafRef.current = null;
        return;
      }

      const rawDelta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const delta = Math.min(rawDelta, 1000 / 45);
      const dt = delta / (1000 / 60);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();


      // console.log(rawDelta, now, delta, dt, lastTimeRef.current);


      if (now - delayRef.current <= 1500) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // ---- stop flare completely ----
      if (!flare.active) {
        wipeRef.current = Math.min(1, wipeRef.current + speed * dt);

        const wipeStart = min - fadeWidth;
        const wipeEnd   = max + fadeWidth;
        const wipePos   = wipeStart + wipeRef.current * (wipeEnd - wipeStart);

        if (wipePos > max) {
          revealDone = true;
          // return;
        }

        // ---- wipe color reveal ----
        if (!revealDone) for (const p of glassMesh) {
          const wipeAlpha = computeRevealAlpha(p.centroid, wipePos, wipeDir, fadeWidth);
          const glareAlpha = computeGlareAlpha(p.centroid, wipePos, wipeDir, fadeWidth * 0.6);

          if (wipeAlpha <= 0) continue;

          ctx.beginPath();
          p.points.forEach((p, i) =>
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
          );
          ctx.closePath();

          ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${(theme === "dark" ? 0.55 : .8) * wipeAlpha})`;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.025 * wipeAlpha})`;
          ctx.lineWidth = 1;
          
          ctx.fill();
          ctx.stroke();
          
          if (glareAlpha > 0) {
            ctx.fillStyle = `rgba(255,255,255,${0.5 * glareAlpha})`;
            ctx.fill();
          }
        }
      }

      // ---- advance time ----
      // flare.t++;
      // flare.life++;

      if (flare.active) {
        flare.t += dt;
        flare.life += dt;
  
        let flareAlpha = 1;
  
        const fadeStart = flare.maxLife * 0.85;
  
        if (flare.life > fadeStart) {
          const t = (flare.life - fadeStart) / (flare.maxLife - fadeStart);
          flareAlpha = 1 - t; // linear fade
        }
  
        // ---- end flare lifetime ----
        if (flare.life >= flare.maxLife) {
          console.warn('ending flare...');
          flare.active = false;
        }
  
        // ---- finish segment → start next ----
        if (flare.t >= flare.duration) {
          flare.from = flare.to;
          // flare.to = randomPoint();
          flare.to = randomPointFarEnough(flare.from);
  
          const dx = flare.to.x - flare.from.x;
          const dy = flare.to.y - flare.from.y;
          const dist = Math.hypot(dx, dy);
  
          flare.duration = Math.max(1, dist / flareSpeed); // ← distance-based
          flare.t = 0;
        }
  
        // ---- interpolate position ----
        const tt = easeInOut(flare.t / flare.duration);
        const fx = lerp(flare.from.x, flare.to.x, tt);
        const fy = lerp(flare.from.y, flare.to.y, tt);
  
        // ---- base wire draw (dim) ----
        for (const piece of wireMesh) {
          ctx.beginPath();
          piece.points.forEach((p, i) =>
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
          );
          ctx.closePath();
  
          ctx.strokeStyle = "rgba(255,255,255,0)";
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
  
        // ---- spotlight wire boost ----
        for (const piece of wireMesh) {
          const dx = piece.centroid.x - fx;
          const dy = piece.centroid.y - fy;
          const dist = Math.hypot(dx, dy);
  
          if (dist > flareRadius) continue;
  
          const intensity = (1 - dist / flareRadius) * flareAlpha; // easeInOut(1 - dist / flareRadius);
  
          ctx.beginPath();
          piece.points.forEach((p, i) =>
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
          );
          ctx.closePath();
  
          ctx.strokeStyle = `rgba(255,255,255,${0.25 * intensity})`;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
  
        // ---- flare glow ----
        // drawFlare(fx, fy, flareRadius, (flareAlpha));
      }

      if (revealDone) {
        applyBurst((logoBounds.minX + logoBounds.maxX) / 2, (logoBounds.minY + logoBounds.maxY) / 2, LOGO_SIZE * 0.3, 1); // center
        applyBurst(logoBounds.maxX, logoBounds.maxY, LOGO_SIZE / 2, 1.5); // bottom right
        applyBurst(logoBounds.maxX, logoBounds.minY, LOGO_SIZE / 2, 1.5); // top right
        applyBurst(logoBounds.minX, logoBounds.minY, LOGO_SIZE / 2, 1.5); // top left
        applyBurst(logoBounds.minX, logoBounds.maxY, LOGO_SIZE / 2, 1.5); // bottom left

        // applyBurst(logoBounds.maxX, (logoBounds.minY + logoBounds.maxY) / 2, LOGO_SIZE / 4, 0.75); // top right
        // applyBurst(logoBounds.minX, (logoBounds.minY + logoBounds.maxY) / 2, LOGO_SIZE / 4, 0.75); // top left

        for (const s of shards) {
          updateShard(s, dt);
          drawShard(s);
        }
      }

      // requestAnimationFrame(draw);
      // schedule next frame
      rafRef.current = requestAnimationFrame(draw);
    }

    function applyBurst(cx: number, cy: number, radius: number, strength: number) {
      for (const s of shards) {
        const dx = s.piece.centroid.x - cx;
        const dy = s.piece.centroid.y - cy;
        const dist = Math.hypot(dx, dy);

        if (dist > radius) continue;

        // normalized direction in plane
        const nx = dx / (dist || 0.0001);
        const ny = dy / (dist || 0.0001);

        // 0 → 1 based on distance
        const t = Math.max(0, 1 - dist / radius);

        // curved falloff (stronger center punch)
        const falloff = t * t / 2;

        const impulse = strength * falloff;

        // planar explosion (outward)
        const randX = (Math.random() - 0.5) * 0.1;
        const randY = (Math.random() - 0.5) * 0.1;

        // s.vx += (nx + randX) * impulse;
        // s.vy += (ny + randY) * impulse;

        s.vx += (nx + randX);
        s.vy += (ny + randY);

        // spherical forward pop (more near center)
        // s.vz += impulse * 1.05;
        s.vz += impulse * 0.8 * s.depthBias;

        // rotational impulse scaled by impact strength
        // s.vrx += (Math.random() - 0.5) * 0.25 * falloff;
        // s.vry += (Math.random() - 0.5) * 0.25 * falloff;
        // s.vrz += (Math.random() - 0.5) * 0.25 * falloff;

        const spinStrength = 0.25; // MASTER SPIN CONTROL

        s.vrx += (Math.random() - 0.5) * spinStrength * falloff / dist;
        s.vry += (Math.random() - 0.5) * spinStrength * falloff / dist;
        s.vrz += (Math.random() - 0.5) * spinStrength * falloff / dist;
      }
    }

    function normalize(v: { x: number; y: number; z: number }) {
      const len = Math.hypot(v.x, v.y, v.z) || 1;
      return { x: v.x / len, y: v.y / len, z: v.z / len };
    }

    const LIGHT = normalize({ x: -0.6, y: -0.4, z: 1 }); // top-left front light

    // function drawShard(s: Shard) {
    //   const { piece } = s;

    //   ctx.beginPath()

    //   piece.points.forEach((p, i) => {
    //     let x = p.x - piece.centroid.x;
    //     let y = p.y - piece.centroid.y;
    //     let z = 0;

    //     // --- ROTATIONS ---
    //     let ty = y * Math.cos(s.rx) - z * Math.sin(s.rx);
    //     let tz = y * Math.sin(s.rx) + z * Math.cos(s.rx);
    //     y = ty; z = tz;

    //     let tx = x * Math.cos(s.ry) + z * Math.sin(s.ry);
    //     tz = -x * Math.sin(s.ry) + z * Math.cos(s.ry);
    //     x = tx; z = tz;

    //     tx = x * Math.cos(s.rz) - y * Math.sin(s.rz);
    //     ty = x * Math.sin(s.rz) + y * Math.cos(s.rz);
    //     x = tx; y = ty;

    //     // --- WORLD POSITION ---
    //     x += piece.centroid.x + s.ox;
    //     y += piece.centroid.y + s.oy;
    //     z += s.oz;

    //     const proj = project3D(x, y, z);

    //     if (i === 0) ctx.moveTo(proj.x, proj.y);
    //     else ctx.lineTo(proj.x, proj.y);
    //   });

    //   ctx.closePath();

    //   // =========================
    //   // 💡 LIGHTING CALCULATION
    //   // =========================

    //   // Approximate rotated normal (original normal = 0,0,1)
    //   const nx = Math.sin(s.ry);
    //   const ny = -Math.sin(s.rx);
    //   const nz = Math.cos(s.rx) * Math.cos(s.ry);

    //   const dot = nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z;

    //   // Strong sharp highlight when facing light
    //   const glare = Math.pow(Math.max(0, dot), 15);

    //   // Slight depth brightness (closer = brighter)
    //   const depthLight = 1 + s.oz * 0.0015;

    //   // --- BASE COLOR ---
    //   ctx.fillStyle = `rgba(${piece.color.r * depthLight}, ${piece.color.g * depthLight}, ${piece.color.b * depthLight}, 0.55)`;
    //   ctx.fill();

    //   // --- GLARE OVERLAY ---
    //   if (glare > 0.02) {
    //     ctx.fillStyle = `rgba(255,255,255,${glare * 0.75})`;
    //     ctx.fill();
    //   }
    // }

    function drawShard(s: Shard) {
      const { piece } = s;

      ctx.beginPath();

      for (let i = 0; i < piece.points.length; i++) {
        const p = piece.points[i];

        let x = p.x - piece.centroid.x;
        let y = p.y - piece.centroid.y;
        let z = 0;

        // --- ROTATE X ---
        let ty = y * s.cosX - z * s.sinX;
        let tz = y * s.sinX + z * s.cosX;
        y = ty; z = tz;

        // --- ROTATE Y ---
        let tx = x * s.cosY + z * s.sinY;
        tz = -x * s.sinY + z * s.cosY;
        x = tx; z = tz;

        // --- ROTATE Z ---
        tx = x * s.cosZ - y * s.sinZ;
        ty = x * s.sinZ + y * s.cosZ;
        x = tx; y = ty;

        // --- WORLD POSITION ---
        x += piece.centroid.x + s.ox;
        y += piece.centroid.y + s.oy;
        z += s.oz;

        const proj = project3D(x, y, z);

        if (i === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      }

      ctx.closePath();

      // =========================
      // 💡 LIGHTING CALCULATION
      // =========================

      // Rotated normal using cached angles
      const nx = s.sinY;
      const ny = -s.sinX;
      const nz = s.cosX * s.cosY;

      const dot = nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z;
      const glare = Math.pow(Math.max(0, dot), 15);

      const depthLight = 1 + s.oz * 0.0015;

      // --- BASE COLOR ---
      let r = piece.color.r * depthLight;
      let g = piece.color.g * depthLight;
      let b = piece.color.b * depthLight;

      // --- MERGE GLARE INTO COLOR (only if threshold hit) ---
      if (glare > 0.02) {
        const boost = glare * 2; // brightness boost
        r += 255 * boost;
        g += 255 * boost;
        b += 255 * boost;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(theme === "dark" ? 0.55 : 0.8)})`;
      ctx.fill();
    }

    // function updateShard(s: Shard, dt: number) {
    //   const friction = 0.5;
    //   const rotFriction = 0.75;

    //   s.ox += s.vx * 0.5 * dt;
    //   s.oy += s.vy * 0.5 * dt;
    //   s.oz += s.vz * 0.5 * dt;

    //   s.vx *= friction;
    //   s.vy *= friction;
    //   s.vz *= friction;

    //   s.rx += s.vrx * dt;
    //   s.ry += s.vry * dt;
    //   s.rz += s.vrz * dt;

    //   // s.vrx *= easeInOut(rotFriction);
    //   // s.vry *= easeInOut(rotFriction);
    //   // s.vrz *= easeInOut(rotFriction);

    //   s.vrx *= easeInOut(rotFriction * dt);
    //   s.vry *= easeInOut(rotFriction * dt);
    //   s.vrz *= easeInOut(rotFriction * dt);

    //   // idle floating rotation (only when slow)
    //   const speed = Math.hypot(s.vx, s.vy, s.vz);
    //   if (speed < 0.1) {
    //     const depthFactor = 1 + s.oz * 0.001 * s.depthBias;
    //     s.ry += 0.001 * depthFactor * Math.sin(s.spinPhase + performance.now() * 0.001);
    //     s.rx += 0.00075 * depthFactor * Math.cos(s.spinPhase + performance.now() * 0.001);
    //   }
    // }

    // function updateShard(s: Shard, dt: number) {
    //   const linDamp = Math.pow(0.15, dt);
    //   const angDamp = Math.pow(0.5, dt);

    //   // --- POSITION ---
    //   s.ox += s.vx * dt;
    //   s.oy += s.vy * dt;
    //   s.oz += s.vz * dt;

    //   s.vx *= linDamp;
    //   s.vy *= linDamp;
    //   s.vz *= linDamp;

    //   // --- ROTATION ---
    //   s.rx += s.vrx * dt;
    //   s.ry += s.vry * dt;
    //   s.rz += s.vrz * dt;

    //   s.vrx *= angDamp;
    //   s.vry *= angDamp;
    //   s.vrz *= angDamp;

    //   // --- IDLE FLOAT ROTATION ---
    //   const speed = Math.hypot(s.vx, s.vy, s.vz);

    //   if (speed < 30) {
    //     const depthFactor = 1 + s.oz * 0.001 * s.depthBias;

    //     // gently push angular velocity toward a target
    //     const targetSpin = 0.00015 * depthFactor;

    //     s.vrx += (Math.sin(s.spinPhase) * targetSpin - s.vrx) * 0.02 * dt;
    //     s.vry += (Math.cos(s.spinPhase) * targetSpin - s.vry) * 0.02 * dt;
    //   }
    // }

    function updateShard(s: Shard, dt: number) {
      const linDamp = Math.pow(0.05, dt);

      // --- POSITION (keep physics here) ---
      s.ox += s.vx * dt;
      s.oy += s.vy * dt;
      s.oz += s.vz * dt;

      s.vx *= linDamp * s.vrx;
      s.vy *= linDamp * s.vry;
      s.vz *= linDamp * s.vrz;

      // --- CINEMATIC ROTATION (NO physics) ---
      const velocity = 1;
      const depthFactor = 1 + s.oz * 0.0005 * s.depthBias;

      s.rx += s.spin.x * velocity * depthFactor * dt;
      s.ry += s.spin.y * velocity * depthFactor * dt;
      s.rz += s.spin.z * velocity * depthFactor * dt;

      // --- ANGLE CALCULATIONS ---
      s.cosX = Math.cos(s.rx);
      s.sinX = Math.sin(s.rx);
      s.cosY = Math.cos(s.ry);
      s.sinY = Math.sin(s.ry);
      s.cosZ = Math.cos(s.rz);
      s.sinZ = Math.sin(s.rz);

      // // --- SPEED ---
      // const speed = Math.hypot(s.vx, s.vy, s.vz);

      // // normalize speed into 0 → 1 range (tweak divisor to taste)
      // const speedFactor = Math.min(speed / 1200, 1);

      // // --- ROTATION ---
      // // base slow classy spin
      // let spinX = s.spin.x;
      // let spinY = s.spin.y;
      // let spinZ = s.spin.z;

      // // add motion-based spin boost
      // spinX += s.vy * s.spinVelInfluence * speedFactor;
      // spinY += s.vx * s.spinVelInfluence * speedFactor;
      // spinZ += (s.vx - s.vy) * s.spinVelInfluence * 0.5 * speedFactor;

      // // apply rotation
      // s.rx += spinX * dt;
      // s.ry += spinY * dt;
      // s.rz += spinZ * dt;
      
    }

    const CAMERA_Z = 800;

    function project3D(x: number, y: number, z: number) {
      const scale = CAMERA_Z / (CAMERA_Z + z);
      return {
        x: x * scale,
        y: y * scale,
        scale
      };
    }

    // draw();
    // start
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(draw);

    canvas.addEventListener("click", e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log('clicked at: ', x, y);

      applyBurst(x, y, 120, 2);
    });

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [wireMesh, theme]);


  return (
    <div className='logo-shatter-canvas' ref={containerRef} style={{ width: "100%", height: "100%", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas ref={canvasRef} />
      {/* <canvas ref={colorsCanvasRef} style={{ position: 'fixed', visibility: 'hidden' }} /> */}
    </div>
  )
}