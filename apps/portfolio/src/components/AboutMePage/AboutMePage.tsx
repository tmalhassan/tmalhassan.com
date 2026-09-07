import { useEffect, useRef, useState } from "react";
import type { PageCardsRefsTypes } from "../../types/PageCardsRefsTypes";
import './AboutMePage.css';
import { ABOUT_ME_TEXT } from "../../components/Strokes/StrokesData";
import { RevealText } from "../RevealText";
import { aboutMeText } from "../../content/AboutMeText";
import TextRenderer from "../TextRenderer/TextRenderer";

export default function AboutMePage({ refs, isHidden }: { refs: PageCardsRefsTypes; isHidden: boolean; }) {
  const [enableAnim, setEnableAnim] = useState(false);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    const pageElement = refs.divRef.current;
    if (!pageElement) return;

    const observer = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) {
        console.log('About Me page is in view!');
        
        setEnableAnim(true);
        obs.unobserve(pageElement);
      }
    }, {rootMargin : '-10%', threshold : 0});
    
    observer.observe(pageElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (enableAnim && firstRenderRef.current === true) firstRenderRef.current = false;
  }, [enableAnim])

  function animState() {
    if (firstRenderRef.current && enableAnim) return ' animate';
    else if (!firstRenderRef.current) return ' end-animate';
    else return ''
  };

  return(
    <div className={`page-card${isHidden ? ' hidden' : ''}`} ref={refs.divRef}>
      <div className={`about-me-container${animState()}`}> {/* ref={setTextContainerNode} style={{ display: !inView ? 'none' : undefined }} */}
        <div className='about-me-title'>
          <RevealText
            strokeData={ABOUT_ME_TEXT}
            fill={{ color: ['#ffcca3', '#fbaf86ff'], angle: 65, opacity: 1 }}
            speed={800} // units/sec
            minDuration={0.15}
            maxDuration={0.2}
            letterGap={0}
            startDelay={0.1}
            easing={'ease-out'} // {"cubic-bezier(0, 0, 0.65, 0.6)"}
            fallbackTextColor="#111827"
          />
        </div>
        <div className='about-me-body'>
          <TextRenderer
            text={aboutMeText}
            animate={true}
            animStartDelay={0.4}
            wordAnimDuration={0.015}
          />
        </div>
      </div>
    </div>
  )
}