import './WebDevPage.css';
import React, { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import BackArrow from '../SVGs/BackArrow';
import { useTheme } from '../../contexts/theme-context/useTheme';
import GlassGlareButton from '../GlassGlareButton/GlassGlareButton';
import TailArrow from '../SVGs/TailArrow';
import { SectionViewCanvasEngine } from '../SectionView/SectionViewCanvasEngine';
import { useDevice } from '../../contexts/device-context/useDevice';
import type { Project, WebProjects } from '../../types/SectionsTypes';
import { PROJECTS_DATA } from '../../content/WebProjectsText';
import type { ContentBlock } from '../../types/TextBlockContent';
import TextRenderer from '../TextRenderer/TextRenderer';

interface WebDevPageType {
  sectionViewPageRef: React.RefObject<HTMLDivElement | null>;
  activeProject: WebProjects;
  targetProject: WebProjects;
  setActiveProject: Dispatch<SetStateAction<Project>>;
  setTargetProject: Dispatch<SetStateAction<Project>>;
  setProjectInView: Dispatch<SetStateAction<boolean>>;
  handleRedirectButtonClick: () => void;
}

export default function WebDeveloperPage({ sectionViewPageRef, activeProject, setActiveProject, targetProject, setTargetProject, setProjectInView, handleRedirectButtonClick }: WebDevPageType) {
  const { theme } = useTheme();
  const { device, tier } = useDevice();

  const [isSwitchingProject, setIsSwitchingProject] = useState(false);
  const [isPageEnd, setIsPageEnd] = useState(false);

  const projectsWrapperRef = useRef<HTMLDivElement | null>(null);

  const canvasEngineRef = useRef<SectionViewCanvasEngine | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const viewWebsiteButtonRef = useRef<HTMLDivElement | null>(null);

  const rawDpr = Math.min(window.devicePixelRatio || 1, 2);
  const dpr = tier === "high"
      ? Math.min(rawDpr, device === "laptop" ? 2 : 1.75)
      : tier === "mid"
        ? Math.min(rawDpr, device === "laptop" ? 1.75 : 1.25) // 1.75 : 1.5
        : Math.min(rawDpr, device === "laptop" ? 1.5 : 1.15); // 1.5 : 1.25

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return;
    
    const engine = new SectionViewCanvasEngine(canvas, activeProject, dpr);
    canvasEngineRef.current = engine;

    const IntrsObserver = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      
      engine.updateInView(entry.isIntersecting);
    }, { threshold: 0.01 })

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      engine.handleResize(width, height);
    });
    
    if (containerRef.current) {
      IntrsObserver.observe(containerRef.current);
      resizeObserver.observe(containerRef.current);
    }

    // clean up
    return () => {
      IntrsObserver.disconnect();
      resizeObserver.disconnect();
      engine.destroy();
      
      if (canvasEngineRef.current === engine) {
        canvasEngineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!canvasEngineRef.current) return;
    canvasEngineRef.current.updateProject(targetProject);
  }, [targetProject]);

  useEffect(() => {
    if (!canvasEngineRef.current) return;
    canvasEngineRef.current.updateTheme(theme);
  }, [theme]);

  useEffect(() => {
    const projWrapElement = projectsWrapperRef.current;
    const viewWebsiteButton = viewWebsiteButtonRef.current;
    if (!projWrapElement || !viewWebsiteButton) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        const targetElement = entry.target;
        
        // --- LOGIC FOR THE PROJECTS WRAPPER ---
        if (targetElement === projWrapElement) {
          if (entry.isIntersecting && (entry.intersectionRatio >= 0.2 || entry.intersectionRatio >= 0.99)) {
            setProjectInView(true);
          } else {
            // Only turn it off if the wrapper itself leaves the active view zone
            setProjectInView(false);
          }
        }
        
        // --- LOGIC FOR THE VIEW WEBSITE BUTTON ---
        if (targetElement === viewWebsiteButton) {
          // Trigger if the button is visible AT ALL, or if we physically hit the bottom of the page
          if (entry.isIntersecting) {
            console.log('view website button in view');
            setIsPageEnd(true);
          } else {
            setIsPageEnd(false);
          }
        }

      });
    }, { threshold: [0, 0.2, 0.9, 1.0] });
    
    observer.observe(projWrapElement);
    observer.observe(viewWebsiteButton);
    
    return () => observer.disconnect();
  }, [activeProject]);

  function onClickAction(proj: WebProjects) {
    if (proj === activeProject) return;

    setTargetProject(proj);
    setIsSwitchingProject(true);

    setTimeout(() => {
      setActiveProject(proj);
      setIsSwitchingProject(false);
    }, 500);
  }

  function ScrollToProjects() {
    // projectsWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    const el = projectsWrapperRef.current;
    if (!el) return;

    const offset = 40; // whatever you want
    const top = el.offsetTop - offset;

    sectionViewPageRef.current?.scrollTo({ top, behavior: "smooth" });
  }

  return(
    <div className="web-page">
      <div className='wp-header'>
        <div className='logo-shatter-canvas' ref={containerRef} style={{ width: "100%", height: "100%", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <canvas ref={canvasRef} />
        </div>
        <TextRenderer
          text={[{
            type: 'heading1',
            content: `A spark of curiosity that turned into _passion_.`
          }]}
          animate={true}
        />
        <div className='wp-p-wrapper'>
          <p>From a small calculator in <code>Visual Basic</code> to building fully functioning applications with <code>C#</code> and <code>JavaScript</code>. My love for coding only grows by the day.</p>
          <p>{"In addition to this portfolio, here are some projects that i enjoyed working on."}</p>
        </div>
        <GlassGlareButton textLable='Jump right in!'
          buttonImage={<TailArrow stroke={theme === 'dark' ? '#ffffff' : 'rgba(77, 77, 77, 1)'}/>}
          buttonStyle={{ marginTop: '2em' }}
          onClickHandler={ScrollToProjects}
          willAnimate={true}
          triggerAnim={true}
          animDelay={750}
        />
      </div>
      <div className='wp-projects-wrapper' ref={projectsWrapperRef} data-isswitchingproj={isSwitchingProject}>
        <div className='wp-project-buttons-container'>
          {(Object.entries(PROJECTS_DATA)).map(([proj, value]) => (
            <button 
              key={proj}
              data-isactive={targetProject === proj}
              onClick={() => onClickAction(proj as WebProjects)}
            >
              <span>{value.name}</span>
            </button>
          ))}
          <div className='wp-project-buttons-container-glass-overlay glass-button-wrapper' data-animstate={'completed'}>
            <div className='gb-glare-group'>
              <div className='gb-glare'/>
              <div className='gb-glare'/>
              <div className='gb-glare'/>
            </div>
          </div>
        </div>
        <AboutProjectSection activeProject={activeProject} />
        <div className='wp-project-preview-container'>
          {Object.values(PROJECTS_DATA[activeProject].sections).map(({ title, shortDesc, fullDesc, image }, i) => (
            <FeatureSectionWithImage
              key={`${activeProject}-${i}`}
              title={title}
              image={image}
              shortDesc={shortDesc}
              fullDesc={fullDesc}
              activeProject={activeProject}
            />
          ))}
          <div className='wp-view-website-button-wrapper' data-fade-out={targetProject !== activeProject} ref={viewWebsiteButtonRef} key={activeProject}>
            <GlassGlareButton
              textLable={'View Website'}
              onClickHandler={handleRedirectButtonClick}
              willAnimate={true}
              triggerAnim={isPageEnd}
              animDelay={100}
            />
          </div>
        </div>
      </div>
      
    </div>
  )
}


interface FeatureSectionType {
  title: string;
  shortDesc: string;
  fullDesc: ContentBlock[];
}

function FeatureSectionWithImage({ title, shortDesc, fullDesc, image }: FeatureSectionType & { image: string; activeProject: WebProjects }) {
  const { theme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSpinnerMounted, setIsSpinnerMounted] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [height, setHeight] = useState(0);
  const [animate, setAnimate] = useState(false);
  const fullDescRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let resizeRafId: number | null = null;
    const intersecObservedEl = sectionRef.current;
    const resizeObservedEl = fullDescRef.current;

    if (!resizeObservedEl || !intersecObservedEl) return;

    const resizeObs = new ResizeObserver(() => {
      if (resizeRafId) return;
      
      resizeRafId = requestAnimationFrame(() => {
        const style = getComputedStyle(resizeObservedEl);
        const calcHeight = resizeObservedEl.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
        // console.log(observedElement.style.marginTop, observedElement.style.marginBottom)
        setHeight(calcHeight);

        resizeRafId = null;
      });
    });

    const intersecObs = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) {
        console.log('section is in view... animate!');
        
        setAnimate(true);
        obs.unobserve(intersecObservedEl);
      }
    }, {rootMargin : '0% 0% -25% 0%', threshold : 0}); // 


    intersecObs.observe(intersecObservedEl);
    resizeObs.observe(resizeObservedEl);

    return () => {
      intersecObs.disconnect();
      resizeObs.disconnect();
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
    };
  }, []);

  return(
    <div className={`project-preview-section${animate ? ' animate' : ''}`} ref={sectionRef}>
      <div className='pp-section-part'>
        <h3 className='pp-section-title'>{title}</h3>
        <p>{shortDesc}</p>
        <div style={{ maxHeight: isCollapsed ? 0 : height, transition: "max-height 0.2s ease-in-out", overflow: 'hidden', display: 'grid' }}>
          <div ref={fullDescRef}>
            <TextRenderer
              text={fullDesc}
              animate={false}
              animStartDelay={0}
              wordAnimDuration={0}
            />
          </div>
        </div>
        <button className='pp-show-hide-button' onClick={() => setIsCollapsed(prev => !prev)}>
          <span>{'Technical details'}</span>
          <span className='pp-show-hide-img' data-iscollapsed={isCollapsed}>
            <BackArrow stroke={theme === 'dark' ? 'white' : '#353535'}/>
          </span>
        </button>
      </div>
      {/* <div className='pp-parts-gap' /> */}
      <div className='pp-section-part'>
        {isSpinnerMounted && (
          <span 
            className={`loader ${isLoaded ? 'fade-out' : ''}`} 
            onTransitionEnd={() => setIsSpinnerMounted(false)}
          >
            <span className='ls' />
            <span className='ls' />
            <span className='ls' />
            <span className='ls' />
          </span>
        )}
        <img 
          src={image} 
          loading='lazy' 
          alt="section image" 
          onLoad={() => setIsLoaded(true)} 
          data-fadein={isLoaded} 
        />
      </div>
    </div>
  )
}

function AboutProjectSection({ activeProject }: { activeProject: WebProjects }) {
  const [animate, setAnimate] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const intersecObservedEl = sectionRef.current;

    if (!intersecObservedEl) return;

    const intersecObs = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) {
        console.log('section is in view... animate!');
        
        setAnimate(true);
        obs.unobserve(intersecObservedEl);
      }
    }, {rootMargin : '0% 0% -25% 0%', threshold : 0}); // 

    intersecObs.observe(intersecObservedEl);

    return () => {
      intersecObs.disconnect();
    };
  }, []);

  return(
    <div className={`project-preview-section about-project${animate ? ' animate' : ''}`} ref={sectionRef}>
      <div className='pp-section-part'>
        <TextRenderer
          text={PROJECTS_DATA[activeProject].about}
          animate={false}
          animStartDelay={0}
          wordAnimDuration={0}
        />
      </div>
    </div>
  )
}