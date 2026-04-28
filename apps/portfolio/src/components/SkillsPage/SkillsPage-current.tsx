import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useTheme } from "../../contexts/theme-context/useTheme";
import type { sectionsTypes, SectionViewTypes } from "../../types/SectionsTypes";
import type { PageCardsRefsTypes } from "../../types/PageCardsRefsTypes";
import './SkillsPage.css';

import darkCodeImg from '../../assets/pages/skills-page/web/code-dark.svg';
import lightCodeImg from '../../assets/pages/skills-page/web/code-light.svg';
import otherBoardCircles from '../../assets/pages/skills-page/game/pacman-circles.svg'
import { useNotificationManager } from "../../contexts/notifications-context/useNotifManager";
import easeInOut from "../../utilities/easeInOut";
import easeOut from "../../utilities/easeOut";
// import { BIG_S1, BIG_S2, SMALL_S1, SMALL_S2, SMALL_S3 } from "../Strokes/StrokesData";
// import { RevealText } from "../RevealText";

type PointerTypes = "mouse" | "touch" | "pen";

export default function SkillsPage({ refs, sectionView, svTransToggle, ToggleSectionView }: SectionViewTypes & { refs: PageCardsRefsTypes; svTransToggle: boolean; }) {
  const { Notify } = useNotificationManager();
  const [inView, setInView] = useState(false);
  const [activeSkillSection, setActiveSkillSection] = useState<sectionsTypes | null>(null);
  const [pointerType, setPointerType] = useState<PointerTypes | undefined>(undefined);
  const skillsSecContainer = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<{ time: number; section: sectionsTypes | null; } | null>(null);
  const toastEnablerRef = useRef(true);

  useEffect(() => {
    const observedElement = refs.divRef.current;
    if (!observedElement) return;

    const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          console.log('Skills page is in view!');
          setInView(true);
        } else {
          console.log('Skills page left the view!');
          setInView(false);
        }
    }, {rootMargin : '-1px', threshold : 0});

    // setTimeout(() => {
    //   firstRenderRef.current = false;
    // }, 50);

    observer.observe(observedElement)
    
    return () => {
      observer.unobserve(observedElement);
      observer.disconnect();
    }
  }, []);

  useEffect(() => {
    console.log(activeSkillSection);
  }, [activeSkillSection]);

  function handleSectionClick(section: sectionsTypes) {
    if (pointerType === 'mouse') {
      setActiveSkillSection(section);
      ToggleSectionView({ state: true, type: section });
      
      return;
    }

    const now = performance.now();
    const lastTap = lastTapRef.current;

    if (lastTap !== null && (now - lastTap.time) <= 700 && lastTap.section === section) {
      lastTapRef.current = null;

      setActiveSkillSection(section);
      ToggleSectionView({ state: true, type: section });

      return;
    }

    // first tap / too slow -> record time & show toast
    if (toastEnablerRef.current) {
      toastEnablerRef.current = false;
      Notify({ message: `Double tap to open`, duration: 1000 });
      setTimeout(() => {
        toastEnablerRef.current = true;
      }, 3000);
    }
    lastTapRef.current = { time: now, section };
  }

  return (
    <div className='page-card' ref={refs.divRef} style={{ overflow: 'hidden' }}>
      <div className={`skills-sections${svTransToggle ? ' hidden' : ''}`} ref={skillsSecContainer}> {/* style={{ display: !inView ? 'none' : undefined }} */}
        <div className='sections-bg'/>
        <SkillSection sectionName='web' enableAnim={inView && !svTransToggle} handleSectionClick={handleSectionClick} setPointerType={setPointerType}/>
        <SkillSection sectionName='game' enableAnim={inView && !svTransToggle} handleSectionClick={handleSectionClick} setPointerType={setPointerType}/>
        <SkillSection sectionName='design' enableAnim={inView && !svTransToggle} handleSectionClick={handleSectionClick} setPointerType={setPointerType}/>
      </div>
    </div>
  )
}

function SkillSection({ sectionName, enableAnim, handleSectionClick, setPointerType }: { sectionName: sectionsTypes; enableAnim: boolean; handleSectionClick: (section: sectionsTypes) => void; setPointerType: Dispatch<SetStateAction<PointerTypes | undefined>> }) {
  const [pointerIn, setPointerIn] = useState(false);
  const sectionCon = useRef<HTMLDivElement | null>(null);
  const sectionString = (() => {
    switch (sectionName) {
      case 'web':
        return 'Web Developer';

      case 'game':
        return 'Game Developer';

      case 'design':
        return 'Designer';
    }
  })();

  useEffect(() => {
    const container = sectionCon.current;
    if (!container) return;
    
    if (!enableAnim) container.classList.remove("animate");
  }, [enableAnim]);

  function handlePointerEnter(e: React.PointerEvent<HTMLDivElement>) {
    setPointerType(prev => {
      const pType = e.pointerType as PointerTypes;
      return pType !== prev ? pType : prev;
    });

    const container = sectionCon.current;
    if (!container || !enableAnim) return;

    container.classList.remove("animate");
    void container.offsetWidth;
    container.classList.add("animate");

    setPointerIn(true);
  }

  function handlePointerLeave() {
    setPointerIn(false);
  }

  return (
    <div className={`section-wrapper ${sectionName}-sw`}>
      <div className={`section ${sectionName}`} ref={sectionCon} onClick={() => handleSectionClick(sectionName)} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
        <div className='section-anim-container'>
          <div className='section-elements-wrapper'> {/* rotating container */}
            {sectionName === 'web' && <WebBackgroundAnimation pointerIn={pointerIn}/>}
            {sectionName === 'game' && <GameBackgroundAnimation />}
            {sectionName === 'design' && <DesignBackgroundAnimation />}
            <div className='section-string-p-wrapper'>
              <p>{sectionString}</p>
            </div>
          </div>
        </div>
      </div>
      <div className={`glare-${sectionName}`}>
        <div></div>
      </div>
    </div>
  )
}

function WebBackgroundAnimation({ pointerIn }: { pointerIn: boolean }) {
  const { theme } = useTheme();

  const sectionBGRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const rafRef = useRef<number | null>(null);
  const startAnimationRef = useRef<() => void>(() => {});
  const rebuildBufferRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const bufferCanvas = bufferCanvasRef.current;
    const container = sectionBGRef.current;
    if (!canvas || !bufferCanvas || !container) return;

    const ctx = canvas.getContext("2d")!;
    const bfrCtx = bufferCanvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    let startTime: number | null = null;
    const DURATION = 1750;

    // ------------------------
    // Resize
    // ------------------------
    const resize = (width: number, height: number) => {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      bufferCanvas.width = width * dpr;
      bufferCanvas.height = height * dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bfrCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      rebuildBufferRef.current();
      startAnimationRef.current();
    };

    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      resize(width, height);
    });

    observer.observe(container);

    // ------------------------
    // Buffer (image)
    // ------------------------
    const img = new Image();
    img.src = theme === "dark" ? darkCodeImg : lightCodeImg;

    let imageReady = false;

    rebuildBufferRef.current = () => {
      if (!imageReady) return;

      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      const size = Math.min(width, height);
      const angle = (-9 * Math.PI) / 180;

      bfrCtx.clearRect(0, 0, width, height);

      bfrCtx.save();
      bfrCtx.translate(size / 2.1, size / 2.1);
      bfrCtx.rotate(angle);
      bfrCtx.drawImage(img, -size / 2, -size / 2, size, size);
      bfrCtx.restore();
    };

    img.onload = () => {
      imageReady = true;
      rebuildBufferRef.current();
    };

    // ------------------------
    // Mask
    // ------------------------
    const drawRippleMask = (
      cx: number,
      cy: number,
      maxRadius: number,
      progress: number
    ) => {
      const radius = maxRadius * progress;

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
    };

    // ------------------------
    // Draw loop
    // ------------------------
    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      const elapsed = timestamp - startTime;
      let progress = Math.min(elapsed / DURATION, 1);
      progress = easeOut(progress, 2);

      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const maxR = Math.max(width * 2, height * 2);

      drawRippleMask(cx, cy, maxR, progress);

      ctx.globalCompositeOperation = "source-in";
      ctx.drawImage(bufferCanvas, 0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        startTime = null;
      }
    };

    // ------------------------
    // Start animation
    // ------------------------
    startAnimationRef.current = () => {
      if (!imageReady) return;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      startTime = null;
      rafRef.current = requestAnimationFrame(draw);
    };

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [theme]);

  useEffect(() => {
    if (pointerIn) {
      startAnimationRef.current();
    }
  }, [pointerIn]);

  return (
    <div ref={sectionBGRef} className="section-bg">
      <canvas
        ref={bufferCanvasRef}
        style={{ display: "none", position: "absolute" }}
      />
      <canvas ref={canvasRef} />
    </div>
  );
}

