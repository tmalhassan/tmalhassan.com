import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { AppCategories, AppInfo, AppsList, IconFileNames, Project, SectionViewTypes } from "../../types/SectionsTypes";
import { useTheme } from '../../contexts/theme-context/useTheme';
import WebDeveloperPage from "../WebDevPage/WebDevPage.tsx";
import './SectionView.css';

import BackArrow from "../SVGs/BackArrow";
import GlassGlareButton from "../GlassGlareButton/GlassGlareButton.tsx";
import useImagesReady from "../../hooks/useImagesReady.tsx";
import GameDeveloperPage from "../GameDevPage/GameDevPage.tsx";
import DesignerPage from "../DesignerPage/DesignerPage.tsx";
import { handleRedirectButtonClick } from "../../utilities/linkRedirect.ts";

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
  'd3-delaunay': 'D3 Delaunay',
  'poisson-disk': 'Poisson Disk',
  'clipper2-ts': 'Clipper2',

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
    'Immer',
    'D3 Delaunay',
    'Poisson Disk',
    'Clipper2'
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
  meshregen: [
    'JavaScript',
    'HTML',
    'CSS',
    'React',
    'TypeScript',

    'D3 Delaunay',
    'Poisson Disk',
    'Clipper2'
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
  const [targetProject, setTargetProject] = useState<Project>('alura');
  const [usedTools, setUsedTools] = useState<{ currProject: string[], nextProject: string[] | null }>({ currProject: PROJECTS_TOOLS[activeProject], nextProject: null });
  const [projectInView, setProjectInView] = useState(false);
  // const [isActive, setIsActive] = useState(true);
  const sectionViewPageRef = useRef<HTMLDivElement | null>(null);
  const scrollEndPosRef = useRef<number>(0);
  const firstCollapseGraceRef = useRef(true);

  const SCROLL_DEADZONE = 1;

  const sectionNames = {
    web: 'Web Dev',
    game: 'Game Dev',
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

  // const getUsedTools = () => {
  //   if (sectionView === 'web') {
  //     if (activeProject === 'alura')
  //       return ['JavaScript', 'HTML', 'CSS', 'React', 'TypeScript', 'Node.js', 'MySQL', 'Express', 'Axios', 'Bcrypt', 'Immer', 'Multer', 'Sharp', 'Illustrator']
  //     else return ['JavaScript', 'HTML', 'CSS', 'Illustrator', 'Photoshop']
  //   } else if (sectionView === 'game') return ['C#', 'Unity', 'GameSparks', 'Node.js', 'Photoshop', 'Illustrator', 'Audition', 'After Effects']
  //     else return ['Photoshop', 'Illustrator', 'After Effects']
  // }

  return (
    <div className="section-view" ref={sectionViewPageRef} data-activeproj={activeProject} data-targetproj={targetProject}>
      <div className="sv-nav-bar" data-navbarstate={barsHidden && projectInView ? 'hidden' : isNavBarColl ? 'collapsed' : 'active'}>
        <button className="sv-close-button" title="Back button" onClick={handleCloseButtonClick}>
          <BackArrow stroke={theme === 'dark' ? 'white' : 'rgba(77, 77, 77, 1)'} />
          <span className="sv-section-name">{sectionView ? sectionNames[sectionView] : undefined}</span>
        </button>
        <GlassGlareButton
          textLable={activeProject === 'starleap' ? 'Download' : 'View Website'}
          buttonStyle={{ height: '35px' }}
          onClickHandler={() => handleRedirectButtonClick(activeProject)}
          willAnimate={true}
          triggerAnim={projectInView}
          animDelay={0}
        />
      </div>
      {(sectionView === 'web' && (activeProject !== 'starleap' && targetProject !== 'starleap')) && 
        <WebDeveloperPage
          sectionViewPageRef={sectionViewPageRef}
          activeProject={activeProject}
          setActiveProject={setActiveProject}
          targetProject={targetProject}
          setTargetProject={setTargetProject}
          setProjectInView={setProjectInView}
          handleRedirectButtonClick={() => handleRedirectButtonClick(activeProject)}
        />
      }
      {sectionView === 'game' && 
        <GameDeveloperPage />
      }
      {sectionView === 'design' && 
        <DesignerPage />
      }
      {/* <div className="filler one" />
      <div className="filler two" />
      <div className="filler three" /> */}
      {sectionView === 'web' && <UsedToolsBar collapseBars={barsHidden} projectInView={projectInView} targetProject={targetProject} />}
    </div>
  )
}

interface UsedToolsBarType {
  collapseBars: boolean;
  projectInView: boolean;
  targetProject: Project;
}

export function UsedToolsBar({ collapseBars, projectInView, targetProject }: UsedToolsBarType) {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<'idle' | 'switching'>('idle');
  const [delayDone, setDelayDone] = useState(false);
  const [forceHide, setForceHide] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapseDelayRef = useRef<number | null>(null);
  const switchDelayRef = useRef<number | null>(null);
  const isFirstRenderRef = useRef(true);

  const COLLAPSE_DELAY = 2500;
  const SWITCH_DELAY = 400;

  const nextProject = useMemo(() => {
    return splitIntoCategories((PROJECTS_TOOLS[targetProject]) as AppsList[]);
  }, [targetProject]);

  const [displayedApps, setDisplayedApps] = useState(nextProject);

  const imagePaths = useMemo(() => {
    return PROJECTS_TOOLS[targetProject].map((currTool) => FULL_APPS_INFO[currTool].src);
  }, [targetProject]);

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

    clearSwitchTimer();
    setSwitchTimer();
  }, [targetProject]);

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

  function setSwitchTimer() {
    switchDelayRef.current = setTimeout(() => {
      setDelayDone(true);
    }, SWITCH_DELAY);
  }

  function clearSwitchTimer() {
    if (switchDelayRef.current) {
      clearTimeout(switchDelayRef.current);
      switchDelayRef.current = null;
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