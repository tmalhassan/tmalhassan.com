import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../contexts/theme-context/useTheme";
import { ALHASSAN_TEXT } from "../../components/Strokes/StrokesData";
import { RevealText } from "../RevealText";
import './IntroPage.css';
import '../IncompleteSection/IncompleteSection.css';

import myImage from '../../assets/pages/intro-page/my-image.webp';
import type { PageCardsRefsTypes } from "../../types/PageCardsRefsTypes";
import InfoIcon from "../SVGs/InfoIcon";
import GlassGlareButton from "../GlassGlareButton/GlassGlareButton";

export default function IntroPage({ refs, isHidden, openDialog }: { refs: PageCardsRefsTypes; isHidden: boolean; openDialog: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [enableAnim, setEnableAnim] = useState(false);

  useEffect(() => {
    setEnableAnim(true);
  }, []);

  return (
    <div className={`page-card${isHidden ? ' hidden' : ''}`} ref={refs.divRef}>
      <IntroPageBackground enableAnim={enableAnim}/>
      <div className="intro-page-elements">
        {/* <button
          className="incomplete-info-button"
          title="Info button"
          onClick={toggleTheme}
        >
          <InfoIcon />
        </button> */}
        <div className="incomplete-info-button-wrapper">
          <GlassGlareButton 
            buttonImage={<InfoIcon stroke={ '#bfbfbf' } />}
            onClickHandler={openDialog}
            highlight={true}
            willAnimate={true}
            triggerAnim={true}
            animDelay={2500}
          />
        </div>
      </div>
      {/* <div className="intro-page-elements">
        <button className="theme-button" title="Theme toggle button" onClick={toggleTheme}>
        </button>
      </div> */}
      {/* <div ref={refs.coverRef} className='cover'/> */}
    </div>
  )
}

function IntroPageBackground({ enableAnim }: { enableAnim: boolean }) {
  const maskContainerRef = useRef<HTMLDivElement | null>(null);
  const glowElementRef = useRef<HTMLDivElement | null>(null);
  const myImageRef = useRef<HTMLImageElement| null>(null);
  const imagePosRef = useRef<{ x: number; y: number; }>({ x: 0, y: 0 });

  useEffect(() => {
    const maskContainer = maskContainerRef.current;
    const glowElement = glowElementRef.current;
    const myImageElement = myImageRef.current;

    if (!maskContainer || !glowElement || !myImageElement) return;

    let rect = maskContainer.getBoundingClientRect();
    const glowRect = glowElement.getBoundingClientRect();
    const glowWidth = glowRect.width;
    const glowHeight = glowRect.height;
    
    // Track latest coordinates safely outside the loop
    let latestX = 0;
    let latestY = 0;
    let rAFId: number | null = null;

    const onResize = () => {
      rect = maskContainer.getBoundingClientRect();
      const imgRect = myImageElement.getBoundingClientRect();
      const xPos = imgRect.left - (imgRect.width / 2.5); // (imgRect.width / 3);
      const yPos = imgRect.top - (imgRect.height / 2);

      updatePos(xPos, yPos);
      imagePosRef.current = { x: xPos, y: yPos };
    };
    
    const updatePos = (xPos: number, yPos: number) => {
      glowElement.style.transform = `translate(${xPos}px, ${yPos}px)`;
    };

    // This loop runs strictly once per browser frame paint
    const renderGlow = () => {
      const xPos = latestX - rect.left - (glowWidth / 2);
      const yPos = latestY - rect.top - (glowHeight / 2);
      
      updatePos(xPos, yPos);
      rAFId = null; // Reset tick so next event can schedule
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;

      // Cache the latest raw mouse position instantly
      latestX = e.clientX;
      latestY = e.clientY;

      // If a frame calculation isn't already scheduled, schedule it
      if (rAFId === null) {
        rAFId = requestAnimationFrame(renderGlow);
      }
    };

    const onPointerEnter = () => glowElement.style.transitionDuration = '0s';

    const onPointerLeave = () => {
      console.log('pointer left!');
      
      // Cancel any pending frame updates so they don't overwrite the exit position
      if (rAFId !== null) {
        cancelAnimationFrame(rAFId);
        rAFId = null;
      }

      onResize();
      glowElement.style.transitionDuration = '0.3s';
      glowElement.style.transform = `translate(${imagePosRef.current.x}px, ${imagePosRef.current.y}px)`;
    };

    onResize();

    maskContainer.addEventListener('pointerenter', onPointerEnter);
    maskContainer.addEventListener('pointermove', onPointerMove);
    maskContainer.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);

    return () => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      maskContainer.removeEventListener('pointerenter', onPointerEnter);
      maskContainer.removeEventListener('pointermove', onPointerMove);
      maskContainer.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return(
    <div className="intro-bg" data-enableanim={enableAnim}>
      <div className="intro-bg-pattern" ref={maskContainerRef}>
        <div className="glow" ref={glowElementRef}/>
      </div>
      
      <div className="bg-elements">
        <div className="my-pfp">
          <img ref={myImageRef} fetchPriority="high" src={myImage} alt="personal picture" />
        </div>
        <div className="texts-container">
          <div className="l-name animate">
            <RevealText
              strokeData={ALHASSAN_TEXT}
              // fill={{ color: '#ffb791', angle: 0 }}
              // fill={{ color: ['#ffcca3', '#f9a375'], angle: 65 }}
              fill={{ color: ['#ffcca3', '#fbaf86'], angle: 65, opacity: 1 }}
              speed={500} // units/sec
              minDuration={0.15}
              maxDuration={0.2}
              letterGap={0}
              startDelay={1}
              easing={'ease-out'} // {"cubic-bezier(0, 0, 0.65, 0.6)"}
              fallbackTextColor="#111827"
            />
          </div>
          <div className="f-name">
            <p>TAREK</p>
          </div>
        </div>
        <div className="skills-text">
          <p>
            <span>Web Developer</span>
            <span className="p-separator">&#9670;</span>
            <span>Game Developer</span>
            <span className="p-separator">&#9670;</span>
            <span>Desginer</span>
          </p>
        </div>
      </div>
    </div>
  )
}