function GameBackgroundAnimation() {
  const circlesContRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    if (!circlesContRef.current) return;

    let eatCount = 0;

    Array.from(circlesContRef.current.children).forEach((circle) => {
      eatCount++;
      (circle as SVGCircleElement).style.animationDelay = `${((eatCount * 0.12) + 0.65)}s`;
    });
  }, []);

  return (
    <div className='section-bg'>
      <img className="circles" src={otherBoardCircles} alt="" />
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" xmlSpace="preserve">
        <g id="game_board">
          <g ref={circlesContRef} className="circles">
            <circle cx="110.6" cy="256" r="2" />
            <circle cx="110.6" cy="239" r="2" />
            <circle cx="110.6" cy="222" r="2" />
            <circle cx="110.6" cy="204.9" r="2" />
            <circle cx="127.6" cy="204.9" r="2" />
            <circle cx="144.6" cy="204.9" r="2" />
            <circle cx="161.7" cy="204.9" r="2" />
            <circle cx="178.7" cy="204.9" r="2" />
            <circle cx="195.7" cy="204.9" r="2" />
            <circle cx="212.7" cy="204.9" r="2" />
            <circle cx="229.7" cy="204.9" r="2" />
            <circle cx="246.8" cy="204.9" r="2" />
            <circle cx="263.8" cy="204.9" r="2" />
            <circle cx="280.8" cy="204.9" r="2" />
            <circle cx="280.8" cy="187.9" r="2" />
            <circle cx="280.8" cy="170.9" r="2" />
            <circle cx="280.8" cy="153.9" r="2" />
            <circle cx="297.8" cy="153.9" r="2" />
            <circle cx="314.8" cy="153.9" r="2" />
            <circle cx="331.9" cy="153.9" r="2" />
            <circle cx="348.9" cy="153.9" r="2" />
            <circle cx="348.9" cy="136.9" r="2" />
            <circle cx="348.9" cy="119.8" r="2" />
            <circle cx="348.9" cy="102.8" r="2" />
            <circle cx="331.9" cy="102.8" r="2" />
            <circle cx="314.8" cy="102.8" r="2" />
            <circle cx="297.8" cy="102.8" r="2" />
            <circle cx="280.8" cy="102.8" r="2" />
            <circle cx="263.8" cy="102.8" r="2" />
          </g>
          <g id="barriers">
            <path className="bb" d="M87.2,85.8H31.9c-3.5,0-6.4-2.9-6.4-6.4V58.1c0-3.5,2.9-6.4,6.4-6.4h55.3c3.5,0,6.4,2.9,6.4,6.4v21.3
                C93.6,82.9,90.7,85.8,87.2,85.8z"/>
            <path className="bb" d="M206.3,85.8H134c-3.5,0-6.4-2.9-6.4-6.4V58.1c0-3.5,2.9-6.4,6.4-6.4h72.3c3.5,0,6.4,2.9,6.4,6.4v21.3
                C212.7,82.9,209.9,85.8,206.3,85.8z"/>
            <path className="bb" d="M87.2,136.9H31.9c-3.5,0-6.4-2.9-6.4-6.4v-4.3c0-3.5,2.9-6.4,6.4-6.4h55.3c3.5,0,6.4,2.9,6.4,6.4v4.3
                C93.6,134,90.7,136.9,87.2,136.9z"/>
            <path className="bb" d="M325.5,136.9h-55.3c-3.5,0-6.4,2.9-6.4,6.4l0,38.3c0,3.5-2.9,6.4-6.4,6.4h-4.3c-3.5,0-6.4-2.9-6.4-6.4
                l0-38.3c0-3.5-2.9-6.4-6.4-6.4h-55.3c-3.5,0-6.4-2.9-6.4-6.4v-4.3c0-3.5,2.9-6.4,6.4-6.4h140.4c3.5,0,6.4,2.9,6.4,6.4v4.3
                C331.9,134,329,136.9,325.5,136.9z"/>
            <path className="bb" d="M376.5,85.8h-72.3c-3.5,0-6.4-2.9-6.4-6.4V58.1c0-3.5,2.9-6.4,6.4-6.4h72.3c3.5,0,6.4,2.9,6.4,6.4v21.3
                C382.9,82.9,380.1,85.8,376.5,85.8z"/>
            <path className="bb" d="M478.7,85.8h-55.3c-3.5,0-6.4-2.9-6.4-6.4V58.1c0-3.5,2.9-6.4,6.4-6.4h55.3c3.5,0,6.4,2.9,6.4,6.4v21.3
                C485.1,82.9,482.2,85.8,478.7,85.8z"/>
            <path className="bb" d="M478.7,136.9h-55.3c-3.5,0-6.4-2.9-6.4-6.4v-4.3c0-3.5,2.9-6.4,6.4-6.4h55.3c3.5,0,6.4,2.9,6.4,6.4v4.3
                C485.1,134,482.2,136.9,478.7,136.9z"/>
            <path className="bb" d="M376.5,187.9h-72.3c-3.5,0-6.4-2.9-6.4-6.4v-4.2c0-3.5,2.9-6.4,6.4-6.4h58.5c1.8,0,3.2-1.4,3.2-3.2v-41.5
                c0-3.5,2.9-6.4,6.4-6.4h4.2c3.5,0,6.4,2.9,6.4,6.4v55.3C382.9,185.1,380.1,187.9,376.5,187.9z"/>
            <path className="bb" d="M134,187.9h72.3c3.5,0,6.4-2.9,6.4-6.4v-4.2c0-3.5-2.9-6.4-6.4-6.4h-58.5c-1.8,0-3.2-1.4-3.2-3.2v-41.5
                c0-3.5-2.9-6.4-6.4-6.4H134c-3.5,0-6.4,2.9-6.4,6.4v55.3C127.6,185.1,130.5,187.9,134,187.9z"/>
            <path className="bb" d="M87.2,426.2H31.9c-3.5,0-6.4,2.9-6.4,6.4v21.3c0,3.5,2.9,6.4,6.4,6.4h55.3c3.5,0,6.4-2.9,6.4-6.4v-21.3
                C93.6,429.1,90.7,426.2,87.2,426.2z"/>
            <path className="bb" d="M206.3,426.2H134c-3.5,0-6.4,2.9-6.4,6.4v21.3c0,3.5,2.9,6.4,6.4,6.4h72.3c3.5,0,6.4-2.9,6.4-6.4v-21.3
                C212.7,429.1,209.9,426.2,206.3,426.2z"/>
            <path className="bb" d="M87.2,375.1H31.9c-3.5,0-6.4,2.9-6.4,6.4v4.3c0,3.5,2.9,6.4,6.4,6.4h55.3c3.5,0,6.4-2.9,6.4-6.4v-4.3
                C93.6,378,90.7,375.1,87.2,375.1z"/>
            <path className="bb" d="M325.5,375.1h-55.3c-3.5,0-6.4-2.9-6.4-6.4l0-38.3c0-3.5-2.9-6.4-6.4-6.4h-4.3c-3.5,0-6.4,2.9-6.4,6.4
                l0,38.3c0,3.5-2.9,6.4-6.4,6.4h-55.3c-3.5,0-6.4,2.9-6.4,6.4v4.3c0,3.5,2.9,6.4,6.4,6.4h140.4c3.5,0,6.4-2.9,6.4-6.4v-4.3
                C331.9,378,329,375.1,325.5,375.1z"/>
            <path className="bb" d="M376.5,426.2h-72.3c-3.5,0-6.4,2.9-6.4,6.4v21.3c0,3.5,2.9,6.4,6.4,6.4h72.3c3.5,0,6.4-2.9,6.4-6.4v-21.3
                C382.9,429.1,380.1,426.2,376.5,426.2z"/>
            <path className="bb" d="M478.7,426.2h-55.3c-3.5,0-6.4,2.9-6.4,6.4v21.3c0,3.5,2.9,6.4,6.4,6.4h55.3c3.5,0,6.4-2.9,6.4-6.4v-21.3
                C485.1,429.1,482.2,426.2,478.7,426.2z"/>
            <path className="bb" d="M478.7,375.1h-55.3c-3.5,0-6.4,2.9-6.4,6.4v4.3c0,3.5,2.9,6.4,6.4,6.4h55.3c3.5,0,6.4-2.9,6.4-6.4v-4.3
                C485.1,378,482.2,375.1,478.7,375.1z"/>
            <path className="bb" d="M376.5,324.1h-72.3c-3.5,0-6.4,2.9-6.4,6.4v4.2c0,3.5,2.9,6.4,6.4,6.4h58.5c1.8,0,3.2,1.4,3.2,3.2v41.5
                c0,3.5,2.9,6.4,6.4,6.4h4.2c3.5,0,6.4-2.9,6.4-6.4v-55.3C382.9,326.9,380.1,324.1,376.5,324.1z"/>
            <path className="bb" d="M134,324.1h72.3c3.5,0,6.4,2.9,6.4,6.4v4.2c0,3.5-2.9,6.4-6.4,6.4h-58.5c-1.8,0-3.2,1.4-3.2,3.2v41.5
                c0,3.5-2.9,6.4-6.4,6.4H134c-3.5,0-6.4-2.9-6.4-6.4v-55.3C127.6,326.9,130.5,324.1,134,324.1z"/>
            <path className="bb" d="M87.2,341.1H14.8c-3.5,0-6.4-2.9-6.4-6.4v-55.3c0-3.5,2.9-6.4,6.4-6.4h72.3c3.5,0,6.4,2.9,6.4,6.4v55.3
                C93.6,338.3,90.7,341.1,87.2,341.1z"/>
            <path className="bb" d="M87.2,239H14.8c-3.5,0-6.4-2.9-6.4-6.4v-55.3c0-3.5,2.9-6.4,6.4-6.4h72.3c3.5,0,6.4,2.9,6.4,6.4v55.3
                C93.6,236.1,90.7,239,87.2,239z"/>
            <path className="bb" d="M495.7,239h-72.3c-3.5,0-6.4-2.9-6.4-6.4v-55.3c0-3.5,2.9-6.4,6.4-6.4h72.3c3.5,0,6.4,2.9,6.4,6.4v55.3
                C502.1,236.1,499.2,239,495.7,239z"/>
            <path className="bb" d="M495.7,341.1h-72.3c-3.5,0-6.4-2.9-6.4-6.4v-55.3c0-3.5,2.9-6.4,6.4-6.4h72.3c3.5,0,6.4,2.9,6.4,6.4v55.3
                C502.1,338.3,499.2,341.1,495.7,341.1z"/>
          </g>
          <g className="pacman-wrapper">
            <g className='pacman-full'>
              <path className="pacman lower" d="M-10,255.9H0c0,2.8-2.2,5-5,5l0,0C-7.8,261-10,258.7-10,255.9z" />
              <path className="pacman upper" d="M-10,256H0c0-2.7-2.2-5-5-5l0,0C-7.8,251.1-10,253.3-10,256z" />
            </g>
          </g>
          <g id="ghosts">
            <g className='ghost-wrapper red'>
              <g className="ghost">
                <path d="M-4.9,249.8L-4.9,249.8c-3.1,0-5.6,2.5-5.6,5.5v5.6v0.2c0.1,0.4,0.1,0.6,0.2,0.9c0.2,0.6,0.4,0.4,1.1-0.3
                    l0.4-0.4c0.3-0.3,0.8-0.3,1.1,0l0.7,0.7c0.3,0.3,0.8,0.3,1.1,0l0.7-0.7c0.3-0.3,0.8-0.3,1.1,0l0.7,0.7c0.3,0.3,0.8,0.3,1.1,0
                    l0.7-0.7c0.3-0.3,0.8-0.3,1.1,0l0.4,0.4c0.7,0.8,1.1,0.9,1.2-0.2c0-0.1,0-0.1,0-0.2l0,0v-6.1C0.7,252.2-1.8,249.8-4.9,249.8z"/>
                <circle className="eye" cx="-1.4" cy="254.8" r="1.6" />
                <circle className="pupil" cx="-0.8" cy="254.8" r="0.7" />
                <circle className="eye" cx="-6" cy="254.8" r="1.6" />
                <circle className="pupil" cx="-5.4" cy="254.8" r="0.7" />
              </g>
            </g>
            <g className='ghost-wrapper pink'>
              <g className="ghost">
                <path d="M-4.9,249.8L-4.9,249.8c-3.1,0-5.6,2.5-5.6,5.5v5.6v0.2c0.1,0.4,0.1,0.6,0.2,0.9c0.2,0.6,0.4,0.4,1.1-0.3
                    l0.4-0.4c0.3-0.3,0.8-0.3,1.1,0l0.7,0.7c0.3,0.3,0.8,0.3,1.1,0l0.7-0.7c0.3-0.3,0.8-0.3,1.1,0l0.7,0.7c0.3,0.3,0.8,0.3,1.1,0
                    l0.7-0.7c0.3-0.3,0.8-0.3,1.1,0l0.4,0.4c0.7,0.8,1.1,0.9,1.2-0.2c0-0.1,0-0.1,0-0.2l0,0v-6.1C0.7,252.2-1.8,249.8-4.9,249.8z"/>
                <circle className="eye" cx="-1.4" cy="254.8" r="1.6" />
                <circle className="pupil" cx="-0.8" cy="254.8" r="0.7" />
                <circle className="eye" cx="-6" cy="254.8" r="1.6" />
                <circle className="pupil" cx="-5.4" cy="254.8" r="0.7" />
              </g>
            </g>
            <g className='ghost-wrapper blue'>
              <g className="ghost">
                <path d="M-4.9,249.8L-4.9,249.8c-3.1,0-5.6,2.5-5.6,5.5v5.6v0.2c0.1,0.4,0.1,0.6,0.2,0.9c0.2,0.6,0.4,0.4,1.1-0.3
                    l0.4-0.4c0.3-0.3,0.8-0.3,1.1,0l0.7,0.7c0.3,0.3,0.8,0.3,1.1,0l0.7-0.7c0.3-0.3,0.8-0.3,1.1,0l0.7,0.7c0.3,0.3,0.8,0.3,1.1,0
                    l0.7-0.7c0.3-0.3,0.8-0.3,1.1,0l0.4,0.4c0.7,0.8,1.1,0.9,1.2-0.2c0-0.1,0-0.1,0-0.2l0,0v-6.1C0.7,252.2-1.8,249.8-4.9,249.8z"/>
                <circle className="eye" cx="-1.4" cy="254.8" r="1.6" />
                <circle className="pupil" cx="-0.8" cy="254.8" r="0.7" />
                <circle className="eye" cx="-6" cy="254.8" r="1.6" />
                <circle className="pupil" cx="-5.4" cy="254.8" r="0.7" />
              </g>
            </g>
            <g className='ghost-wrapper orange'>
              <g className="ghost">
                <path d="M-4.9,249.8L-4.9,249.8c-3.1,0-5.6,2.5-5.6,5.5v5.6v0.2c0.1,0.4,0.1,0.6,0.2,0.9c0.2,0.6,0.4,0.4,1.1-0.3
                    l0.4-0.4c0.3-0.3,0.8-0.3,1.1,0l0.7,0.7c0.3,0.3,0.8,0.3,1.1,0l0.7-0.7c0.3-0.3,0.8-0.3,1.1,0l0.7,0.7c0.3,0.3,0.8,0.3,1.1,0
                    l0.7-0.7c0.3-0.3,0.8-0.3,1.1,0l0.4,0.4c0.7,0.8,1.1,0.9,1.2-0.2c0-0.1,0-0.1,0-0.2l0,0v-6.1C0.7,252.2-1.8,249.8-4.9,249.8z"/>
                <circle className="eye" cx="-1.4" cy="254.8" r="1.6" />
                <circle className="pupil" cx="-0.8" cy="254.8" r="0.7" />
                <circle className="eye" cx="-6" cy="254.8" r="1.6" />
                <circle className="pupil" cx="-5.4" cy="254.8" r="0.7" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}

function DesignBackgroundAnimation() {
  const commonProps: React.SVGAttributes<SVGPathElement> = {
    fill: "none",
    stroke: "white",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeMiterlimit: 10,
    className: "des-str-path"
  }

  // const strLngth = {
  //   s1: 428.31689453125,
  //   s2: 420.57647705078125,
  //   s3: 100.85675811767578,
  //   s4: 117.53598022460938,
  //   s5: 112.3761978149414,
  // }

  const strLngth = {
    s1: 107.05818176269531,
    s2: 105.13661193847656,
    s3: 25.24056053161621,
    s4: 29.38809585571289,
    s5: 28.11471939086914,
  }

  return(
    <div className='section-bg'>
      <div className="bg-wrapper">
        {/* <RevealText
          strokeData={BIG_S1}
          fill={{ color: ['#ffe5aa', '#ffe5aa'], angle: 65, opacity: 0.75 }}
          speed={800} // units/sec
          minDuration={0.15}
          maxDuration={0.2}
          letterGap={0}
          startDelay={0.1}
          easing={'ease-out'} // {"cubic-bezier(0, 0, 0.65, 0.6)"}
          fallbackTextColor="#111827"
        />
        <RevealText
          strokeData={SMALL_S1}
          fill={{ color: ['#ec348c', '#ec348c'], angle: 65, opacity: 0.75 }}
          speed={800} // units/sec
          minDuration={0.15}
          maxDuration={0.2}
          letterGap={0}
          startDelay={0.1}
          easing={'ease-out'} // {"cubic-bezier(0, 0, 0.65, 0.6)"}
          fallbackTextColor="#111827"
        />
        <RevealText
          strokeData={SMALL_S2}
          fill={{ color: ['#ef5841', '#ef5841'], angle: 65, opacity: 0.75 }}
          speed={800} // units/sec
          minDuration={0.15}
          maxDuration={0.2}
          letterGap={0}
          startDelay={0.1}
          easing={'ease-out'} // {"cubic-bezier(0, 0, 0.65, 0.6)"}
          fallbackTextColor="#111827"
        />
        <RevealText
          strokeData={SMALL_S3}
          fill={{ color: ['#ffd4b9', '#ffd4b9'], angle: 65, opacity: 0.75 }}
          speed={800} // units/sec
          minDuration={0.15}
          maxDuration={0.2}
          letterGap={0}
          startDelay={0.1}
          easing={'ease-out'} // {"cubic-bezier(0, 0, 0.65, 0.6)"}
          fallbackTextColor="#111827"
        />
        <RevealText
          strokeData={BIG_S2}
          fill={{ color: ['#ff6a6a', '#ff6a6a'], angle: 65, opacity: 0.75 }}
          speed={800} // units/sec
          minDuration={0.15}
          maxDuration={0.2}
          letterGap={0}
          startDelay={0.1}
          easing={'ease-out'} // {"cubic-bezier(0, 0, 0.65, 0.6)"}
          fallbackTextColor="#111827"
        /> */}
        <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 128 128">
          <defs>
            <mask id="des-str1">
              <path {...commonProps} strokeWidth={8.75} strokeDasharray={strLngth.s1} strokeDashoffset={strLngth.s1} style={{ animationDelay: '0.2s' }}
                d="M61.2 5.7S50.3 24.4 45.5 25.3C39.4 26.5 21.3 46.2 20.7 50 19.5 59.1 3.6 88.5 2.8 92.4"/>
            </mask>
            <mask id="des-str2">
              <path {...commonProps} strokeWidth={10.5} strokeDasharray={strLngth.s2} strokeDashoffset={strLngth.s2} style={{ animationDelay: '0.35s' }}
                d="M58.6 123.2c14.5-8 18.4-31.9 24.2-37.5 4.3-4.2 25-12.4 30.2-24.6 4.1-9.6 9.8-17.7 9.8-17.7"/>
            </mask>
            <mask id="des-str3">
              <path {...commonProps} strokeWidth={11.25} strokeDasharray={strLngth.s3} strokeDashoffset={strLngth.s3} style={{ animationDelay: '0.6s' }}
                d="M61.2 54.4s-9.9 2.1-20.3 14.4"/>
            </mask>
            <mask id="des-str4">
              <path {...commonProps} strokeWidth={11.25} strokeDasharray={strLngth.s4} strokeDashoffset={strLngth.s4} style={{ animationDelay: '0.8s' }}
                d="M48.9 73.1c2.3-3.3 20.7-14.7 24.1-16.7"/>
            </mask>
            <mask id="des-str5">
              <path {...commonProps} strokeWidth={9.25} strokeDasharray={strLngth.s5} strokeDashoffset={strLngth.s5} style={{ animationDelay: '1s' }}
                d="M81.9 58.2s-9.6 2-23.7 14.7"/>
            </mask>
          </defs>
          <g>
            <path mask="url(#des-str1)" fill="#ffe5aa" fillOpacity={0.75} 
              d="M40.4 26.5c2.3-1.2 4.1-2.9 5.7-4.9.5-.7 1.1-1.3 1.6-2 .4-.6.8-1.3 1.3-1.9 1.3-2 3.1-4 5-5.7-.3.1-.1.4-.4.6.5-1 1.5-1.9 2.2-2.6-.5 1 .9 2.4-.9 3 1.5-1.9 3.6-2.6 5.5-3.6-.3.1-.6.3-1 .2 1.8.8 2.9-1.2 3.7-2.3.2 1-.1 1.8-.9 2.3.3-.1.4-.6.7-.7-.8 1.1-.8 2.5-2.5 2.7 1.1-.6 2.4-.9 3.2-2-4 3.9-5.9 9.5-10.7 12.5l-1.8 1.5c-.6.5-1.2 1-1.9 1.4.8-.4 1.7-.9 2.3-1.6-3.4 3.6-6.5 7-11 9.3-1.7.9-2.5 2.7-3.7 4.4-.6.6-1.3 1.2-1.9 1.8C29 44 23.3 49.3 22.2 57.6c-.3.7-.5 1.5-.7 2.3-.3.8-.6 1.6-.8 2.4-.2.8-.4 1.7-.5 2.6-.3.8-.7 1.6-1 2.4-.5.9-1 1.8-1.6 2.7-.5.9-1.1 1.8-1.6 2.7-.5.9-1.1 1.8-1.6 2.7l-1.5 2.7c-2.7 4.6-3 10.1-6.4 14.3 3.2-4.5 3.4-10.3 5.9-14.8.3-.5.6-1.1.8-1.6.3-.5.5-1 .8-1.6.1-.1.1-.2.1-.2-.1.1-.2.2-.2.3-.2.3-.3.5-.4.8-.3.6-.6 1.1-.9 1.7-2.1 2.7-1.8 6-3.5 8.7-.3-1.9 1.3-3.5 1-5.5-2.4 5.5-3.8 11.5-9 15 6.2-5.1 5.9-13.8 10-20.7.5-.8.9-1.6 1.4-2.5 1-1.6 1.9-3.2 2.8-4.8.3-.5.4-.8.4-.9 0-.1 0-.2.4-.8.1-.1.2-.3.2-.4.5-.6.7-1.4 1-2.3 0-1 .4-1.6 1.1-2.3l-.1.4c.2-.6.4-1.2.6-1.7.6-.8.8-1.7.9-2.6.2-1.1.4-1.9.7-2.8-.4.6-.5 1-.7 1.4.4-1.3.4-2.7.5-3.8-1.1.6-.5 1.7-1 2.7 0 .9 0 1.9-.4 2.7 0-.7 0-1.4.4-2-.2.6-.4 1.2-.5 1.7-.2.5-.4 1-.7 1.6l-.6 1.5-.6 1.5c-.4.7-.7 1.3-1.2 1.8-.4.6-.7 1.2-1.1 1.8-1.5 2.5-3.1 5-4.5 7.6-.4.7-.9 1.5-1.3 2.2-2.7 3.9-2.1 8.9-4.3 12.9 1-3.4 2.2-6.5 2.1-10-.9 3.7-1.1 7.3-3 10.4 2-3.5 1.5-7.9 3.1-11.5-.8 1.1-.9 2.3-1.3 3.5.5-2.4 1.6-5.1 2.6-7.3.3-.5.5-1 .8-1.5l2.1-3.9V67l-.1.1c-.5.8-1.1 1.5-1.6 2.5-.4.8-1 1.7-1.5 2.5-.1.2-.3.5-.5.8.1 0-.1.2-.2.1.4-.7.7-1.3 1.1-2 .3-.5.3-.6.1-.4-.2.2-.2.1 0-.3 1-1.7 2-3.4 2.9-5.1 0-.1.1-.1.1-.2.7-1 1.2-1.9 1.6-2.8.2-.4.4-.6.5-.7.2-.2.3-.3.5-.7.1-.6.7-.9.8-1.3-.6.3-.4.6-.5 1 .4-.7.7-1.3 1.1-2 .3-.7.5-1.5.8-2.3.2-.8.5-1.5.7-2.3 1.8-6 3.3-13.1 9.6-15.8l-.3.1c.3-.1.7-.7 1-.9.1.3-.1.4 0 .7 1.8-1.3 2.7-2.9 3.9-4.4.7-.8 1.1-1.8 1.5-2.7.4-.9.8-1.9 1.5-2.5-.3.8-.6 1.6-1 2.4-.4.8-.9 1.5-1.3 2.1l-.9 1.5c-.3.6-.6 1.3-1.1 1.8.4-.7.9-1.2 1.4-1.8.3-.7.7-1.3 1.1-1.9l1.2-1.8c1.6-2 3.5-3.8 6.1-4.3.4.1.7.1 1 .1zM15 62.8c-.4.6-.7 1.2-1.1 1.8-1.7 2.8-3.3 5.5-4.9 8.3-.3.6-.7 1.1-1 1.7-.3.8-.4 1.2-.7 2.1.4-.6.8-1.1 1-1.8.4-.8.9-1.6 1.3-2.4.5-.8.9-1.6 1.4-2.4.4-.9 1.1-1.8 1.6-2.7.4-.7.8-1.4 1.3-2.2s.9-1.5 1.3-2.2c.3-.6.7-1.1 1-1.7.4-.8 1-1.6 1.4-2.5.4-.9.7-1.9.6-3-.1 1-.5 1.9-.9 2.7-.4.8-.9 1.5-1.3 2.4-.3.7-.7 1.3-1 1.9zm-6.5 20c-.1 0 .1.3.1.3.5-1 .6-2.1.8-3.2-.1.4-.3.8-.5 1.4-.2.4-.3 1-.4 1.5zm33.4-57c1.7-1.7 3.3-3.5 4.9-5.4.5-.6 1-1.3 1.5-1.9.4-.5.8-1 1.3-1.5 1.5-1.7 2.6-3.7 4.1-5.5-2 2.1-3.5 4.7-5.2 6.6L47 19.9c-1.5 1.8-3.1 3.7-4.6 5.5-.5.2-.6.3-.5.4zM17.7 49.7c-.1 1.1-.2 2.2-.4 3.5-.1.6-.3 1.2-.5 1.8s-.5 1-.8 1.6c-.3.5-.5.9-.8 1.4-.3.5-.6.9-.9 1.3-.3.5-.6 1-.8 1.4l-3.3 5.7c-.5.8-.9 1.7-1.4 2.5 0 .1-.1.2 0 .1l.2-.2c.2-.3.3-.5.5-.8.7-1.2 1.3-2.4 2-3.5.4-.7.8-1.3 1.2-2s.7-1.3 1.1-1.9c.4-.7.9-1.4 1.3-2.2 1-1.2 1.5-2.6 1.9-4.1.2-.7.3-1.5.5-2.2.9-2.1.5-4.8 1.9-6.9-.4.6-.7 1.4-1.1 2.1-.3.7-.5 1.5-.6 2.4zm2.3-6.4c0 .5-.3.7-.4 1.1 2.5-4.5 8-6.3 11.1-10.5.4-.6.7-1.3 1-2-.5.6-.9 1.2-1.3 1.8-1.7 3.8-6 5-8.8 7.9-.7.5-1.2 1.1-1.6 1.7zM61.2 2.1c-1.3 1.8-2.2 4.1-3.6 5.5 1.9-1 3.3-3.1 3.6-5.1v-.4zM6.4 74.5c-2 3.3-2 7.2-2.8 11.2.7-3.9 1.5-7.9 3-11.5 0 0-.1.2-.2.3zm-5 16.8c1.3-.6 2-2 2.8-3.1-1 .9-1.3 2.1-2.5 2.8-.2.1-.2.2-.3.3zm32.4-63.1c.1.1-.1.2-.1.2 1.8-1.3 3.4-2.9 5.6-3.3-1.4 0-2.4.9-3.5 1.4-.8.4-1.5 1-2 1.7z" />
            <path mask="url(#des-str2)" fill="#ff6a6a" fillOpacity={0.75} 
              d="M122.5 41.2c-.3.1-1.1.4-.3.4 1 .2 1.8-.6 2.8-.6-.3 1-1.6 1.1-1.6 2.1 1.3-.8 2.4-1.6 3.7-2.1-.8.8-1.5 1.6-2.2 2.5-.7.8-1.3 1.7-1.9 2.6-3.1 4-3.5 9.2-5.4 13.8 1.1-1.3 1.6-2.6 1.9-4.1C118 64.2 109.4 68 104.3 74c-.6.6-1.2 1.2-1.9 1.8-.7.6-1.2 1.1-2 1.7.8-.3 1.1-1 1.8-1.1 0 .3-.3.5-.3.8 1.3 0 1.8-1.3 2.9-1.9-.7.8-1.5 1.7-2.4 2.4-2.6 2.1-5.5 4.2-8.9 5.3 1.6-1.1 3.4-2.1 5.2-2.7-8.3 2.8-16 9.4-18.7 17.9-.5 1.3-1 2.6-1.4 3.8-.5 1.3-1.1 2.6-1.6 3.9-.5 1.3-1.1 2.6-1.6 3.9v-.5c-.9 3.6-3.5 6.7-6.4 8.9-.9.8-1.9 1.6-2.7 2.5v-.3c-1.3.8-2.1 1.8-3.4 2.5-1.2.8-2.4 1.4-3.7 2 .3-.5.5-.8 1.1-1-.5.3-.8.3-1.3.3 0-.5.5-1 .8-1.6-1.5 0-2.1 2.4-3.9 1.6.9-.7 1.7-1.4 2.5-2.1.8-.7 1.6-1.5 2.3-2.2 1.1-1.1 2.1-2.3 3-3.5 2.5-3.4 4.9-6.8 6.3-10.8.5-1.4 1.1-2.9 1.8-4.3.5-1.3 1-2.6 1.4-3.9.3-1.1.7-2.2 1.1-3.3 2.9-6.7 8.4-12.4 15.1-15.8 1.1-.6 2.3-1.1 3.6-1.5-1.5.4-2.9.8-4.2 1.4-6.3 3-10.8 8.2-14 14.2-.7 1.2-1.4 2.4-2 3.6-.2 1-.4 1.9-.7 2.9-.2.9-.5 1.9-.9 2.8-.3.9-.7 1.8-1.2 2.7-1.6 3.4-3.5 6.3-5.5 9.4-.5.7-1 1.4-1.6 2s-1.1 1.4-1.6 2.1c-.8.9-1.5 1.8-2.3 2.7-1.6 1.8-3.2 3.5-4.8 5.2-.5-1 .3-1.8.8-2.6 1.3-1.6 2.9-3.2 4.4-4.7.8-.8 1.6-1.5 2.3-2.3 1-1.1 2.1-2.1 3.2-3.3 2-2.1 3.3-4.7 4-7.6.4-1.3.7-2.5 1-3.8l.6-2.7c.2-.9.5-1.8.7-2.6.4-1.1.9-2.1 1.6-3.1 3.7-5.7 8.7-10.7 14.5-14.6.7-.5 1.4-.9 2.2-1.4 2.2-1.3 4.6-2.5 7-3.6l3-2.7c11.1-5.6 15.5-15.9 19.4-26.8.5-.9 1.1-1.7 1.8-2.4s1.5-1.3 2.4-1.8c0 .5-.5.5-.9.7 0 .8.2.7.3.7zm-42.9 62.5c.2-.8.2-1 .1-1.2-.1.4-.2 1-.1 1.2zm3.2-10.4c-.7-.8-.1.2-.2.2s0 0 .2-.2zm29.1-33.6c-.6 1-1.6 2-2.2 2.8.7-.8 2-1.8 2.2-2.8zm-51.5 57.4c-1.8 1.3-2.7 2.2-3.1 2.9 1.5-1.1 1.8-1.7 3.1-2.9zm38-44.7c-1.3.8-2 1.3-2.1 1.7.6-.6 1.7-1.2 2.1-1.7zm-32.6 38.8c1.7-1.9 1.7-1.9 1.5-2.3-.6 1-1.4 1.8-1.5 2.3zm2.4-3.8c.4-.7.4-1.2.6-2-.7 1.6-.7 1.6-.6 2zm30.2-35c.7-.5 1.3-1 1.8-1.5-.8.7-1.8 1.3-1.8 1.5zm.4 9c-1 .4-1.5.7-1.4.9.9-.4 1-.6 1.4-.9zm7.4-15.7c-.4.4-1 .8-1 1.1.4-.4.9-.8 1-1.1zM75.4 89.3c-.4.7-.7 1.3-.9 1.7.8-1.1.8-1.1.9-1.7zm-21.6 35.5c.3-.3.3-.4.3-.5-.2.1-.4.4-.3.5zm12-13.6c-.8.7-1.4 1.2-1.1 1.3.6-.6 1.5-1.4 1.1-1.3zm-10 10.8c-.2 0-.3.3-.5.4.2-.2.4-.3.5-.4zm43-40.5c-.2-.1 1-.6.5-.6-.7.4-1.1.6-.5.6 0-.1 0 0 0 0zm-38.4 35.6c0-.1.5-.5.5-.5-.3 0-.8 0-1.1.9.2 0 .4-.4.6-.4zm51.9-57.8c.2-.3.5-.9.7-1.2-.2.3-.2.3-.5.6-.1.3-.3.5-.2.6zM99.9 80.4c.6.1.6-.1.6-.3 0 0-.3 0-.3.1-.3.1-.4.2-.3.2z" />
            <path mask="url(#des-str3)" fill="#ec348c" fillOpacity={0.75} 
              d="M66.3 53.6c-.1 0-.2.1-.3.3-.1.3-.1.6-.1.9 0 .6-.1.9-.6 1.1-.1 0-.3.1-.3.3-.1.3 0 .4.1.4h.1c0 .2.2.3.1.5-.1.3-.3.3-.4.4-.5.2-1 .2-1.5.3-.5 0-1 .1-1.4.1-.1 0-.1 0-.2.1-.1 0-.1.1-.2.2 0 .1 0 .1.1.2s.4-.1.5 0c-.1.1-.3.3-.4.2-.1-.1-.2 0-.4 0-.4.1-.8.2-1.2.2-.4.1-.9.2-1.3.3-.8.2-1.7.6-2.6.9-.5.2-.9.3-1.4.6-.1.1-.2.1-.2.2v.2c.1.4.1.4-.2.9-.1.1-.2.2-.3.4-.1.3-.1.4.1.3.2-.1.3 0 .4-.1-.8 1-1.6 1.6-2.4 2.4-.8.7-1.6 1.5-2.5 1.9.2-.4.4-.6.6-.8.5-.4 1.1-1 1.7-1.4-.2-.2-.5 0-.7.2-.5.4-1.1.8-1.6 1.3-.3.3-.6.4-.8.3-.1-.1-.2 0-.4.1-.5.3-.9.6-1.4.9-.1.1-.2.1-.2.1-.4.2-.7.4-.9-.1-.1-.2-.2-.1-.1-.4-.1 0-.3.4-.4.2 0-.1-.1 0-.2 0l-.3.3c-.1.1-.2.2-.2 0 0 .1-.1.1-.1.2-.2.7-.6 1-1 1.3-.3.2-.4.6-.6.9-.1.1 0 .3-.2.3-.1.1-.3.1-.3-.1s-.2-.1-.3 0c-.4.2-.7.6-1 1-.4.5-.7.9-1.2 1.5.2-.5.4-.8.7-1.1-.2.1-.4.3-.5.5-.1.2-.3.3-.4.4-.2.2-.4.2-.4-.1-.1-.5-.1-1-.3-1.4-.1-.1 0-.3.2-.6-.3.1-.5-.1-.7-.2-.1-.1-.1-.3 0-.5.2-.3.2-.5.1-.7.1-.2.2-.2.3-.3.2-.1.3-.4.3-.6 0-.4.2-.6.4-.9.2-.3.5-.7.7-1 0-.3-.2-.4-.4-.5-.2-.1-.1-.2 0-.5.2-.4.5-.7.7-1 1.2-1.2 2.3-2.3 3.5-3.3.9-.8 1.9-1.5 2.8-2.1 1.7-1.1 3.3-2.1 4.9-2.9 1.4-.6 2.8-1.2 4.1-1.8.1-.1.2.1.4-.1s.3-.1.5-.2c.1-.1.2-.3.4-.4v-.1c-.2-.1-.3.3-.5.3s-.3-.1-.5.1-.3.1-.5 0c-.1 0-.3 0-.4.1-.6.6-1.2.7-1.8.9h-.4c-.1 0-.2-.1-.3.3-.1.2-.4.3-.5.2-.1-.2-.4 0-.6.2-.5.6-1 .6-1.4 1-.1 0-.1.1-.2 0-.1-.2-.2-.1-.3.1-.1.2-.2.2-.3.3-.1.1-.2.1-.1-.2.1-.1-.3 0-.3 0-.2.3-.4.3-.6.4-.5.2-.9.8-1.4.8-.1 0-.1.1-.2.2-.3.5-.6.7-.9.9-.7.3-.7.3-1.5 1.2-.1.1-.2.1-.2 0 0-.2-.2-.1-.3.1-.3.6-.7.7-1.1 1.1l-.9.9c-.3.3-.6.5-.9.9-.2.3-.5.5-.7.7-.2.1-.4.6-.7.7.2-.5.5-.8.7-1.1.9-1 1.9-2 2.8-2.9.9-1 1.9-1.7 2.8-2.5.8-.7 1.6-1.2 2.4-1.7 1.1-.7 2.3-1.4 3.4-1.9s2.2-1 3.3-1.4c1.5-.5 3-1 4.4-1.2 1.2-.2 2.5-.3 3.6-.1.7.1 1.4.2 2.1.4h.3c.2 0 .5-.1.5.3 0 .2.3.3.4.5 0 .7-.2.7-.4.8.2 0 .2-.1.2-.2 0 0-.1-.1-.1 0-.1 0-.1.1-.1.2zm-23 15.7c.2-.1.4-.3.5-.5-.2.1-.3.2-.5.5zm4.1-3.8s.1-.1.2-.1v-.1s-.1 0-.2.2zm16.8-14.1c-.3.2-.4-.1-.8 0 .2 0 .3.5.8 0zm-19.9 8.2c-.3-.1-.6.2-.9.8.3-.2.6-.6.9-.8zm15.4-7.9c-.1-.3-.3-.3-.7.3.4-.3.5-.1.7-.3zm-13.5 6.1c.5-.2.5-.2.7-.6-.2.2-.5.3-.7.6zm1.1-.7c.2 0 .3-.2.6-.4-.4 0-.4 0-.6.4zm12.4-5.4c.1.1.3.1.6-.2-.2.1-.3-.2-.6.2zM51 66.6c-.1-.2-.3-.1-.5.2.2.1.3-.1.5-.2zm11.3-15.3c-.2.1-.3-.1-.5.2.2 0 .2.2.5-.2zm-9.4 2.4c-.2 0-.3.1-.5.2.3.1.3.1.5-.2zM41 62.9c.1-.1.2-.2.3-.4-.1.1-.2.2-.3.4zm5.2-5.1c-.1 0-.3 0-.4.4.1-.1.3-.1.4-.4zm-3.7 3.6s.1-.1.1-.2-.1-.1-.1 0-.1.1-.1.2h.1zm8.5 5.2c.1-.3.3-.2.4-.6-.2.1-.3.2-.4.6zm-6.7-7c0-.1.1-.1.1-.2l.1-.1s0-.1-.1-.1l-.1.1v.3zm19.9-8.1c0 .1-.1.1 0 .1h.2c.1-.1 0-.1 0-.2-.1 0-.2 0-.2.1zM51.7 65.8v.1c.1 0 .1-.1.2-.2v-.1l-.2.2zm-15.1 2.6s.1-.1.1-.2 0-.2.1-.1.2 0 .3-.1c.3-.3.5-.6.8-.9.5-.6 1-1.1 1.5-1.7.1-.1.2-.2.1-.4-.2-.2-.4.1-.5.2-.3.5-.9.8-1.1 1.4-.3.1-.4.4-.6.5h-.1c.1-.3.4-.8.7-1 .1-.1.2-.3.3-.4.6-.7 1.1-1.4 1.7-2.1.4-.5.7-.9 1-1.4.2-.3.6-.7.8-.9.6-.7 1.1-1.1 1.7-1.7.7-.7 1.5-1.2 2.2-1.8.6-.6 1.4-1 2-1.5.2-.2.5-.4.7-.7-.2.1-.4.1-.5.2-.4.3-.8.5-1.2.8-.3.3-.9.6-.9.6-.3.1-.7.2-.8.4-.6.5-.7.7-.9.8-.2.1-.5.3-.7.5-.3.4-.7.6-1 .9-.1.2-.2.3-.4.4-.2.1-.2.4-.3.4-.1 0-.7 1-.8 1-.1-.1-.1-.1 0-.3.2-.3.5-.5.7-.8 0-.2.1-.3.2-.4.3-.4.7-.8 1.1-1.2-.6.5-1.2 1.1-1.8 1.6l-.4.4-.4.4c-.3.3-.5.6-.8.8l-.3.3h.2c-.3.2-.4.6-.7.7.1-.1.1-.2.2-.3l-.4.4c.1.1 0 .2-.1.2 0 .3-.2.5-.4.6-.1.1-.3 0-.2.3 0 .1 0 .1-.1.1s-.2-.1-.2 0c.1.3-.4.3-.3.6 0 .2 0 .3-.2.3-.3 0-.2.3-.4.5-.1.1-.2.2 0 .3.1.1 0 .1-.1.1-.2-.1-.2 0-.2.2 0 .1-.1.1-.1.1-.3.1-.3.3-.2.5-.3-.1-.5.1-.6.7.1 0 .4-.1.5 0 .2.2.4-.1.6-.2-.1.3-.2.5-.3.7 0 .1-.1.2 0 .3.4.1.5 0 .5-.1zm8.9-10.9c-.1-.1 0-.2.1-.3 0 .1.1.2-.1.3zm-.2.1c0-.2.1-.2.2-.2h.1l-.1.1c-.1.1-.1.2-.2.1zm-4.6 4.2-.1-.1c.1-.1.2-.3.3-.2 0 .1 0 .3-.2.3zm-.8 1.1c-.1 0-.1 0-.2-.1 0 0 0-.1.1-.1.1-.1.1 0 .1.2.1-.1 0 0 0 0zm-3.1 4.4v-.1c.1-.1.1 0 0 .1.1-.1.1 0 0 0zm.3.3s-.1 0 0 0c-.1 0-.1-.1-.1-.1.1-.1.1-.3.3-.3.1.2-.2.2-.2.4zm24.1-17.3c0-.1-.1-.2-.2-.2-.5.1-1 .2-1.6.4-.1 0-.3.1-.4.1h-.5c-.4.2-.9.3-1.3.4-.1.1-.3.2-.5.2-.3.1-.7.2-1 .3-.4.1-.7.3-1.1.3-.1 0-.3.1-.3.3 0 .2.2.1.3.1h.1c.9-.3 1.8-.5 2.7-.8.5-.1 1-.2 1.5-.4.2-.1.4-.1.7-.1.2-.1.5.1.6-.3.2 0 .4.1.7 0 .1 0 .2 0 .3-.1v-.2c0-.1 0 0 0 0zm-7.4 2.1c0-.1-.1-.2-.2-.1s-.3.1-.4.2c-.5.4-1.1.7-1.6 1-.1.1-.2.1-.3.2-.1 0-.2.1-.1.2 0 .1.1.1.2.1s.1 0 .2-.1c.2-.1.4-.3.6-.4.5-.2 1-.6 1.5-.8l.1-.1v-.2zm-5 3.1h.1c.5-.4 1.1-.7 1.6-1.1.1-.1.1-.2 0-.3-.1-.1-.1 0-.2 0-.1.2-.3.3-.5.4l-1 1z" />
            <path mask="url(#des-str4)" fill="#ef5841" fillOpacity={0.75} 
              d="M54.3 70.4c-.4-.1-.5.2-.8.4-.5.3-1 .6-1.5 1-.4.4-.4.4-.3 1.1.2-.3.8-.2.4-.7-.1-.2.3-.2.4-.4.1-.3.4-.3.7-.4.1.3-.2.3-.2.5.4-.1.6-.3.9-.5-.1-.2-.3 0-.4-.3.6-.3 1-.9 1.7-.9.1.1.1.3.3.2.1 0 .1-.1.1-.2-.1-.1-.2 0-.3 0h-.1c.4-.6 1.1-.8 1.7-1.2.7-.5 1.4-.9 2.2-1.3.2-.1.3-.3.6 0 .2.2.3 0 .3-.4 0-.1 0-.1.1-.2.2-.1.4-.3.6-.4.4-.2.9-.3 1.3-.7.3-.3.9-.5 1.3-.7.5-.2.9-.5 1.4-.8.4-.2.9-.5 1.3-.7.1-.1.3-.1.3-.3.3 0 .6-.2.8-.3.2-.1-.1-.1-.2-.1.3-.4.6-.7 1.1-.5h.2c.3-.8 1.2-.8 1.9-1.1.2-.1.4 0 .6.3.1.3.3.6.7.5.3-.1.3.3.5.4-.2.3-.5.5-.8.7-1.6.9-3.1 2-4.6 2.9-1 .6-2 1.3-2.9 2-1.4 1-2.8 2-4.1 3-.4.3-.9.6-1.5.7.5-.4.9-.8 1.5-1.2-.3 0-.4.1-.5.1-.5.4-1 .8-1.4 1.1-.1.1-.3.3-.4 0-.1-.2-.3-.3-.1-.5.2-.2.4-.4.5-.6 1-.9 2.4-1.9 3.6-2.9.1-.1.4-.1.5-.4-1.1.5-1.9 1.2-2.7 1.8-.8.6-1.6 1.3-2.4 1.9 0-.3 0-.5.3-.6-.2-.1-.3-.1-.4 0-1.5.9-3 1.9-4.6 2.8-.6.4-1.1.8-1.7 1.1-.5.3-.9.7-1.5.4-.8.5-1.2 0-1.4-.7l-.3-.6c-.2-.2-.1-.4-.5-.3-.3.1-.7-.1-.7-.6-.1-.5-.5-1-.2-1.6.1-.3-.1-.8.1-1.1.1-.2-.2-.2-.4-.3-.5-.2-.5-.3-.2-.6.7-.6 1.2-1.4 2.1-1.7.2-.1.4-.2.5-.4.1-.2.1-.3.4-.3.1 0 .2 0 .2-.2-.1-.5.4-.6.7-.8.9-.6 1.8-1.1 2.6-1.6 1.1-.8 2.2-1.6 3.4-2.3.4-.2.6-.5 1-.8.4-.3.8-.8 1.4-.8.4 0 .4-.3.6-.4.5-.3 1.1-.6 1.6-.8h.2c.4-.7 1.3-.7 1.9-1.2.6-.5 1.3-.8 1.9-1.1 1.1-.6 2.2-1.1 3.3-1.5.5-.1.8-.4 1.3-.6.4-.2.8-.5 1.4-.3.2.1.4-.1.6-.1.8-.3 1.6-.7 2.5-.9.4-.1.9-.3 1.2-.5.4-.2.9-.4 1.3-.6.5-.2.7-.2 1.2.4.1.1.1.1.2.1.4-.1.3.1.3.4-.1.4 0 .5.5.5.2 0 .5-.1.6.2.1.3-.1.4-.3.6-.7.4-1.6.6-2.3 1-.2.1-.4.1-.5.2-.1 0-.1.1-.1.2s.2.1.3.1c.2-.1.4-.1.6-.2.1 0 .2 0 .3.1v.2l-.6.6c-1.1.7-2.3 1.2-3.4 1.8-2 1.2-4 2.3-6 3.5-1.8 1-3.6 2.2-5.3 3.3-2 1.3-3.9 2.8-5.7 4.3-.8.2-1 .4-.7.8zm-2.5.7c-.5.1-.7.5-1 .8.4-.2.8-.4 1-.8.2-.2.5-.4.7-.7-.4.2-.7.4-.7.7zm6.1-2.2c-.2 0-.3.1-.4.2.2 0 .3-.1.4-.2zm-8.6 4.7h-.1c-.1.1-.3.1-.2.3.2.1.3-.1.3-.3zm2.6-.4c0-.1 0-.1 0 0-.1-.1-.2-.1-.2 0-.1 0-.1.1 0 .1 0 0 .1-.1.2-.1zm2.4-2.8c.1-.3.4-.4.6-.5.6-.3 1.1-.6 1.7-1 .2-.1.5-.2.5-.5-1.1.4-1.9 1-2.7 1.6-.2.1-.2.3-.1.4zm11.9-6.7c.1-.3.5-.3.6-.5-.4-.2-.6.1-.9.2-.5.2-1 .3-1.4.7.2.2.3 0 .4 0 .5-.2.9-.5 1.3-.4zm-7.3 3.6c-.6.1-1 .5-1.4.9.5-.2 1.1-.4 1.4-.9zm0 0c.4 0 .4 0 .7-.4-.3.2-.6.1-.7.4zm11.9-13.8c0 .1.2 0 .3-.1-.1 0-.4-.1-.3.1z" />
            <path mask="url(#des-str5)" fill="#ffd4b9" fillOpacity={0.75} 
              d="M69.6 65.3c.1 0 .2-.1.2 0 .1.2-.1.1-.2.2-.7.4-1.4.9-2.1 1.3-.5.3-.9.7-1.4 1v.1c.1.1.1.2.3 0 .7-.4 1.3-.9 2-1.3.5-.3.9-.7 1.5-.7.1-.3.3-.4.6-.4.2-.2.2-.1.3.1.1.2 0 .2-.1.2-.1.3-.3.4-.6.5-.1.1-.4-.1-.3.2 0 .1 0 .1-.1.1s-.2-.1-.2-.1c0 .3-.5.2-.4.5 0 .2 0 .3-.3.2-.3-.1-.3.3-.5.4-.1.1-.2.1-.1.3.1.1-.1.1-.1.1-.2-.1-.2-.1-.2.1 0 .1-.1.1-.2.1-.4 0-.4.2-.4.5-.4-.2-.6 0-.8.5.1 0 .5 0 .5.1.2.2.4 0 .7 0-.2.3-.4.4-.5.7-.1.1-.2.2 0 .3.1.1.3.1.4 0 .1 0 .1-.1.1-.2s.1-.2.1-.1c.1.1.2 0 .3 0 .4-.2.8-.5 1.1-.7l2.1-1.2c.1-.1.3-.1.3-.4-.2-.2-.5-.1-.6.1-.5.4-1.2.5-1.5 1.1-.3 0-.5.2-.8.4h-.2c.2-.3.7-.6 1-.8.2-.1.3-.3.4-.4.8-.6 1.6-1.1 2.4-1.6.6-.3 1.2-.7 1.8-.9.2-.1.4-.3.6-.4.8-.5 1.7-.9 2.6-1.4 1-.5 2-.9 3-1.4.8-.4 1.7-.7 2.6-1 .3-.1.6-.3 1-.5h-.6c-.5.1-1.1.2-1.6.4-.4.2-.9.2-1.3.4l-.2-.1c.5-.3 1.1-.6 1.6-1 .7-.4 1.4-.7 2-1.2.4-.3.8-.3 1.2-.6.1-.1.3-.1.4-.3-.4.2-.8.3-1.2.4-.2.1-.3.2-.5 0 .1 0 .1 0 .2-.1.1-.4.4-.5.8-.5.1 0 .3 0 .4-.2-.2-.2-.4 0-.5-.1 0-.1.1-.2.1-.3l.1-.1c.2-.5.2-.6.5-.6 0-.1.4-.1.4-.2-.3 0-1-.1-1.2-.1.2-.3.3-.4.5-.4l.2-.2c.1-.1.1-.1.1-.3h-.1c-.1 0-.1 0-.2.1-.1 0-.3 0-.3-.1s.1-.1.2-.2c0 0 .1 0 .2-.1-.3-.2-.7 0-1-.1H84c0-.4-.4-.3-.7-.4l-.1-.1c-.1.1-.2.2-.3.2-.1 0-.1-.3-.3 0-.1.1-.3.1-.4 0-.1-.1-.2-.1-.4-.1 0 .2-.1.4-.1.6-.2 0-.2-.1-.3-.1-.2 0-.3-.1-.4-.3-.1-.1-.2-.4-.5-.3 0 .2.2.4.2.6 0 .1 0 .1.1.1s.1 0 .1.1-.1.1-.1.1c-.2 0-.4 0-.5-.2-.1-.1-.1-.2-.3-.3-.2.1 0 .2 0 .3-.4 0-.6-.1-.8-.3-.1.4.6.6.3 1-.2-.3-.2-.3-.5-.6-.2.1-.4.3-.6 0-.1-.1-.2 0-.2.1v.3c0 .2-.1.3-.3.2-.1 0-.2-.1-.2 0s.1.3-.1.3c-.1 0-.3 0-.4-.1-.1-.1-.2 0-.2.1s.2.2 0 .2c-.1 0-.2 0-.3-.1l-.2-.2c-.2-.2-.1-.3.1-.4.1 0 .1 0 .2-.1-.2 0-.5.1-.7.1 0 0-.1.1-.1.2-.3 0-.4 0-.3.3-.1.1-.2.2-.1.4.1.1.3.2.3.5-.2-.1-.3-.1-.5-.2-.1.1.1.3 0 .4-.3.1-.3-.1-.5-.3-.1-.1-.1-.1-.2 0-.1 0-.1.1 0 .2s.1.1.1.2-.1.2-.1.2c-.2-.1-.3 0-.5.2-.1.1-.1.1-.2 0s-.2-.1-.3 0c.1-.2-.2-.3-.2-.5-.3.1-.1.3-.2.5-.1-.1-.1-.2-.1-.2-.1-.2-.4-.3-.5-.1-.1.2-.1.3-.3.1-.1-.1-.1 0-.1.1s.1.1 0 .2c-.1 0-.1 0-.1-.1s-.1-.1-.2 0c.3-.2.2-.2.1-.2-.2 0-.3.1-.4.2-.1.1-.3 0-.4.1-.1.1-.1.2-.1.2.1 0 .2-.1.2 0 .1.1 0 .1-.1.2s-.2 0-.2-.1c-.2 0-.3-.1-.5 0v.1c.1.1.3.2.1.4-.2.2-.3 0-.4-.1 0 0-.1-.1-.2-.1 0 .5.2.4-.3.4 0 .2 0 .3-.2.1-.1-.1-.2-.2-.3-.1-.2 0-.3.1-.5.2-.1 0-.1.1 0 .2s.1.1.2.1c0 0-.1-.1 0-.1.1-.1.2-.1.3-.1.1 0 .2.1.1.2s-.2.1-.3 0c0 .1 0 .2-.1.2s-.2-.2-.3-.3c.1.2 0 .3 0 .5 0 0-.8.6-.8.5-.5-.3-.5-.3-1 .1.5-.1.5-.1.6.3-.3 0-.3-.3-.6-.3-.2.1-.3.1-.5.2-.1 0-.1.1-.2.1-.1.1.1.3 0 .3-.1.1-.1-.2-.2-.2s-.2.2-.3.2c-.3.1-.4.1-.2.3.1.1.3.3.1.4-.2.1-.3-.1-.4-.2-.1-.1-.1-.1-.2-.1 0 .3.3.4.3.6-.2.1-.3 0-.5 0v.3c-.2 0-.3-.1-.4-.2-.1-.2-.1-.2-.3 0-.2 0-.3.3-.5.3-.1 0-.1.2 0 .2.1.1.2.2.3.4v.2c0 .1-.1.1-.2 0s-.3-.1-.3-.1c0 .1.1.2 0 .3 0 .1-.1 0-.2 0 0 .1.1.2.1.3-.2-.1-.6 0-.6-.4 0-.1-.2-.1-.2.1-.2.1-.5.2-.7.5.2.1.6.2.5.6-.2-.2-.5-.3-.6-.6-.3.3-.6.5-.9.8-.1.1-.2.2-.1.3.1.1.3.3.2.4-.2.1-.3.4-.6.3.1.1 0 .2-.1.2 0 .1 0 .2-.1.2s-.2 0-.2-.1 0-.2-.1-.4c-.1 0-.2.2-.3.3-.3.3-.3.3-.1.7 0 0 .1.1 0 .2l-.3-.3c-.4.3-.5.3-.1.6 0 .1 0 .3-.2.2-.1 0-.2-.1-.2-.2-.1.1 0 .2-.1.2.3 0 .3 0 .3.4-.2-.1-.4 0-.2-.3-.4.2-.4.2-.3.6 0 .1 0 .1-.1.1s-.1 0-.1-.1l-.1-.1v.1c.2.2 0 .5 0 .7.1 0 .1.1.2 0 .1-.2.3-.3.6-.4-.3.3-.4.7-.8.9-.5.7-1 1.3-1.5 1.9-.1.1-.1.1-.2 0s-.1.1-.1.1c.1.3 0 .5-.3.5-.2.2 0 .2.1.4-.2 0-.3.1-.3.2s.2 0 .2.2c-.1.1-.1.2-.2.3-.1.2-.2.3-.4.2-.1-.1-.2.1-.2.1.2.3-.1.5-.2.7.1-.1.3-.3.5-.4v.2s.1 0 .1.1c.1.2 0 .3-.2.3 0 .1.1.1 0 .2s-.2.2-.3.4c2-1.8 3.9-3.5 6.3-4.6 0 .2-.2.3-.2.4.1 0 .2 0 .3.1.5-.2.9-.6 1.3-.9 1.3-1 2.6-1.9 3.9-2.9l1.8-1.2s.5-.4 1.2-.6zm-14.1 8.4c0 .1-.1.2-.3.2.2-.1.2-.2.3-.2zm.3-.3c0 .1-.1.2-.3.2 0-.2.2-.2.3-.2zm2.5-2.1v.2c-.7.6-1.5 1.3-2.2 1.9-.1.1-.1 0-.2 0 .7-.8 1.4-1.6 2.4-2.1zm.2-3.2c.1 0 .2.1.3.1-.2.1-.3.1-.3-.1zm.9-.5c-.1.1-.2.2-.3.1v-.1c.1-.1.2 0 .3 0 0-.1 0-.1 0 0zm-.5-.1c0-.1-.1-.3 0-.4.2.3.2.3 0 .4zm.8-.7c-.2.1-.3 0-.4-.2 0 0 0-.1.1-.1.2 0 .2.1.3.3zm16.5-10.1c-.1 0-.1 0 0 0-.1-.2.1-.2.1-.3v-.2c.2.2.3.6.5.8-.4.2-.4-.2-.6-.3zm-2.4 1.5c-.1-.1-.1-.2 0-.2h.1v.1s0 .1-.1.1zm9.3-1.1H83c-.1 0-.1-.1 0-.2.2-.1.3-.3.6-.2 0 .3-.5 0-.5.4zm-.6.2c-.1 0-.1 0-.1-.1s0-.1.1-.1.1 0 .1.1c-.1 0-.1.1-.1.1zm-.5.1s0-.1.1-.1h.1c-.1.1-.1.1-.2.1 0 .1 0 .1 0 0zm-10.9 1.9s-.1 0-.1-.1v-.1c.1 0 .1 0 .1.1v.1zm12.5-.4c-.1-.1 0-.1 0-.2.1-.1.2 0 .2.1s-.1.1-.2.1zm-16.5 2.5c-.2 0-.4 0-.5-.2 0-.1.1-.2.1-.2.3 0 .3.2.4.4zM66 62c-.4-.1-.4-.1-.3-.5.1.1.2.3.3.5zm2.6 7.1c.1.3-.3.2-.3.4h-.1s-.1-.1 0-.1c.1-.1.2-.3.4-.3zm-.5-.1c.1 0 .1 0 0 0 0 .1 0 .1-.1.1s-.1 0-.1-.1h.2zM61 65.1l.3.3c-.2.2-.4.1-.5-.1v-.2c.1-.1.2-.1.2 0zm.6-.2c0 .1 0 .2-.1.2-.2 0-.2-.1-.3-.2 0-.1 0-.2.1-.2.2 0 .3.1.3.2zm1.2-.6c-.1 0-.2-.1-.3-.1-.3-.1-.3-.3-.1-.6 0 .4.4.4.4.7zm1.4-1.3c-.4-.2-.5-.2-.2-.5 0 .2.3.3.2.5zm16.5-2.2c0-.1-.1-.2.1-.2.1 0-.1.1-.1.2zm0 .1c-.2 0-.3 0-.5-.1.2-.2.4-.1.5.1zm-.5.8c-.1-.1 0-.2.1-.3 0 .1.1.3-.1.3zm-.3.1s0-.1 0 0c0-.2.1-.2.2-.1h.1-.1c-.1.1-.1.1-.2.1zm-5.6 2.6h-.2c-.1-.1 0-.2.1-.3.3-.2.7-.3.9-.6l.3-.3c1.1-.7 2.2-1.3 3.4-1.9.2-.1.4 0 .5-.2.3-.2.6-.3 1-.4 0 .1.1.1 0 .2l-.6.3c-.8.3-1.6.7-2.3 1.2-.3.2-.5.3-.8.4-.4.3-.9.5-1.3.8-.1.2-.3.3-.5.3-.2.2-.3.5-.5.5zm-.6.2s-.1-.1 0-.1c.1-.1.3-.2.4-.1-.1.1-.2.3-.4.2zm-3.2.4c-.2.1-.3.1-.5.2.2-.3.3-.5.5-.2zm1.9.3c0-.1.1-.1.1-.1.1 0 .1.1.1.2 0 0 0 .1-.1.1 0-.1-.1-.1-.1-.2zm-.4-.4c-.4.2-.6.5-.9.5.2-.1.2-.2.3-.3.2-.1.3-.3.6-.2zm-.3 2.7c0-.1-.1-.2 0-.3.5-.3 1-.6 1.6-.9.1-.1.3-.1.4-.3.1-.1.3-.3.5-.4.5-.1.9-.5 1.4-.6.2-.1.4-.1.5-.2.3-.2.7-.4 1-.5.4-.2.8-.3 1.2-.6.1-.1.3-.2.4 0 .1.2-.1.2-.2.3h-.1c-.9.5-1.9.9-2.8 1.4-.5.2-1 .6-1.5.8-.2.1-.4.3-.6.4-.2.1-.4.4-.7.2-.2.2-.3.4-.5.5-.1 0-.2.1-.3.1-.2.3-.2.2-.3.1zm-5.5.3c.1.1.1.2 0 .3-.1.1-.2.2-.4.3-.9.6-1.8 1.3-2.7 1.9-.7.5-1.4 1-2.2 1.5-.4.3-.9.6-1.4.8-.1 0-.1.1-.2 0v-.1s.1 0 .1-.1c.4-.2.8-.5 1.2-.8.8-.6 1.6-1.2 2.5-1.8.7-.5 1.4-.9 2-1.5.2-.2.5-.3.7-.5.2-.1.3 0 .4 0zm12.6-4.1c0-.1-.1-.2.1-.2.1-.1.2-.2.4-.3.7-.2 1.3-.5 1.9-.8.1 0 .2-.1.3-.2.1 0 .2-.1.3.1 0 .1 0 .2-.1.2-.1.1-.1.1-.2.1-.2.1-.5.2-.7.3-.5.4-1.2.5-1.7.8 0 0-.1 0-.2.1 0 .1-.1 0-.1-.1zm5.2-2.6s0 .1-.1.1c-.6.4-1.2.7-1.8 1-.1.1-.2 0-.2-.1s0-.2.1-.2c.2 0 .4-.2.6-.3.5-.1.9-.3 1.4-.5zM59.7 72c-.1.1-.2.2-.3.1-.1-.1 0-.3.1-.3.2-.1.3-.3.6-.3l.1-.1c.1-.2.1-.2.4-.3.1 0 .2 0 .3.1-.4.3-.9.5-1.2.8zm-3.1-1.4c-.2-.5-.2-.5.3-.7h.1c0 .3-.3.5-.4.7zm-1.9 4c-.2 0-.4.2-.6.4 0-.2.3-.3.3-.5.2 0 .3-.2.4-.2 0 0 .1 0 .1.1 0 0-.2.1-.2.2zM75.5 57c-.1-.2-.2-.3-.1-.4.1-.1.3-.3.5-.1-.2.1-.4.2-.4.5zm-10.7 5.5c-.2 0-.3-.1-.3-.2 0-.2.2-.2.4-.3-.2.2-.1.3-.1.5-.1 0 0 0 0 0zm-7.5 7.2c0-.2-.1-.3-.2-.5.2.1.3.2.5.2v.3c-.1-.1-.2-.1-.3 0zm2.8-3.4c-.2 0-.3-.2-.4-.3.3-.4.3-.4.5 0-.3.1-.3.1-.1.3zm-3.5 4.3c-.1 0-.1.3-.3.3 0-.1-.1-.2 0-.3.1-.1.2.1.3 0zm13.3-11.3c-.1 0-.3 0-.2-.2 0-.1.2-.2.3-.1.2.1 0 .2-.1.3zm-9.8 6.4c0-.1.1-.1.1-.1.1 0 .2 0 .2.1s-.1.1-.1.1c-.1 0-.2 0-.2-.1zm3-2s.1 0 0 0c-.2-.1-.3-.2-.2-.4.2-.2.2.1.3.1-.2-.1-.1.1-.1.3zm-7.2 7.6c.1-.1.1-.2.2-.3 0 0 .1 0 .1.1-.1.2-.2.2-.3.2 0 .1-.1 0 0 0zm24.4-16.5s0 .1 0 0c-.1.2-.2 0-.3 0 .1-.1.2-.1.3 0zM58.9 72.9c.1-.1.2-.2.4-.1-.1.1-.2.2-.4.1zm18.7-17.3.1.1c0 .1 0 .1-.1.1 0 0-.1-.1 0-.2-.1 0-.1 0 0 0zM70 65.9c.1.1.3.1.2.3-.2-.1-.2-.2-.2-.3zm11.9-11c-.1.1-.1.1-.2 0v-.1c.1 0 .2.1.2.1zM57.3 69.7c-.1 0-.1.2-.2.1 0 0-.1-.1 0-.1.1-.1.1 0 .2 0zm13.3-4.2c0-.1 0-.1 0 0 .1.1.2.1.2.3-.3 0-.3-.1-.2-.3z" />
          </g>
        </svg>
      </div>
    </div>
  )
}